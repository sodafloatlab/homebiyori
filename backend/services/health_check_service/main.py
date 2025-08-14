from fastapi import FastAPI, HTTPException
import time
from datetime import datetime
from typing import Dict, Any
import logging

# Lambda Layer共通ライブラリ
from homebiyori_common.utils.datetime_utils import get_current_jst
from homebiyori_common.utils.middleware import error_handling_middleware

# ログ設定 - CloudWatch統合対応
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPIアプリケーション初期化
# 設計意図：
# - シンプルな死活監視専用API（認証なし）
# - 一般ユーザーもアクセス可能な基本的な疎通確認
# - API Gatewayからの健全性チェック用
# - 詳細な外部サービス監視は管理者機能で実装
app = FastAPI(
    title="Homebiyori Health Check Service",
    description="基本的な死活監視API（認証なし）",
    version="1.0.0"
)

# 共通ミドルウェアをLambda Layerから適用
app.middleware("http")(error_handling_middleware)

@app.get("/api/health")
async def basic_health_check() -> Dict[str, Any]:
    """
    基本的な死活監視エンドポイント（認証なし・パブリックアクセス可能）
    
    用途：
    - API Gatewayからの基本的な死活確認
    - 一般ユーザーからのサービス稼働状況確認
    - Lambda関数が正常に起動できることの確認
    - レスポンス時間の測定（CloudWatch メトリクス用）
    
    Returns:
        Dict[str, Any]: ヘルスチェック結果
        {
            "status": "ok",
            "timestamp": "JST形式の現在時刻",
            "service": "health-check",
            "version": "アプリケーションバージョン",
            "response_time_ms": "レスポンス時間（ミリ秒）"
        }
    
    レスポンス時間目標: < 200ms（シンプル構成のため）
    
    注意：外部サービス（DynamoDB、Bedrock等）の詳細チェックは
    　　　 管理者機能で実装し、こちらは基本的な疎通確認のみ
    """
    try:
        # シンプルなヘルスチェック処理
        # Lambda関数とFastAPIアプリケーションが正常に動作していることを確認
        start_time = time.time()
        
        # 現在時刻取得（JST）- Lambda実行環境の時刻同期確認
        current_time = get_current_jst().isoformat()
        
        # レスポンス時間計算
        response_time_ms = (time.time() - start_time) * 1000
        
        logger.info(f"Health check completed in {response_time_ms:.2f}ms")
        
        return {
            "status": "ok",
            "timestamp": current_time,
            "service": "health-check",
            "version": "1.0.0",
            "response_time_ms": round(response_time_ms, 2)
        }
        
    except Exception as e:
        # 予期しないエラーが発生した場合
        logger.error(f"Health check failed: {str(e)}")
        
        # 500エラーを返してサービス異常を明確に通知
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "timestamp": get_current_jst().isoformat(),
                "service": "health-check",
                "error": "Service temporarily unavailable"  # エラー詳細は隠蔽
            }
        )

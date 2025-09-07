"""
tree-service Lambda エントリーポイント

■Lambda設定■
Runtime: Python 3.11
Memory: 512MB
Timeout: 30秒
Environment Variables:
- CORE_TABLE_NAME: prod-homebiyori-core
- FRUITS_TABLE_NAME: prod-homebiyori-fruits
- LOG_LEVEL: INFO
- ENVIRONMENT: prod

■API Gateway統合■
- 認証: Cognito User Pool Authorizer
- CORS: 適切な設定
- レスポンス変換: Lambda Proxy統合
"""

import os
import json
from mangum import Mangum
from homebiyori_common.logger import get_logger

# FastAPIアプリケーションをインポート
# Lambda環境での完全な初期化
import sys
import os

# Lambda環境でのパッケージ認識強化
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# パッケージ名を設定してモジュールを初期化
import importlib.util
import types

# tree_serviceパッケージを強制的に作成
tree_service_package = types.ModuleType('tree_service')
tree_service_package.__path__ = [current_dir]
sys.modules['tree_service'] = tree_service_package

# 相対インポートが動作するようにmainモジュールを読み込み
spec = importlib.util.spec_from_file_location("tree_service.main", os.path.join(current_dir, "main.py"))
main_module = importlib.util.module_from_spec(spec)
sys.modules['tree_service.main'] = main_module
spec.loader.exec_module(main_module)

app = main_module.app

# 構造化ログ設定
logger = get_logger(__name__)

# Mangumアダプターでラップ（API Gateway用）
# ルーティング設定はFastAPIで一元管理
handler = Mangum(app)

def lambda_handler(event, context):
    """
    Lambda エントリーポイント
    
    Args:
        event: API Gateway イベント
        context: Lambda コンテキスト
        
    Returns:
        API Gateway レスポンス
    """
    try:
        # リクエスト情報をログに記録
        logger.info(
            f"tree-service リクエスト開始",
            extra={
                "method": event.get("httpMethod"),
                "path": event.get("path"),
                "user_id": event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("sub"),
                "request_id": context.aws_request_id
            }
        )
        
        # Mangumでリクエスト処理
        response = handler(event, context)
        
        # レスポンス情報をログに記録
        logger.info(
            f"tree-service リクエスト完了",
            extra={
                "status_code": response.get("statusCode"),
                "request_id": context.aws_request_id
            }
        )
        
        return response
        
    except Exception as e:
        # 予期しないエラーをログに記録
        logger.error(
            f"tree-service 予期しないエラー: {e}",
            extra={
                "request_id": context.aws_request_id,
                "error_type": type(e).__name__
            }
        )
        
        # エラーレスポンス返却
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            "body": json.dumps({
                "error": "internal_server_error",
                "message": "内部サーバーエラーが発生しました",
                "request_id": context.aws_request_id
            })
        }
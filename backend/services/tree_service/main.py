"""
tree-service Lambda FastAPIアプリケーション

■システム概要■
Homebiyori（ほめびより）の木の成長管理システム。
ユーザーの育児投稿に基づいて木を成長させ、
感情的な瞬間を「実」として保存する機能を提供。

■主要機能■
1. 木の成長状態取得・更新
2. 実（褒めメッセージ）生成・管理
3. 成長履歴記録・分析
4. テーマカラー管理
5. 成長統計の取得

■アーキテクチャ改訂■
- AWS Lambda (Python 3.11, 512MB, 30秒)
- FastAPI + Mangum
- Lambda Layers: homebiyori-common-layer
- 認証: API Gateway + Cognito Authorizer
- データストア: DynamoDB 7テーブル構成 (prod-homebiyori-trees, prod-homebiyori-fruits)

■セキュリティ■
JWT認証必須、入力値検証、レート制限、適切なCORS設定
"""

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import os
import asyncio
from datetime import datetime, timedelta
import pytz

# Lambda Layers からの共通機能インポート
from homebiyori_common.auth import get_user_id_from_event
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import (
    ValidationError,
    AuthenticationError,
    DatabaseError,
    MaintenanceError,
    ExternalServiceError
)
from homebiyori_common.utils.maintenance import maintenance_required
from homebiyori_common.utils.middleware import maintenance_check_middleware, get_current_user_id

# ローカルモジュール
from .models import (
    TreeStatus,
    TreeGrowthInfo,
    FruitInfo,
    FruitViewRequest,
    FruitViewResponse,
    FruitsListRequest,
    FruitsListResponse,
    GrowthHistoryResponse,
    TreeStage,
    AICharacterType,
    EmotionType,
    TreeTheme,
    get_current_jst,
    calculate_tree_stage,
    get_characters_to_next_stage,
    calculate_progress_percentage,
    get_character_theme_color,
    can_generate_fruit,
    generate_growth_celebration_message,
    create_tree_status_from_stats,
    TREE_STAGE_CONFIG
)
from .database import get_tree_database

# 構造化ログ設定
logger = get_logger(__name__)

# FastAPIインスタンス作成
app = FastAPI(
    title="Tree Service API",
    description="Homebiyori 木の成長管理システム",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENABLE_DOCS") == "true" else None,
    redoc_url="/redoc" if os.getenv("ENABLE_DOCS") == "true" else None
)

# データベースインスタンス
db = get_tree_database()

# =====================================
# ミドルウェア・依存関数
# =====================================

# 共通ミドルウェアをLambda Layerから適用
app.middleware("http")(maintenance_check_middleware)

@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    """
    統一エラーハンドリング
    """
    try:
        response = await call_next(request)
        return response
    except ValidationError as e:
        logger.warning(f"バリデーションエラー: {e}")
        return JSONResponse(
            status_code=400,
            content={
                "error": "validation_error",
                "message": str(e)
            }
        )
    except DatabaseError as e:
        logger.error(f"データベースエラー: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "database_error",
                "message": "データベース処理でエラーが発生しました"
            }
        )
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_server_error",
                "message": "内部サーバーエラーが発生しました"
            }
        )

# =====================================
# 木の成長状態管理エンドポイント
# =====================================

@app.get("/api/tree/status", response_model=TreeStatus)
async def get_tree_status(
    user_id: str = Depends(get_current_user_id)
):
    """
    木の成長状態取得
    
    ■取得情報■
    - 現在の成長段階と説明
    - 累計文字数と進捗
    - 実の総数
    - 最終更新情報
    """
    try:
        logger.info(f"木の状態取得開始: user_id={user_id}")
        
        # ユーザーの木統計を取得
        tree_stats = await db.get_user_tree_stats(user_id)
        
        if not tree_stats:
            # 初回アクセス時：新規木作成
            tree_stats = await db.create_initial_tree(user_id)
            logger.info(f"新規木作成: user_id={user_id}")
        
        # TreeStatusオブジェクト作成
        tree_status = create_tree_status_from_stats(
            user_id=user_id,
            stats=tree_stats,
            theme_color=TreeTheme(tree_stats.get("theme_color", "rose"))
        )
        
        logger.info(f"木の状態取得完了: stage={tree_status.current_stage}, chars={tree_status.total_characters}")
        return tree_status
        
    except Exception as e:
        logger.error(f"木の状態取得エラー: error={e}")
        raise HTTPException(status_code=500, detail="木の状態取得に失敗しました")

@app.post("/api/tree/update-growth", response_model=TreeGrowthInfo)
async def update_tree_growth(
    added_characters: int,
    user_id: str = Depends(get_current_user_id)
):
    """
    木の成長更新（chat-serviceから呼び出し）
    
    Args:
        added_characters: 追加された文字数
    
    Returns:
        TreeGrowthInfo: 成長情報（段階変化含む）
    """
    try:
        logger.info(f"木の成長更新開始: user_id={user_id}, added_characters={added_characters}")
        
        # 成長更新処理をデータベースに委譲
        growth_info = await db.update_tree_growth(user_id, added_characters)
        
        logger.info(f"木の成長更新完了: user_id={user_id}, current_stage={growth_info.current_stage}")
        return growth_info
        
    except Exception as e:
        logger.error(f"木の成長更新エラー: error={e}")
        raise HTTPException(status_code=500, detail="木の成長更新に失敗しました")

# =====================================
# ヘルスチェック
# =====================================

@app.get("/health")
async def health_check():
    """
    ヘルスチェック
    """
    try:
        # データベース接続確認
        await db.health_check()
        
        return {
            "status": "healthy",
            "service": "tree-service",
            "timestamp": get_current_jst().isoformat(),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"ヘルスチェック失敗: {e}")
        raise HTTPException(status_code=503, detail="サービスが利用できません")
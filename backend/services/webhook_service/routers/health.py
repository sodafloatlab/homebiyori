"""
Health Check Handler

Webhook Service のヘルスチェック機能。
- Lambda関数の死活監視
- 依存サービス接続確認
- 設定検証
"""

from fastapi import APIRouter

from homebiyori_common import get_logger, success_response

# ログ設定
logger = get_logger(__name__)

# ルーター初期化
health_router = APIRouter()


@health_router.get("/")
async def health_check():
    """
    基本的なヘルスチェック（DB接続確認）
    
    Returns:
        FastAPI Response: サービス状態とDB接続状態
    """
    from ..database import get_webhook_database
    
    try:
        # データベース接続確認
        db = get_webhook_database()
        health_result = await db.health_check()
        
        return success_response(
            data={
                "status": "healthy",
                "service": "webhook-service",
                "timestamp": health_result["timestamp"],
                "database_status": health_result["database_status"],
                "connected_tables": health_result.get("connected_tables", [])
            },
            message="Webhook service is healthy"
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Health check failed")



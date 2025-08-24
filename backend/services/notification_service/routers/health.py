"""
ヘルスチェック用ハンドラー

サービス状態監視用のエンドポイント。
"""

from fastapi import APIRouter

from homebiyori_common import get_logger
from homebiyori_common.utils.response_utils import success_response, error_response
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string

from ..services.notification_service import NotificationService
from ..core.config import get_settings

logger = get_logger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """
    ヘルスチェック
    
    Returns:
        Dict: サービス状態
    """
    try:
        current_time = get_current_jst()
        settings = get_settings()
        
        # DynamoDB接続確認
        service = NotificationService(settings)
        db_health = await service.health_check()
        
        health_status = {
            "service": "notification_service",
            "status": "healthy",
            "timestamp": to_jst_string(current_time),
            "version": "1.0.0",
            "database": {
                "status": "healthy" if db_health else "unhealthy",
                "table": settings.dynamodb_table
            },
            "features": {
                "user_notifications": True,
                "admin_notifications": settings.enable_admin_notifications,
                "batch_operations": settings.enable_batch_operations
            }
        }
        
        if not db_health:
            health_status["status"] = "degraded"
            logger.warning("Database health check failed")
        
        return success_response(health_status)
        
    except Exception as e:
        logger.error("Health check failed", extra={
            "error": str(e),
            "error_type": type(e).__name__
        })
        
        return error_response(
            message="ヘルスチェックに失敗しました",
            status_code=500,
            data={
                "service": "notification_service",
                "status": "unhealthy",
                "timestamp": to_jst_string(get_current_jst()),
                "error": str(e)
            }
        )
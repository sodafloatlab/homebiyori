"""
内部API用ハンドラー

他のLambdaサービスからの通知作成・管理用API。
- 単体通知作成
- 一括通知作成
- 通知削除
- ヘルスチェック
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.security import HTTPBearer

from homebiyori_common import get_logger
from homebiyori_common.utils.response_utils import success_response, error_response

from ..models.notification_models import (
    NotificationCreateRequest, BulkNotificationRequest, 
    UserNotification
)
from ..services.notification_service import NotificationService
from ..core.config import get_settings
from ..utils.auth import verify_internal_api_key

logger = get_logger(__name__)
router = APIRouter(prefix="/internal", tags=["internal"])
security = HTTPBearer()


@router.post("/notifications", response_model=UserNotification)
async def create_notification(
    request: NotificationCreateRequest,
    _: str = Depends(verify_internal_api_key)
):
    """
    通知作成（内部API）
    
    Args:
        request: 通知作成リクエスト
        _: 内部API認証
        
    Returns:
        UserNotification: 作成された通知
    """
    try:
        settings = get_settings()
        service = NotificationService(settings)
        
        if not request.user_id:
            return error_response("user_idは必須です", status_code=400)
        
        logger.info("Creating notification via internal API", extra={
            "user_id": request.user_id,
            "type": request.type,
            "title": request.title,
            "priority": request.priority
        })
        
        notification = await service.create_notification(
            user_id=request.user_id,
            notification_type=request.type,
            title=request.title,
            message=request.message,
            priority=request.priority,
            metadata=request.metadata,
            expires_at=request.expires_at
        )
        
        return success_response(notification)
        
    except Exception as e:
        logger.error("Failed to create notification via internal API", extra={
            "user_id": request.user_id if request else None,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("通知作成に失敗しました", status_code=500)


@router.post("/notifications/bulk")
async def create_bulk_notifications(
    request: BulkNotificationRequest,
    _: str = Depends(verify_internal_api_key)
):
    """
    一括通知作成（内部API）
    
    Args:
        request: 一括通知作成リクエスト
        _: 内部API認証
        
    Returns:
        Dict: 作成結果
    """
    try:
        settings = get_settings()
        service = NotificationService(settings)
        
        logger.info("Creating bulk notifications via internal API", extra={
            "notification_count": len(request.notifications)
        })
        
        results = await service.create_bulk_notifications(request.notifications)
        
        success_count = len([r for r in results if r.get("success", False)])
        failed_count = len(results) - success_count
        
        return success_response({
            "message": f"{success_count}件作成、{failed_count}件失敗",
            "success_count": success_count,
            "failed_count": failed_count,
            "results": results
        })
        
    except Exception as e:
        logger.error("Failed to create bulk notifications", extra={
            "notification_count": len(request.notifications) if request else 0,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("一括通知作成に失敗しました", status_code=500)


@router.delete("/notifications/{user_id}/{notification_id}")
async def delete_notification(
    user_id: str,
    notification_id: str,
    _: str = Depends(verify_internal_api_key)
):
    """
    通知削除（内部API）
    
    Args:
        user_id: ユーザーID
        notification_id: 通知ID
        _: 内部API認証
        
    Returns:
        Dict: 削除結果
    """
    try:
        settings = get_settings()
        service = NotificationService(settings)
        
        logger.info("Deleting notification via internal API", extra={
            "user_id": user_id,
            "notification_id": notification_id
        })
        
        success = await service.delete_notification(user_id, notification_id)
        
        if not success:
            return error_response("通知が見つかりません", status_code=404)
        
        return success_response({"message": "通知を削除しました"})
        
    except Exception as e:
        logger.error("Failed to delete notification", extra={
            "user_id": user_id,
            "notification_id": notification_id,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("通知削除に失敗しました", status_code=500)


@router.get("/notifications/health")
async def health_check():
    """
    ヘルスチェック（内部API）
    
    Returns:
        Dict: サービス状態
    """
    try:
        settings = get_settings()
        service = NotificationService(settings)
        
        # 簡単な疎通確認
        health_status = await service.health_check()
        
        return success_response({
            "service": "notification_service",
            "status": "healthy" if health_status else "unhealthy",
            "timestamp": health_status.get("timestamp") if health_status else None
        })
        
    except Exception as e:
        logger.error("Health check failed", extra={
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("ヘルスチェックに失敗しました", status_code=500)
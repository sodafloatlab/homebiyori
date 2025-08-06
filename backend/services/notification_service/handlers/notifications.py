"""
通知関連APIハンドラー

ユーザー向け通知のCRUD操作を提供。
- 通知一覧取得
- 通知詳細取得
- 通知既読処理
- 通知アーカイブ
- 通知統計情報
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer

from homebiyori_common import get_logger
from homebiyori_common.auth import get_user_id_from_event
from homebiyori_common.utils.response_utils import success_response, error_response

from ..models.notification_models import (
    UserNotification, NotificationListResponse, NotificationStatsResponse,
    NotificationStatus, NotificationPriority
)
from ..services.notification_service import NotificationService
from ..core.config import get_settings

logger = get_logger(__name__)
router = APIRouter(prefix="/notifications", tags=["notifications"])
security = HTTPBearer()


@router.get("/", response_model=NotificationListResponse)
async def get_notifications(
    page: int = Query(1, ge=1, description="ページ番号"),
    page_size: int = Query(20, ge=1, le=100, description="ページサイズ"),
    status: Optional[NotificationStatus] = Query(None, description="通知状態フィルター"),
    priority: Optional[NotificationPriority] = Query(None, description="優先度フィルター"),
    unread_only: bool = Query(False, description="未読のみ取得"),
    current_user: str = Depends(get_user_id_from_event)
):
    """
    ユーザー通知一覧取得
    
    Args:
        page: ページ番号 (1から開始)
        page_size: ページサイズ (1-100)
        status: 通知状態フィルター
        priority: 優先度フィルター
        unread_only: 未読のみ取得フラグ
        current_user: 認証済みユーザーID
        
    Returns:
        NotificationListResponse: 通知一覧と統計情報
    """
    try:
        settings = get_settings()
        service = NotificationService(settings)
        
        # ページサイズ制限
        page_size = min(page_size, settings.max_page_size)
        
        logger.info("Getting user notifications", extra={
            "user_id": current_user,
            "page": page,
            "page_size": page_size,
            "status": status,
            "priority": priority,
            "unread_only": unread_only
        })
        
        result = await service.get_user_notifications(
            user_id=current_user,
            page=page,
            page_size=page_size,
            status=status,
            priority=priority,
            unread_only=unread_only
        )
        
        return success_response(result)
        
    except Exception as e:
        logger.error("Failed to get user notifications", extra={
            "user_id": current_user,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("通知一覧の取得に失敗しました", status_code=500)


@router.get("/stats", response_model=NotificationStatsResponse)
async def get_notification_stats(
    current_user: str = Depends(get_user_id_from_event)
):
    """
    ユーザー通知統計取得
    
    Args:
        current_user: 認証済みユーザーID
        
    Returns:
        NotificationStatsResponse: 通知統計情報
    """
    try:
        settings = get_settings()
        service = NotificationService(settings)
        
        logger.info("Getting notification stats", extra={
            "user_id": current_user
        })
        
        stats = await service.get_user_notification_stats(current_user)
        
        return success_response(stats)
        
    except Exception as e:
        logger.error("Failed to get notification stats", extra={
            "user_id": current_user,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("通知統計の取得に失敗しました", status_code=500)


@router.get("/{notification_id}")
async def get_notification(
    notification_id: str,
    current_user: str = Depends(get_user_id_from_event)
):
    """
    通知詳細取得
    
    Args:
        notification_id: 通知ID
        current_user: 認証済みユーザーID
        
    Returns:
        UserNotification: 通知詳細
    """
    try:
        settings = get_settings()
        service = NotificationService(settings)
        
        logger.info("Getting notification details", extra={
            "user_id": current_user,
            "notification_id": notification_id
        })
        
        notification = await service.get_notification(current_user, notification_id)
        
        if not notification:
            return error_response("通知が見つかりません", status_code=404)
        
        return success_response(notification)
        
    except Exception as e:
        logger.error("Failed to get notification", extra={
            "user_id": current_user,
            "notification_id": notification_id,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("通知詳細の取得に失敗しました", status_code=500)


@router.patch("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    current_user: str = Depends(get_user_id_from_event)
):
    """
    通知既読処理
    
    Args:
        notification_id: 通知ID
        current_user: 認証済みユーザーID
        
    Returns:
        Dict: 処理結果
    """
    try:
        settings = get_settings()
        service = NotificationService(settings)
        
        logger.info("Marking notification as read", extra={
            "user_id": current_user,
            "notification_id": notification_id
        })
        
        success = await service.mark_as_read(current_user, notification_id)
        
        if not success:
            return error_response("通知が見つかりません", status_code=404)
        
        return success_response({"message": "通知を既読にしました"})
        
    except Exception as e:
        logger.error("Failed to mark notification as read", extra={
            "user_id": current_user,
            "notification_id": notification_id,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("既読処理に失敗しました", status_code=500)


@router.patch("/{notification_id}/archive")
async def archive_notification(
    notification_id: str,
    current_user: str = Depends(get_user_id_from_event)
):
    """
    通知アーカイブ処理
    
    Args:
        notification_id: 通知ID
        current_user: 認証済みユーザーID
        
    Returns:
        Dict: 処理結果
    """
    try:
        settings = get_settings()
        service = NotificationService(settings)
        
        logger.info("Archiving notification", extra={
            "user_id": current_user,
            "notification_id": notification_id
        })
        
        success = await service.archive_notification(current_user, notification_id)
        
        if not success:
            return error_response("通知が見つかりません", status_code=404)
        
        return success_response({"message": "通知をアーカイブしました"})
        
    except Exception as e:
        logger.error("Failed to archive notification", extra={
            "user_id": current_user,
            "notification_id": notification_id,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("アーカイブ処理に失敗しました", status_code=500)


@router.patch("/bulk/read")
async def mark_all_as_read(
    current_user: str = Depends(get_user_id_from_event)
):
    """
    全通知既読処理
    
    Args:
        current_user: 認証済みユーザーID
        
    Returns:
        Dict: 処理結果
    """
    try:
        settings = get_settings()
        service = NotificationService(settings)
        
        logger.info("Marking all notifications as read", extra={
            "user_id": current_user
        })
        
        count = await service.mark_all_as_read(current_user)
        
        return success_response({
            "message": f"{count}件の通知を既読にしました",
            "updated_count": count
        })
        
    except Exception as e:
        logger.error("Failed to mark all notifications as read", extra={
            "user_id": current_user,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("一括既読処理に失敗しました", status_code=500)
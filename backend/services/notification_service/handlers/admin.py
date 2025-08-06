"""
管理者API用ハンドラー

システム管理者向けの通知管理機能。
- 管理者通知作成・配信
- メンテナンス通知作成
- 通知統計情報
- 一括操作
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query

from homebiyori_common import get_logger
from homebiyori_common.utils.response_utils import success_response, error_response

from ..models.notification_models import (
    AdminNotificationCreateRequest, MaintenanceNotificationTemplate,
    AdminNotification, NotificationListResponse
)
from ..services.admin_notification_service import AdminNotificationService
from ..core.config import get_settings
from ..utils.auth import verify_admin_api_key

logger = get_logger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/notifications", response_model=AdminNotification)
async def create_admin_notification(
    request: AdminNotificationCreateRequest,
    admin_id: str = Depends(verify_admin_api_key)
):
    """
    管理者通知作成
    
    Args:
        request: 管理者通知作成リクエスト
        admin_id: 認証済み管理者ID
        
    Returns:
        AdminNotification: 作成された管理者通知
    """
    try:
        settings = get_settings()
        service = AdminNotificationService(settings)
        
        logger.info("Creating admin notification", extra={
            "admin_id": admin_id,
            "type": request.type,
            "title": request.title,
            "scope": request.scope,
            "target_plan": request.target_plan,
            "scheduled_at": request.scheduled_at.isoformat() if request.scheduled_at else None
        })
        
        notification = await service.create_admin_notification(
            admin_id=admin_id,
            notification_type=request.type,
            title=request.title,
            message=request.message,
            priority=request.priority,
            scope=request.scope,
            target_plan=request.target_plan,
            metadata=request.metadata,
            expires_at=request.expires_at,
            scheduled_at=request.scheduled_at
        )
        
        return success_response(notification)
        
    except Exception as e:
        logger.error("Failed to create admin notification", extra={
            "admin_id": admin_id,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("管理者通知作成に失敗しました", status_code=500)


@router.post("/notifications/maintenance")
async def create_maintenance_notification(
    template: MaintenanceNotificationTemplate,
    admin_id: str = Depends(verify_admin_api_key)
):
    """
    メンテナンス通知作成
    
    Args:
        template: メンテナンス通知テンプレート
        admin_id: 認証済み管理者ID
        
    Returns:
        AdminNotification: 作成されたメンテナンス通知
    """
    try:
        settings = get_settings()
        service = AdminNotificationService(settings)
        
        logger.info("Creating maintenance notification", extra={
            "admin_id": admin_id,
            "maintenance_type": template.maintenance_type,
            "start_time": template.start_time.isoformat(),
            "end_time": template.end_time.isoformat(),
            "affected_services": template.affected_services,
            "notice_period_hours": template.notice_period_hours
        })
        
        # テンプレートから通知リクエストを生成
        notification_request = template.generate_notification(admin_id)
        
        notification = await service.create_admin_notification(
            admin_id=admin_id,
            notification_type=notification_request.type,
            title=notification_request.title,
            message=notification_request.message,
            priority=notification_request.priority,
            scope=notification_request.scope,
            target_plan=notification_request.target_plan,
            metadata=notification_request.metadata,
            expires_at=notification_request.expires_at,
            scheduled_at=notification_request.scheduled_at
        )
        
        return success_response(notification)
        
    except Exception as e:
        logger.error("Failed to create maintenance notification", extra={
            "admin_id": admin_id,
            "maintenance_type": template.maintenance_type if template else None,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("メンテナンス通知作成に失敗しました", status_code=500)


@router.get("/notifications")
async def get_admin_notifications(
    page: int = Query(1, ge=1, description="ページ番号"),
    page_size: int = Query(20, ge=1, le=100, description="ページサイズ"),
    sent_only: bool = Query(False, description="配信済みのみ取得"),
    scheduled_only: bool = Query(False, description="配信予定のみ取得"),
    admin_id: str = Depends(verify_admin_api_key)
):
    """
    管理者通知一覧取得
    
    Args:
        page: ページ番号
        page_size: ページサイズ
        sent_only: 配信済みのみフラグ
        scheduled_only: 配信予定のみフラグ
        admin_id: 認証済み管理者ID
        
    Returns:
        List[AdminNotification]: 管理者通知一覧
    """
    try:
        settings = get_settings()
        service = AdminNotificationService(settings)
        
        logger.info("Getting admin notifications", extra={
            "admin_id": admin_id,
            "page": page,
            "page_size": page_size,
            "sent_only": sent_only,
            "scheduled_only": scheduled_only
        })
        
        notifications = await service.get_admin_notifications(
            page=page,
            page_size=page_size,
            sent_only=sent_only,
            scheduled_only=scheduled_only
        )
        
        return success_response(notifications)
        
    except Exception as e:
        logger.error("Failed to get admin notifications", extra={
            "admin_id": admin_id,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("管理者通知一覧取得に失敗しました", status_code=500)


@router.post("/notifications/{notification_id}/send")
async def send_admin_notification(
    notification_id: str,
    admin_id: str = Depends(verify_admin_api_key)
):
    """
    管理者通知配信実行
    
    Args:
        notification_id: 通知ID
        admin_id: 認証済み管理者ID
        
    Returns:
        Dict: 配信結果
    """
    try:
        settings = get_settings()
        service = AdminNotificationService(settings)
        
        logger.info("Sending admin notification", extra={
            "admin_id": admin_id,
            "notification_id": notification_id
        })
        
        result = await service.send_admin_notification(notification_id)
        
        if not result:
            return error_response("通知が見つかりません", status_code=404)
        
        return success_response({
            "message": f"{result['recipient_count']}名に配信しました",
            "recipient_count": result["recipient_count"],
            "sent_at": result["sent_at"]
        })
        
    except Exception as e:
        logger.error("Failed to send admin notification", extra={
            "admin_id": admin_id,
            "notification_id": notification_id,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("管理者通知配信に失敗しました", status_code=500)


@router.delete("/notifications/{notification_id}")
async def delete_admin_notification(
    notification_id: str,
    admin_id: str = Depends(verify_admin_api_key)
):
    """
    管理者通知削除
    
    Args:
        notification_id: 通知ID
        admin_id: 認証済み管理者ID
        
    Returns:
        Dict: 削除結果
    """
    try:
        settings = get_settings()
        service = AdminNotificationService(settings)
        
        logger.info("Deleting admin notification", extra={
            "admin_id": admin_id,
            "notification_id": notification_id
        })
        
        success = await service.delete_admin_notification(notification_id)
        
        if not success:
            return error_response("通知が見つかりません", status_code=404)
        
        return success_response({"message": "管理者通知を削除しました"})
        
    except Exception as e:
        logger.error("Failed to delete admin notification", extra={
            "admin_id": admin_id,
            "notification_id": notification_id,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("管理者通知削除に失敗しました", status_code=500)


@router.get("/notifications/stats")
async def get_admin_notification_stats(
    admin_id: str = Depends(verify_admin_api_key)
):
    """
    管理者通知統計取得
    
    Args:
        admin_id: 認証済み管理者ID
        
    Returns:
        Dict: 統計情報
    """
    try:
        settings = get_settings()
        service = AdminNotificationService(settings)
        
        logger.info("Getting admin notification stats", extra={
            "admin_id": admin_id
        })
        
        stats = await service.get_admin_notification_stats()
        
        return success_response(stats)
        
    except Exception as e:
        logger.error("Failed to get admin notification stats", extra={
            "admin_id": admin_id,
            "error": str(e),
            "error_type": type(e).__name__
        })
        return error_response("管理者通知統計取得に失敗しました", status_code=500)
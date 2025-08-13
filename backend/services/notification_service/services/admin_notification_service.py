"""
管理者通知サービス

管理者による全ユーザー向け通知の管理。
- 管理者通知作成・配信
- 対象ユーザー取得
- 配信実行
- 統計情報
"""

from typing import List, Optional, Dict, Any
from datetime import datetime

from homebiyori_common import get_logger
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string

from ..models.notification_models import (
    AdminNotification, NotificationType, NotificationPriority, 
    NotificationScope, UserNotification, NotificationStatus
)
from ..core.config import NotificationSettings
from ..database import NotificationServiceDatabase
from .notification_service import NotificationService

logger = get_logger(__name__)


class AdminNotificationService:
    """管理者通知サービス"""
    
    def __init__(self, settings: NotificationSettings):
        self.settings = settings
        # Database layer initialization
        self.db = NotificationServiceDatabase()
        self.notification_service = NotificationService(settings)
    
    async def create_admin_notification(
        self,
        admin_id: str,
        notification_type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        scope: NotificationScope = NotificationScope.ALL_USERS,
        target_plan: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        expires_at: Optional[datetime] = None,
        scheduled_at: Optional[datetime] = None
    ) -> AdminNotification:
        """
        管理者通知作成
        
        Args:
            admin_id: 管理者ID
            notification_type: 通知タイプ
            title: 通知タイトル
            message: 通知メッセージ
            priority: 優先度
            scope: 配信範囲
            target_plan: 対象プラン
            metadata: 追加情報
            expires_at: 有効期限
            scheduled_at: 配信予定日時
            
        Returns:
            AdminNotification: 作成された管理者通知
        """
        try:
            admin_notification = AdminNotification(
                type=notification_type,
                title=title,
                message=message,
                priority=priority,
                scope=scope,
                target_plan=target_plan,
                admin_id=admin_id,
                metadata=metadata or {},
                expires_at=expires_at,
                scheduled_at=scheduled_at
            )
            
            # DynamoDB書き込み用データ変換
            item_data = {
                "PK": f"ADMIN_NOTIFICATION#{admin_notification.notification_id}",
                "SK": "METADATA",
                "GSI1PK": "ADMIN_NOTIFICATIONS",
                "GSI1SK": f"CREATED#{admin_notification.created_at.isoformat()}",
                "notification_id": admin_notification.notification_id,
                "type": admin_notification.type,
                "title": admin_notification.title,
                "message": admin_notification.message,
                "priority": admin_notification.priority,
                "scope": admin_notification.scope,
                "target_plan": admin_notification.target_plan,
                "admin_id": admin_notification.admin_id,
                "metadata": admin_notification.metadata,
                "created_at": to_jst_string(admin_notification.created_at),
                "expires_at": to_jst_string(admin_notification.expires_at) if admin_notification.expires_at else None,
                "scheduled_at": to_jst_string(admin_notification.scheduled_at) if admin_notification.scheduled_at else None,
                "sent_at": None,
                "recipient_count": 0
            }
            
            # TTL設定（expires_atがある場合）
            if admin_notification.expires_at:
                item_data["ttl"] = int(admin_notification.expires_at.timestamp())
            
            await self.db.create_admin_notification(item_data)
            
            logger.info("Admin notification created", extra={
                "admin_id": admin_id,
                "notification_id": admin_notification.notification_id,
                "type": notification_type,
                "scope": scope,
                "target_plan": target_plan,
                "scheduled_at": scheduled_at.isoformat() if scheduled_at else None
            })
            
            return admin_notification
            
        except Exception as e:
            logger.error("Failed to create admin notification", extra={
                "admin_id": admin_id,
                "type": notification_type,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def get_admin_notifications(
        self,
        page: int = 1,
        page_size: int = 20,
        sent_only: bool = False,
        scheduled_only: bool = False
    ) -> List[AdminNotification]:
        """
        管理者通知一覧取得
        
        Args:
            page: ページ番号
            page_size: ページサイズ
            sent_only: 配信済みのみフラグ
            scheduled_only: 配信予定のみフラグ
            
        Returns:
            List[AdminNotification]: 管理者通知一覧
        """
        try:
            # GSIで管理者通知を取得
            result = await self.db.get_admin_notifications(page_size * 2)
            items = result.get('items', [])
            
            # フィルタリング
            filtered_items = []
            current_time = get_current_jst()
            
            for item in items:
                # 期限切れチェック
                if item.get("expires_at"):
                    expires_at = datetime.fromisoformat(item["expires_at"])
                    if current_time > expires_at:
                        continue
                
                # 配信状態フィルター
                has_sent_at = bool(item.get("sent_at"))
                has_scheduled_at = bool(item.get("scheduled_at"))
                
                if sent_only and not has_sent_at:
                    continue
                
                if scheduled_only and (has_sent_at or not has_scheduled_at):
                    continue
                
                filtered_items.append(item)
            
            # ページネーション
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            page_items = filtered_items[start_idx:end_idx]
            
            # 管理者通知オブジェクト変換
            notifications = []
            for item in page_items:
                notification = AdminNotification(
                    notification_id=item["notification_id"],
                    type=item["type"],
                    title=item["title"],
                    message=item["message"],
                    priority=item["priority"],
                    scope=item["scope"],
                    target_plan=item.get("target_plan"),
                    admin_id=item["admin_id"],
                    metadata=item.get("metadata", {}),
                    created_at=datetime.fromisoformat(item["created_at"]),
                    expires_at=datetime.fromisoformat(item["expires_at"]) if item.get("expires_at") else None,
                    scheduled_at=datetime.fromisoformat(item["scheduled_at"]) if item.get("scheduled_at") else None,
                    sent_at=datetime.fromisoformat(item["sent_at"]) if item.get("sent_at") else None,
                    recipient_count=item.get("recipient_count", 0)
                )
                notifications.append(notification)
            
            return notifications
            
        except Exception as e:
            logger.error("Failed to get admin notifications", extra={
                "page": page,
                "page_size": page_size,
                "sent_only": sent_only,
                "scheduled_only": scheduled_only,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def send_admin_notification(self, notification_id: str) -> Optional[Dict[str, Any]]:
        """
        管理者通知配信実行
        
        Args:
            notification_id: 通知ID
            
        Returns:
            Optional[Dict[str, Any]]: 配信結果
        """
        try:
            # 管理者通知取得
            admin_notification_item = await self.db.get_admin_notification(notification_id)
            
            if not admin_notification_item:
                return None
            
            # 既に配信済みの場合はスキップ
            if admin_notification_item.get("sent_at"):
                logger.warning("Admin notification already sent", extra={
                    "notification_id": notification_id
                })
                return {
                    "recipient_count": admin_notification_item.get("recipient_count", 0),
                    "sent_at": admin_notification_item["sent_at"]
                }
            
            # 対象ユーザー取得
            target_users = await self._get_target_users(
                scope=admin_notification_item["scope"],
                target_plan=admin_notification_item.get("target_plan")
            )
            
            if not target_users:
                logger.warning("No target users found for admin notification", extra={
                    "notification_id": notification_id,
                    "scope": admin_notification_item["scope"],
                    "target_plan": admin_notification_item.get("target_plan")
                })
                return {"recipient_count": 0, "sent_at": to_jst_string(get_current_jst())}
            
            # 各ユーザーに通知作成
            successful_count = 0
            current_time = get_current_jst()
            
            for user_id in target_users:
                try:
                    await self.notification_service.create_notification(
                        user_id=user_id,
                        notification_type=admin_notification_item["type"],
                        title=admin_notification_item["title"],
                        message=admin_notification_item["message"],
                        priority=admin_notification_item["priority"],
                        metadata={
                            **admin_notification_item.get("metadata", {}),
                            "admin_notification_id": notification_id,
                            "admin_id": admin_notification_item["admin_id"]
                        },
                        expires_at=datetime.fromisoformat(admin_notification_item["expires_at"]) if admin_notification_item.get("expires_at") else None
                    )
                    successful_count += 1
                    
                except Exception as user_error:
                    logger.error("Failed to create notification for user", extra={
                        "user_id": user_id,
                        "notification_id": notification_id,
                        "error": str(user_error)
                    })
            
            # 管理者通知を配信済みにマーク
            sent_at_str = to_jst_string(current_time)
            await self.db.update_admin_notification(
                notification_id,
                "SET sent_at = :sent_at, recipient_count = :count",
                {
                    ":sent_at": sent_at_str,
                    ":count": successful_count
                }
            )
            
            logger.info("Admin notification sent", extra={
                "notification_id": notification_id,
                "recipient_count": successful_count,
                "total_target_users": len(target_users)
            })
            
            return {
                "recipient_count": successful_count,
                "sent_at": sent_at_str
            }
            
        except Exception as e:
            logger.error("Failed to send admin notification", extra={
                "notification_id": notification_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def delete_admin_notification(self, notification_id: str) -> bool:
        """
        管理者通知削除
        
        Args:
            notification_id: 通知ID
            
        Returns:
            bool: 削除成功フラグ
        """
        try:
            # 配信済みの場合は削除不可
            admin_notification_item = await self.db.get_admin_notification(notification_id)
            
            if not admin_notification_item:
                return False
            
            if admin_notification_item.get("sent_at"):
                logger.warning("Cannot delete sent admin notification", extra={
                    "notification_id": notification_id
                })
                return False
            
            success = await self.db.delete_admin_notification(notification_id)
            
            if success:
                logger.info("Admin notification deleted", extra={
                    "notification_id": notification_id
                })
            
            return success
            
        except Exception as e:
            logger.error("Failed to delete admin notification", extra={
                "notification_id": notification_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def get_admin_notification_stats(self) -> Dict[str, Any]:
        """
        管理者通知統計取得
        
        Returns:
            Dict[str, Any]: 統計情報
        """
        try:
            # 全管理者通知取得
            result = await self.db.get_admin_notifications()
            items = result.get('items', [])
            
            # 統計計算
            total_notifications = len(items)
            sent_count = len([item for item in items if item.get("sent_at")])
            scheduled_count = len([item for item in items if item.get("scheduled_at") and not item.get("sent_at")])
            draft_count = total_notifications - sent_count - scheduled_count
            
            # タイプ別集計
            type_breakdown = {}
            for notification_type in NotificationType:
                type_breakdown[notification_type] = len([item for item in items if item.get("type") == notification_type])
            
            # スコープ別集計
            scope_breakdown = {}
            for scope in NotificationScope:
                scope_breakdown[scope] = len([item for item in items if item.get("scope") == scope])
            
            # 配信実績
            total_recipients = sum(item.get("recipient_count", 0) for item in items if item.get("sent_at"))
            
            return {
                "total_notifications": total_notifications,
                "sent_count": sent_count,
                "scheduled_count": scheduled_count,
                "draft_count": draft_count,
                "total_recipients": total_recipients,
                "type_breakdown": type_breakdown,
                "scope_breakdown": scope_breakdown
            }
            
        except Exception as e:
            logger.error("Failed to get admin notification stats", extra={
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def _get_target_users(
        self, 
        scope: NotificationScope, 
        target_plan: Optional[str] = None
    ) -> List[str]:
        """
        対象ユーザー取得
        
        Args:
            scope: 配信範囲
            target_plan: 対象プラン
            
        Returns:
            List[str]: ユーザーIDリスト
        """
        try:
            if scope == NotificationScope.ALL_USERS:
                # 全ユーザー取得（coreテーブルのPROFILE）
                items = await self.db.get_all_user_profiles()
                return [item["user_id"] for item in items if item.get("user_id")]
            
            elif scope == NotificationScope.PLAN_USERS and target_plan:
                # 特定プランユーザー取得（coreテーブルのSUBSCRIPTION）
                items = await self.db.get_users_by_plan(target_plan)
                return [item["user_id"] for item in items if item.get("user_id")]
            
            else:
                logger.warning("Invalid target scope configuration", extra={
                    "scope": scope,
                    "target_plan": target_plan
                })
                return []
            
        except Exception as e:
            logger.error("Failed to get target users", extra={
                "scope": scope,
                "target_plan": target_plan,
                "error": str(e),
                "error_type": type(e).__name__
            })
            return []
"""
通知サービス

ユーザー通知のCRUD操作とビジネスロジック。
- 通知作成・取得・更新・削除
- 一括操作
- 統計情報計算
- TTL管理
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone

from homebiyori_common import get_logger
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string

from ..models.notification_models import (
    UserNotification, NotificationCreateRequest, 
    NotificationListResponse, NotificationStatsResponse,
    NotificationStatus, NotificationPriority, NotificationType
)
from ..core.config import NotificationSettings
from ..database import NotificationServiceDatabase

logger = get_logger(__name__)


class NotificationService:
    """通知サービス"""
    
    def __init__(self, settings: NotificationSettings):
        self.settings = settings
        # Database layer initialization
        self.db = NotificationServiceDatabase()
    
    async def create_notification(
        self,
        user_id: str,
        notification_type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        metadata: Optional[Dict[str, Any]] = None,
        expires_at: Optional[datetime] = None
    ) -> UserNotification:
        """
        通知作成
        
        Args:
            user_id: ユーザーID
            notification_type: 通知タイプ
            title: 通知タイトル
            message: 通知メッセージ
            priority: 優先度
            metadata: 追加情報
            expires_at: 有効期限
            
        Returns:
            UserNotification: 作成された通知
        """
        try:
            notification = UserNotification(
                user_id=user_id,
                type=notification_type,
                title=title,
                message=message,
                priority=priority,
                metadata=metadata or {},
                expires_at=expires_at
            )
            
            # DynamoDB書き込み用データ変換
            item_data = {
                "PK": f"USER#{user_id}",
                "SK": f"NOTIFICATION#{notification.notification_id}",
                "GSI1PK": f"USER#{user_id}",
                "GSI1SK": f"STATUS#{notification.status}#{notification.created_at.isoformat()}",
                "notification_id": notification.notification_id,
                "user_id": user_id,
                "type": notification.type,
                "title": notification.title,
                "message": notification.message,
                "priority": notification.priority,
                "status": notification.status,
                "metadata": notification.metadata,
                "created_at": to_jst_string(notification.created_at),
                "expires_at": to_jst_string(notification.expires_at) if notification.expires_at else None,
                "read_at": None,
                "archived_at": None
            }
            
            # TTL設定（expires_atがある場合）
            if notification.expires_at:
                item_data["ttl"] = int(notification.expires_at.timestamp())
            
            await self.db.create_user_notification(item_data)
            
            logger.info("Notification created", extra={
                "user_id": user_id,
                "notification_id": notification.notification_id,
                "type": notification_type,
                "priority": priority
            })
            
            return notification
            
        except Exception as e:
            logger.error("Failed to create notification", extra={
                "user_id": user_id,
                "type": notification_type,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def get_user_notifications(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        status: Optional[NotificationStatus] = None,
        priority: Optional[NotificationPriority] = None,
        unread_only: bool = False
    ) -> NotificationListResponse:
        """
        ユーザー通知一覧取得
        
        Args:
            user_id: ユーザーID
            page: ページ番号
            page_size: ページサイズ
            status: 状態フィルター
            priority: 優先度フィルター
            unread_only: 未読のみフラグ
            
        Returns:
            NotificationListResponse: 通知一覧と統計情報
        """
        try:
            # クエリ条件構築
            if unread_only or status == NotificationStatus.UNREAD:
                # 未読通知のみ取得（GSI使用）
                result = await self.db.get_user_notifications_by_status(
                    user_id, 
                    NotificationStatus.UNREAD, 
                    page_size * 2
                )
                items = result.get('items', [])
            else:
                # 全通知取得
                result = await self.db.get_user_notifications_all(
                    user_id, 
                    page_size * 2
                )
                items = result.get('items', [])
            
            # フィルタリング
            filtered_items = []
            for item in items:
                # 期限切れチェック
                if item.get("expires_at"):
                    expires_at = datetime.fromisoformat(item["expires_at"])
                    # タイムゾーンが設定されていない場合はJSTとして解釈
                    if expires_at.tzinfo is None:
                        expires_at = expires_at.replace(tzinfo=timezone(timedelta(hours=9)))
                    if get_current_jst() > expires_at:
                        continue
                
                # 状態フィルター
                if status and item.get("status") != status:
                    continue
                
                # 優先度フィルター
                if priority and item.get("priority") != priority:
                    continue
                
                filtered_items.append(item)
            
            # ページネーション
            total_count = len(filtered_items)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            page_items = filtered_items[start_idx:end_idx]
            
            # 通知オブジェクト変換
            notifications = []
            for item in page_items:
                notification = UserNotification(
                    notification_id=item["notification_id"],
                    user_id=item["user_id"],
                    type=item["type"],
                    title=item["title"],
                    message=item["message"],
                    priority=item["priority"],
                    status=item["status"],
                    metadata=item.get("metadata", {}),
                    created_at=datetime.fromisoformat(item["created_at"]),
                    expires_at=datetime.fromisoformat(item["expires_at"]) if item.get("expires_at") else None,
                    read_at=datetime.fromisoformat(item["read_at"]) if item.get("read_at") else None,
                    archived_at=datetime.fromisoformat(item["archived_at"]) if item.get("archived_at") else None
                )
                notifications.append(notification)
            
            # 未読件数計算
            unread_count = len([item for item in filtered_items if item.get("status") == NotificationStatus.UNREAD])
            
            return NotificationListResponse(
                notifications=notifications,
                total_count=total_count,
                unread_count=unread_count,
                page=page,
                page_size=page_size,
                has_next=end_idx < total_count
            )
            
        except Exception as e:
            logger.error("Failed to get user notifications", extra={
                "user_id": user_id,
                "page": page,
                "page_size": page_size,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def get_notification(self, user_id: str, notification_id: str) -> Optional[UserNotification]:
        """
        通知詳細取得
        
        Args:
            user_id: ユーザーID
            notification_id: 通知ID
            
        Returns:
            Optional[UserNotification]: 通知詳細
        """
        try:
            item = await self.db.get_user_notification(user_id, notification_id)
            
            if not item:
                return None
            
            # 期限切れチェック
            if item.get("expires_at"):
                expires_at = datetime.fromisoformat(item["expires_at"])
                # タイムゾーンが設定されていない場合はJSTとして解釈
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone(timedelta(hours=9)))
                if get_current_jst() > expires_at:
                    return None
            
            return UserNotification(
                notification_id=item["notification_id"],
                user_id=item["user_id"],
                type=item["type"],
                title=item["title"],
                message=item["message"],
                priority=item["priority"],
                status=item["status"],
                metadata=item.get("metadata", {}),
                created_at=datetime.fromisoformat(item["created_at"]),
                expires_at=datetime.fromisoformat(item["expires_at"]) if item.get("expires_at") else None,
                read_at=datetime.fromisoformat(item["read_at"]) if item.get("read_at") else None,
                archived_at=datetime.fromisoformat(item["archived_at"]) if item.get("archived_at") else None
            )
            
        except Exception as e:
            logger.error("Failed to get notification", extra={
                "user_id": user_id,
                "notification_id": notification_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def mark_as_read(self, user_id: str, notification_id: str) -> bool:
        """
        通知既読処理
        
        Args:
            user_id: ユーザーID
            notification_id: 通知ID
            
        Returns:
            bool: 処理成功フラグ
        """
        try:
            current_time = get_current_jst()
            
            # 現在の通知データ取得
            notification = await self.get_notification(user_id, notification_id)
            if not notification:
                return False
            
            # 既に既読の場合はスキップ
            if notification.status != NotificationStatus.UNREAD:
                return True
            
            # 更新データ
            update_data = {
                "status": NotificationStatus.READ,
                "read_at": to_jst_string(current_time),
                "GSI1SK": f"STATUS#{NotificationStatus.READ}#{notification.created_at.isoformat()}"
            }
            
            success = await self.db.update_user_notification(
                user_id,
                notification_id,
                "SET #status = :status, read_at = :read_at, GSI1SK = :gsi1sk",
                {"#status": "status"},
                {
                    ":status": update_data["status"],
                    ":read_at": update_data["read_at"], 
                    ":gsi1sk": update_data["GSI1SK"]
                }
            )
            
            if success:
                logger.info("Notification marked as read", extra={
                    "user_id": user_id,
                    "notification_id": notification_id
                })
            
            return success
            
        except Exception as e:
            logger.error("Failed to mark notification as read", extra={
                "user_id": user_id,
                "notification_id": notification_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def archive_notification(self, user_id: str, notification_id: str) -> bool:
        """
        通知アーカイブ処理
        
        Args:
            user_id: ユーザーID
            notification_id: 通知ID
            
        Returns:
            bool: 処理成功フラグ
        """
        try:
            current_time = get_current_jst()
            
            # 現在の通知データ取得
            notification = await self.get_notification(user_id, notification_id)
            if not notification:
                return False
            
            # 更新データ
            update_data = {
                "status": NotificationStatus.ARCHIVED,
                "archived_at": to_jst_string(current_time),
                "GSI1SK": f"STATUS#{NotificationStatus.ARCHIVED}#{notification.created_at.isoformat()}"
            }
            
            # 既読でない場合は既読時刻も設定
            if notification.status == NotificationStatus.UNREAD:
                update_data["read_at"] = to_jst_string(current_time)
            
            success = await self.db.update_user_notification(
                user_id,
                notification_id,
                "SET #status = :status, read_at = :read_at, GSI1SK = :gsi1sk",
                {"#status": "status"},
                {
                    ":status": update_data["status"],
                    ":read_at": update_data["read_at"], 
                    ":gsi1sk": update_data["GSI1SK"]
                }
            )
            
            if success:
                logger.info("Notification archived", extra={
                    "user_id": user_id,
                    "notification_id": notification_id
                })
            
            return success
            
        except Exception as e:
            logger.error("Failed to archive notification", extra={
                "user_id": user_id,
                "notification_id": notification_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def mark_all_as_read(self, user_id: str) -> int:
        """
        全通知既読処理
        
        Args:
            user_id: ユーザーID
            
        Returns:
            int: 更新件数
        """
        try:
            # 未読通知取得
            result = await self.db.get_user_notifications_by_status(
                user_id, 
                NotificationStatus.UNREAD
            )
            items = result.get('items', [])
            
            current_time = get_current_jst()
            update_count = 0
            
            # 一括更新
            for item in items:
                notification_id = item["notification_id"]
                created_at = item["created_at"]
                
                update_data = {
                    "status": NotificationStatus.READ,
                    "read_at": to_jst_string(current_time),
                    "GSI1SK": f"STATUS#{NotificationStatus.READ}#{created_at}"
                }
                
                success = await self.db.update_user_notification(
                    user_id,
                    notification_id,
                    "SET #status = :status, read_at = :read_at, GSI1SK = :gsi1sk",
                    {"#status": "status"},
                    {
                        ":status": update_data["status"],
                        ":read_at": update_data["read_at"],
                        ":gsi1sk": update_data["GSI1SK"]
                    }
                )
                
                if success:
                    update_count += 1
            
            logger.info("All notifications marked as read", extra={
                "user_id": user_id,
                "update_count": update_count
            })
            
            return update_count
            
        except Exception as e:
            logger.error("Failed to mark all notifications as read", extra={
                "user_id": user_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def delete_notification(self, user_id: str, notification_id: str) -> bool:
        """
        通知削除
        
        Args:
            user_id: ユーザーID
            notification_id: 通知ID
            
        Returns:
            bool: 削除成功フラグ
        """
        try:
            success = await self.db.delete_user_notification(user_id, notification_id)
            
            if success:
                logger.info("Notification deleted", extra={
                    "user_id": user_id,
                    "notification_id": notification_id
                })
            
            return success
            
        except Exception as e:
            logger.error("Failed to delete notification", extra={
                "user_id": user_id,
                "notification_id": notification_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def create_bulk_notifications(
        self, 
        notifications: List[NotificationCreateRequest]
    ) -> List[Dict[str, Any]]:
        """
        一括通知作成
        
        Args:
            notifications: 通知作成リクエストリスト
            
        Returns:
            List[Dict[str, Any]]: 作成結果リスト
        """
        try:
            results = []
            
            for request in notifications:
                try:
                    notification = await self.create_notification(
                        user_id=request.user_id,
                        notification_type=request.type,
                        title=request.title,
                        message=request.message,
                        priority=request.priority,
                        metadata=request.metadata,
                        expires_at=request.expires_at
                    )
                    
                    results.append({
                        "success": True,
                        "notification_id": notification.notification_id,
                        "user_id": request.user_id
                    })
                    
                except Exception as e:
                    results.append({
                        "success": False,
                        "error": str(e),
                        "user_id": request.user_id
                    })
            
            return results
            
        except Exception as e:
            logger.error("Failed to create bulk notifications", extra={
                "notification_count": len(notifications),
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def get_user_notification_stats(self, user_id: str) -> NotificationStatsResponse:
        """
        ユーザー通知統計取得
        
        Args:
            user_id: ユーザーID
            
        Returns:
            NotificationStatsResponse: 統計情報
        """
        try:
            # 全通知取得
            result = await self.db.get_user_notifications_all(user_id)
            items = result.get('items', [])
            
            # 期限切れ除外
            valid_items = []
            current_time = get_current_jst()
            
            for item in items:
                if item.get("expires_at"):
                    expires_at = datetime.fromisoformat(item["expires_at"])
                    # タイムゾーンが設定されていない場合はJSTとして解釈
                    if expires_at.tzinfo is None:
                        expires_at = expires_at.replace(tzinfo=timezone(timedelta(hours=9)))
                    if current_time > expires_at:
                        continue
                valid_items.append(item)
            
            # 統計計算
            total_notifications = len(valid_items)
            unread_count = len([item for item in valid_items if item.get("status") == NotificationStatus.UNREAD])
            read_count = len([item for item in valid_items if item.get("status") == NotificationStatus.READ])
            archived_count = len([item for item in valid_items if item.get("status") == NotificationStatus.ARCHIVED])
            
            # 優先度別集計
            priority_breakdown = {}
            for priority in NotificationPriority:
                priority_breakdown[priority] = len([item for item in valid_items if item.get("priority") == priority])
            
            # タイプ別集計
            type_breakdown = {}
            for notification_type in NotificationType:
                type_breakdown[notification_type] = len([item for item in valid_items if item.get("type") == notification_type])
            
            return NotificationStatsResponse(
                total_notifications=total_notifications,
                unread_count=unread_count,
                read_count=read_count,
                archived_count=archived_count,
                priority_breakdown=priority_breakdown,
                type_breakdown=type_breakdown
            )
            
        except Exception as e:
            logger.error("Failed to get user notification stats", extra={
                "user_id": user_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def health_check(self) -> Optional[Dict[str, Any]]:
        """
        ヘルスチェック
        
        Returns:
            Optional[Dict[str, Any]]: ヘルス状態
        """
        try:
            # Database layer health check
            return await self.db.health_check()
            
        except Exception as e:
            logger.error("Health check failed", extra={
                "error": str(e),
                "error_type": type(e).__name__
            })
            return None
"""
通知関連データモデル

Notification Service で使用する通知データのPydanticモデル定義。
- 通知情報
- ユーザー向け通知
- 管理者向けメンテナンス通知
- 内部API連携
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, field_validator
from enum import Enum
import uuid

from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string


class NotificationType(str, Enum):
    """通知タイプ"""
    # システム通知
    SYSTEM_MAINTENANCE = "system_maintenance"
    SYSTEM_UPDATE = "system_update"
    SYSTEM_ANNOUNCEMENT = "system_announcement"
    
    # 課金関連通知
    SUBSCRIPTION_WELCOME = "subscription_welcome"
    SUBSCRIPTION_CANCELED = "subscription_canceled"
    SUBSCRIPTION_WILL_CANCEL = "subscription_will_cancel"
    PLAN_CHANGED = "plan_changed"
    PAYMENT_SUCCEEDED = "payment_succeeded"
    PAYMENT_FAILED = "payment_failed"
    TRIAL_WILL_END = "trial_will_end"
    
    # 機能通知
    FEATURE_ANNOUNCEMENT = "feature_announcement"
    USAGE_LIMIT_WARNING = "usage_limit_warning"
    
    # その他
    GENERAL = "general"


class NotificationPriority(str, Enum):
    """通知優先度"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationScope(str, Enum):
    """通知配信範囲"""
    USER = "user"        # 特定ユーザー
    ALL_USERS = "all"    # 全ユーザー
    PLAN_USERS = "plan"  # 特定プラン契約者


class NotificationStatus(str, Enum):
    """通知状態"""
    UNREAD = "unread"
    READ = "read"
    ARCHIVED = "archived"


class BaseNotification(BaseModel):
    """通知ベースモデル"""
    notification_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="通知ID")
    type: NotificationType = Field(..., description="通知タイプ")
    title: str = Field(..., min_length=1, max_length=100, description="通知タイトル")
    message: str = Field(..., min_length=1, max_length=500, description="通知メッセージ")
    priority: NotificationPriority = Field(default=NotificationPriority.NORMAL, description="優先度")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="追加情報")
    created_at: datetime = Field(default_factory=get_current_jst, description="作成日時（JST）")
    expires_at: Optional[datetime] = Field(None, description="有効期限（JST）")
    
    @field_validator('expires_at', mode='before')
    @classmethod
    def set_default_expiry(cls, v):
        """デフォルト有効期限設定（30日後）"""
        if v is None:
            created_at = get_current_jst()
            return created_at + timedelta(days=30)
        return v
    
    class Config:
        json_encoders = {
            datetime: lambda v: to_jst_string(v)
        }


class UserNotification(BaseNotification):
    """ユーザー通知モデル"""
    user_id: str = Field(..., description="ユーザーID")
    status: NotificationStatus = Field(default=NotificationStatus.UNREAD, description="通知状態")
    read_at: Optional[datetime] = Field(None, description="既読日時（JST）")
    archived_at: Optional[datetime] = Field(None, description="アーカイブ日時（JST）")
    
    def mark_as_read(self) -> None:
        """既読にマーク"""
        if self.status == NotificationStatus.UNREAD:
            self.status = NotificationStatus.READ
            self.read_at = get_current_jst()
    
    def archive(self) -> None:
        """アーカイブにマーク"""
        self.status = NotificationStatus.ARCHIVED
        self.archived_at = get_current_jst()
    
    @property
    def is_unread(self) -> bool:
        """未読判定"""
        return self.status == NotificationStatus.UNREAD
    
    @property
    def is_expired(self) -> bool:
        """期限切れ判定"""
        if self.expires_at is None:
            return False
        return get_current_jst() > self.expires_at


class AdminNotification(BaseNotification):
    """管理者通知モデル（全ユーザー配信）"""
    scope: NotificationScope = Field(default=NotificationScope.ALL_USERS, description="配信範囲")
    target_plan: Optional[str] = Field(None, description="対象プラン（scope=plan時）")
    admin_id: str = Field(..., description="作成管理者ID")
    scheduled_at: Optional[datetime] = Field(None, description="配信予定日時（JST）")
    sent_at: Optional[datetime] = Field(None, description="配信実行日時（JST）")
    recipient_count: int = Field(default=0, description="配信対象者数")
    
    @property
    def is_scheduled(self) -> bool:
        """配信予定判定"""
        return self.scheduled_at is not None and self.sent_at is None
    
    @property
    def is_sent(self) -> bool:
        """配信済み判定"""
        return self.sent_at is not None
    
    def mark_as_sent(self, recipient_count: int = 0) -> None:
        """配信済みにマーク"""
        self.sent_at = get_current_jst()
        self.recipient_count = recipient_count


class NotificationCreateRequest(BaseModel):
    """通知作成リクエスト"""
    user_id: Optional[str] = Field(None, description="ユーザーID（内部API用）")
    type: NotificationType = Field(..., description="通知タイプ")
    title: str = Field(..., min_length=1, max_length=100, description="通知タイトル")
    message: str = Field(..., min_length=1, max_length=500, description="通知メッセージ")
    priority: NotificationPriority = Field(default=NotificationPriority.NORMAL, description="優先度")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="追加情報")
    expires_at: Optional[datetime] = Field(None, description="有効期限（JST）")


class AdminNotificationCreateRequest(BaseModel):
    """管理者通知作成リクエスト"""
    type: NotificationType = Field(..., description="通知タイプ")
    title: str = Field(..., min_length=1, max_length=100, description="通知タイトル")
    message: str = Field(..., min_length=1, max_length=500, description="通知メッセージ")
    priority: NotificationPriority = Field(default=NotificationPriority.NORMAL, description="優先度")
    scope: NotificationScope = Field(default=NotificationScope.ALL_USERS, description="配信範囲")
    target_plan: Optional[str] = Field(None, description="対象プラン（scope=plan時）")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="追加情報")
    expires_at: Optional[datetime] = Field(None, description="有効期限（JST）")
    scheduled_at: Optional[datetime] = Field(None, description="配信予定日時（JST）")
    
    @field_validator('target_plan')
    @classmethod
    def validate_target_plan(cls, v, info):
        """target_plan の検証"""
        scope = info.data.get('scope')
        if scope == NotificationScope.PLAN_USERS and not v:
            raise ValueError("scope=plan の場合、target_plan は必須です")
        if scope != NotificationScope.PLAN_USERS and v:
            raise ValueError("scope=plan 以外の場合、target_plan は不要です")
        return v


class NotificationListResponse(BaseModel):
    """通知一覧レスポンス"""
    notifications: List[UserNotification] = Field(..., description="通知リスト")
    total_count: int = Field(..., description="総件数")
    unread_count: int = Field(..., description="未読件数")
    page: int = Field(..., description="現在ページ")
    page_size: int = Field(..., description="ページサイズ")
    has_next: bool = Field(..., description="次ページ有無")


class NotificationStatsResponse(BaseModel):
    """通知統計レスポンス"""
    total_notifications: int = Field(..., description="総通知数")
    unread_count: int = Field(..., description="未読数")
    read_count: int = Field(..., description="既読数")
    archived_count: int = Field(..., description="アーカイブ数")
    priority_breakdown: Dict[str, int] = Field(..., description="優先度別件数")
    type_breakdown: Dict[str, int] = Field(..., description="タイプ別件数")


class BulkNotificationRequest(BaseModel):
    """一括通知作成リクエスト"""
    notifications: List[NotificationCreateRequest] = Field(..., min_items=1, max_items=100, description="通知リスト")
    
    @field_validator('notifications')
    def validate_notifications(cls, v):
        """通知リストの検証"""
        if len(v) > 100:
            raise ValueError("一括作成は最大100件までです")
        return v


class MaintenanceNotificationTemplate(BaseModel):
    """メンテナンス通知テンプレート"""
    maintenance_type: str = Field(..., description="メンテナンス種別")
    start_time: datetime = Field(..., description="メンテナンス開始時刻（JST）")
    end_time: datetime = Field(..., description="メンテナンス終了時刻（JST）")
    affected_services: List[str] = Field(default_factory=list, description="影響するサービス")
    notice_period_hours: int = Field(default=24, description="事前通知時間")
    
    def generate_notification(self, admin_id: str) -> AdminNotificationCreateRequest:
        """メンテナンス通知を生成"""
        duration = self.end_time - self.start_time
        duration_str = f"{int(duration.total_seconds() // 3600)}時間{int((duration.total_seconds() % 3600) // 60)}分"
        
        affected_str = "、".join(self.affected_services) if self.affected_services else "全サービス"
        
        title = f"【メンテナンスのお知らせ】{self.maintenance_type}"
        message = (
            f"{to_jst_string(self.start_time)} から {to_jst_string(self.end_time)} まで（約{duration_str}）、"
            f"{affected_str}のメンテナンスを実施いたします。メンテナンス中はサービスをご利用いただけません。"
            "ご不便をおかけして申し訳ございません。"
        )
        
        # 事前通知日時を計算
        notification_time = self.start_time - timedelta(hours=self.notice_period_hours)
        
        return AdminNotificationCreateRequest(
            type=NotificationType.SYSTEM_MAINTENANCE,
            title=title,
            message=message,
            priority=NotificationPriority.HIGH,
            scope=NotificationScope.ALL_USERS,
            metadata={
                "maintenance_type": self.maintenance_type,
                "start_time": to_jst_string(self.start_time),
                "end_time": to_jst_string(self.end_time),
                "affected_services": self.affected_services
            },
            scheduled_at=notification_time if notification_time.replace(tzinfo=timezone(timedelta(hours=9))) > get_current_jst() else None
        )
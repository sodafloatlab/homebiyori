"""
Stripe関連データモデル

Webhook処理で使用するStripeオブジェクトのPydanticモデル定義。
- サブスクリプション
- 顧客情報
- 請求書
- イベント
"""

from datetime import datetime
from typing import Dict, Any, Optional, List, Union
from pydantic import BaseModel, Field, validator
from enum import Enum

from homebiyori_common.utils.datetime_utils import get_current_jst
from homebiyori_common.models import SubscriptionStatus, SubscriptionPlan

# PlanType削除: SubscriptionPlanに統一（Issue #15 統一対応）
# webhook_service固有のレガシー定義を削除


class WebhookEventType(str, Enum):
    """処理対象Webhookイベントタイプ"""
    SUBSCRIPTION_CREATED = "customer.subscription.created"
    SUBSCRIPTION_UPDATED = "customer.subscription.updated"
    SUBSCRIPTION_DELETED = "customer.subscription.deleted"
    PAYMENT_SUCCEEDED = "invoice.payment_succeeded"
    PAYMENT_FAILED = "invoice.payment_failed"
    TRIAL_WILL_END = "customer.subscription.trial_will_end"


class StripeCustomer(BaseModel):
    """Stripe 顧客情報"""
    id: str = Field(..., description="Stripe Customer ID")
    email: Optional[str] = Field(None, description="顧客メールアドレス")
    created: int = Field(..., description="作成日時（Unix timestamp）")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="メタデータ")
    
    @property
    def homebiyori_user_id(self) -> Optional[str]:
        """HomebiyoriユーザーIDを取得"""
        return self.metadata.get("homebiyori_user_id")


class StripeSubscription(BaseModel):
    """Stripe サブスクリプション情報"""
    id: str = Field(..., description="Stripe Subscription ID")
    customer: str = Field(..., description="Stripe Customer ID")
    status: SubscriptionStatus = Field(..., description="サブスクリプション状態")
    current_period_start: int = Field(..., description="現在期間開始（Unix timestamp）")
    current_period_end: int = Field(..., description="現在期間終了（Unix timestamp）")
    cancel_at: Optional[int] = Field(None, description="解約予定日時（Unix timestamp）")
    canceled_at: Optional[int] = Field(None, description="解約日時（Unix timestamp）")
    trial_start: Optional[int] = Field(None, description="トライアル開始（Unix timestamp）")
    trial_end: Optional[int] = Field(None, description="トライアル終了（Unix timestamp）")
    created: int = Field(..., description="作成日時（Unix timestamp）")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="メタデータ")
    
    @property
    def homebiyori_user_id(self) -> Optional[str]:
        """HomebiyoriユーザーIDを取得"""
        return self.metadata.get("homebiyori_user_id")
    
    @property
    def plan_type(self) -> SubscriptionPlan:
        """プランタイプを取得"""
        plan_name = self.metadata.get("plan_type", "trial").lower()
        try:
            return SubscriptionPlan(plan_name)
        except ValueError:
            return SubscriptionPlan.TRIAL
    
    @property
    def is_active(self) -> bool:
        """アクティブ状態かどうか"""
        return self.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
    
    @property
    def is_canceled(self) -> bool:
        """解約済みかどうか"""
        return self.status == SubscriptionStatus.CANCELED
    
    @property
    def will_cancel(self) -> bool:
        """解約予定かどうか"""
        return self.cancel_at is not None and self.status != SubscriptionStatus.CANCELED


class StripeInvoice(BaseModel):
    """Stripe 請求書情報"""
    id: str = Field(..., description="Stripe Invoice ID")
    customer: str = Field(..., description="Stripe Customer ID")
    subscription: Optional[str] = Field(None, description="Stripe Subscription ID")
    status: str = Field(..., description="請求書状態")
    amount_paid: int = Field(..., description="支払済み金額（セント単位）")
    amount_due: int = Field(..., description="支払予定金額（セント単位）")
    currency: str = Field(default="jpy", description="通貨")
    created: int = Field(..., description="作成日時（Unix timestamp）")
    period_start: int = Field(..., description="対象期間開始（Unix timestamp）")
    period_end: int = Field(..., description="対象期間終了（Unix timestamp）")
    
    @property
    def amount_paid_yen(self) -> int:
        """支払済み金額（円単位）"""
        return self.amount_paid if self.currency == "jpy" else self.amount_paid // 100
    
    @property
    def is_paid(self) -> bool:
        """支払済みかどうか"""
        return self.status == "paid"


class WebhookEvent(BaseModel):
    """処理済みWebhookイベント"""
    id: str = Field(..., description="Stripe Event ID")
    type: WebhookEventType = Field(..., description="イベントタイプ")
    created: int = Field(..., description="作成日時（Unix timestamp）")
    api_version: Optional[str] = Field(None, description="Stripe API バージョン")
    data: Dict[str, Any] = Field(..., description="イベントデータ")
    processed_at: datetime = Field(default_factory=get_current_jst, description="処理日時（JST）")
    
    @property
    def subscription_data(self) -> Optional[StripeSubscription]:
        """サブスクリプションデータを取得"""
        if "subscription" in str(self.type):
            subscription_obj = self.data.get("object", {})
            if subscription_obj:
                try:
                    return StripeSubscription(**subscription_obj)
                except Exception:
                    return None
        return None
    
    @property
    def invoice_data(self) -> Optional[StripeInvoice]:
        """請求書データを取得"""
        if "invoice" in str(self.type):
            invoice_obj = self.data.get("object", {})
            if invoice_obj:
                try:
                    return StripeInvoice(**invoice_obj)
                except Exception:
                    return None
        return None


class TTLUpdateMessage(BaseModel):
    """TTL更新SQSメッセージ"""
    user_id: str = Field(..., description="ユーザーID")
    old_plan: SubscriptionPlan = Field(..., description="変更前プラン")
    new_plan: SubscriptionPlan = Field(..., description="変更後プラン")
    effective_date: datetime = Field(default_factory=get_current_jst, description="適用日時（JST）")
    subscription_id: str = Field(..., description="Stripe Subscription ID")
    change_reason: str = Field(..., description="変更理由")
    request_id: str = Field(..., description="リクエストID（トレーシング用）")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NotificationMessage(BaseModel):
    """通知作成メッセージ"""
    user_id: str = Field(..., description="ユーザーID")
    type: str = Field(..., description="通知タイプ")
    title: str = Field(..., description="通知タイトル")
    message: str = Field(..., description="通知メッセージ")
    priority: str = Field(default="normal", description="優先度")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="追加情報")
    expires_at: Optional[datetime] = Field(None, description="有効期限（JST）")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
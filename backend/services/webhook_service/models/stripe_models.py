"""
Stripe関連データモデル

Webhook処理で使用するStripeオブジェクトのPydanticモデル定義。
- サブスクリプション
- 顧客情報
- 請求書
- イベント
"""

from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum

from homebiyori_common.utils.datetime_utils import get_current_jst
from homebiyori_common.models import SubscriptionStatus, SubscriptionPlan

# PlanType削除: SubscriptionPlanに統一（Issue #15 統一対応）
# webhook_service固有のレガシー定義を削除


class WebhookEventType(str, Enum):
    """処理対象Webhookイベントタイプ"""
    # サブスクリプション更新（status/plan変更時の同期処理）
    SUBSCRIPTION_UPDATED = "customer.subscription.updated"
    
    # 決済処理（PaymentHistory保存用）
    PAYMENT_SUCCEEDED = "invoice.payment_succeeded"
    PAYMENT_FAILED = "invoice.payment_failed"
    
    # SUBSCRIPTION_CREATED削除: billing_serviceで作成済み、webhook不要
    # SUBSCRIPTION_DELETED削除: billing_serviceで削除済み、webhook不要
    # TRIAL_WILL_END削除: ほめびよりではトライアルを内部管理しており、Stripeトライアル機能は未使用
    # TRIAL_WILL_END削除: ほめびよりではトライアルを内部管理しており、Stripeトライアル機能は未使用


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
        """Homebiyoriユーザーidを取得
        
        billing_serviceでの設定に合わせて"user_id"キーから取得
        """
        return self.metadata.get("user_id")
    
    @property
    def plan_type(self) -> SubscriptionPlan:
        """プランタイプを取得（metadata特化版）
        
        metadata.plan_typeから判定。設定されていない場合はTRIALをデフォルト。
        シンプル・高速・確実な判定方法。
        """
        try:
            plan_name = self.metadata.get("plan_type", "trial").lower()
            return SubscriptionPlan(plan_name)
        except ValueError:
            return SubscriptionPlan.TRIAL
    
    @property
    def is_active(self) -> bool:
        """アクティブ状態かどうか（ほめびより内部管理のためACTIVEのみ）"""
        # TRIALINGを削除: ほめびよりではトライアルを内部管理しており、Stripeトライアル機能は未使用
        return self.status == SubscriptionStatus.ACTIVE
    
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
    payment_intent: Optional[str] = Field(None, description="Payment Intent ID")
    
    # PaymentHistory統合用の生データ保持
    raw_data: Optional[Dict[str, Any]] = Field(default=None, description="元のStripe請求書データ")
    
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
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat()
        }
    }
    
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
        """請求書データを取得（PaymentHistory統合対応）"""
        if "invoice" in str(self.type):
            invoice_obj = self.data.get("object", {})
            if invoice_obj:
                try:
                    # PaymentHistory.from_stripe_invoice()で使用するraw_dataを設定
                    invoice_data = StripeInvoice(**invoice_obj)
                    invoice_data.raw_data = invoice_obj  # 元データを保持
                    return invoice_data
                except Exception:
                    return None
        return None

# ==============================================
# webhook_service models.stripe_models 最適化完了
# ==============================================
#
# ✅ 削除された不要定義:
# - TTLUpdateMessage: Issue #15統一戦略によりTTL制御機能は不要
# - NotificationMessage: 簡素化された通知アーキテクチャにより不要
# - SUBSCRIPTION_CREATED: billing_serviceで作成済み、webhook不要
# - SUBSCRIPTION_DELETED: billing_serviceで削除済み、webhook不要
# - TRIAL_WILL_END: ほめびよりではトライアルを内部管理、Stripeトライアル機能は未使用
#
# ✅ 最適化された既存定義:
# - WebhookEventType: 実際に処理される3つのイベント（UPDATED, SUCCEEDED, FAILED）のみ
# - StripeSubscription.is_active: TRIALINGを削除、ACTIVEのみ対応
# - StripeInvoice: PaymentHistory統合用のraw_dataプロパティ追加
# - WebhookEvent: Pydantic v2のmodel_config使用
#
# 🎯 最適化効果:
# - コード簡素化: 不要なモデル削除による保守性向上
# - webhook処理特化: 実際に使用される機能のみに集約
# - 仕様準拠: 現在のwebhook_serviceアーキテクチャと完全一致
#


# TTLUpdateMessage削除: Issue #15統一戦略によりTTL制御機能は不要
# 削除理由: 全ユーザー統一機能提供によりプラン別TTL管理が廃止


# NotificationMessage削除: 簡素化された通知アーキテクチャにより不要
# 削除理由: webhook_serviceは複雑な通知処理を行わず、シンプルなログ記録のみ
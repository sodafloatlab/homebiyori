"""
Stripe Webhooks EventBridge Models

EventBridge経由でStripe webhookを処理するためのデータモデル
既存webhook_serviceから必要なモデルを抽出・簡素化
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum

from homebiyori_common.models import SubscriptionPlan
from homebiyori_common.utils.datetime_utils import get_current_jst


class PaymentStatus(str, Enum):
    """決済ステータス"""
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    PENDING = "pending"
    CANCELED = "canceled"


class PaymentHistory(BaseModel):
    """
    決済履歴モデル（EventBridge版）
    DynamoDB paymentsテーブル用の簡素化版
    """
    # Primary Key
    payment_id: str = Field(..., description="決済ID (payment_intent_id or invoice_id)")
    
    # 基本情報
    user_id: str = Field(..., description="ユーザーID")
    customer_id: str = Field(..., description="Stripe Customer ID")
    subscription_id: Optional[str] = Field(None, description="Stripe Subscription ID")
    
    # 決済詳細
    stripe_payment_intent_id: Optional[str] = Field(None, description="Stripe PaymentIntent ID")
    stripe_invoice_id: str = Field(..., description="Stripe Invoice ID")
    amount: int = Field(..., description="金額（円）")
    currency: str = Field(default="jpy", description="通貨")
    status: PaymentStatus = Field(..., description="決済ステータス")
    
    # 期間情報
    billing_period_start: int = Field(..., description="請求期間開始（Unix timestamp）")
    billing_period_end: int = Field(..., description="請求期間終了（Unix timestamp）")
    
    # タイムスタンプ
    stripe_created: int = Field(..., description="Stripe作成日時（Unix timestamp）")
    created_at: datetime = Field(default_factory=get_current_jst, description="作成日時（JST）")
    
    # 失敗情報
    failure_reason: Optional[str] = Field(None, description="失敗理由")
    attempt_count: Optional[int] = Field(None, description="試行回数")
    
    @classmethod
    def from_stripe_invoice(cls, invoice_data: Dict[str, Any], user_id: str) -> "PaymentHistory":
        """
        Stripe Invoice データから PaymentHistory を作成
        
        Args:
            invoice_data: Stripe invoice object
            user_id: Homebiyori user ID
            
        Returns:
            PaymentHistory: 決済履歴インスタンス
        """
        # 決済ステータス判定
        if invoice_data.get("paid", False):
            status = PaymentStatus.SUCCEEDED
            failure_reason = None
        else:
            status = PaymentStatus.FAILED
            failure_reason = "payment_failed"  # 詳細なエラー情報は別途取得可能
        
        # 金額処理（JPYは既にyen単位）
        amount_cents = invoice_data.get("amount_paid", 0) if status == PaymentStatus.SUCCEEDED else invoice_data.get("amount_due", 0)
        amount_yen = amount_cents  # JPYの場合、Stripeでは既にyen単位で提供
        
        return cls(
            payment_id=invoice_data["payment_intent"] or invoice_data["id"],
            user_id=user_id,
            customer_id=invoice_data["customer"],
            subscription_id=invoice_data.get("subscription"),
            stripe_payment_intent_id=invoice_data.get("payment_intent"),
            stripe_invoice_id=invoice_data["id"],
            amount=amount_yen,
            currency=invoice_data.get("currency", "jpy"),
            status=status,
            billing_period_start=invoice_data.get("period_start", 0),
            billing_period_end=invoice_data.get("period_end", 0),
            stripe_created=invoice_data.get("created", 0),
            failure_reason=failure_reason,
            attempt_count=invoice_data.get("attempt_count")
        )
    
    def to_dynamodb_item(self) -> Dict[str, Any]:
        """
        DynamoDB保存用のアイテム形式に変換
        
        Returns:
            Dict[str, Any]: DynamoDB item
        """
        item = {
            # Primary Key
            "payment_id": self.payment_id,
            
            # GSI Keys
            "user_id": self.user_id,
            "customer_id": self.customer_id,
            
            # 基本データ
            "subscription_id": self.subscription_id,
            "stripe_payment_intent_id": self.stripe_payment_intent_id,
            "stripe_invoice_id": self.stripe_invoice_id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status.value,
            
            # 期間
            "billing_period_start": self.billing_period_start,
            "billing_period_end": self.billing_period_end,
            
            # タイムスタンプ
            "stripe_created": self.stripe_created,
            "created_at": int(self.created_at.timestamp()),
            
            # TTL（7年後）
            "expires_at": int(self.created_at.timestamp()) + (7 * 365 * 24 * 60 * 60)
        }
        
        # Optional fields
        if self.failure_reason:
            item["failure_reason"] = self.failure_reason
        if self.attempt_count is not None:
            item["attempt_count"] = self.attempt_count
            
        return item


class SubscriptionStatus(str, Enum):
    """サブスクリプション状態"""
    ACTIVE = "active"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    PAST_DUE = "past_due"
    TRIALING = "trialing"
    UNPAID = "unpaid"


class SubscriptionData(BaseModel):
    """
    サブスクリプションデータモデル（EventBridge版）
    webhook_serviceから抽出・簡素化
    """
    id: str = Field(..., description="Stripe Subscription ID")
    customer: str = Field(..., description="Stripe Customer ID")
    status: SubscriptionStatus = Field(..., description="サブスクリプション状態")
    
    # 期間情報
    current_period_start: int = Field(..., description="現在の期間開始")
    current_period_end: int = Field(..., description="現在の期間終了")
    
    # キャンセル情報
    cancel_at_period_end: bool = Field(default=False, description="期間終了時にキャンセル")
    canceled_at: Optional[int] = Field(None, description="キャンセル日時")
    cancel_at: Optional[int] = Field(None, description="キャンセル予定日時")
    
    # トライアル情報
    trial_start: Optional[int] = Field(None, description="トライアル開始")
    trial_end: Optional[int] = Field(None, description="トライアル終了")
    
    # メタデータ
    metadata: Dict[str, str] = Field(default_factory=dict, description="メタデータ")
    items_data: list = Field(default_factory=list, description="サブスクリプションアイテム")
    raw_data: Dict[str, Any] = Field(default_factory=dict, description="元のStripeデータ")
    
    @property
    def homebiyori_user_id(self) -> Optional[str]:
        """HomebiyoriユーザーIDを取得（billing_service/stripe_client.pyに合わせて修正）"""
        return self.metadata.get("user_id")
    
    @property
    def plan_type(self) -> SubscriptionPlan:
        """プランタイプを判定"""
        if self.items_data:
            price_id = self.items_data[0].get("price", {}).get("id", "")
            if "monthly" in price_id.lower():
                return SubscriptionPlan.MONTHLY
            elif "yearly" in price_id.lower():
                return SubscriptionPlan.YEARLY
        return SubscriptionPlan.TRIAL
    
    @property
    def will_cancel(self) -> bool:
        """キャンセル予定かどうか"""
        return self.cancel_at_period_end or self.cancel_at is not None
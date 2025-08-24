"""
Payment History Models for Webhook Service

Phase 1実装：PaymentHistory DB保存機能のモデル定義
- 決済データの確実な保存とコンプライアンス対応
- DynamoDB Single Table Designに基づく効率的なデータ保存
- GET APIは削除、DB保存のみの責務に特化

Note: GET機能はPhase 2でStripe Customer Portal、Phase 3でadmin_serviceが担当
"""

from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, ConfigDict
from homebiyori_common.utils.datetime_utils import get_current_jst

class PaymentHistory(BaseModel):
    """
    決済履歴モデル（Stripe Invoice webhook専用・design_database.md準拠）
    
    Invoice webhookから取得可能な情報のみを対象とした最適化モデル
    PaymentIntent固有データ（card_last4等）は対象外
    """
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        frozen=False
    )
    
    # 必須フィールド（Invoice webhookから取得可能）
    user_id: str
    stripe_payment_intent_id: str
    amount: int  # 金額（円）
    status: str  # 決済ステータス（succeeded|failed）
    subscription_id: str
    customer_id: str  # Stripe Customer ID
    
    # 課金期間（サブスクリプションの場合・Invoice webhookから取得可能）
    billing_period_start: Optional[datetime] = None
    billing_period_end: Optional[datetime] = None
    
    # エラー情報（Invoice webhookから取得可能）
    failure_reason: Optional[str] = None     # 失敗理由
    
    # 決済詳細
    currency: str = "jpy"  # 通貨（デフォルト円）
    
    # タイムスタンプ（JST統一）
    created_at: datetime = None              # 作成日時
    expires_at: datetime = None              # TTL用期限日時（7年後）
    
    def model_post_init(self, __context) -> None:
        """モデル初期化後処理：JST時刻設定とTTL設定"""
        if self.created_at is None:
            self.created_at = get_current_jst()
        
        # TTL設定（7年後）
        if self.expires_at is None:
            self.expires_at = self.created_at + timedelta(days=7*365)
    
    def to_dynamodb_item(self) -> Dict[str, Any]:
        """DynamoDB保存用のアイテム形式に変換（Invoice webhook対応版）"""
        item = {
            "PK": f"USER#{self.user_id}",
            "SK": f"PAYMENT#{self.created_at.isoformat()}",
            "user_id": self.user_id,
            "subscription_id": self.subscription_id,
            "stripe_payment_intent_id": self.stripe_payment_intent_id,
            "customer_id": self.customer_id,
            
            # 支払い情報（Invoice webhookから取得）
            "amount": self.amount,                         # 支払い金額（円）
            "currency": self.currency,                     # 通貨
            "status": self.status,                         # succeeded|failed
            
            # 期間情報（Invoice webhookから取得）
            "billing_period_start": self.billing_period_start.isoformat() if self.billing_period_start else None,
            "billing_period_end": self.billing_period_end.isoformat() if self.billing_period_end else None,
            
            # エラー情報（Invoice webhookから取得可能）
            "failure_reason": self.failure_reason,         # 失敗理由
            
            # タイムスタンプ（JST統一）
            "created_at": self.created_at.isoformat(),     # 作成日時
            "expires_at": self.expires_at.isoformat(),     # TTL用期限日時
            
            # TTL設定（DynamoDB用数値）
            "ttl": int(self.expires_at.timestamp())
        }
        
        # None値の削除（DynamoDB効率化）
        return {k: v for k, v in item.items() if v is not None}

    @classmethod
    def from_stripe_invoice(cls, invoice: Dict[str, Any], user_id: str) -> "PaymentHistory":
        """
        Stripe Invoice webhookイベントからPaymentHistoryを生成
        
        Invoice webhookから取得可能な情報のみを使用した最適化実装
        """
        # 基本的な決済情報（invoice webhookから取得可能）
        stripe_payment_intent_id = invoice.get("payment_intent", "")
        amount = invoice.get("amount_paid", 0)
        paid = invoice.get("paid", False)
        status = "succeeded" if paid else "failed"
        customer_id = invoice.get("customer", "")  # Stripe Customer ID取得
        
        # 期間情報（UNIX timestamp → datetime変換）
        period_start = invoice.get("period_start")
        period_end = invoice.get("period_end") 
        
        billing_period_start = None
        billing_period_end = None
        
        if period_start:
            billing_period_start = datetime.fromtimestamp(period_start, tz=timezone.utc)
        if period_end:
            billing_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)
        
        # 失敗理由（利用可能な場合）
        failure_reason = None
        if not paid:
            last_error = invoice.get("last_finalization_error")
            if last_error and isinstance(last_error, dict):
                failure_reason = last_error.get("message", "Payment failed")
            else:
                failure_reason = "Payment failed"
        
        # 現在時刻（JST）
        now_jst = datetime.now(timezone(timedelta(hours=9)))
        
        return cls(
            user_id=user_id,
            stripe_payment_intent_id=stripe_payment_intent_id,
            amount=amount,
            currency=invoice.get("currency", "jpy"),
            status=status,
            subscription_id=invoice.get("subscription", ""),
            customer_id=customer_id,
            billing_period_start=billing_period_start,
            billing_period_end=billing_period_end,
            failure_reason=failure_reason,
            created_at=now_jst
        )


# PaymentEventDataクラスは削除されました
# 理由: 実際のwebhook処理では使用されておらず、PaymentHistory.from_stripe_invoice()が
# 直接invoice.raw_dataを使用してより効率的に処理している
#
# 削除日: 2024-08-24
# 代替実装: PaymentHistory.from_stripe_invoice(invoice.raw_data, user_id)
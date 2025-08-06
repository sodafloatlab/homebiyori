"""
billing-service データモデル定義

■システム概要■
Homebiyori（ほめびより）課金システムのデータモデル。
Stripe連携による安全なサブスクリプション管理と、
JST時刻統一、DynamoDB効率的保存を提供。

■課金システム設計■
月額プレミアムプラン:
- 価格: 980円/月（税込）
- TTL: 180日（フリープランの6倍）
- 特典: 長期保存、将来的に限定機能追加予定

■データ保存戦略■
- サブスクリプション状態: DynamoDB 7テーブル構成 (prod-homebiyori-subscriptions)
- 課金履歴: DynamoDB（分析・監査用）
- Stripeデータ: Stripe側がマスター、DynamoDB側はキャッシュ的位置づけ
- JST時刻: 日本のユーザーに最適化
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Literal, Optional, Union, Any
from pydantic import BaseModel, Field, validator
import uuid

# 共通Layerから日時処理をインポート
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string
from enum import Enum

# 共通Layerから使用するため削除（homebiyori_common.utils.datetime_utils を使用）

# =====================================
# サブスクリプション関連型定義
# =====================================

class SubscriptionPlan(str, Enum):
    """サブスクリプションプラン"""
    FREE = "free"                # 無料プラン（30日保持）
    MONTHLY = "monthly"          # 月額プレミアム（180日保持）
    # YEARLY = "yearly"          # 将来的に年額プラン追加予定

class SubscriptionStatus(str, Enum):
    """サブスクリプション状態"""
    ACTIVE = "active"            # アクティブ
    CANCELED = "canceled"        # キャンセル済み
    PAST_DUE = "past_due"       # 支払い遅延
    UNPAID = "unpaid"           # 未払い
    INCOMPLETE = "incomplete"    # 不完全（初回支払い失敗等）
    TRIALING = "trialing"       # トライアル期間

class PaymentStatus(str, Enum):
    """支払い状態"""
    SUCCEEDED = "succeeded"      # 成功
    FAILED = "failed"           # 失敗
    PENDING = "pending"         # 保留中
    CANCELED = "canceled"       # キャンセル

# =====================================
# リクエスト・レスポンスモデル
# =====================================

class CreateSubscriptionRequest(BaseModel):
    """サブスクリプション作成リクエスト"""
    plan: SubscriptionPlan = Field(..., description="サブスクリプションプラン")
    payment_method_id: Optional[str] = Field(None, description="Stripe支払い方法ID")
    coupon_code: Optional[str] = Field(None, description="クーポンコード")

class CreateSubscriptionResponse(BaseModel):
    """サブスクリプション作成レスポンス"""
    subscription_id: str = Field(description="サブスクリプションID")
    client_secret: Optional[str] = Field(None, description="Stripe Client Secret（3Dセキュア等）")
    status: SubscriptionStatus = Field(description="サブスクリプション状態")
    current_period_end: datetime = Field(description="現在の課金期間終了日（JST）")
    
    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

class CancelSubscriptionRequest(BaseModel):
    """サブスクリプションキャンセルリクエスト"""
    cancel_at_period_end: bool = Field(
        default=True, 
        description="期間終了時にキャンセルするか（即座にキャンセルしない）"
    )
    cancellation_reason: Optional[str] = Field(
        None, 
        max_length=500, 
        description="キャンセル理由（アンケート用）"
    )

class UpdatePaymentMethodRequest(BaseModel):
    """支払い方法更新リクエスト"""
    payment_method_id: str = Field(..., description="新しいStripe支払い方法ID")

# =====================================
# データ永続化モデル
# =====================================

class UserSubscription(BaseModel):
    """ユーザーサブスクリプション情報"""
    user_id: str = Field(description="ユーザーID（Cognito sub）")
    subscription_id: Optional[str] = Field(None, description="StripeサブスクリプションID")
    customer_id: Optional[str] = Field(None, description="Stripe顧客ID")
    
    # プラン情報
    current_plan: SubscriptionPlan = Field(
        default=SubscriptionPlan.FREE, 
        description="現在のプラン"
    )
    status: SubscriptionStatus = Field(
        default=SubscriptionStatus.ACTIVE, 
        description="サブスクリプション状態"
    )
    
    # 期間情報（JST）
    current_period_start: Optional[datetime] = Field(
        None, 
        description="現在の課金期間開始日（JST）"
    )
    current_period_end: Optional[datetime] = Field(
        None, 
        description="現在の課金期間終了日（JST）"
    )
    cancel_at_period_end: bool = Field(
        default=False, 
        description="期間終了時にキャンセル予定か"
    )
    canceled_at: Optional[datetime] = Field(
        None, 
        description="キャンセル日時（JST）"
    )
    
    # TTL設定
    ttl_days: int = Field(
        default=30, 
        description="データ保持期間（日数）"
    )
    
    # メタデータ
    created_at: datetime = Field(
        default_factory=get_current_jst, 
        description="作成日時（JST）"
    )
    updated_at: datetime = Field(
        default_factory=get_current_jst, 
        description="更新日時（JST）"
    )
    
    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

class PaymentHistory(BaseModel):
    """支払い履歴"""
    payment_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="支払いID")
    user_id: str = Field(description="ユーザーID")
    subscription_id: str = Field(description="サブスクリプションID")
    stripe_payment_intent_id: str = Field(description="Stripe PaymentIntent ID")
    
    # 支払い情報
    amount: int = Field(description="支払い金額（円）")
    currency: str = Field(default="jpy", description="通貨")
    status: PaymentStatus = Field(description="支払い状態")
    
    # 期間情報
    billing_period_start: datetime = Field(description="課金期間開始（JST）")
    billing_period_end: datetime = Field(description="課金期間終了（JST）")
    
    # 支払い方法
    payment_method_type: Optional[str] = Field(None, description="支払い方法タイプ（card等）")
    card_last4: Optional[str] = Field(None, description="カード下4桁")
    card_brand: Optional[str] = Field(None, description="カードブランド")
    
    # 詳細情報
    description: Optional[str] = Field(None, description="支払い説明")
    failure_reason: Optional[str] = Field(None, description="失敗理由")
    
    # タイムスタンプ（JST）
    paid_at: Optional[datetime] = Field(None, description="支払い完了日時（JST）")
    created_at: datetime = Field(default_factory=get_current_jst, description="作成日時（JST）")
    
    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

class BillingPortalRequest(BaseModel):
    """課金ポータルセッション作成リクエスト"""
    return_url: str = Field(..., description="戻り先URL")

class BillingPortalResponse(BaseModel):
    """課金ポータルセッション作成レスポンス"""
    portal_url: str = Field(description="Stripe課金ポータルURL")

# =====================================
# 統計・分析モデル
# =====================================

class SubscriptionAnalytics(BaseModel):
    """サブスクリプション分析データ"""
    user_id: str = Field(description="ユーザーID")
    analysis_period: str = Field(description="分析期間")
    
    # 利用統計
    total_paid_amount: int = Field(ge=0, description="総支払い額（円）")
    subscription_start_date: Optional[datetime] = Field(None, description="サブスクリプション開始日")
    subscription_duration_days: int = Field(ge=0, description="継続日数")
    
    # 課金履歴統計
    successful_payments: int = Field(ge=0, description="成功した支払い回数")
    failed_payments: int = Field(ge=0, description="失敗した支払い回数")
    average_payment_amount: float = Field(ge=0, description="平均支払い額")
    
    # サブスクリプション変更履歴
    plan_changes: List[Dict[str, Any]] = Field(
        default_factory=list, 
        description="プラン変更履歴"
    )
    
    # 分析メタデータ
    analyzed_at: datetime = Field(
        default_factory=get_current_jst, 
        description="分析実行時刻（JST）"
    )
    
    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

# =====================================
# エラーハンドリング
# =====================================

class BillingServiceError(Exception):
    """課金サービス基底例外"""
    def __init__(self, message: str, error_code: str = "BILLING_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class StripeAPIError(BillingServiceError):
    """Stripe API エラー"""
    def __init__(self, message: str, stripe_error_code: Optional[str] = None):
        self.stripe_error_code = stripe_error_code
        super().__init__(message, "STRIPE_API_ERROR")

class PaymentFailedError(BillingServiceError):
    """支払い失敗エラー"""
    def __init__(self, message: str):
        super().__init__(message, "PAYMENT_FAILED")

class SubscriptionNotFoundError(BillingServiceError):
    """サブスクリプション未発見エラー"""
    def __init__(self, message: str):
        super().__init__(message, "SUBSCRIPTION_NOT_FOUND")

# =====================================
# コンスタント定義
# =====================================

# プラン設定
PLAN_CONFIGS = {
    SubscriptionPlan.FREE: {
        "name": "フリープラン",
        "price": 0,
        "ttl_days": 30,
        "description": "30日保存、基本機能利用可能"
    },
    SubscriptionPlan.MONTHLY: {
        "name": "プレミアムプラン（月額）",
        "price": 980,  # 円
        "ttl_days": 180,
        "stripe_price_id": "price_1PremiumMonthly",  # 実際のStripe価格IDに置換
        "description": "180日保存、全機能利用可能"
    }
}

# Stripe設定
STRIPE_CONFIG = {
    "currency": "jpy",
    "payment_method_types": ["card"],
    "billing_cycle_anchor_behavior": "create_prorations",
    "collection_method": "charge_automatically"
}

# TTL計算関数
def calculate_ttl_for_plan(plan: SubscriptionPlan) -> int:
    """プランに基づくTTL日数を計算"""
    config = PLAN_CONFIGS.get(plan, PLAN_CONFIGS[SubscriptionPlan.FREE])
    return config["ttl_days"]

def get_plan_price(plan: SubscriptionPlan) -> int:
    """プランの価格を取得（円）"""
    config = PLAN_CONFIGS.get(plan, PLAN_CONFIGS[SubscriptionPlan.FREE])
    return config["price"]

def get_stripe_price_id(plan: SubscriptionPlan) -> Optional[str]:
    """StripeのPrice IDを取得"""
    config = PLAN_CONFIGS.get(plan)
    return config.get("stripe_price_id") if config else None

# サブスクリプション状態判定
def is_active_subscription(subscription: UserSubscription) -> bool:
    """サブスクリプションがアクティブかどうか判定"""
    if subscription.current_plan == SubscriptionPlan.FREE:
        return True
    
    return (
        subscription.status == SubscriptionStatus.ACTIVE and
        subscription.current_period_end and
        subscription.current_period_end > get_current_jst()
    )

def should_apply_premium_benefits(subscription: UserSubscription) -> bool:
    """プレミアム特典を適用すべきかどうか判定"""
    return (
        subscription.current_plan == SubscriptionPlan.MONTHLY and
        is_active_subscription(subscription)
    )
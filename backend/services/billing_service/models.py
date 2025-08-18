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
from pydantic import BaseModel, Field, field_validator, ConfigDict
import uuid

# 共通Layerから日時処理とenum定義をインポート
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string
from homebiyori_common.models import SubscriptionStatus, SubscriptionPlan, PaymentStatus
from homebiyori_common.utils.subscription_utils import (
    is_premium_plan, is_paid_plan, is_active_subscription, 
    get_unified_ttl_days, get_plan_price, get_stripe_price_id
)
from homebiyori_common.exceptions import (
    BillingServiceError, StripeAPIError, PaymentFailedError, SubscriptionNotFoundError
)

# =====================================
# リクエスト・レスポンスモデル
# =====================================

class CreateSubscriptionRequest(BaseModel):
    """サブスクリプション作成リクエスト"""
    plan: SubscriptionPlan = Field(..., description="サブスクリプションプラン")
    payment_method_id: Optional[str] = Field(None, description="Stripe支払い方法ID")
    # coupon_code削除: Stripe側制御のため不要

class CreateSubscriptionResponse(BaseModel):
    """サブスクリプション作成レスポンス"""
    subscription_id: str = Field(description="サブスクリプションID")
    client_secret: Optional[str] = Field(None, description="Stripe Client Secret（3Dセキュア等）")
    status: SubscriptionStatus = Field(description="サブスクリプション状態")
    current_period_end: datetime = Field(description="現在の課金期間終了日（JST）")
    
    model_config = ConfigDict(
        json_encoders={datetime: to_jst_string}
    )

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
        default=SubscriptionPlan.TRIAL, 
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
    
    # 新戦略：トライアル期間管理
    trial_start_date: Optional[datetime] = Field(
        None, 
        description="トライアル開始日（JST）"
    )
    trial_end_date: Optional[datetime] = Field(
        None, 
        description="トライアル終了日（JST）"
    )
    
    # TTL設定（新戦略では統一）
    ttl_days: int = Field(
        default=180, 
        description="データ保持期間（日数）：全プラン統一"
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
    
    model_config = ConfigDict(
        json_encoders={datetime: to_jst_string}
    )

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
    
    model_config = ConfigDict(
        json_encoders={datetime: to_jst_string}
    )

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
    
    model_config = ConfigDict(
        json_encoders={datetime: to_jst_string}
    )

# エラーハンドリングクラスは homebiyori_common.exceptions からインポート
# 統一定義により重複削除（Issue #15 サービス間記載統一）

# =====================================
# コンスタント定義
# =====================================

# プラン設定は homebiyori_common.utils.subscription_utils.get_plan_price() を使用
# 重複定義を削除（Issue #15 統一対応）

# Stripe設定
STRIPE_CONFIG = {
    "currency": "jpy",
    "payment_method_types": ["card"],
    "billing_cycle_anchor_behavior": "create_prorations",
    "collection_method": "charge_automatically"
}

# 統一ロジック関数は homebiyori_common.utils.subscription_utils からインポート
# Issue #15 リファクタリング完了
"""
billing-service データモデル定義

■システム概要■
Homebiyori（ほめびより）課金システムのデータモデル。
Stripe連携による安全なサブスクリプション管理と、
JST時刻統一、DynamoDB効率的保存を提供。

■課金システム設計■
月額プレミアムプラン:
- 価格: 580円/月（税込）
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

# CreateSubscriptionResponse 削除（2024-08-22）
# 理由: StripeCheckout方式に統一。create_subscriptionエンドポイント削除に伴い不要

# CancelSubscriptionRequest 削除（2024-08-22）
# 理由: Portal経由でのサブスクリプション管理に統一。cancel_subscriptionエンドポイント削除に伴い不要

# UpdatePaymentMethodRequest 削除（2024-08-22）
# 理由: StripeCheckout方式に統一。支払い方法更新はPortal経由で管理。update_payment_methodエンドポイント削除に伴い不要

# =====================================
# データ永続化モデル
# =====================================

class UserSubscription(BaseModel):
    """ユーザーサブスクリプション情報（設計書準拠版）"""
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
    
    # 新戦略：トライアル期間管理（設計書準拠）
    trial_start_date: Optional[datetime] = Field(
        None, 
        description="トライアル開始日（JST）"
    )
    trial_end_date: Optional[datetime] = Field(
        None, 
        description="トライアル終了日（JST）"
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

# PaymentHistoryモデルはwebhook_serviceに移管されました
# 理由: 責任分離の原則に基づき、決済情報の管理はwebhook_serviceが完全担当
# 移管日: 2024-08-22
# 
# ■責任分離後の役割■
# billing_service: サブスクリプション管理（Stripe API呼び出し）
# - サブスクリプション作成・更新・キャンセル
# - 顧客管理（Customer CRUD）
# - 課金ポータルセッション作成
# 
# webhook_service: 決済情報管理（Stripe Webhook受信）
# - PaymentHistory完全管理
# - Stripe Webhookイベント処理
# - 決済完了・失敗の状態更新
#
# PaymentHistory関連の実装はwebhook_serviceで行ってください

class BillingPortalRequest(BaseModel):
    """課金ポータルセッション作成リクエスト"""
    return_url: str = Field(..., description="戻り先URL")

class BillingPortalResponse(BaseModel):
    """課金ポータルセッション作成レスポンス"""
    portal_url: str = Field(description="Stripe課金ポータルURL")

# =====================================
# サブスクリプションキャンセル（解約理由収集用）
# =====================================

class CancelSubscriptionRequest(BaseModel):
    """
    サブスクリプションキャンセルリクエスト（解約理由収集機能付き）
    
    ■設計方針■
    - Portal経由ではなくAPI実行でキャンセルを行う
    - 解約理由の収集がサービス改善に重要なため
    - design_database.md準拠の個別フィールド構造で受信
    """
    cancel_at_period_end: bool = Field(
        default=True,
        description="期間終了時にキャンセルするか（即座にキャンセルの場合はFalse）"
    )
    
    # 解約理由（個別フィールド）- design_database.md準拠
    reason_category: Optional[str] = Field(
        default=None,
        description="解約理由カテゴリ（price|features|usability|competitors|other）",
        max_length=50
    )
    reason_text: Optional[str] = Field(
        default=None,
        description="具体的な解約理由",
        max_length=200
    )
    satisfaction_score: Optional[int] = Field(
        default=None,
        description="満足度スコア（1-5）",
        ge=1,
        le=5
    )
    improvement_suggestions: Optional[str] = Field(
        default=None,
        description="改善提案・フィードバック",
        max_length=300
    )

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class CancelSubscriptionResponse(BaseModel):
    """サブスクリプションキャンセル結果レスポンス"""
    success: bool = Field(description="キャンセル成功フラグ")
    message: str = Field(description="キャンセル結果メッセージ")
    canceled_at: Optional[datetime] = Field(
        default=None,
        description="キャンセル実行日時（即座キャンセルの場合）"
    )
    will_cancel_at_period_end: bool = Field(
        default=False,
        description="期間終了時にキャンセル予定かどうか"
    )

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# =====================================
# 統計・分析モデル
# =====================================

# SubscriptionAnalyticsクラスは削除されました
# 理由: Stripe管理コンソールで同等の統計情報を確認可能なため
# 削除日: 2024-08-21
# Issue #15 統一戦略の一環として、重複機能を削除し、アーキテクチャをシンプル化

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
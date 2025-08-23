"""
webhook_service PaymentHistory管理モデル

■システム概要■
PaymentHistory完全管理機能を提供。
Stripe Webhook受信時の決済情報処理と、
PaymentHistory CRUD操作を統合管理。

■責任分離後の役割■
webhook_service: PaymentHistory完全管理
- PaymentHistory作成・更新・取得
- Stripe Webhookイベント処理 
- 決済完了・失敗の状態更新
- 支払い履歴API提供
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum

# 共通Layerから統一enum定義をインポート
from homebiyori_common.models import PaymentStatus
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string

# =====================================
# PaymentHistoryモデル（webhook_service専用）
# =====================================

class PaymentHistory(BaseModel):
    """支払い履歴情報（webhook_service完全管理版）"""
    
    # 基本識別情報
    payment_id: str = Field(description="支払いID（UUID）")
    user_id: str = Field(description="ユーザーID（Cognito sub）")
    subscription_id: str = Field(description="サブスクリプションID")
    stripe_payment_intent_id: str = Field(description="Stripe PaymentIntent ID")
    
    # 支払い情報
    amount: int = Field(description="支払い金額（円）")
    currency: str = Field(default="jpy", description="通貨")
    status: PaymentStatus = Field(description="支払い状態")
    
    # 期間情報（JST統一）
    billing_period_start: datetime = Field(description="課金期間開始日（JST）")
    billing_period_end: datetime = Field(description="課金期間終了日（JST）")
    
    # 支払い方法詳細（Stripe Webhook取得）
    payment_method_type: Optional[str] = Field(None, description="支払い方法タイプ")
    card_last4: Optional[str] = Field(None, description="カード下4桁")
    card_brand: Optional[str] = Field(None, description="カードブランド")
    
    # 詳細情報
    description: Optional[str] = Field(None, description="支払い説明")
    failure_reason: Optional[str] = Field(None, description="失敗理由")
    
    # タイムスタンプ（JST統一）
    paid_at: Optional[datetime] = Field(None, description="支払い完了日時（JST）")
    created_at: datetime = Field(
        default_factory=get_current_jst, 
        description="作成日時（JST）"
    )
    
    model_config = ConfigDict(
        json_encoders={datetime: to_jst_string}
    )

# =====================================
# リクエスト・レスポンスモデル
# =====================================

class PaymentHistoryRequest(BaseModel):
    """支払い履歴取得リクエスト"""
    limit: int = Field(default=20, ge=1, le=100, description="取得件数制限")
    next_token: Optional[str] = Field(None, description="ページネーショントークン")
    start_date: Optional[datetime] = Field(None, description="取得開始日（JST）")
    end_date: Optional[datetime] = Field(None, description="取得終了日（JST）")

class PaymentHistoryResponse(BaseModel):
    """支払い履歴取得レスポンス"""
    items: List[PaymentHistory] = Field(description="支払い履歴リスト")
    next_token: Optional[str] = Field(None, description="次ページトークン")
    has_more: bool = Field(default=False, description="続きのページがあるか")
    total_count: Optional[int] = Field(None, description="総件数")
    
    model_config = ConfigDict(
        json_encoders={datetime: to_jst_string}
    )

# =====================================
# Stripe Webhook専用モデル
# =====================================

class StripePaymentEvent(BaseModel):
    """Stripe Payment Webhookイベント"""
    payment_intent_id: str = Field(description="Stripe PaymentIntent ID")
    customer_id: str = Field(description="Stripe Customer ID")
    subscription_id: Optional[str] = Field(None, description="Stripe Subscription ID")
    
    # 支払い情報
    amount: int = Field(description="支払い金額（セント）")
    currency: str = Field(description="通貨")
    status: str = Field(description="支払い状態")
    
    # 支払い方法詳細
    payment_method_type: Optional[str] = Field(None, description="支払い方法タイプ")
    card_last4: Optional[str] = Field(None, description="カード下4桁")
    card_brand: Optional[str] = Field(None, description="カードブランド")
    
    # メタデータ
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Stripeメタデータ")
    failure_reason: Optional[str] = Field(None, description="失敗理由")
    
    # タイムスタンプ
    created_timestamp: int = Field(description="作成タイムスタンプ（Unix）")
    paid_timestamp: Optional[int] = Field(None, description="支払い完了タイムスタンプ（Unix）")
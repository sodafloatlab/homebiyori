"""
webhook-service データモデル定義

■システム概要■
Homebiyori（ほめびより）Webhook処理システムのデータモデル。
Stripe WebhookイベントとGitHub Actionsデプロイフックの処理と、
JST時刻統一、DynamoDB効率的保存を提供。

■Webhook処理設計■
Stripe Webhookイベント:
- payment_intent.succeeded: 支払い成功
- payment_intent.payment_failed: 支払い失敗
- customer.subscription.updated: サブスクリプション更新
- customer.subscription.cancelled: サブスクリプションキャンセル
- invoice.payment_succeeded: 請求書支払い成功
- invoice.payment_failed: 請求書支払い失敗

■データ保存戦略■
- Webhookイベント: DynamoDB（監査・デバッグ用）
- 処理結果: DynamoDB（エラー追跡・リトライ用）
- JST時刻: 日本のユーザーに最適化
- べき等性: イベントIDによる重複処理防止
"""

from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional, Union, Any
from pydantic import BaseModel, Field, validator
import uuid
import pytz
from enum import Enum

def get_current_jst() -> datetime:
    """現在時刻をJST（日本標準時）で取得"""
    jst = pytz.timezone('Asia/Tokyo')
    return datetime.now(jst)

def to_jst_string(dt: datetime) -> str:
    """datetimeをJST文字列に変換"""
    if dt.tzinfo is None:
        # ナイーブなdatetimeの場合、JSTと仮定
        jst = pytz.timezone('Asia/Tokyo')
        dt = jst.localize(dt)
    else:
        # タイムゾーン付きdatetimeをJSTに変換
        jst = pytz.timezone('Asia/Tokyo')
        dt = dt.astimezone(jst)
    return dt.isoformat()

# =====================================
# Webhook関連型定義
# =====================================

class WebhookSource(str, Enum):
    """Webhookソース"""
    STRIPE = "stripe"                # Stripe決済Webhook
    GITHUB = "github"               # GitHub Actions
    INTERNAL = "internal"           # 内部システム

class WebhookEventType(str, Enum):
    """WebhookイベントタイプStripe"""
    # 支払い関連
    PAYMENT_INTENT_SUCCEEDED = "payment_intent.succeeded"
    PAYMENT_INTENT_FAILED = "payment_intent.payment_failed"
    
    # サブスクリプション関連
    SUBSCRIPTION_CREATED = "customer.subscription.created"
    SUBSCRIPTION_UPDATED = "customer.subscription.updated"
    SUBSCRIPTION_CANCELLED = "customer.subscription.deleted"
    
    # 請求書関連
    INVOICE_PAYMENT_SUCCEEDED = "invoice.payment_succeeded"
    INVOICE_PAYMENT_FAILED = "invoice.payment_failed"
    INVOICE_PAYMENT_ACTION_REQUIRED = "invoice.payment_action_required"
    
    # 顧客関連
    CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END = "customer.subscription.trial_will_end"
    
    # GitHub Actions
    DEPLOYMENT_SUCCESS = "github.deployment.success"
    DEPLOYMENT_FAILURE = "github.deployment.failure"

class ProcessingStatus(str, Enum):
    """処理状態"""
    PENDING = "pending"             # 処理待ち
    PROCESSING = "processing"       # 処理中
    COMPLETED = "completed"         # 処理完了
    FAILED = "failed"              # 処理失敗
    SKIPPED = "skipped"            # スキップ（重複等）

# =====================================
# Webhookイベントモデル
# =====================================

class WebhookEvent(BaseModel):
    """Webhookイベント"""
    event_id: str = Field(description="WebhookイベントID（外部システム由来）")
    internal_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="内部管理ID")
    
    # イベント情報
    source: WebhookSource = Field(description="Webhookソース")
    event_type: WebhookEventType = Field(description="イベントタイプ")
    api_version: Optional[str] = Field(None, description="API バージョン")
    
    # イベントデータ
    data: Dict[str, Any] = Field(description="イベントデータ")
    object_id: Optional[str] = Field(None, description="関連オブジェクトID")
    user_id: Optional[str] = Field(None, description="関連ユーザーID")
    
    # 処理状態
    processing_status: ProcessingStatus = Field(default=ProcessingStatus.PENDING, description="処理状態")
    processing_attempts: int = Field(default=0, description="処理試行回数")
    last_processing_error: Optional[str] = Field(None, description="最終処理エラー")
    
    # タイムスタンプ（JST）
    event_created_at: datetime = Field(description="イベント発生時刻（外部システム）")
    received_at: datetime = Field(default_factory=get_current_jst, description="受信時刻（JST）")
    processed_at: Optional[datetime] = Field(None, description="処理完了時刻（JST）")
    
    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

class WebhookProcessingResult(BaseModel):
    """Webhook処理結果"""
    internal_id: str = Field(description="内部管理ID")
    event_id: str = Field(description="WebhookイベントID")
    
    # 処理結果
    success: bool = Field(description="処理成功フラグ")
    processing_time_ms: int = Field(description="処理時間（ミリ秒）")
    
    # 詳細情報
    actions_performed: List[str] = Field(default_factory=list, description="実行されたアクション")
    affected_resources: List[str] = Field(default_factory=list, description="影響を受けたリソース")
    error_message: Optional[str] = Field(None, description="エラーメッセージ")
    
    # メタデータ
    processed_at: datetime = Field(default_factory=get_current_jst, description="処理時刻（JST）")
    
    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

# =====================================
# Stripe固有モデル
# =====================================

class StripePaymentIntentWebhook(BaseModel):
    """Stripe PaymentIntent Webhookデータ"""
    payment_intent_id: str = Field(description="PaymentIntent ID")
    customer_id: Optional[str] = Field(None, description="Customer ID")
    subscription_id: Optional[str] = Field(None, description="Subscription ID") 
    amount: int = Field(description="金額（円）")
    currency: str = Field(default="jpy", description="通貨")
    status: str = Field(description="支払い状態")
    
    # 支払い方法情報
    payment_method_type: Optional[str] = Field(None, description="支払い方法タイプ")
    card_last4: Optional[str] = Field(None, description="カード下4桁")
    card_brand: Optional[str] = Field(None, description="カードブランド")
    
    # エラー情報
    last_payment_error: Optional[Dict[str, Any]] = Field(None, description="支払いエラー詳細")

class StripeSubscriptionWebhook(BaseModel):
    """Stripe Subscription Webhookデータ"""
    subscription_id: str = Field(description="Subscription ID")
    customer_id: str = Field(description="Customer ID")
    status: str = Field(description="サブスクリプション状態")
    
    # 期間情報
    current_period_start: int = Field(description="現在期間開始（Unix timestamp）")
    current_period_end: int = Field(description="現在期間終了（Unix timestamp）")
    
    # キャンセル情報
    cancel_at_period_end: bool = Field(default=False, description="期間終了時キャンセル")
    canceled_at: Optional[int] = Field(None, description="キャンセル日時（Unix timestamp）")
    
    # プラン情報
    price_id: Optional[str] = Field(None, description="Price ID")
    quantity: int = Field(default=1, description="数量")

class StripeInvoiceWebhook(BaseModel):
    """Stripe Invoice Webhookデータ"""
    invoice_id: str = Field(description="Invoice ID")
    subscription_id: Optional[str] = Field(None, description="Subscription ID")
    customer_id: str = Field(description="Customer ID")
    
    # 金額情報
    amount_paid: int = Field(description="支払い済み金額")
    amount_due: int = Field(description="支払い予定金額")
    total: int = Field(description="合計金額")
    currency: str = Field(default="jpy", description="通貨")
    
    # 期間情報
    period_start: int = Field(description="請求期間開始（Unix timestamp）")
    period_end: int = Field(description="請求期間終了（Unix timestamp）")
    
    # 状態
    status: str = Field(description="請求書状態")
    paid: bool = Field(description="支払い済みフラグ")

# =====================================
# GitHub Actions固有モデル
# =====================================

class GitHubDeploymentWebhook(BaseModel):
    """GitHub Deployment Webhookデータ"""
    deployment_id: str = Field(description="デプロイメントID")
    repository: str = Field(description="リポジトリ名")
    environment: str = Field(description="デプロイ環境")
    
    # ステータス情報
    state: str = Field(description="デプロイ状態")
    target_url: Optional[str] = Field(None, description="デプロイ先URL")
    description: Optional[str] = Field(None, description="デプロイ説明")
    
    # コミット情報
    sha: str = Field(description="コミットSHA")
    ref: str = Field(description="ブランチ・タグ")
    
    # タイムスタンプ
    created_at: str = Field(description="作成時刻")
    updated_at: str = Field(description="更新時刻")

# =====================================
# SQS処理モデル
# =====================================

class WebhookQueueMessage(BaseModel):
    """Webhook処理キューメッセージ"""
    internal_id: str = Field(description="内部管理ID")
    event_id: str = Field(description="WebhookイベントID")
    source: WebhookSource = Field(description="Webhookソース")
    event_type: WebhookEventType = Field(description="イベントタイプ")
    priority: int = Field(default=5, description="処理優先度（1=最高、10=最低）")
    retry_count: int = Field(default=0, description="リトライ回数")
    max_retries: int = Field(default=3, description="最大リトライ回数")
    
    # 処理データ
    payload: Dict[str, Any] = Field(description="処理用ペイロード")
    
    # タイムスタンプ
    queued_at: datetime = Field(default_factory=get_current_jst, description="キュー投入時刻（JST）")
    scheduled_for: Optional[datetime] = Field(None, description="処理予定時刻（JST）")
    
    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

# =====================================
# エラーハンドリング
# =====================================

class WebhookServiceError(Exception):
    """Webhook サービス基底例外"""
    def __init__(self, message: str, error_code: str = "WEBHOOK_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class WebhookSignatureError(WebhookServiceError):
    """Webhook署名検証エラー"""
    def __init__(self, message: str):
        super().__init__(message, "WEBHOOK_SIGNATURE_ERROR")

class WebhookProcessingError(WebhookServiceError):
    """Webhook処理エラー"""
    def __init__(self, message: str):
        super().__init__(message, "WEBHOOK_PROCESSING_ERROR")

class DuplicateWebhookError(WebhookServiceError):
    """重複Webhookエラー"""
    def __init__(self, message: str):
        super().__init__(message, "DUPLICATE_WEBHOOK_ERROR")

# =====================================
# コンスタント定義
# =====================================

# 処理優先度設定
WEBHOOK_PRIORITIES = {
    # 高優先度（即座に処理）
    WebhookEventType.PAYMENT_INTENT_SUCCEEDED: 1,
    WebhookEventType.PAYMENT_INTENT_FAILED: 1,
    WebhookEventType.INVOICE_PAYMENT_FAILED: 1,
    
    # 中優先度（5分以内）
    WebhookEventType.SUBSCRIPTION_UPDATED: 3,
    WebhookEventType.SUBSCRIPTION_CANCELLED: 3,
    WebhookEventType.INVOICE_PAYMENT_SUCCEEDED: 3,
    
    # 低優先度（1時間以内）
    WebhookEventType.SUBSCRIPTION_CREATED: 5,
    WebhookEventType.CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END: 7,
    
    # GitHub Actions
    WebhookEventType.DEPLOYMENT_SUCCESS: 5,
    WebhookEventType.DEPLOYMENT_FAILURE: 2,
}

# リトライ設定
RETRY_CONFIGS = {
    WebhookSource.STRIPE: {
        "max_retries": 3,
        "base_delay_seconds": 30,
        "exponential_backoff": True
    },
    WebhookSource.GITHUB: {
        "max_retries": 2,
        "base_delay_seconds": 60,
        "exponential_backoff": False
    }
}

# ユーティリティ関数
def get_webhook_priority(event_type: WebhookEventType) -> int:
    """イベントタイプから処理優先度を取得"""
    return WEBHOOK_PRIORITIES.get(event_type, 5)

def should_retry_processing(
    source: WebhookSource, 
    current_attempts: int, 
    error_type: Optional[str] = None
) -> bool:
    """処理をリトライすべきかどうか判定"""
    config = RETRY_CONFIGS.get(source, RETRY_CONFIGS[WebhookSource.STRIPE])
    
    if current_attempts >= config["max_retries"]:
        return False
    
    # 特定のエラータイプはリトライしない
    non_retryable_errors = [
        "signature_verification_failed",
        "invalid_payload",
        "duplicate_event"
    ]
    
    if error_type in non_retryable_errors:
        return False
    
    return True

def calculate_retry_delay(source: WebhookSource, attempt: int) -> int:
    """リトライ遅延時間を計算（秒）"""
    config = RETRY_CONFIGS.get(source, RETRY_CONFIGS[WebhookSource.STRIPE])
    base_delay = config["base_delay_seconds"]
    
    if config["exponential_backoff"]:
        return base_delay * (2 ** (attempt - 1))
    else:
        return base_delay
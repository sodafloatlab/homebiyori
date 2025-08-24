"""
admin_service データモデル定義

管理者ダッシュボード用のPydanticモデル
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, field_validator
from enum import Enum

# Phase 3: PaymentHistory管理機能用モデル
class PaymentStatus(str, Enum):
    """決済ステータス"""
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    PENDING = "pending"
    CANCELED = "canceled"

class PaymentHistoryInfo(BaseModel):
    """決済履歴情報（管理者表示用）"""
    user_id: str = Field(..., description="ユーザーID")
    stripe_payment_intent_id: str = Field(..., description="Stripe PaymentIntent ID")
    subscription_id: str = Field(..., description="サブスクリプションID")
    amount: int = Field(..., description="決済金額（円）")
    status: PaymentStatus = Field(..., description="決済ステータス")
    currency: str = Field(default="jpy", description="通貨")
    billing_period_start: Optional[str] = Field(None, description="課金期間開始日")
    billing_period_end: Optional[str] = Field(None, description="課金期間終了日")
    payment_method_type: Optional[str] = Field(None, description="支払い方法種別")
    stripe_customer_id: Optional[str] = Field(None, description="Stripe Customer ID")
    created_at: str = Field(..., description="作成日時")
    metadata: Optional[Dict[str, Any]] = Field(None, description="メタデータ")

class PaymentHistoryListRequest(BaseModel):
    """決済履歴一覧取得リクエスト"""
    user_id: Optional[str] = Field(None, description="特定ユーザーID（フィルタ用）")
    status: Optional[PaymentStatus] = Field(None, description="決済ステータス（フィルタ用）")
    start_date: Optional[str] = Field(None, description="期間開始日（YYYY-MM-DD）")
    end_date: Optional[str] = Field(None, description="期間終了日（YYYY-MM-DD）")
    limit: int = Field(default=50, ge=1, le=100, description="取得件数上限")
    cursor: Optional[str] = Field(None, description="ページネーション用カーソル")

class PaymentHistoryListResponse(BaseModel):
    """決済履歴一覧レスポンス"""
    payments: List[PaymentHistoryInfo] = Field(..., description="決済履歴一覧")
    total_count: int = Field(..., description="総件数")
    has_next_page: bool = Field(..., description="次ページ存在フラグ")
    next_cursor: Optional[str] = Field(None, description="次ページカーソル")

class PaymentAnalyticsResponse(BaseModel):
    """決済分析レスポンス"""
    total_revenue: float = Field(..., description="総売上（円）")
    successful_payments: int = Field(..., description="成功決済数")
    failed_payments: int = Field(..., description="失敗決済数")
    success_rate: float = Field(..., description="決済成功率（%）")
    average_payment_amount: float = Field(..., description="平均決済金額（円）")
    monthly_revenue_trend: List[Dict[str, Any]] = Field(..., description="月別売上推移")
    payment_method_distribution: Dict[str, int] = Field(..., description="支払い方法別分布")
    daily_payment_volume: List[Dict[str, Any]] = Field(..., description="日別決済量")

class PaymentExportRequest(BaseModel):
    """決済データ出力リクエスト"""
    format: str = Field(default="csv", regex="^(csv|excel)$", description="出力形式")
    start_date: Optional[str] = Field(None, description="期間開始日（YYYY-MM-DD）")
    end_date: Optional[str] = Field(None, description="期間終了日（YYYY-MM-DD）")
    include_failed: bool = Field(default=True, description="失敗決済を含める")
    include_metadata: bool = Field(default=False, description="メタデータを含める")

class MaintenanceLevel(str, Enum):
    """メンテナンスレベル"""
    FULL = "full"  # 全機能停止
    PARTIAL = "partial"  # 一部機能制限
    NONE = "none"  # メンテナンスなし

class AlertLevel(str, Enum):
    """アラートレベル"""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"

class SystemHealthStatus(str, Enum):
    """システム健全性ステータス"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

# リクエストモデル
class MaintenanceControlRequest(BaseModel):
    """メンテナンス制御リクエスト"""
    enable_maintenance: bool = Field(..., description="メンテナンス有効化")
    maintenance_level: MaintenanceLevel = Field(default=MaintenanceLevel.FULL, description="メンテナンスレベル")
    maintenance_message: str = Field(..., min_length=1, max_length=500, description="メンテナンスメッセージ")
    maintenance_end_time: Optional[str] = Field(None, description="メンテナンス終了予定時刻（ISO形式）")
    affected_services: Optional[List[str]] = Field(default=[], description="影響を受けるサービス一覧")

    @field_validator('maintenance_end_time')
    @classmethod
    def validate_end_time(cls, v):
        if v:
            try:
                datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError('Invalid datetime format. Use ISO format.')
        return v

# レスポンスモデル
class SystemMetricsResponse(BaseModel):
    """システムメトリクスレスポンス"""
    timestamp: str = Field(..., description="取得時刻")
    system_health: SystemHealthStatus = Field(..., description="システム健全性")
    
    # ユーザーメトリクス
    total_users: int = Field(..., description="総ユーザー数")
    active_users_today: int = Field(..., description="本日のアクティブユーザー数")
    active_users_weekly: int = Field(..., description="週間アクティブユーザー数")
    premium_users: int = Field(..., description="プレミアムユーザー数")
    new_users_today: int = Field(..., description="本日の新規ユーザー数")
    
    # チャットメトリクス
    total_chats_today: int = Field(..., description="本日のチャット数")
    total_chats_weekly: int = Field(..., description="週間チャット数")
    ai_response_success_rate: float = Field(..., description="AI応答成功率")
    
    # システムメトリクス
    bedrock_api_calls_today: int = Field(..., description="本日のBedrock API呼び出し数")
    lambda_invocations: Dict[str, int] = Field(..., description="Lambda関数別呼び出し数")
    error_rates: Dict[str, float] = Field(..., description="サービス別エラー率")
    
    # インフラメトリクス
    dynamodb_usage: Dict[str, Any] = Field(..., description="DynamoDB使用量統計")
    s3_usage: Dict[str, Any] = Field(..., description="S3使用量統計")
    cloudfront_usage: Dict[str, Any] = Field(..., description="CloudFront使用量統計")

class UserStatisticsResponse(BaseModel):
    """ユーザー統計レスポンス"""
    total_count: int = Field(..., description="総ユーザー数")
    new_users_today: int = Field(..., description="本日の新規ユーザー数")
    new_users_weekly: int = Field(..., description="週間新規ユーザー数")
    new_users_monthly: int = Field(..., description="月間新規ユーザー数")
    
    premium_users_count: int = Field(..., description="プレミアムユーザー数")
    premium_conversion_rate: float = Field(..., description="プレミアム転換率（%）")
    
    active_users_today: int = Field(..., description="本日のアクティブユーザー数")
    active_users_weekly: int = Field(..., description="週間アクティブユーザー数")
    active_users_monthly: int = Field(..., description="月間アクティブユーザー数")
    
    retention_rate_7d: float = Field(..., description="7日間継続率（%）")
    retention_rate_30d: float = Field(..., description="30日間継続率（%）")
    
    churn_rate_monthly: float = Field(..., description="月間解約率（%）")
    
    top_user_segments: List[Dict[str, Any]] = Field(..., description="主要ユーザーセグメント")

class RecentUserInfo(BaseModel):
    """最近のユーザー情報"""
    user_id: str = Field(..., description="ユーザーID（ハッシュ化）")
    nickname: Optional[str] = Field(None, description="ニックネーム")
    subscription_plan: str = Field(..., description="サブスクリプションプラン")
    created_at: str = Field(..., description="登録日時")
    last_active: Optional[str] = Field(None, description="最終アクティブ日時")
    total_chats: int = Field(..., description="総チャット数")
    ai_character_preference: Optional[str] = Field(None, description="好みのAIキャラクター")

class RecentUsersResponse(BaseModel):
    """最近のユーザー一覧レスポンス"""
    total_count: int = Field(..., description="総ユーザー数")
    users: List[RecentUserInfo] = Field(..., description="ユーザー一覧")
    has_next_page: bool = Field(..., description="次のページが存在するか")
    next_cursor: Optional[str] = Field(None, description="次のページのカーソル")

class MaintenanceStatusResponse(BaseModel):
    """メンテナンス状態レスポンス"""
    is_maintenance_mode: bool = Field(..., description="メンテナンスモード状態")
    maintenance_level: MaintenanceLevel = Field(..., description="メンテナンスレベル")
    maintenance_message: Optional[str] = Field(None, description="メンテナンスメッセージ")
    maintenance_start_time: Optional[str] = Field(None, description="メンテナンス開始時刻")
    maintenance_end_time: Optional[str] = Field(None, description="メンテナンス終了予定時刻")
    affected_services: List[str] = Field(default=[], description="影響を受けるサービス一覧")
    estimated_recovery_time: Optional[str] = Field(None, description="推定復旧時刻")

class SystemAlert(BaseModel):
    """システムアラート"""
    alert_id: str = Field(..., description="アラートID")
    alert_level: AlertLevel = Field(..., description="アラートレベル")
    service_name: str = Field(..., description="対象サービス名")
    alert_message: str = Field(..., description="アラートメッセージ")
    created_at: str = Field(..., description="発生時刻")
    resolved_at: Optional[str] = Field(None, description="解決時刻")
    is_resolved: bool = Field(default=False, description="解決済みフラグ")

class SystemAlertsResponse(BaseModel):
    """システムアラート一覧レスポンス"""
    alerts: List[SystemAlert] = Field(..., description="アラート一覧")
    total_unresolved: int = Field(..., description="未解決アラート数")
    critical_count: int = Field(..., description="クリティカルアラート数")
    warning_count: int = Field(..., description="警告アラート数")

class BillingStatistics(BaseModel):
    """課金統計情報"""
    total_revenue_monthly: float = Field(..., description="月間総売上")
    total_revenue_yearly: float = Field(..., description="年間総売上")
    average_revenue_per_user: float = Field(..., description="ユーザー平均単価")
    subscription_distribution: Dict[str, int] = Field(..., description="プラン別ユーザー分布")
    churn_rate: float = Field(..., description="解約率")
    mrr_growth_rate: float = Field(..., description="MRR成長率")

class CostBreakdown(BaseModel):
    """コスト内訳"""
    service_name: str = Field(..., description="サービス名")
    monthly_cost: float = Field(..., description="月間コスト")
    cost_per_user: float = Field(..., description="ユーザー単価")
    usage_metrics: Dict[str, Any] = Field(..., description="使用量メトリクス")

class CostAnalysisResponse(BaseModel):
    """コスト分析レスポンス"""
    total_monthly_cost: float = Field(..., description="総月間コスト")
    cost_per_active_user: float = Field(..., description="アクティブユーザー単価")
    cost_breakdown: List[CostBreakdown] = Field(..., description="サービス別コスト内訳")
    optimization_suggestions: List[str] = Field(..., description="コスト最適化提案")
    projected_growth_cost: Dict[str, float] = Field(..., description="成長シナリオ別コスト予測")

class PerformanceMetrics(BaseModel):
    """パフォーマンスメトリクス"""
    api_response_times: Dict[str, float] = Field(..., description="API応答時間（サービス別）")
    lambda_cold_start_rates: Dict[str, float] = Field(..., description="Lambda コールドスタート率")
    database_query_performance: Dict[str, float] = Field(..., description="データベースクエリ性能")
    bedrock_api_latency: float = Field(..., description="Bedrock API レイテンシ")
    error_rates_by_service: Dict[str, float] = Field(..., description="サービス別エラー率")

class DatabaseHealth(BaseModel):
    """データベース健全性"""
    table_name: str = Field(..., description="テーブル名")
    item_count: int = Field(..., description="アイテム数")
    storage_size_mb: float = Field(..., description="ストレージサイズ（MB）")
    read_capacity_utilization: float = Field(..., description="読み取り容量使用率")
    write_capacity_utilization: float = Field(..., description="書き込み容量使用率")
    throttled_requests: int = Field(..., description="スロットルされたリクエスト数")

class SystemHealthResponse(BaseModel):
    """システム健全性レスポンス"""
    overall_status: SystemHealthStatus = Field(..., description="全体ステータス")
    last_updated: str = Field(..., description="最終更新時刻")
    
    performance_metrics: PerformanceMetrics = Field(..., description="パフォーマンスメトリクス")
    database_health: List[DatabaseHealth] = Field(..., description="データベース健全性")
    
    service_status: Dict[str, str] = Field(..., description="サービス別ステータス")
    recent_incidents: List[SystemAlert] = Field(..., description="最近のインシデント")
    
    uptime_percentage: float = Field(..., description="稼働率（%）")
    sla_compliance: float = Field(..., description="SLA遵守率（%）")
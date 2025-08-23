"""
billing-service データベース操作クラス

■システム概要■
Homebiyori（ほめびより）課金システム専用のDynamoDB操作。
Single Table Design による効率的なデータ管理と、
JST時刻統一、サブスクリプション・支払い履歴管理を提供。

■データ設計■
DynamoDB Single Table Design:
- PK: USER#{user_id}
- SK: SUBSCRIPTION / PAYMENT#{timestamp}#{payment_id} / ANALYTICS#{period}
- GSI1: サブスクリプション状態検索用
- TTL: なし（課金データは永続保存）

■設計の特徴■
- サブスクリプション状態: リアルタイム更新
- 支払い履歴: 永続化（監査・分析用）
- JST時刻: 日本のユーザーに最適化
- Stripe連携: 外部APIマスター、DynamoDBキャッシュ

■依存関係■
homebiyori-common-layer:
- DynamoDBClient: 高レベルDB操作
- Logger: 構造化ログ  
- Exceptions: 統一例外処理
"""

from typing import List, Optional, Dict, Any, Tuple
import os
import uuid
from datetime import datetime, timezone, timedelta
import json
import pytz

# Lambda Layers からの共通機能インポート
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import DatabaseError, NotFoundError, ValidationError
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string

# ローカルモジュール
from .models import (
    UserSubscription,
    SubscriptionPlan,
    SubscriptionStatus,
    get_unified_ttl_days,
    is_active_subscription
)

# 構造化ログ設定
logger = get_logger(__name__)

class BillingDatabase:
    """
    課金システム専用データベースクラス
    
    ■主要機能■
    1. サブスクリプション状態管理
    2. 支払い履歴記録・取得
    3. キャンセル理由記録
    
    ■統計・分析機能について■
    統計情報はStripe管理コンソールでより詳細に確認可能なため、
    当サービスでは重複実装を避け、コアな課金機能に特化
    """
    
    def __init__(self):
        """
        データベースクライアント初期化（billing_service必要テーブルのみ）
    
        ■billing_service用テーブル■
        - core: サブスクリプション情報（SUBSCRIPTION）
        - feedback: 解約理由フィードバック（分析用）
        
        ■不要テーブル（責任分離）■
        - chats: chat_serviceが管理
        - fruits: tree_serviceが管理
        """
        # billing_serviceに必要なテーブルのみ初期化
        self.core_client = DynamoDBClient(os.environ["CORE_TABLE_NAME"])
        self.feedback_client = DynamoDBClient(os.environ["FEEDBACK_TABLE_NAME"])
        self.logger = get_logger(__name__)
    
    # =====================================
    # サブスクリプション管理
    # =====================================
    
    async def get_user_subscription(self, user_id: str) -> Optional[UserSubscription]:
        """
        ユーザーのサブスクリプション情報を取得（設計書準拠版）
        
        Args:
            user_id: ユーザーID
            
        Returns:
            UserSubscription: サブスクリプション情報（存在しない場合はNone）
        """
        try:
            pk = f"USER#{user_id}"
            sk = "SUBSCRIPTION"
            
            item = await self.core_client.get_item(pk, sk)
            
            if item:
                # JST時刻に変換（設計書準拠）
                subscription = UserSubscription(
                    user_id=item["user_id"],
                    subscription_id=item.get("subscription_id"),
                    customer_id=item.get("customer_id"),
                    current_plan=SubscriptionPlan(item.get("current_plan", "trial")),
                    status=SubscriptionStatus(item.get("status", "active")),
                    current_period_start=self._parse_jst_datetime(item.get("current_period_start")),
                    current_period_end=self._parse_jst_datetime(item.get("current_period_end")),
                    cancel_at_period_end=item.get("cancel_at_period_end", False),
                    canceled_at=self._parse_jst_datetime(item.get("canceled_at")),
                    # 設計書準拠：trialフィールド追加
                    trial_start_date=self._parse_jst_datetime(item.get("trial_start_date")),
                    trial_end_date=self._parse_jst_datetime(item.get("trial_end_date")),
                    created_at=self._parse_jst_datetime(item.get("created_at", get_current_jst().isoformat())),
                    updated_at=self._parse_jst_datetime(item.get("updated_at", get_current_jst().isoformat()))
                )
                
                self.logger.info(f"サブスクリプション取得成功: user_id={user_id}, plan={subscription.current_plan}")
                return subscription
            
            self.logger.info(f"サブスクリプション未登録: user_id={user_id}")
            return None
            
        except Exception as e:
            self.logger.error(f"サブスクリプション取得エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"サブスクリプション情報の取得に失敗しました: {e}")
    
    async def save_user_subscription(self, subscription: UserSubscription) -> None:
        """
        ユーザーのサブスクリプション情報を保存（設計書準拠版）
        
        Args:
            subscription: サブスクリプション情報
        """
        try:
            now = get_current_jst()
            
            item = {
                "PK": f"USER#{subscription.user_id}",
                "SK": "SUBSCRIPTION",
                "user_id": subscription.user_id,
                "subscription_id": subscription.subscription_id,
                "customer_id": subscription.customer_id,
                "current_plan": subscription.current_plan.value,
                "status": subscription.status.value,
                "current_period_start": to_jst_string(subscription.current_period_start) if subscription.current_period_start else None,
                "current_period_end": to_jst_string(subscription.current_period_end) if subscription.current_period_end else None,
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "canceled_at": to_jst_string(subscription.canceled_at) if subscription.canceled_at else None,
                # 設計書準拠：trialフィールド追加
                "trial_start_date": to_jst_string(subscription.trial_start_date) if subscription.trial_start_date else None,
                "trial_end_date": to_jst_string(subscription.trial_end_date) if subscription.trial_end_date else None,
                "created_at": to_jst_string(subscription.created_at),
                "updated_at": to_jst_string(now),
                # 課金データは永続保存（TTL設定なし）
                # GSI1PK/GSI1SK削除: TerraformでGSI作成時にcurrent_plan/statusフィールドを指定
            }
            
            await self.core_client.put_item(item)
            
            # 更新時刻を反映
            subscription.updated_at = now
            
            self.logger.info(f"サブスクリプション保存完了: user_id={subscription.user_id}")
            
        except Exception as e:
            self.logger.error(f"サブスクリプション保存エラー: user_id={subscription.user_id}, error={e}")
            raise DatabaseError(f"サブスクリプション情報の保存に失敗しました: {e}")
    
    # =====================================
    # 支払い履歴管理
    # =====================================
    
    # PaymentHistory関連機能はwebhook_serviceに完全移管されました
    # 移管日: 2024-08-22
    # 
    # ■責任分離後の役割■
    # billing_service: サブスクリプション管理のみ（Stripe API呼び出し）
    # - サブスクリプション作成・更新・キャンセル
    # - 顧客管理（Customer CRUD）
    # - 課金ポータルセッション作成
    # 
    # webhook_service: PaymentHistory完全管理（Stripe Webhook受信）
    # - PaymentHistory完全管理
    # - Stripe Webhookイベント処理
    # - 決済完了・失敗の状態更新
    #
    # PaymentHistory関連の実装はwebhook_serviceで行ってください
    
    # PaymentHistory取得機能はwebhook_serviceに完全移管されました
    # 移管日: 2024-08-22
    # 
    # ■責任分離後の役割■
    # billing_service: サブスクリプション管理のみ
    # webhook_service: PaymentHistory完全管理
    #
    # PaymentHistory取得はwebhook_serviceのAPIをご利用ください
    
    # =====================================
    # キャンセル理由・分析データ
    # =====================================
    
    async def record_cancellation_reason(
        self,
        user_id: str,
        subscription_id: str,
        reason_category: str,
        reason_text: str = None,
        satisfaction_score: int = None,
        improvement_suggestions: str = None,
        canceled_plan: str = None,
        usage_duration_days: int = None
    ) -> None:
        """
        キャンセル理由をfeedbackテーブルに記録（design_database.md準拠）
        
        ■feedbackテーブル対応■
        - PK: FEEDBACK#subscription_cancellation
        - SK: {timestamp}
        - 個別カラム: reason_category, reason_text, satisfaction_score, etc.
        
        Args:
            user_id: ユーザーID
            subscription_id: サブスクリプションID
            reason_category: 理由カテゴリー (price|features|usability|competitors|other)
            reason_text: 自由記述理由（任意）
            satisfaction_score: 満足度スコア 1-5（任意）
            improvement_suggestions: 改善提案（任意）
            canceled_plan: 解約プラン (monthly|yearly)（任意）
            usage_duration_days: 利用期間日数（任意）
        """
        try:
            now = get_current_jst()
            timestamp_str = now.strftime("%Y-%m-%dT%H:%M:%S+09:00")
            feedback_id = f"feedback_{user_id}_{int(now.timestamp())}"
            
            item = {
                "PK": "FEEDBACK#subscription_cancellation",
                "SK": timestamp_str,
                "feedback_id": feedback_id,
                "user_id": user_id,
                "subscription_id": subscription_id,
                "feedback_type": "subscription_cancellation",
                "reason_category": reason_category,
                "reason_text": reason_text,
                "satisfaction_score": satisfaction_score,
                "improvement_suggestions": improvement_suggestions,
                "canceled_plan": canceled_plan,
                "usage_duration_days": usage_duration_days,
                "created_at": timestamp_str
                # GSI1/GSI2はTerraformで自動設定（feedback_type/reason_category, satisfaction_score/created_at）
            }
            
            # None値を除去してクリーンなデータ保存
            item = {k: v for k, v in item.items() if v is not None}
            
            await self.feedback_client.put_item(item)
            
            self.logger.info(f"キャンセル理由記録完了: user_id={user_id}, category={reason_category}")
            
        except Exception as e:
            self.logger.error(f"キャンセル理由記録エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"キャンセル理由の記録に失敗しました: {e}")
    
    # save_subscription_analyticsメソッドは削除されました
    # 理由: SubscriptionAnalytics機能削除により不要となった
    # 削除日: 2024-08-21
    # 統計情報はStripe管理コンソールで確認可能
    
    # =====================================
    # 統計・分析クエリセクションは削除されました
    # Stripe管理コンソールで詳細な統計情報を確認してください
    # =====================================
    
    # get_active_subscription_countメソッドは削除されました（2024-08-22）
    # 理由: 
    # 1. 使用されていない: main.pyで呼び出されておらず、APIエンドポイントとして公開もされていない
    # 2. Stripe管理コンソールで代替可能: サブスクリプション数統計はStripe管理画面で確認可能
    # 3. 責任分離: billing_serviceは課金処理に特化、統計・分析機能は将来のadmin_serviceで実装
    # 4. コスト最適化: 不要なGSIクエリ削除によるDynamoDB利用コスト削減
    
    # get_monthly_revenue_statsメソッドは削除されました
    # 理由: 統計機能削除の一環として削除（Stripe管理コンソールで確認可能）
    # 削除日: 2024-08-21
    # 月次収益統計はStripe管理コンソールのレポート機能で詳細に確認可能
    
    # =====================================
    # ヘルスチェック
    # =====================================
    
    async def health_check(self) -> Dict[str, Any]:
        """
        データベース接続ヘルスチェック（統一戻り値型）
        
        billing_serviceで使用する全テーブル（core + feedback）の接続確認
        
        Returns:
            Dict[str, Any]: ヘルスチェック結果
        """
        try:
            # billing_serviceで使用する全テーブルの存在確認
            # 1. coreテーブル（サブスクリプション管理）
            await self.core_client.describe_table()
            
            # 2. feedbackテーブル（解約理由収集）
            await self.feedback_client.describe_table()
            
            self.logger.info("課金サービス ヘルスチェック成功")
            return {
                "status": "healthy",
                "service": "billing_service",
                "database": "connected",
                "core_table": "available",
                "feedback_table": "available"
            }
            
        except Exception as e:
            self.logger.error(f"課金サービス ヘルスチェック失敗: {e}")
            return {
                "status": "unhealthy",
                "service": "billing_service", 
                "database": "error",
                "error": str(e)
            }
    
    # =====================================
    # ユーティリティメソッド
    # =====================================
    
    def _parse_jst_datetime(self, datetime_str: Optional[str]) -> Optional[datetime]:
        """
        JST時刻文字列をdatetimeオブジェクトに変換
        
        Args:
            datetime_str: 時刻文字列
            
        Returns:
            datetime: datetimeオブジェクト（Noneの場合はNone）
        """
        if not datetime_str:
            return None
        
        try:
            # ISO文字列をパース
            dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
            
            # JSTに変換
            jst = pytz.timezone('Asia/Tokyo')
            return dt.astimezone(jst)
            
        except Exception as e:
            self.logger.warning(f"日時パースエラー: datetime_str={datetime_str}, error={e}")
            return None

    # =====================================
    # トライアル期間管理（新戦略）
    # =====================================
    
    async def check_trial_status(self, user_id: str) -> Dict[str, Any]:
        """
        ユーザーのトライアル状態をチェック
        
        Args:
            user_id: ユーザーID
            
        Returns:
            Dict: トライアル状態情報
                - is_trial_active: トライアル有効フラグ
                - trial_start_date: トライアル開始日
                - trial_end_date: トライアル終了日
                - days_remaining: 残り日数
                - needs_expiration: 期限切れ処理が必要か
        """
        try:
            subscription = await self.get_user_subscription(user_id)
            
            if not subscription:
                return {
                    "is_trial_active": False,
                    "trial_start_date": None,
                    "trial_end_date": None,
                    "days_remaining": 0,
                    "needs_expiration": False
                }
            
            # トライアルプランかチェック
            if subscription.current_plan != SubscriptionPlan.TRIAL:
                return {
                    "is_trial_active": False,
                    "trial_start_date": None,
                    "trial_end_date": None,
                    "days_remaining": 0,
                    "needs_expiration": False
                }
            
            # トライアル期間計算
            from homebiyori_common.utils.parameter_store import get_parameter
            trial_duration_days = int(get_parameter(
                "/prod/homebiyori/trial/duration_days", 
                default_value="7"
            ))
            
            current_time = get_current_jst()
            trial_start = subscription.current_period_start or subscription.created_at
            trial_end = trial_start + timedelta(days=trial_duration_days)
            
            is_trial_active = current_time < trial_end
            days_remaining = max(0, (trial_end - current_time).days)
            needs_expiration = current_time >= trial_end and subscription.status == SubscriptionStatus.ACTIVE
            
            self.logger.debug(
                "Trial status checked",
                extra={
                    "user_id": user_id[:8] + "****",
                    "is_trial_active": is_trial_active,
                    "days_remaining": days_remaining,
                    "needs_expiration": needs_expiration
                }
            )
            
            return {
                "is_trial_active": is_trial_active,
                "trial_start_date": trial_start.isoformat(),
                "trial_end_date": trial_end.isoformat(),
                "days_remaining": days_remaining,
                "needs_expiration": needs_expiration
            }
            
        except Exception as e:
            self.logger.error(
                "Failed to check trial status",
                extra={"error": str(e), "user_id": user_id[:8] + "****"}
            )
            raise DatabaseError(f"Failed to check trial status: {str(e)}")
    
    async def expire_trial_subscription(self, user_id: str) -> bool:
        """
        トライアル期間終了処理
        
        Args:
            user_id: ユーザーID
            
        Returns:
            bool: 更新成功フラグ
        """
        try:
            subscription = await self.get_user_subscription(user_id)
            
            if not subscription or subscription.current_plan != SubscriptionPlan.TRIAL:
                return False
            
            # ステータスをcanceledに変更（トライアル期間終了）
            subscription.status = SubscriptionStatus.CANCELED
            subscription.updated_at = get_current_jst()
            
            await self.save_user_subscription(subscription)
            
            self.logger.info(
                "Trial subscription expired",
                extra={"user_id": user_id[:8] + "****"}
            )
            
            return True
            
        except Exception as e:
            self.logger.error(
                "Failed to expire trial subscription",
                extra={"error": str(e), "user_id": user_id[:8] + "****"}
            )
            return False

    
    # この機能は共通Layer (homebiyori_common.middleware.access_control) に移行されました
    # 削除されたメソッド: check_user_access_allowed
    # 理由: 全サービス統一のアクセス制御として共通Layer化により冗長となったため
    # 代替: homebiyori_common.middleware.access_control.AccessControlClient.check_user_access


# =====================================
# ファクトリー関数
# =====================================

_billing_database_instance = None

def get_billing_database() -> BillingDatabase:
    """
    BillingDatabaseインスタンスを取得（シングルトンパターン）
    
    Returns:
        BillingDatabase: データベースクライアント
    """
    global _billing_database_instance
    if _billing_database_instance is None:
        _billing_database_instance = BillingDatabase()
    return _billing_database_instance
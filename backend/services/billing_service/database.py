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
    PaymentHistory,
    SubscriptionAnalytics,
    SubscriptionPlan,
    SubscriptionStatus,
    PaymentStatus,
    calculate_ttl_for_plan,
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
    3. 課金分析データ管理
    4. キャンセル理由記録
    """
    
    def __init__(self):
        """
        データベースクライアント初期化（4テーブル統合対応）
    
        ■4テーブル統合対応■
        - core: サブスクリプション情報（SUBSCRIPTION）、通知（NOTIFICATION#timestamp）
        - chats: チャット履歴（TTL管理）
        - fruits: 実の情報（永続保存）
        - feedback: フィードバック（分析用）
        """
        # 4つのテーブル用のクライアントを初期化：環境変数からテーブル名取得
        self.core_client = DynamoDBClient(os.environ["CORE_TABLE_NAME"])
        self.chats_client = DynamoDBClient(os.environ["CHATS_TABLE_NAME"])
        self.fruits_client = DynamoDBClient(os.environ["FRUITS_TABLE_NAME"])
        self.feedback_client = DynamoDBClient(os.environ["FEEDBACK_TABLE_NAME"])
        self.logger = get_logger(__name__)
    
    # =====================================
    # サブスクリプション管理
    # =====================================
    
    async def get_user_subscription(self, user_id: str) -> Optional[UserSubscription]:
        """
        ユーザーのサブスクリプション情報を取得
        
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
                # JST時刻に変換
                subscription = UserSubscription(
                    user_id=item["user_id"],
                    subscription_id=item.get("subscription_id"),
                    customer_id=item.get("customer_id"),
                    current_plan=SubscriptionPlan(item.get("current_plan", "free")),
                    status=SubscriptionStatus(item.get("status", "active")),
                    current_period_start=self._parse_jst_datetime(item.get("current_period_start")),
                    current_period_end=self._parse_jst_datetime(item.get("current_period_end")),
                    cancel_at_period_end=item.get("cancel_at_period_end", False),
                    canceled_at=self._parse_jst_datetime(item.get("canceled_at")),
                    ttl_days=item.get("ttl_days", 30),
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
        ユーザーのサブスクリプション情報を保存
        
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
                "ttl_days": subscription.ttl_days,
                "created_at": to_jst_string(subscription.created_at),
                "updated_at": to_jst_string(now),
                # GSI1用（サブスクリプション検索）
                "GSI1PK": f"SUBSCRIPTION#{subscription.current_plan.value}",
                "GSI1SK": f"{subscription.status.value}#{subscription.user_id}",
                # TTL設定なし（課金データは永続保存）
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
    
    async def save_payment_history(self, payment: PaymentHistory) -> None:
        """
        支払い履歴を保存
        
        Args:
            payment: 支払い履歴情報
        """
        try:
            timestamp_str = payment.created_at.strftime("%Y%m%d%H%M%S")
            
            item = {
                "PK": f"USER#{payment.user_id}",
                "SK": f"PAYMENT#{timestamp_str}#{payment.payment_id}",
                "payment_id": payment.payment_id,
                "user_id": payment.user_id,
                "subscription_id": payment.subscription_id,
                "stripe_payment_intent_id": payment.stripe_payment_intent_id,
                "amount": payment.amount,
                "currency": payment.currency,
                "status": payment.status.value,
                "billing_period_start": to_jst_string(payment.billing_period_start),
                "billing_period_end": to_jst_string(payment.billing_period_end),
                "payment_method_type": payment.payment_method_type,
                "card_last4": payment.card_last4,
                "card_brand": payment.card_brand,
                "description": payment.description,
                "failure_reason": payment.failure_reason,
                "paid_at": to_jst_string(payment.paid_at) if payment.paid_at else None,
                "created_at": to_jst_string(payment.created_at),
                # GSI1用（支払い履歴検索）
                "GSI1PK": f"PAYMENT#{payment.user_id}",
                "GSI1SK": f"{payment.status.value}#{timestamp_str}",
            }
            
            await self.core_client.put_item(item)
            
            self.logger.info(f"支払い履歴保存完了: user_id={payment.user_id}, payment_id={payment.payment_id}")
            
        except Exception as e:
            self.logger.error(f"支払い履歴保存エラー: payment_id={payment.payment_id}, error={e}")
            raise DatabaseError(f"支払い履歴の保存に失敗しました: {e}")
    
    async def get_payment_history(
        self,
        user_id: str,
        limit: int = 20,
        next_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        ユーザーの支払い履歴を取得
        
        Args:
            user_id: ユーザーID
            limit: 取得件数制限
            next_token: ページネーショントークン
            
        Returns:
            Dict: 支払い履歴とメタデータ
        """
        try:
            pk = f"USER#{user_id}"
            
            # 基本クエリ条件
            query_params = {
                "pk": pk,
                "sk_condition": "begins_with(SK, :sk_prefix)",
                "expression_values": {":sk_prefix": "PAYMENT#"},
                "limit": limit,
                "scan_index_forward": False  # 新しい順
            }
            
            if next_token:
                query_params["next_token"] = next_token
            
            # クエリ実行
            result = await self.core_client.query_with_pagination(**query_params)
            
            # PaymentHistoryオブジェクトに変換
            payments = []
            for item in result["items"]:
                payment = PaymentHistory(
                    payment_id=item["payment_id"],
                    user_id=item["user_id"],
                    subscription_id=item["subscription_id"],
                    stripe_payment_intent_id=item["stripe_payment_intent_id"],
                    amount=item["amount"],
                    currency=item["currency"],
                    status=PaymentStatus(item["status"]),
                    billing_period_start=self._parse_jst_datetime(item["billing_period_start"]),
                    billing_period_end=self._parse_jst_datetime(item["billing_period_end"]),
                    payment_method_type=item.get("payment_method_type"),
                    card_last4=item.get("card_last4"),
                    card_brand=item.get("card_brand"),
                    description=item.get("description"),
                    failure_reason=item.get("failure_reason"),
                    paid_at=self._parse_jst_datetime(item.get("paid_at")),
                    created_at=self._parse_jst_datetime(item["created_at"])
                )
                payments.append(payment)
            
            self.logger.info(f"支払い履歴取得完了: user_id={user_id}, count={len(payments)}")
            
            return {
                "items": payments,
                "next_token": result.get("next_token"),
                "has_more": result.get("has_more", False)
            }
            
        except Exception as e:
            self.logger.error(f"支払い履歴取得エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"支払い履歴の取得に失敗しました: {e}")
    
    # =====================================
    # キャンセル理由・分析データ
    # =====================================
    
    async def record_cancellation_reason(self, user_id: str, reason: str) -> None:
        """
        キャンセル理由を記録（4テーブル統合対応）
    
    ■feedbackテーブル対応■
    - PK: FEEDBACK#subscription_cancellation
        - SK: {timestamp}
        
        Args:
            user_id: ユーザーID
            reason: キャンセル理由
        """
        try:
            now = get_current_jst()
            timestamp_str = now.strftime("%Y-%m-%dT%H:%M:%S+09:00")
            
            item = {
                "PK": "FEEDBACK#subscription_cancellation",
                "SK": timestamp_str,
                "user_id": user_id,
                "feedback_type": "cancellation_reason",
                "reason_category": "other",  # デフォルト値
                "reason_text": reason,
                "satisfaction_score": None,
                "improvement_suggestions": None,
                "created_at": timestamp_str,
                # feedbackテーブルGSI用
                "GSI1PK": "FEEDBACK#cancellation#other",
                "GSI2PK": "FEEDBACK#cancellation#unknown"
            }
            
            await self.feedback_client.put_item(item)
            
            self.logger.info(f"キャンセル理由記録完了: user_id={user_id}")
            
        except Exception as e:
            self.logger.error(f"キャンセル理由記録エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"キャンセル理由の記録に失敗しました: {e}")
    
    async def save_subscription_analytics(self, analytics: SubscriptionAnalytics) -> None:
        """
        サブスクリプション分析データを保存
        
        Args:
            analytics: 分析データ
        """
        try:
            item = {
                "PK": f"USER#{analytics.user_id}",
                "SK": f"ANALYTICS#{analytics.analysis_period}",
                "user_id": analytics.user_id,
                "analysis_period": analytics.analysis_period,
                "total_paid_amount": analytics.total_paid_amount,
                "subscription_start_date": to_jst_string(analytics.subscription_start_date) if analytics.subscription_start_date else None,
                "subscription_duration_days": analytics.subscription_duration_days,
                "successful_payments": analytics.successful_payments,
                "failed_payments": analytics.failed_payments,
                "average_payment_amount": analytics.average_payment_amount,
                "plan_changes": json.dumps(analytics.plan_changes),
                "analyzed_at": to_jst_string(analytics.analyzed_at),
            }
            
            await self.core_client.put_item(item)
            
            self.logger.info(f"分析データ保存完了: user_id={analytics.user_id}, period={analytics.analysis_period}")
            
        except Exception as e:
            self.logger.error(f"分析データ保存エラー: user_id={analytics.user_id}, error={e}")
            raise DatabaseError(f"分析データの保存に失敗しました: {e}")
    
    # =====================================
    # 統計・分析クエリ
    # =====================================
    
    async def get_active_subscription_count(self) -> int:
        """
        アクティブなサブスクリプション数を取得
        
        Returns:
            int: アクティブサブスクリプション数
        """
        try:
            # GSI1を使用してアクティブサブスクリプションを検索
            result = await self.core_client.query_gsi(
                "GSI1",
                pk="monthly",
                sk_prefix="active"
            )
            
            active_count = len(result.get("items", []))
            
            self.logger.info(f"アクティブサブスクリプション数取得: count={active_count}")
            return active_count
            
        except Exception as e:
            self.logger.error(f"アクティブサブスクリプション数取得エラー: {e}")
            raise DatabaseError(f"アクティブサブスクリプション数の取得に失敗しました: {e}")
    
    async def get_monthly_revenue_stats(self, year_month: str) -> Dict[str, Any]:
        """
        月次収益統計を取得
        
        Args:
            year_month: 年月（YYYY-MM形式）
            
        Returns:
            Dict: 月次収益統計
        """
        try:
            # 月初と月末を計算
            year, month = map(int, year_month.split("-"))
            start_date = f"{year:04d}-{month:02d}-01"
            
            if month == 12:
                end_date = f"{year+1:04d}-01-01"
            else:
                end_date = f"{year:04d}-{month+1:02d}-01"
            
            # 新しいテーブル構成ではGSI削除のため、基本クエリに変更
            # 月次統計は別途実装が必要
            result = {"items": []}
            self.logger.warning(f"月次収益統計は新テーブル構成では未実装: {year_month}")
            
            # 統計計算
            payments = result.get("items", [])
            total_revenue = sum(item.get("amount", 0) for item in payments if item.get("status") == "succeeded")
            successful_payments = len([item for item in payments if item.get("status") == "succeeded"])
            failed_payments = len([item for item in payments if item.get("status") == "failed"])
            
            stats = {
                "year_month": year_month,
                "total_revenue": total_revenue,
                "successful_payments": successful_payments,
                "failed_payments": failed_payments,
                "total_payments": len(payments),
                "success_rate": (successful_payments / len(payments) * 100) if payments else 0
            }
            
            self.logger.info(f"月次収益統計取得完了: {year_month}, revenue={total_revenue}")
            return stats
            
        except Exception as e:
            self.logger.error(f"月次収益統計取得エラー: year_month={year_month}, error={e}")
            raise DatabaseError(f"月次収益統計の取得に失敗しました: {e}")
    
    # =====================================
    # ヘルスチェック
    # =====================================
    
    async def health_check(self) -> bool:
        """
        データベース接続ヘルスチェック
        
        Returns:
            bool: 接続が正常かどうか
        """
        try:
            # テーブル存在確認（coreテーブル）
            await self.core_client.describe_table()
            return True
            
        except Exception as e:
            self.logger.error(f"ヘルスチェック失敗: {e}")
            return False
    
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
# ファクトリー関数
# =====================================

def get_billing_database() -> BillingDatabase:
    """
    BillingDatabaseインスタンスを取得
    
    Returns:
        BillingDatabase: データベースクライアント
    """
    return BillingDatabase()
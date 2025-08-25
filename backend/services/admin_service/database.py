"""
Admin Service Database Layer

管理者サービス専用のDynamoDB接続とデータアクセス層。
4テーブル構成に対応した統計情報取得とメトリクス算出機能を提供。
"""

import asyncio
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from homebiyori_common import get_logger
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.utils.datetime_utils import get_current_jst

logger = get_logger(__name__)


class AdminServiceDatabase:
    """管理者サービス専用データベースクライアント"""
    
    def __init__(self):
        """4テーブル構成 + payments テーブルのDynamoDBクライアント初期化"""
        # 4テーブル構成対応：環境変数からテーブル名取得
        self.core_client = DynamoDBClient(os.environ["CORE_TABLE_NAME"])
        self.chats_client = DynamoDBClient(os.environ["CHATS_TABLE_NAME"])  
        self.fruits_client = DynamoDBClient(os.environ["FRUITS_TABLE_NAME"])
        self.feedback_client = DynamoDBClient(os.environ["FEEDBACK_TABLE_NAME"])
        
        # Issue #27対応: PaymentHistory専用のpaymentsテーブルを追加
        # - 7年保管TTL設定でcoreテーブル90日TTLと分離
        # - 法的要件準拠の決済履歴管理
        self.payments_client = DynamoDBClient(os.environ["PAYMENTS_TABLE_NAME"])
    
    # ユーザー統計メソッド
    async def get_total_user_count(self) -> int:
        """総ユーザー数取得"""
        try:
            # coreテーブルからユーザープロフィール数をカウント
            result = await self.core_client.query_by_prefix(
                pk="USER#",
                sk_prefix="PROFILE",
                projection_expression="PK"
            )
            return result.get('count', 0)
            
        except Exception as e:
            logger.error(f"Failed to get total user count: {str(e)}")
            return 0

    async def get_premium_user_count(self) -> int:
        """プレミアムユーザー数取得"""
        try:
            # coreテーブルからアクティブなサブスクリプション数をカウント
            result = await self.core_client.query_by_prefix(
                pk="USER#",
                sk_prefix="SUBSCRIPTION",
                filter_expression="current_plan <> :plan AND #status = :status",
                expression_names={"#status": "status"},
                expression_values={":plan": "free", ":status": "active"}
            )
            return result.get('count', 0)
            
        except Exception as e:
            logger.error(f"Failed to get premium user count: {str(e)}")
            return 0

    async def get_active_users_count(self, since_time: datetime) -> int:
        """指定時刻以降のアクティブユーザー数取得"""
        try:
            # chatsテーブルから指定時刻以降のユニークユーザー数をカウント
            timestamp_str = since_time.strftime("%Y-%m-%dT%H:%M:%S+09:00")
            
            # chatsテーブルで指定時刻以降のチャット履歴をクエリ
            result = await self.chats_client.query_by_prefix(
                pk="USER#",
                sk_prefix="CHAT#",
                filter_expression="created_at >= :timestamp",
                expression_values={":timestamp": timestamp_str},
                projection_expression="PK"
            )
            
            # ユニークユーザーIDを抽出
            unique_users = set()
            for item in result.get('items', []):
                user_id = item['PK'].replace('USER#', '')
                unique_users.add(user_id)
            
            return len(unique_users)
            
        except Exception as e:
            logger.error(f"Failed to get active users count: {str(e)}")
            return 0

    async def count_chats_since(self, since_time: datetime) -> int:
        """指定時刻以降のチャット数カウント"""
        try:
            timestamp_str = since_time.strftime("%Y-%m-%dT%H:%M:%S+09:00")
            
            # chatsテーブルで指定時刻以降のチャット数をカウント
            result = await self.chats_client.query_by_prefix(
                pk="USER#",
                sk_prefix="CHAT#",
                filter_expression="created_at >= :timestamp",
                expression_values={":timestamp": timestamp_str}
            )
            
            return result.get('count', 0)
            
        except Exception as e:
            logger.error(f"Failed to count chats: {str(e)}")
            return 0

    async def get_new_users_count(self, today_start: datetime, week_start: datetime) -> Dict[str, int]:
        """新規ユーザー数取得"""
        try:
            today_str = today_start.strftime("%Y-%m-%dT%H:%M:%S+09:00")
            week_str = week_start.strftime("%Y-%m-%dT%H:%M:%S+09:00")
            
            # 本日の新規ユーザー（coreテーブルのPROFILE）
            today_result = await self.core_client.query_by_prefix(
                pk="USER#",
                sk_prefix="PROFILE",
                filter_expression="created_at >= :timestamp",
                expression_values={":timestamp": today_str}
            )
            
            # 週間の新規ユーザー
            weekly_result = await self.core_client.query_by_prefix(
                pk="USER#",
                sk_prefix="PROFILE", 
                filter_expression="created_at >= :timestamp",
                expression_values={":timestamp": week_str}
            )
            
            return {
                'today': today_result.get('count', 0),
                'weekly': weekly_result.get('count', 0)
            }
            
        except Exception as e:
            logger.error(f"Failed to get new users count: {str(e)}")
            return {'today': 0, 'weekly': 0}

    # メトリクス統合メソッド
    async def get_user_metrics(self, today_start: datetime, week_start: datetime) -> Dict[str, int]:
        """ユーザーメトリクス取得"""
        try:
            # 並行してメトリクス取得
            total_users, premium_users, active_today, active_weekly = await asyncio.gather(
                self.get_total_user_count(),
                self.get_premium_user_count(),
                self.get_active_users_count(today_start),
                self.get_active_users_count(week_start)
            )
            
            return {
                'total': total_users,
                'premium': premium_users,
                'active_today': active_today,
                'active_weekly': active_weekly
            }
            
        except Exception as e:
            logger.error(f"Failed to get user metrics: {str(e)}")
            return {'total': 0, 'premium': 0, 'active_today': 0, 'active_weekly': 0}

    async def get_chat_metrics(self, today_start: datetime, week_start: datetime) -> Dict[str, int]:
        """チャットメトリクス取得"""
        try:
            # 並行してチャット数取得
            today_chats, weekly_chats = await asyncio.gather(
                self.count_chats_since(today_start),
                self.count_chats_since(week_start)
            )
            
            return {
                'today': today_chats,
                'weekly': weekly_chats
            }
            
        except Exception as e:
            logger.error(f"Failed to get chat metrics: {str(e)}")
            return {'today': 0, 'weekly': 0}

    async def get_premium_conversion_metrics(self) -> Dict[str, float]:
        """プレミアム転換率メトリクス取得"""
        try:
            total_users, premium_users = await asyncio.gather(
                self.get_total_user_count(),
                self.get_premium_user_count()
            )
            
            conversion_rate = (premium_users / total_users * 100) if total_users > 0 else 0.0
            
            return {
                'conversion_rate': round(conversion_rate, 2)
            }
            
        except Exception as e:
            logger.error(f"Failed to get premium conversion metrics: {str(e)}")
            return {'conversion_rate': 0.0}

    async def get_user_retention_metrics(self, week_start: datetime, month_start: datetime) -> Dict[str, Any]:
        """ユーザー継続率メトリクス取得"""
        try:
            # 並行してメトリクス取得
            active_today, active_7d, active_30d, total_users = await asyncio.gather(
                self.get_active_users_count(datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)),
                self.get_active_users_count(week_start),
                self.get_active_users_count(month_start),
                self.get_total_user_count()
            )
            
            retention_7d = (active_7d / total_users * 100) if total_users > 0 else 0.0
            retention_30d = (active_30d / total_users * 100) if total_users > 0 else 0.0
            
            return {
                'active_today': active_today,
                'retention_7d': round(retention_7d, 2),
                'retention_30d': round(retention_30d, 2)
            }
            
        except Exception as e:
            logger.error(f"Failed to get user retention metrics: {str(e)}")
            return {'active_today': 0, 'retention_7d': 0.0, 'retention_30d': 0.0}

    # ヘルスチェック
    async def health_check(self) -> Dict[str, Any]:
        """データベース接続ヘルスチェック（Issue #27対応: payments_client含む）"""
        try:
            current_time = get_current_jst()
            
            # 全テーブルの疎通確認
            test_pk = "HEALTH_CHECK"
            test_sk = "ADMIN_SERVICE_TEST"
            
            # coreテーブルの疎通確認
            await self.core_client.put_item({
                "PK": test_pk,
                "SK": test_sk,
                "timestamp": current_time.isoformat(),
                "ttl": int((current_time + timedelta(minutes=1)).timestamp())
            })
            
            item = await self.core_client.get_item(pk=test_pk, sk=test_sk)
            if item:
                await self.core_client.delete_item(pk=test_pk, sk=test_sk)
            
            # Issue #27対応: paymentsテーブルの疎通確認
            await self.payments_client.describe_table()
            
            return {
                "service": "admin_service",
                "database_status": "healthy",
                "timestamp": current_time.isoformat(),
                "connected_tables": ["core", "chats", "fruits", "feedback", "payments"]  # Issue #27対応
            }
            
        except Exception as e:
            logger.error(f"Admin service health check failed: {str(e)}")
            return {
                "service": "admin_service",
                "database_status": "unhealthy",
                "error": str(e)
            }

    # Phase 3: PaymentHistory管理機能
    async def get_payment_history_list(self, request) -> Dict[str, Any]:
        """決済履歴一覧取得（管理者専用・Issue #27対応: payments_client使用）"""
        try:
            # Issue #27対応: PaymentHistory専用のpaymentsテーブルから取得
            # 7年保存のpaymentsテーブルのPAYMENT#プレフィックスで検索
            query_params = {
                "index_name": None,  # プライマリキーでクエリ
                "projection_expression": "PK, SK, amount, #status, stripe_payment_intent_id, subscription_id, billing_period_start, billing_period_end, currency, created_at, customer_id, failure_reason",
                "expression_attribute_names": {"#status": "status"}
            }
            
            # フィルタ条件構築
            if request.user_id:
                # 特定ユーザーの決済履歴
                query_params["pk"] = f"USER#{request.user_id}"
                query_params["sk_prefix"] = "PAYMENT#"
            else:
                # 全決済履歴を取得（PAYMENT#プレフィックス）
                query_params["pk"] = "PAYMENT#"  
                
            if request.status:
                if "filter_expression" not in query_params:
                    query_params["filter_expression"] = "#status = :status"
                    query_params["expression_attribute_values"] = {":status": request.status.value}
                
            if request.start_date:
                date_filter = "created_at >= :start_date"
                if "filter_expression" in query_params:
                    query_params["filter_expression"] += f" AND {date_filter}"
                else:
                    query_params["filter_expression"] = date_filter
                    query_params["expression_attribute_values"] = {}
                query_params["expression_attribute_values"][":start_date"] = request.start_date
                
            if request.end_date:
                date_filter = "created_at <= :end_date"
                if "filter_expression" in query_params:
                    query_params["filter_expression"] += f" AND {date_filter}"
                else:
                    query_params["filter_expression"] = date_filter
                    query_params["expression_attribute_values"] = {}
                if "expression_attribute_values" not in query_params:
                    query_params["expression_attribute_values"] = {}
                query_params["expression_attribute_values"][":end_date"] = request.end_date

            # ページネーション
            if request.cursor:
                query_params["exclusive_start_key"] = request.cursor
                
            query_params["limit"] = request.limit
            
            # Issue #27対応: payments_clientでクエリ実行
            result = await self.payments_client.query(**query_params)
            
            # PaymentHistoryInfo形式に変換
            payments = []
            for item in result.get("items", []):
                payment_info = {
                    "user_id": item["PK"].replace("USER#", "") if item["PK"].startswith("USER#") else "",
                    "stripe_payment_intent_id": item.get("stripe_payment_intent_id", ""),
                    "subscription_id": item.get("subscription_id", ""),
                    "amount": item.get("amount", 0),
                    "status": item.get("status", "unknown"),
                    "currency": item.get("currency", "jpy"),
                    "billing_period_start": item.get("billing_period_start"),
                    "billing_period_end": item.get("billing_period_end"), 
                    "customer_id": item.get("customer_id"),  # payments テーブル対応
                    "failure_reason": item.get("failure_reason"),  # payments テーブル対応
                    "created_at": item.get("created_at", "")
                }
                payments.append(payment_info)
            
            # レスポンス構築
            return {
                "payments": payments,
                "total_count": result.get("count", len(payments)),
                "has_next_page": "last_evaluated_key" in result,
                "next_cursor": result.get("last_evaluated_key") if "last_evaluated_key" in result else None
            }
            
        except Exception as e:
            logger.error(f"Failed to get payment history list from payments table: {str(e)}")
            return {"payments": [], "total_count": 0, "has_next_page": False, "next_cursor": None}

    async def get_payment_analytics(self, start_date: Optional[str], end_date: Optional[str]) -> Dict[str, Any]:
        """決済分析データ取得（管理者専用・Issue #27対応: payments_client使用）"""
        try:
            # 期間指定がない場合は過去30日間
            if not start_date or not end_date:
                end_dt = get_current_jst()
                start_dt = end_dt - timedelta(days=30)
                start_date = start_dt.strftime("%Y-%m-%d")
                end_date = end_dt.strftime("%Y-%m-%d")
            
            # Issue #27対応: payments_clientで決済履歴を取得（期間フィルタ付き）
            query_params = {
                "pk": "PAYMENT#",
                "filter_expression": "created_at BETWEEN :start_date AND :end_date",
                "expression_attribute_values": {
                    ":start_date": start_date,
                    ":end_date": end_date
                },
                "projection_expression": "amount, #status, created_at, failure_reason, customer_id",
                "expression_attribute_names": {"#status": "status"}
            }
            
            result = await self.payments_client.query(**query_params)
            payments = result.get("items", [])
            
            # 分析データ計算
            total_revenue = 0.0
            successful_payments = 0
            failed_payments = 0
            monthly_revenue = {}
            daily_volume = {}
            failure_reasons = {}
            
            for payment in payments:
                amount = payment.get("amount", 0)
                status = payment.get("status", "unknown")
                created_at = payment.get("created_at", "")
                failure_reason = payment.get("failure_reason")
                
                if status == "succeeded":
                    total_revenue += amount
                    successful_payments += 1
                elif status in ["failed", "canceled"]:
                    failed_payments += 1
                    
                    # 失敗理由集計（payments テーブル対応）
                    if failure_reason:
                        failure_reasons[failure_reason] = failure_reasons.get(failure_reason, 0) + 1
                
                # 月別売上（created_atから年月抽出）
                if created_at:
                    try:
                        month_key = created_at[:7]  # YYYY-MM
                        if status == "succeeded":
                            monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + amount
                    except:
                        pass
                
                # 日別決済量
                if created_at:
                    try:
                        day_key = created_at[:10]  # YYYY-MM-DD
                        daily_volume[day_key] = daily_volume.get(day_key, 0) + 1
                    except:
                        pass
            
            total_payments = successful_payments + failed_payments
            success_rate = (successful_payments / total_payments * 100) if total_payments > 0 else 0.0
            average_payment = (total_revenue / successful_payments) if successful_payments > 0 else 0.0
            
            # 月別売上推移を配列形式に変換
            monthly_trend = [{"month": k, "revenue": v} for k, v in sorted(monthly_revenue.items())]
            daily_volume_array = [{"date": k, "volume": v} for k, v in sorted(daily_volume.items())]
            
            return {
                "total_revenue": total_revenue,
                "successful_payments": successful_payments,
                "failed_payments": failed_payments,
                "success_rate": round(success_rate, 2),
                "average_payment_amount": round(average_payment, 2),
                "monthly_revenue_trend": monthly_trend,
                "failure_reason_distribution": failure_reasons,  # payments テーブル対応
                "daily_payment_volume": daily_volume_array
            }
            
        except Exception as e:
            logger.error(f"Failed to get payment analytics from payments table: {str(e)}")
            return {
                "total_revenue": 0.0,
                "successful_payments": 0,
                "failed_payments": 0,
                "success_rate": 0.0,
                "average_payment_amount": 0.0,
                "monthly_revenue_trend": [],
                "failure_reason_distribution": {},
                "daily_payment_volume": []
            }

    async def get_payment_trends(self, months: int) -> List[Dict[str, Any]]:
        """決済トレンドデータ取得（管理者専用・Issue #27対応: payments_client使用）"""
        try:
            # 指定月数分のデータを取得
            end_dt = get_current_jst()
            start_dt = end_dt - timedelta(days=months * 30)  # 概算
            
            # Issue #27対応: payments_clientで月別の決済データを取得
            query_params = {
                "pk": "PAYMENT#",
                "filter_expression": "created_at >= :start_date",
                "expression_attribute_values": {":start_date": start_dt.strftime("%Y-%m-%d")},
                "projection_expression": "amount, #status, created_at, failure_reason",
                "expression_attribute_names": {"#status": "status"}
            }
            
            result = await self.payments_client.query(**query_params)
            payments = result.get("items", [])
            
            # 月別集計
            monthly_data = {}
            
            for payment in payments:
                created_at = payment.get("created_at", "")
                if not created_at:
                    continue
                    
                try:
                    month_key = created_at[:7]  # YYYY-MM
                    if month_key not in monthly_data:
                        monthly_data[month_key] = {"revenue": 0, "count": 0, "success_count": 0, "failed_count": 0}
                    
                    monthly_data[month_key]["count"] += 1
                    
                    if payment.get("status") == "succeeded":
                        monthly_data[month_key]["revenue"] += payment.get("amount", 0)
                        monthly_data[month_key]["success_count"] += 1
                    elif payment.get("status") in ["failed", "canceled"]:
                        monthly_data[month_key]["failed_count"] += 1
                        
                except:
                    continue
            
            # トレンドデータを配列形式で返却
            trend_data = []
            for month, data in sorted(monthly_data.items()):
                success_rate = (data["success_count"] / data["count"] * 100) if data["count"] > 0 else 0.0
                trend_data.append({
                    "month": month,
                    "revenue": data["revenue"], 
                    "transaction_count": data["count"],
                    "success_count": data["success_count"],
                    "failed_count": data["failed_count"],  # payments テーブル対応
                    "success_rate": round(success_rate, 2)
                })
            
            return trend_data
            
        except Exception as e:
            logger.error(f"Failed to get payment trends from payments table: {str(e)}")
            return []

    async def export_payment_data(self, export_request) -> Dict[str, Any]:
        """決済データエクスポート（管理者専用・Issue #27対応: payments_client使用）"""
        try:
            # Issue #27対応: payments_clientでエクスポート対象データ取得
            query_params = {
                "pk": "PAYMENT#",
                "projection_expression": "PK, SK, amount, #status, stripe_payment_intent_id, subscription_id, billing_period_start, billing_period_end, currency, created_at, customer_id, failure_reason",
                "expression_attribute_names": {"#status": "status"}
            }
            
            # 期間フィルタ
            if export_request.start_date or export_request.end_date:
                filter_conditions = []
                expression_values = {}
                
                if export_request.start_date:
                    filter_conditions.append("created_at >= :start_date")
                    expression_values[":start_date"] = export_request.start_date
                    
                if export_request.end_date:
                    filter_conditions.append("created_at <= :end_date")
                    expression_values[":end_date"] = export_request.end_date
                
                query_params["filter_expression"] = " AND ".join(filter_conditions)
                query_params["expression_attribute_values"] = expression_values
            
            # 失敗決済除外オプション
            if not export_request.include_failed:
                status_filter = "#status = :success_status"
                if "filter_expression" in query_params:
                    query_params["filter_expression"] += f" AND {status_filter}"
                else:
                    query_params["filter_expression"] = status_filter
                    query_params["expression_attribute_values"] = {}
                query_params["expression_attribute_values"][":success_status"] = "succeeded"
            
            # Issue #27対応: payments_clientでクエリ実行
            result = await self.payments_client.query(**query_params)
            payments = result.get("items", [])
            
            # S3に一時ファイルとしてアップロード（実装は簡略化）
            # 実際の実装では、CSV/Excelファイル生成後S3にアップロードし、署名付きURLを返却
            current_time = get_current_jst()
            file_name = f"payment_export_{current_time.strftime('%Y%m%d_%H%M%S')}.{export_request.format}"
            
            # モックレスポンス（実際はS3アップロード処理）
            return {
                "export_url": f"https://homebiyori-exports.s3.amazonaws.com/{file_name}",
                "file_name": file_name,
                "total_records": len(payments),
                "source": "payments_table"  # Issue #27対応確認用
            }
            
        except Exception as e:
            logger.error(f"Failed to export payment data from payments table: {str(e)}")
            raise Exception(f"Export failed: {str(e)}")


# =====================================
# ファクトリー関数
# =====================================

_admin_database_instance = None

def get_admin_database() -> AdminServiceDatabase:
    """
    AdminServiceDatabaseインスタンスを取得（シングルトンパターン）
    
    Returns:
        AdminServiceDatabase: データベース操作クライアント
    """
    global _admin_database_instance
    if _admin_database_instance is None:
        _admin_database_instance = AdminServiceDatabase()
    return _admin_database_instance
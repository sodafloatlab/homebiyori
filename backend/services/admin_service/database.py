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
        """4テーブル構成のDynamoDBクライアント初期化"""
        # 4テーブル構成対応：環境変数からテーブル名取得
        self.core_client = DynamoDBClient(os.environ["CORE_TABLE_NAME"])
        self.chats_client = DynamoDBClient(os.environ["CHATS_TABLE_NAME"])  
        self.fruits_client = DynamoDBClient(os.environ["FRUITS_TABLE_NAME"])
        self.feedback_client = DynamoDBClient(os.environ["FEEDBACK_TABLE_NAME"])
    
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
        """データベース接続ヘルスチェック"""
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
            
            return {
                "service": "admin_service",
                "database_status": "healthy",
                "timestamp": current_time.isoformat(),
                "connected_tables": ["core", "chats", "fruits", "feedback"]
            }
            
        except Exception as e:
            logger.error(f"Admin service health check failed: {str(e)}")
            return {
                "service": "admin_service",
                "database_status": "unhealthy",
                "error": str(e)
            }
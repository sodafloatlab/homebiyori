"""
Notification Service Database Layer

通知サービス専用のDynamoDB接続とデータアクセス層。
4テーブル構成に対応したユーザー通知と管理者通知の管理機能を提供。
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
from homebiyori_common import get_logger
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string

logger = get_logger(__name__)


class NotificationServiceDatabase:
    """通知サービス専用データベースクライアント"""
    
    def __init__(self):
        """4テーブル構成のDynamoDBクライアント初期化"""
        # 4テーブル構成対応：環境変数からテーブル名取得
        self.core_client = DynamoDBClient(os.environ["CORE_TABLE_NAME"])
        self.chats_client = DynamoDBClient(os.environ["CHATS_TABLE_NAME"])
        self.fruits_client = DynamoDBClient(os.environ["FRUITS_TABLE_NAME"])
        self.feedback_client = DynamoDBClient(os.environ["FEEDBACK_TABLE_NAME"])
    
    # ユーザー通知メソッド
    async def create_user_notification(self, item_data: Dict[str, Any]) -> None:
        """ユーザー通知作成"""
        try:
            await self.core_client.put_item(item_data)
        except Exception as e:
            logger.error(f"Failed to create user notification: {str(e)}")
            raise
    
    async def get_user_notifications_by_status(
        self, 
        user_id: str, 
        status: str, 
        limit: int = 50
    ) -> Dict[str, Any]:
        """ステータス別ユーザー通知取得（GSI使用）"""
        try:
            gsi_sk_prefix = f"STATUS#{status}#"
            
            result = await self.core_client.query_gsi(
                gsi_name="GSI1",
                pk=f"USER#{user_id}",
                sk_prefix=gsi_sk_prefix,
                limit=limit,
                scan_index_forward=False  # 新しい順
            )
            return result
        except Exception as e:
            logger.error(f"Failed to get user notifications by status: {str(e)}")
            return {'items': [], 'count': 0}
    
    async def get_user_notifications_all(
        self, 
        user_id: str, 
        limit: int = 50
    ) -> Dict[str, Any]:
        """全ユーザー通知取得"""
        try:
            result = await self.core_client.query_by_prefix(
                pk=f"USER#{user_id}",
                sk_prefix="NOTIFICATION#",
                limit=limit,
                scan_index_forward=False
            )
            return result
        except Exception as e:
            logger.error(f"Failed to get all user notifications: {str(e)}")
            return {'items': [], 'count': 0}
    
    async def get_user_notification(
        self, 
        user_id: str, 
        notification_id: str
    ) -> Optional[Dict[str, Any]]:
        """ユーザー通知詳細取得"""
        try:
            item = await self.core_client.get_item(
                pk=f"USER#{user_id}",
                sk=f"NOTIFICATION#{notification_id}"
            )
            return item
        except Exception as e:
            logger.error(f"Failed to get user notification: {str(e)}")
            return None
    
    async def update_user_notification(
        self, 
        user_id: str, 
        notification_id: str,
        update_expression: str,
        expression_names: Dict[str, str],
        expression_values: Dict[str, Any]
    ) -> bool:
        """ユーザー通知更新"""
        try:
            success = await self.core_client.update_item(
                pk=f"USER#{user_id}",
                sk=f"NOTIFICATION#{notification_id}",
                update_expression=update_expression,
                expression_names=expression_names,
                expression_values=expression_values
            )
            return success
        except Exception as e:
            logger.error(f"Failed to update user notification: {str(e)}")
            return False
    
    async def delete_user_notification(
        self, 
        user_id: str, 
        notification_id: str
    ) -> bool:
        """ユーザー通知削除"""
        try:
            deleted_item = await self.core_client.delete_item(
                pk=f"USER#{user_id}",
                sk=f"NOTIFICATION#{notification_id}"
            )
            return deleted_item is not None
        except Exception as e:
            logger.error(f"Failed to delete user notification: {str(e)}")
            return False
    
    # 管理者通知メソッド
    async def create_admin_notification(self, item_data: Dict[str, Any]) -> None:
        """管理者通知作成"""
        try:
            await self.core_client.put_item(item_data)
        except Exception as e:
            logger.error(f"Failed to create admin notification: {str(e)}")
            raise
    
    async def get_admin_notifications(
        self, 
        limit: int = 40
    ) -> Dict[str, Any]:
        """管理者通知一覧取得（GSI使用）"""
        try:
            result = await self.core_client.query_gsi(
                gsi_name="GSI1", 
                pk="ADMIN_NOTIFICATIONS",
                sk_prefix="CREATED#",
                limit=limit,
                scan_index_forward=False  # 新しい順
            )
            return result
        except Exception as e:
            logger.error(f"Failed to get admin notifications: {str(e)}")
            return {'items': [], 'count': 0}
    
    async def get_admin_notification(
        self, 
        notification_id: str
    ) -> Optional[Dict[str, Any]]:
        """管理者通知詳細取得"""
        try:
            item = await self.core_client.get_item(
                pk=f"ADMIN_NOTIFICATION#{notification_id}",
                sk="METADATA"
            )
            return item
        except Exception as e:
            logger.error(f"Failed to get admin notification: {str(e)}")
            return None
    
    async def update_admin_notification(
        self, 
        notification_id: str,
        update_expression: str,
        expression_values: Dict[str, Any]
    ) -> bool:
        """管理者通知更新"""
        try:
            success = await self.core_client.update_item(
                pk=f"ADMIN_NOTIFICATION#{notification_id}",
                sk="METADATA",
                update_expression=update_expression,
                expression_values=expression_values
            )
            return success
        except Exception as e:
            logger.error(f"Failed to update admin notification: {str(e)}")
            return False
    
    async def delete_admin_notification(
        self, 
        notification_id: str
    ) -> bool:
        """管理者通知削除"""
        try:
            deleted_item = await self.core_client.delete_item(
                pk=f"ADMIN_NOTIFICATION#{notification_id}",
                sk="METADATA"
            )
            return deleted_item is not None
        except Exception as e:
            logger.error(f"Failed to delete admin notification: {str(e)}")
            return False
    
    # 対象ユーザー取得メソッド
    async def get_all_user_profiles(self) -> List[Dict[str, Any]]:
        """全ユーザープロフィール取得"""
        try:
            result = await self.core_client.query_by_prefix(
                pk="USER#",
                sk_prefix="PROFILE"
            )
            return result.get('items', [])
        except Exception as e:
            logger.error(f"Failed to get all user profiles: {str(e)}")
            return []
    
    async def get_users_by_plan(
        self, 
        target_plan: str
    ) -> List[Dict[str, Any]]:
        """プラン別ユーザー取得"""
        try:
            result = await self.core_client.query_by_prefix(
                pk="USER#",
                sk_prefix="SUBSCRIPTION",
                filter_expression="current_plan = :plan AND #status = :status",
                expression_names={"#status": "status"},
                expression_values={":plan": target_plan, ":status": "active"}
            )
            return result.get('items', [])
        except Exception as e:
            logger.error(f"Failed to get users by plan: {str(e)}")
            return []
    
    # ヘルスチェック
    async def health_check(self) -> Dict[str, Any]:
        """データベース接続ヘルスチェック"""
        try:
            current_time = get_current_jst()
            
            # coreテーブルの疎通確認
            test_pk = "HEALTH_CHECK"
            test_sk = "NOTIFICATION_SERVICE_TEST"
            
            await self.core_client.put_item({
                "PK": test_pk,
                "SK": test_sk,
                "timestamp": to_jst_string(current_time),
                "ttl": int((current_time + timedelta(minutes=1)).timestamp())
            })
            
            item = await self.core_client.get_item(pk=test_pk, sk=test_sk)
            if item:
                await self.core_client.delete_item(pk=test_pk, sk=test_sk)
            
            return {
                "service": "notification_service",
                "database_status": "healthy",
                "timestamp": to_jst_string(current_time),
                "connected_tables": ["core", "chats", "fruits", "feedback"]
            }
            
        except Exception as e:
            logger.error(f"Notification service health check failed: {str(e)}")
            return {
                "service": "notification_service",
                "database_status": "unhealthy",
                "error": str(e)
            }
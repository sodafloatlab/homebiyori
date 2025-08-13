"""
Webhook Service Database Layer

Webhookサービス専用のDynamoDB接続とデータアクセス層。
4テーブル構成に対応したStripe Webhookイベント処理とサブスクリプション管理機能を提供。
"""

import os
from typing import Dict, Any, Optional
from datetime import timedelta
from homebiyori_common import get_logger
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string

logger = get_logger(__name__)


class WebhookServiceDatabase:
    """Webhookサービス専用データベースクライアント"""
    
    def __init__(self):
        """4テーブル構成のDynamoDBクライアント初期化"""
        # 4テーブル構成対応：環境変数からテーブル名取得
        self.core_client = DynamoDBClient(os.environ["CORE_TABLE_NAME"])
        self.chats_client = DynamoDBClient(os.environ["CHATS_TABLE_NAME"])
        self.fruits_client = DynamoDBClient(os.environ["FRUITS_TABLE_NAME"])
        self.feedback_client = DynamoDBClient(os.environ["FEEDBACK_TABLE_NAME"])
    
    # サブスクリプション管理メソッド
    async def create_subscription(self, subscription_item: Dict[str, Any]) -> None:
        """サブスクリプション作成"""
        try:
            await self.core_client.put_item(subscription_item)
        except Exception as e:
            logger.error(f"Failed to create subscription: {str(e)}")
            raise
    
    async def get_subscription(self, user_id: str) -> Optional[Dict[str, Any]]:
        """ユーザーのサブスクリプション情報取得"""
        try:
            item = await self.core_client.get_item(
                pk=f"USER#{user_id}",
                sk="SUBSCRIPTION"
            )
            return item
        except Exception as e:
            logger.error(f"Failed to get subscription: {str(e)}")
            return None
    
    async def get_subscription_by_stripe_id(self, stripe_subscription_id: str) -> Optional[Dict[str, Any]]:
        """Stripe Subscription IDからサブスクリプション情報取得"""
        try:
            # GSI1を使用してStripe IDから検索
            result = await self.core_client.query_gsi(
                gsi_name="GSI1",
                pk_value=f"STRIPE_SUB#{stripe_subscription_id}",
                limit=1
            )
            
            if result.items:
                return result.items[0]
            
            return None
        except Exception as e:
            logger.error(f"Failed to get subscription by Stripe ID: {str(e)}")
            return None
    
    async def update_subscription(
        self, 
        user_id: str, 
        update_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """サブスクリプション更新"""
        try:
            updated_item = await self.core_client.update_item(
                pk=f"USER#{user_id}",
                sk="SUBSCRIPTION",
                update_data=update_data
            )
            return updated_item
        except Exception as e:
            logger.error(f"Failed to update subscription: {str(e)}")
            return None
    
    async def update_user_profile_plan(
        self, 
        user_id: str, 
        profile_update: Dict[str, Any]
    ) -> bool:
        """ユーザープロフィールのプラン情報更新"""
        try:
            success = await self.core_client.update_item(
                pk=f"USER#{user_id}",
                sk="PROFILE",
                update_data=profile_update
            )
            return success
        except Exception as e:
            logger.error(f"Failed to update user profile plan: {str(e)}")
            return False
    
    # Webhookイベント管理メソッド
    async def store_webhook_event(self, event_data: Dict[str, Any]) -> None:
        """Webhookイベント記録（将来の拡張用）"""
        try:
            # 現在は実装しないが、将来のイベント追跡用にインターフェースを定義
            pass
        except Exception as e:
            logger.error(f"Failed to store webhook event: {str(e)}")
            raise
    
    # ヘルスチェック
    async def health_check(self) -> Dict[str, Any]:
        """データベース接続ヘルスチェック"""
        try:
            current_time = get_current_jst()
            
            # coreテーブルの疎通確認
            test_pk = "HEALTH_CHECK"
            test_sk = "WEBHOOK_SERVICE_TEST"
            
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
                "service": "webhook_service",
                "database_status": "healthy",
                "timestamp": to_jst_string(current_time),
                "connected_tables": ["core", "chats", "fruits", "feedback"]
            }
            
        except Exception as e:
            logger.error(f"Webhook service health check failed: {str(e)}")
            return {
                "service": "webhook_service",
                "database_status": "unhealthy",
                "error": str(e)
            }
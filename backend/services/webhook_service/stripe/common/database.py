"""
Stripe Webhooks Database Layer

EventBridge版 Stripe webhooks用のデータベース操作
DynamoDBアクセスの簡素化版
"""

from typing import Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError

from homebiyori_common import get_logger
from homebiyori_common.database import DynamoDBClient

logger = get_logger(__name__)


class StripeWebhookDatabase:
    """Stripe Webhook用データベースクライアント"""
    
    def __init__(self):
        self.dynamodb_client = DynamoDBClient()
        
        # テーブル名は環境変数から取得
        import os
        self.core_table_name = os.environ.get('CORE_TABLE_NAME')
        self.payments_table_name = os.environ.get('PAYMENTS_TABLE_NAME')
        
        if not self.core_table_name or not self.payments_table_name:
            raise ValueError("Required table name environment variables not set")
    
    async def get_subscription_by_customer_id(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """
        Customer IDからサブスクリプション情報を取得
        GSI2（customer_id）を使用した高速検索
        
        Args:
            customer_id: Stripe Customer ID
            
        Returns:
            Optional[Dict[str, Any]]: サブスクリプション情報
        """
        try:
            response = await self.dynamodb_client.query_gsi(
                table_name=self.core_table_name,
                index_name="GSI2",
                key_condition="customer_id = :customer_id",
                expression_attribute_values={":customer_id": customer_id},
                limit=1
            )
            
            items = response.get('Items', [])
            if not items:
                logger.warning("Subscription not found for customer_id", extra={
                    "customer_id": customer_id
                })
                return None
                
            subscription = items[0]
            logger.info("Subscription found for customer_id", extra={
                "customer_id": customer_id,
                "user_id": subscription.get("user_id"),
                "subscription_id": subscription.get("subscription_id")
            })
            
            return subscription
            
        except ClientError as e:
            logger.error("Failed to get subscription by customer_id", extra={
                "customer_id": customer_id,
                "error": str(e),
                "error_code": e.response['Error']['Code']
            })
            return None
        except Exception as e:
            logger.error("Unexpected error getting subscription by customer_id", extra={
                "customer_id": customer_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            return None
    
    async def save_payment_history(self, payment_item: Dict[str, Any]) -> bool:
        """
        PaymentHistoryをDynamoDBに保存
        
        Args:
            payment_item: DynamoDB形式の決済履歴アイテム
            
        Returns:
            bool: 保存成功フラグ
        """
        try:
            await self.dynamodb_client.put_item(
                table_name=self.payments_table_name,
                item=payment_item
            )
            
            logger.info("Payment history saved successfully", extra={
                "payment_id": payment_item.get("payment_id"),
                "user_id": payment_item.get("user_id"),
                "amount": payment_item.get("amount"),
                "status": payment_item.get("status")
            })
            
            return True
            
        except ClientError as e:
            logger.error("Failed to save payment history", extra={
                "payment_id": payment_item.get("payment_id"),
                "user_id": payment_item.get("user_id"),
                "error": str(e),
                "error_code": e.response['Error']['Code']
            })
            return False
        except Exception as e:
            logger.error("Unexpected error saving payment history", extra={
                "payment_id": payment_item.get("payment_id"),
                "user_id": payment_item.get("user_id"),
                "error": str(e),
                "error_type": type(e).__name__
            })
            return False
    
    async def get_subscription(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        ユーザーIDからサブスクリプション情報を取得
        
        Args:
            user_id: Homebiyori user ID
            
        Returns:
            Optional[Dict[str, Any]]: サブスクリプション情報
        """
        try:
            response = await self.dynamodb_client.get_item(
                table_name=self.core_table_name,
                key={
                    "pk": f"USER#{user_id}",
                    "sk": "SUBSCRIPTION"
                }
            )
            
            item = response.get('Item')
            if not item:
                logger.info("Subscription not found for user", extra={
                    "user_id": user_id
                })
                return None
                
            logger.info("Subscription found for user", extra={
                "user_id": user_id,
                "plan_type": item.get("plan_type"),
                "customer_id": item.get("customer_id")
            })
            
            return item
            
        except ClientError as e:
            logger.error("Failed to get subscription for user", extra={
                "user_id": user_id,
                "error": str(e),
                "error_code": e.response['Error']['Code']
            })
            return None
        except Exception as e:
            logger.error("Unexpected error getting subscription for user", extra={
                "user_id": user_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            return None
    
    async def update_subscription(self, user_id: str, subscription_data: Dict[str, Any]) -> bool:
        """
        サブスクリプション情報を更新
        
        Args:
            user_id: Homebiyori user ID
            subscription_data: 更新するサブスクリプション情報
            
        Returns:
            bool: 更新成功フラグ
        """
        try:
            # 更新するアイテム
            item = {
                "pk": f"USER#{user_id}",
                "sk": "SUBSCRIPTION",
                **subscription_data
            }
            
            await self.dynamodb_client.put_item(
                table_name=self.core_table_name,
                item=item
            )
            
            logger.info("Subscription updated successfully", extra={
                "user_id": user_id,
                "subscription_id": subscription_data.get("subscription_id"),
                "status": subscription_data.get("status")
            })
            
            return True
            
        except ClientError as e:
            logger.error("Failed to update subscription", extra={
                "user_id": user_id,
                "error": str(e),
                "error_code": e.response['Error']['Code']
            })
            return False
        except Exception as e:
            logger.error("Unexpected error updating subscription", extra={
                "user_id": user_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            return False


# シングルトン インスタンス作成関数
_webhook_db_instance = None

def get_webhook_database() -> StripeWebhookDatabase:
    """
    Stripe Webhook Database インスタンスを取得
    シングルトンパターンでインスタンスを管理
    
    Returns:
        StripeWebhookDatabase: データベースクライアント
    """
    global _webhook_db_instance
    
    if _webhook_db_instance is None:
        _webhook_db_instance = StripeWebhookDatabase()
    
    return _webhook_db_instance
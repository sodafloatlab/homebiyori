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
    
    # =====================================
    # PaymentHistory完全管理（責任分離対応）
    # =====================================
    
    async def save_payment_history(self, payment_data: Dict[str, Any]) -> None:
        """
        支払い履歴を保存（webhook_service完全管理）
        
        Args:
            payment_data: 支払い履歴データ
        """
        try:
            # SK構造最適化：時系列クエリに最適化
            timestamp_str = payment_data["created_at"]
            
            item = {
                "PK": f"USER#{payment_data['user_id']}",
                "SK": f"PAYMENT#{timestamp_str}",
                **payment_data,  # 全ての支払い情報を保存
            }
            
            await self.core_client.put_item(item)
            logger.info(f"PaymentHistory保存完了: user_id={payment_data['user_id']}, payment_id={payment_data['payment_id']}")
            
        except Exception as e:
            logger.error(f"PaymentHistory保存エラー: payment_id={payment_data.get('payment_id')}, error={e}")
            raise
    
    async def get_payment_history(
        self,
        user_id: str,
        limit: int = 20,
        next_token: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        ユーザーの支払い履歴を取得（webhook_service完全管理）
        
        Args:
            user_id: ユーザーID
            limit: 取得件数制限
            next_token: ページネーショントークン
            start_date: 取得開始日（ISO文字列）
            end_date: 取得終了日（ISO文字列）
            
        Returns:
            Dict: 支払い履歴とメタデータ
        """
        try:
            pk = f"USER#{user_id}"
            
            # 基本クエリ条件
            query_params = {
                "pk": pk,
                "limit": limit,
                "scan_index_forward": False  # 新しい順
            }
            
            # 期間指定がある場合
            if start_date and end_date:
                query_params["sk_condition"] = "SK BETWEEN :start_sk AND :end_sk"
                query_params["expression_values"] = {
                    ":start_sk": f"PAYMENT#{start_date}",
                    ":end_sk": f"PAYMENT#{end_date}"
                }
            else:
                # 期間指定がない場合は全PaymentHistory取得
                query_params["sk_condition"] = "begins_with(SK, :sk_prefix)"
                query_params["expression_values"] = {":sk_prefix": "PAYMENT#"}
            
            if next_token:
                query_params["next_token"] = next_token
            
            # クエリ実行
            result = await self.core_client.query_with_pagination(**query_params)
            
            logger.info(f"PaymentHistory取得完了: user_id={user_id}, count={len(result['items'])}")
            
            return {
                "items": result["items"],
                "next_token": result.get("next_token"),
                "has_more": result.get("has_more", False),
                "total_count": len(result["items"])
            }
            
        except Exception as e:
            logger.error(f"PaymentHistory取得エラー: user_id={user_id}, error={e}")
            raise
    
    async def update_payment_history(
        self,
        user_id: str,
        payment_timestamp: str,
        update_data: Dict[str, Any]
    ) -> bool:
        """
        支払い履歴を更新（webhook_service完全管理）
        
        Args:
            user_id: ユーザーID
            payment_timestamp: 支払いタイムスタンプ
            update_data: 更新データ
            
        Returns:
            bool: 更新成功フラグ
        """
        try:
            success = await self.core_client.update_item(
                pk=f"USER#{user_id}",
                sk=f"PAYMENT#{payment_timestamp}",
                update_data=update_data
            )
            
            if success:
                logger.info(f"PaymentHistory更新完了: user_id={user_id}, timestamp={payment_timestamp}")
            
            return success
            
        except Exception as e:
            logger.error(f"PaymentHistory更新エラー: user_id={user_id}, timestamp={payment_timestamp}, error={e}")
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


# =====================================
# ファクトリー関数
# =====================================

_webhook_database_instance = None

def get_webhook_database() -> WebhookServiceDatabase:
    """
    WebhookServiceDatabaseインスタンスを取得（シングルトンパターン）
    
    Returns:
        WebhookServiceDatabase: データベース操作クライアント
    """
    global _webhook_database_instance
    if _webhook_database_instance is None:
        _webhook_database_instance = WebhookServiceDatabase()
    return _webhook_database_instance
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
        """webhook_serviceで必要なDynamoDBテーブル（core + payments）を初期化"""
        # webhook_serviceでcoreテーブルを使用
        # - サブスクリプション状態管理（create/get/update）
        # - ユーザープロファイル更新（プラン情報）
        self.core_client = DynamoDBClient(os.environ["CORE_TABLE_NAME"])
        
        # Issue #27対応: PaymentHistory専用のpaymentsテーブルを追加
        # - 7年保管TTL設定でcoreテーブル90日TTLと分離
        # - 法的要件準拠の決済履歴管理
        self.payments_client = DynamoDBClient(os.environ["PAYMENTS_TABLE_NAME"])
    
    # サブスクリプション管理メソッド
    
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
    

    
    async def get_subscription_by_customer_id(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """
        Stripe Customer IDからサブスクリプション情報取得（GSI2活用）
        
        💡 効率的なアクセスパターン（GSI2実装完了）：
        - webhook_serviceではcustomer_idが主要な識別子
        - Stripe webhookイベントには必ずcustomer_idが含まれる
        - GSI2を使用してO(1)での高速検索を実現
        
        🔄 処理フロー（最適化版）：
        1. GSI2でcustomer_idを使用して直接サブスクリプション情報を取得
        2. O(1)アクセスで高速かつ確実なデータ取得
        """
        try:
            logger.info(f"Searching subscription by customer_id using GSI2: {customer_id}")
            
            # GSI2を使用してcustomer_idから直接サブスクリプション情報を取得
            result = await self.core_client.query_gsi(
                gsi_name="GSI2",
                pk_value=customer_id,
                limit=1  # 1顧客=1サブスクリプションの関係
            )
            
            if result and len(result.get("Items", [])) > 0:
                subscription_item = result["Items"][0]
                logger.info(f"Subscription found for customer_id: {customer_id}", extra={
                    "user_id": subscription_item.get("user_id"),
                    "subscription_id": subscription_item.get("stripe_subscription_id"),
                    "plan_type": subscription_item.get("plan_type"),
                    "status": subscription_item.get("status")
                })
                return subscription_item
            else:
                logger.warning(f"No subscription found for customer_id: {customer_id}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get subscription by customer ID: {str(e)}", extra={
                "customer_id": customer_id,
                "error_type": type(e).__name__
            })
            return None
    

    # =====================================
    # GSI2実装完了：customer_id最適化アクセスパターン
    # =====================================
    # 
    # ✅ GSI2実装状況：
    # - GSI2: customer_idキー（Stripe統合最適化用）実装完了
    # - PartitionKey: customer_id（Stripe Customer ID）
    # - SortKey: なし（1顧客=1サブスクリプション関係）
    # - ProjectionType: ALL（全属性取得可能）
    # 
    # 🎯 実装効果：
    # - O(1)アクセス：customer_id→サブスクリプション情報の高速取得
    # - フルスキャン排除：DynamoDB Queryによる効率的データアクセス
    # - Stripe Webhook最適化：payment.succeeded/failedイベント処理高速化
    # 
    # 💡 使用例：
    # ```python
    # # GSI2を活用した効率的なアクセス
    # subscription = await db.get_subscription_by_customer_id(customer_id)
    # # O(1)での高速検索、フルスキャン不要
    # ```
    # 
    # 🔧 Terraform設定（実装済み）：
    # ```hcl
    # global_secondary_index {
    #   name            = "GSI2"
    #   hash_key        = "customer_id"
    #   projection_type = "ALL"
    # }
    # ```
    # 
    # 📊 パフォーマンス改善：
    # - 検索時間: O(n)フルスキャン → O(1)GSI Query
    # - DynamoDBコスト: スキャン課金削減（クエリ課金最適化）
    # - Webhook処理時間: customer_id検索高速化
    
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
    
    
    
    # =====================================
    # PaymentHistory機能（Phase 1実装: DB保存機能復旧）
    # =====================================
    # Phase 1: DB保存機能復旧（webhook_service）- コンプライアンス対応
    # Phase 2: Stripe Customer Portal（billing_service）- ユーザーアクセス
    # Phase 3: admin_service - 内部管理・分析機能
    # 実装日: 2024-08-23（設計変更対応）
    
    async def save_payment_history(self, payment_history_data: Dict[str, Any]) -> bool:
        """
        決済履歴をpaymentsテーブルに保存（Issue #27対応）
        
        Args:
            payment_history_data: 決済履歴データ（PaymentHistory.to_dynamodb_item()の形式）
            
        Returns:
            bool: 保存成功可否
        """
        try:
            # Issue #27対応: paymentsテーブルに保存（7年TTL設定）
            await self.payments_client.put_item(payment_history_data)
            logger.info("Payment history saved successfully to payments table", extra={
                "user_id": payment_history_data.get("user_id"),
                "payment_id": payment_history_data.get("stripe_payment_intent_id"),
                "amount": payment_history_data.get("amount"),
                "status": payment_history_data.get("status"),
                "ttl_expires_at": payment_history_data.get("expires_at")
            })
            return True
            
        except Exception as e:
            logger.error("Failed to save payment history to payments table", extra={
                "error": str(e),
                "user_id": payment_history_data.get("user_id"),
                "payment_id": payment_history_data.get("stripe_payment_intent_id")
            })
            return False
    
    # Webhookイベント管理メソッド
    
    
    # ヘルスチェック
    # =====================================
    # webhook_service 必要処理ラインナップ（最適化後）
    # =====================================
    # 
    # 🎯 **コア責任：Stripe Webhook受信とDynamoDB同期**
    # 
    # ✅ **必須機能（保持）：**
    # 1. create_subscription() - 新規サブスクリプション作成（webhook起点）
    # 2. get_subscription() - user_id既知前提でのサブスクリプション取得
    # 3. update_subscription() - webhook経由でのサブスクリプション状態更新
    # 4. save_payment_history() - Phase 1実装：決済履歴DB保存（コンプライアンス対応）
    # 5. health_check() - サービス監視（core table接続確認）
    # 
    # ❌ **削除・無効化機能：**
    # 1. get_subscription_by_stripe_id() - GSI不整合により無効化
    # 2. update_user_profile_plan() - 責任分離違反により無効化
    # 3. store_webhook_event() - CloudWatchログで代替
    # 
    # 🔄 **条件付き追加機能：**
    # 1. get_subscription_by_customer_id() - GSI2実装時に有効化
    # 2. get_user_by_subscription_id() - マッピングテーブル実装時に有効化
    # 
    # 📊 **処理フロー最適化：**
    # 
    # **現在（GSI制約下）：**
    # Stripe Webhook → user_id特定（外部連携） → get_subscription() → update_subscription()
    # 
    # **将来（GSI2実装後）：**
    # Stripe Webhook → get_subscription_by_customer_id() → update_subscription()
    # 
    # 💡 **推奨アーキテクチャ：**
    # - webhook_serviceは最小限の責任に特化
    # - user_service, billing_serviceとの明確な責任分離
    # - Stripe WebhookイベントはCloudWatchログで十分なトレーサビリティ確保
    # - PaymentHistory管理はwebhook_serviceが唯一の責任者（設計書準拠）

    async def health_check(self) -> Dict[str, Any]:
        """データベース接続ヘルスチェック（core + payments両テーブル対応）"""
        try:
            current_time = get_current_jst()
            
            # coreテーブルの疎通確認（describe方式）
            await self.core_client.describe_table()
            
            # Issue #27対応: paymentsテーブルの疎通確認
            await self.payments_client.describe_table()
            
            return {
                "service": "webhook_service",
                "database_status": "healthy",
                "timestamp": to_jst_string(current_time),
                "connected_tables": ["core", "payments"]  # webhook_serviceで使用するテーブル
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
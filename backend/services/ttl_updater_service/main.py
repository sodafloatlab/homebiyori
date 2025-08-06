"""
TTL Updater Service - Main Implementation

SQSメッセージ駆動でDynamoDB TTL値を更新するサービス。
Stripe Webhookイベントを受けてチャット履歴の保持期間を
ユーザーのサブスクリプションプランに応じて動的調整。
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from enum import Enum

from homebiyori_common import get_logger
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string

logger = get_logger(__name__)


class TTLUpdateType(str, Enum):
    """TTL更新タイプ"""
    SUBSCRIPTION_CREATED = "subscription_created"
    SUBSCRIPTION_UPDATED = "subscription_updated"
    SUBSCRIPTION_CANCELLED = "subscription_cancelled"
    TRIAL_EXPIRED = "trial_expired"
    PAYMENT_FAILED = "payment_failed"
    PLAN_CHANGED = "plan_changed"


class PlanTTLMapping:
    """プラン別TTL設定"""
    
    # プラン別チャット履歴保持期間（日数）
    PLAN_TTL_DAYS = {
        "free": 7,           # 無料プラン: 7日
        "basic": 30,         # ベーシックプラン: 30日  
        "premium": 90,       # プレミアムプラン: 90日
        "trial": 30,         # トライアル: 30日
        "cancelled": 7,      # 退会予定: 7日
        "expired": 3         # 期限切れ: 3日
    }
    
    @classmethod
    def get_ttl_days(cls, plan: str) -> int:
        """プランに応じたTTL日数取得"""
        return cls.PLAN_TTL_DAYS.get(plan.lower(), 7)  # デフォルト7日
    
    @classmethod 
    def calculate_ttl_timestamp(cls, plan: str, base_time: Optional[datetime] = None) -> int:
        """TTLタイムスタンプ計算"""
        if base_time is None:
            base_time = get_current_jst()
        
        ttl_days = cls.get_ttl_days(plan)
        ttl_datetime = base_time + timedelta(days=ttl_days)
        
        return int(ttl_datetime.timestamp())


class TTLUpdaterService:
    """TTL更新サービス"""
    
    def __init__(self):
        # 環境変数から設定取得
        import os
        self.dynamodb_table = os.getenv("DYNAMODB_TABLE", "prod-homebiyori-chats")
        self.dynamodb_region = os.getenv("AWS_DEFAULT_REGION", "ap-northeast-1")
        
        self.db_client = DynamoDBClient(
            table_name=self.dynamodb_table,
            region_name=self.dynamodb_region
        )
    
    async def process_ttl_update_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        SQSメッセージ処理
        
        Args:
            message: SQSメッセージボディ
            
        Returns:
            Dict[str, Any]: 処理結果
        """
        try:
            # メッセージ検証
            message_type = message.get("type")
            user_id = message.get("user_id")
            
            if not message_type or not user_id:
                return {
                    "success": False,
                    "error": "Invalid message format: missing type or user_id"
                }
            
            # TTL更新タイプ判定
            if message_type not in [t.value for t in TTLUpdateType]:
                return {
                    "success": False,
                    "error": f"Unknown message type: {message_type}"
                }
            
            logger.info("Processing TTL update message", extra={
                "message_type": message_type,
                "user_id": user_id,
                "plan": message.get("plan"),
                "subscription_id": message.get("subscription_id")
            })
            
            # メッセージタイプ別処理
            if message_type == TTLUpdateType.SUBSCRIPTION_CREATED:
                result = await self._handle_subscription_created(message)
            elif message_type == TTLUpdateType.SUBSCRIPTION_UPDATED:
                result = await self._handle_subscription_updated(message)
            elif message_type == TTLUpdateType.SUBSCRIPTION_CANCELLED:
                result = await self._handle_subscription_cancelled(message)
            elif message_type == TTLUpdateType.TRIAL_EXPIRED:
                result = await self._handle_trial_expired(message)
            elif message_type == TTLUpdateType.PAYMENT_FAILED:
                result = await self._handle_payment_failed(message)
            elif message_type == TTLUpdateType.PLAN_CHANGED:
                result = await self._handle_plan_changed(message)
            else:
                result = {
                    "success": False,
                    "error": f"Unhandled message type: {message_type}"
                }
            
            return result
            
        except Exception as e:
            logger.error("Failed to process TTL update message", extra={
                "message": message,
                "error": str(e),
                "error_type": type(e).__name__
            })
            return {
                "success": False,
                "error": f"Processing failed: {str(e)}"
            }
    
    async def _handle_subscription_created(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """サブスクリプション作成処理"""
        user_id = message["user_id"]
        plan = message.get("plan", "basic")
        
        updated_count = await self._update_user_chat_ttl(user_id, plan)
        
        logger.info("Subscription created - TTL updated", extra={
            "user_id": user_id,
            "plan": plan,
            "updated_count": updated_count
        })
        
        return {
            "success": True,
            "updated_count": updated_count,
            "plan": plan
        }
    
    async def _handle_subscription_updated(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """サブスクリプション更新処理"""
        user_id = message["user_id"]
        plan = message.get("plan", "basic")
        
        updated_count = await self._update_user_chat_ttl(user_id, plan)
        
        logger.info("Subscription updated - TTL updated", extra={
            "user_id": user_id,
            "plan": plan,
            "updated_count": updated_count
        })
        
        return {
            "success": True,
            "updated_count": updated_count,
            "plan": plan
        }
    
    async def _handle_subscription_cancelled(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """サブスクリプション解約処理"""
        user_id = message["user_id"]
        plan = "cancelled"
        
        updated_count = await self._update_user_chat_ttl(user_id, plan)
        
        logger.info("Subscription cancelled - TTL shortened", extra={
            "user_id": user_id,
            "plan": plan,
            "updated_count": updated_count
        })
        
        return {
            "success": True,
            "updated_count": updated_count,
            "plan": plan
        }
    
    async def _handle_trial_expired(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """トライアル期限切れ処理"""
        user_id = message["user_id"]
        plan = "free"  # トライアル終了後は無料プランに移行
        
        updated_count = await self._update_user_chat_ttl(user_id, plan)
        
        logger.info("Trial expired - TTL updated to free plan", extra={
            "user_id": user_id,
            "plan": plan,
            "updated_count": updated_count
        })
        
        return {
            "success": True,
            "updated_count": updated_count,
            "plan": plan
        }
    
    async def _handle_payment_failed(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """支払い失敗処理"""
        user_id = message["user_id"]
        plan = "expired"  # 支払い失敗時は期限切れ扱い
        
        updated_count = await self._update_user_chat_ttl(user_id, plan)
        
        logger.info("Payment failed - TTL shortened", extra={
            "user_id": user_id,
            "plan": plan,
            "updated_count": updated_count
        })
        
        return {
            "success": True,
            "updated_count": updated_count,
            "plan": plan
        }
    
    async def _handle_plan_changed(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """プラン変更処理"""
        user_id = message["user_id"]
        new_plan = message.get("new_plan", "basic")
        old_plan = message.get("old_plan", "free")
        
        updated_count = await self._update_user_chat_ttl(user_id, new_plan)
        
        logger.info("Plan changed - TTL updated", extra={
            "user_id": user_id,
            "old_plan": old_plan,
            "new_plan": new_plan,
            "updated_count": updated_count
        })
        
        return {
            "success": True,
            "updated_count": updated_count,
            "old_plan": old_plan,
            "new_plan": new_plan
        }
    
    async def _update_user_chat_ttl(self, user_id: str, plan: str) -> int:
        """
        ユーザーのチャット履歴TTL更新
        
        Args:
            user_id: ユーザーID
            plan: 新しいプラン
            
        Returns:
            int: 更新されたレコード数
        """
        try:
            # 新しいTTL値計算
            new_ttl = PlanTTLMapping.calculate_ttl_timestamp(plan)
            current_time = get_current_jst()
            
            logger.debug("Calculating new TTL", extra={
                "user_id": user_id,
                "plan": plan,
                "ttl_days": PlanTTLMapping.get_ttl_days(plan),
                "new_ttl": new_ttl,
                "new_ttl_datetime": datetime.fromtimestamp(new_ttl).isoformat()
            })
            
            # ユーザーのチャット履歴を取得
            chat_items = await self.db_client.query_by_prefix(
                pk=f"USER#{user_id}",
                sk_prefix="CHAT#"
            )
            
            if not chat_items:
                logger.info("No chat records found for user", extra={
                    "user_id": user_id
                })
                return 0
            
            # 各チャット履歴のTTL更新
            updated_count = 0
            
            for chat_item in chat_items:
                try:
                    # チャット作成日時取得
                    created_at_str = chat_item.get("created_at")
                    if not created_at_str:
                        logger.warning("Chat record missing created_at", extra={
                            "user_id": user_id,
                            "chat_id": chat_item.get("chat_id")
                        })
                        continue
                    
                    # 作成日時ベースでTTL再計算
                    created_at = datetime.fromisoformat(created_at_str)
                    chat_specific_ttl = PlanTTLMapping.calculate_ttl_timestamp(plan, created_at)
                    
                    # 過去のチャットが新しいプランで既に期限切れの場合はスキップ
                    if chat_specific_ttl < current_time.timestamp():
                        logger.debug("Chat already expired with new plan", extra={
                            "user_id": user_id,
                            "chat_id": chat_item.get("chat_id"),
                            "created_at": created_at_str,
                            "calculated_ttl": chat_specific_ttl
                        })
                        continue
                    
                    # TTL更新
                    pk = chat_item["PK"]
                    sk = chat_item["SK"]
                    
                    success = await self.db_client.update_item(
                        pk=pk,
                        sk=sk,
                        update_data={"ttl": chat_specific_ttl}
                    )
                    
                    if success:
                        updated_count += 1
                        logger.debug("Chat TTL updated", extra={
                            "user_id": user_id,
                            "chat_id": chat_item.get("chat_id"),
                            "old_ttl": chat_item.get("ttl"),
                            "new_ttl": chat_specific_ttl
                        })
                    
                except Exception as item_error:
                    logger.error("Failed to update chat TTL", extra={
                        "user_id": user_id,
                        "chat_item": chat_item,
                        "error": str(item_error)
                    })
            
            logger.info("User chat TTL update completed", extra={
                "user_id": user_id,
                "plan": plan,
                "total_chats": len(chat_items),
                "updated_count": updated_count
            })
            
            return updated_count
            
        except Exception as e:
            logger.error("Failed to update user chat TTL", extra={
                "user_id": user_id,
                "plan": plan,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def health_check(self) -> Dict[str, Any]:
        """
        ヘルスチェック
        
        Returns:
            Dict[str, Any]: ヘルス状態
        """
        try:
            # DynamoDB疎通確認
            test_pk = "HEALTH_CHECK"
            test_sk = "TTL_UPDATER_TEST"
            current_time = get_current_jst()
            
            # テストアイテム書き込み・削除
            test_ttl = int((current_time + timedelta(minutes=1)).timestamp())
            
            await self.db_client.put_item({
                "PK": test_pk,
                "SK": test_sk,
                "timestamp": to_jst_string(current_time),
                "ttl": test_ttl
            })
            
            item = await self.db_client.get_item(pk=test_pk, sk=test_sk)
            if item:
                await self.db_client.delete_item(pk=test_pk, sk=test_sk)
            
            return {
                "service": "ttl_updater_service",
                "status": "healthy",
                "timestamp": to_jst_string(current_time),
                "database_connected": True,
                "supported_message_types": [t.value for t in TTLUpdateType]
            }
            
        except Exception as e:
            logger.error("TTL Updater health check failed", extra={
                "error": str(e),
                "error_type": type(e).__name__
            })
            return {
                "service": "ttl_updater_service",
                "status": "unhealthy",
                "timestamp": to_jst_string(get_current_jst()),
                "error": str(e)
            }
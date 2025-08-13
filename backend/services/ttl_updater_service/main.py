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
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string
from .database import TTLUpdaterServiceDatabase

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
        # Database layer initialization
        self.db = TTLUpdaterServiceDatabase()
    
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
        
        updated_count = await self.db.update_user_chat_ttl_bulk(user_id, plan, PlanTTLMapping.PLAN_TTL_DAYS)
        
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
        
        updated_count = await self.db.update_user_chat_ttl_bulk(user_id, plan, PlanTTLMapping.PLAN_TTL_DAYS)
        
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
        
        updated_count = await self.db.update_user_chat_ttl_bulk(user_id, plan, PlanTTLMapping.PLAN_TTL_DAYS)
        
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
        
        updated_count = await self.db.update_user_chat_ttl_bulk(user_id, plan, PlanTTLMapping.PLAN_TTL_DAYS)
        
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
        
        updated_count = await self.db.update_user_chat_ttl_bulk(user_id, plan, PlanTTLMapping.PLAN_TTL_DAYS)
        
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
        
        updated_count = await self.db.update_user_chat_ttl_bulk(user_id, new_plan, PlanTTLMapping.PLAN_TTL_DAYS)
        
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
    
    # TTL更新ロジックはdatabase.pyに移動済み
    
    async def health_check(self) -> Dict[str, Any]:
        """
        ヘルスチェック
        
        Returns:
            Dict[str, Any]: ヘルス状態
        """
        try:
            # Database layer health check
            db_health = await self.db.health_check()
            
            # Add supported message types to response
            db_health["supported_message_types"] = [t.value for t in TTLUpdateType]
            
            return db_health
            
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
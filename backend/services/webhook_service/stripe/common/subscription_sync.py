"""
Subscription Sync Service for EventBridge

EventBridge版 サブスクリプション同期サービス
webhook_serviceから抽出・簡素化
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone

from homebiyori_common import get_logger
from homebiyori_common.models import SubscriptionPlan
from homebiyori_common.utils.datetime_utils import get_current_jst

# 同じcommonディレクトリ内のモジュールのインポート
try:
    from .models import SubscriptionData, SubscriptionStatus
    from .database import get_webhook_database
except ImportError:
    # Lambda実行時の直接インポート
    from models import SubscriptionData, SubscriptionStatus
    from database import get_webhook_database

logger = get_logger(__name__)


class SubscriptionSyncService:
    """サブスクリプション同期サービス"""
    
    def __init__(self):
        self.db = get_webhook_database()
    
    async def get_subscription(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        ユーザーのサブスクリプション情報を取得
        
        Args:
            user_id: Homebiyori user ID
            
        Returns:
            Optional[Dict[str, Any]]: サブスクリプション情報
        """
        return await self.db.get_subscription(user_id)
    
    async def update_subscription(self, subscription_data: SubscriptionData, user_id: str) -> Dict[str, str]:
        """
        サブスクリプション情報を同期・更新
        
        Args:
            subscription_data: Stripe サブスクリプションデータ
            user_id: Homebiyori user ID
            
        Returns:
            Dict[str, str]: 更新結果
        """
        try:
            # DynamoDB保存用データを構築
            update_data = {
                "subscription_id": subscription_data.id,
                "customer_id": subscription_data.customer,
                "status": subscription_data.status.value,
                "plan_type": subscription_data.plan_type.value,
                
                # 期間情報
                "current_period_start": subscription_data.current_period_start,
                "current_period_end": subscription_data.current_period_end,
                
                # キャンセル情報
                "cancel_at_period_end": subscription_data.cancel_at_period_end,
                "canceled_at": subscription_data.canceled_at,
                "cancel_at": subscription_data.cancel_at,
                
                # トライアル情報
                "trial_start": subscription_data.trial_start,
                "trial_end": subscription_data.trial_end,
                
                # 更新日時
                "updated_at": int(get_current_jst().timestamp()),
                
                # GSI用キー
                "user_id": user_id,
            }
            
            # Optional fields を追加
            if subscription_data.trial_end:
                update_data["trial_end"] = subscription_data.trial_end
            
            # DynamoDB更新実行
            success = await self.db.update_subscription(user_id, update_data)
            
            if success:
                logger.info("Subscription synced successfully", extra={
                    "user_id": user_id,
                    "subscription_id": subscription_data.id,
                    "status": subscription_data.status.value,
                    "plan_type": subscription_data.plan_type.value
                })
                return {"status": "updated", "subscription_id": subscription_data.id}
            else:
                logger.error("Failed to sync subscription", extra={
                    "user_id": user_id,
                    "subscription_id": subscription_data.id
                })
                return {"status": "failed", "error": "database_update_failed"}
                
        except Exception as e:
            logger.error("Error syncing subscription", extra={
                "user_id": user_id,
                "subscription_id": subscription_data.id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            return {"status": "error", "error": str(e)}
    
    def _determine_plan_type(self, items_data: list) -> SubscriptionPlan:
        """
        サブスクリプションアイテムからプランタイプを判定
        
        Args:
            items_data: Stripe subscription items
            
        Returns:
            SubscriptionPlan: 判定されたプランタイプ
        """
        if not items_data:
            return SubscriptionPlan.TRIAL
        
        # 最初のアイテムの価格IDを確認
        price_id = items_data[0].get("price", {}).get("id", "").lower()
        
        if "monthly" in price_id or "month" in price_id:
            return SubscriptionPlan.MONTHLY
        elif "yearly" in price_id or "year" in price_id:
            return SubscriptionPlan.YEARLY
        else:
            # デフォルトは月額プランとみなす
            return SubscriptionPlan.MONTHLY
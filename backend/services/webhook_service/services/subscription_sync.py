"""
Subscription Synchronization Service

Stripe サブスクリプション情報とDynamoDB間の同期処理。
- Stripe → DynamoDB データ同期
- サブスクリプション状態管理
- ユーザープランステータス更新
"""

import os
from typing import Dict, Any, Optional
from datetime import datetime

from homebiyori_common import get_logger
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string
from homebiyori_common.exceptions import DatabaseError

from ..models.stripe_models import StripeSubscription, SubscriptionStatus
from homebiyori_common.models import SubscriptionPlan
from ..database import WebhookServiceDatabase

logger = get_logger(__name__)


class SubscriptionSyncService:
    """サブスクリプション同期サービス"""
    
    def __init__(self):
        # Database layer initialization
        self.db = WebhookServiceDatabase()
    
    async def update_subscription(
        self,
        subscription: StripeSubscription,
        user_id: str
    ) -> Dict[str, Any]:
        """
        サブスクリプション更新（webhook_serviceのコア機能）
        
        Args:
            subscription: Stripeサブスクリプション情報
            user_id: ユーザーID
            
        Returns:
            Dict[str, Any]: 処理結果
        """
        try:
            current_time = get_current_jst()
            
            # 既存のサブスクリプション情報を取得
            existing_subscription = await self.db.get_subscription(user_id)
            
            if not existing_subscription:
                logger.warning("Subscription not found for update - may need to be created by billing_service first", extra={
                    "user_id": user_id,
                    "subscription_id": subscription.id
                })
                return {
                    "status": "failed",
                    "reason": "subscription_not_found",
                    "subscription_id": subscription.id
                }
            
            # 更新データ準備（design_database.md準拠）
            subscription_update_data = {
                "subscription_id": subscription.id,  # design_database.mdフィールド名に統一
                "customer_id": subscription.customer,  # design_database.mdフィールド名に統一
                "status": subscription.status.value,
                "current_plan": subscription.plan_type.value,  # design_database.mdフィールド名に統一
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "cancel_at_period_end": subscription.will_cancel,  # design_database.mdフィールド名に統一
                "canceled_at": subscription.canceled_at,
                "trial_start_date": subscription.trial_start,  # design_database.mdフィールド名に統一
                "trial_end_date": subscription.trial_end,  # design_database.mdフィールド名に統一
                "updated_at": to_jst_string(current_time)
            }
            
            # 条件付き更新実行
            updated_subscription = await self.db.update_subscription(user_id, subscription_update_data)
            
            logger.info("Subscription updated successfully", extra={
                "user_id": user_id,
                "subscription_id": subscription.id,
                "current_plan": subscription.plan_type.value,
                "status": subscription.status.value,
                "previous_plan": existing_subscription.get("current_plan"),
                "previous_status": existing_subscription.get("status")
            })
            
            return {
                "status": "success",
                "action": "updated",
                "subscription_id": subscription.id,
                "current_plan": subscription.plan_type.value,
                "previous_plan": existing_subscription.get("current_plan"),
                "changes_detected": True
            }
            
        except Exception as e:
            logger.error("Failed to update subscription", extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "user_id": user_id,
                "subscription_id": subscription.id if subscription else None
            })
            raise DatabaseError(f"サブスクリプション更新に失敗しました: {str(e)}")
    
    async def get_subscription(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        ユーザーのサブスクリプション情報取得
        
        Args:
            user_id: ユーザーID
            
        Returns:
            Optional[Dict[str, Any]]: サブスクリプション情報
        """
        try:
            subscription_item = await self.db.get_subscription(user_id)
            
            return subscription_item
            
        except Exception as e:
            logger.error("Failed to get subscription", extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "user_id": user_id
            })
            return None
    
    
    
    async def get_subscription_by_customer_id(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """
        Stripe Customer IDからサブスクリプション情報取得（GSI2活用）
        
        Args:
            customer_id: Stripe Customer ID
            
        Returns:
            Optional[Dict[str, Any]]: サブスクリプション情報
        """
        try:
            # GSI2を使用してcustomer_idから検索
            return await self.db.get_subscription_by_customer_id(customer_id)
            
        except Exception as e:
            logger.error("Failed to get subscription by customer ID", extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "customer_id": customer_id
            })
            return None
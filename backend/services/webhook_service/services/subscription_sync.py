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
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string
from homebiyori_common.exceptions import DatabaseError

from ..models.stripe_models import StripeSubscription, SubscriptionStatus, PlanType

logger = get_logger(__name__)


class SubscriptionSyncService:
    """サブスクリプション同期サービス"""
    
    def __init__(self):
        table_name = os.getenv("DYNAMODB_TABLE")
        if not table_name:
            raise ValueError("DYNAMODB_TABLE environment variable is required")
        self.db_client = DynamoDBClient(table_name)
    
    async def create_subscription(
        self,
        subscription: StripeSubscription,
        user_id: str
    ) -> Dict[str, Any]:
        """
        新規サブスクリプション作成
        
        Args:
            subscription: Stripeサブスクリプション情報
            user_id: ユーザーID
            
        Returns:
            Dict[str, Any]: 処理結果
        """
        try:
            current_time = get_current_jst()
            
            # サブスクリプション情報をDynamoDBに保存
            subscription_item = {
                "PK": f"USER#{user_id}",
                "SK": "SUBSCRIPTION",
                "stripe_subscription_id": subscription.id,
                "stripe_customer_id": subscription.customer,
                "status": subscription.status.value,
                "plan_type": subscription.plan_type.value,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "trial_start": subscription.trial_start,
                "trial_end": subscription.trial_end,
                "cancel_at": subscription.cancel_at,
                "canceled_at": subscription.canceled_at,
                "created": subscription.created,
                "metadata": subscription.metadata,
                "synced_at": to_jst_string(current_time),
                "GSI1PK": f"STRIPE_SUB#{subscription.id}",
                "GSI1SK": f"USER#{user_id}"
            }
            
            await self.db_client.put_item(subscription_item)
            
            # ユーザープロフィールのプラン情報も更新
            await self._update_user_plan_status(user_id, subscription.plan_type, subscription.status)
            
            logger.info("Subscription created successfully", extra={
                "user_id": user_id,
                "subscription_id": subscription.id,
                "plan_type": subscription.plan_type.value,
                "status": subscription.status.value
            })
            
            return {
                "status": "success",
                "action": "created",
                "subscription_id": subscription.id,
                "plan_type": subscription.plan_type.value
            }
            
        except Exception as e:
            logger.error("Failed to create subscription", extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "user_id": user_id,
                "subscription_id": subscription.id if subscription else None
            })
            raise DatabaseError(f"サブスクリプション作成に失敗しました: {str(e)}")
    
    async def update_subscription(
        self,
        subscription: StripeSubscription,
        user_id: str
    ) -> Dict[str, Any]:
        """
        サブスクリプション更新
        
        Args:
            subscription: Stripeサブスクリプション情報
            user_id: ユーザーID
            
        Returns:
            Dict[str, Any]: 処理結果
        """
        try:
            current_time = get_current_jst()
            
            # 既存のサブスクリプション情報を取得
            existing_item = await self.db_client.get_item(
                pk=f"USER#{user_id}",
                sk="SUBSCRIPTION"
            )
            
            if not existing_item:
                logger.warning("Subscription not found for update, creating new", extra={
                    "user_id": user_id,
                    "subscription_id": subscription.id
                })
                return await self.create_subscription(subscription, user_id)
            
            # 更新データ準備
            update_data = {
                "stripe_subscription_id": subscription.id,
                "stripe_customer_id": subscription.customer,
                "status": subscription.status.value,
                "plan_type": subscription.plan_type.value,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "trial_start": subscription.trial_start,
                "trial_end": subscription.trial_end,
                "cancel_at": subscription.cancel_at,
                "canceled_at": subscription.canceled_at,
                "metadata": subscription.metadata,
                "synced_at": to_jst_string(current_time)
            }
            
            # 条件付き更新実行
            updated_item = await self.db_client.update_item(
                pk=f"USER#{user_id}",
                sk="SUBSCRIPTION",
                update_data=update_data
            )
            
            # ユーザープロフィールのプラン情報も更新
            await self._update_user_plan_status(user_id, subscription.plan_type, subscription.status)
            
            logger.info("Subscription updated successfully", extra={
                "user_id": user_id,
                "subscription_id": subscription.id,
                "plan_type": subscription.plan_type.value,
                "status": subscription.status.value,
                "previous_plan": existing_item.get("plan_type"),
                "previous_status": existing_item.get("status")
            })
            
            return {
                "status": "success",
                "action": "updated",
                "subscription_id": subscription.id,
                "plan_type": subscription.plan_type.value,
                "previous_plan": existing_item.get("plan_type"),
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
    
    async def delete_subscription(
        self,
        subscription: StripeSubscription,
        user_id: str
    ) -> Dict[str, Any]:
        """
        サブスクリプション削除（解約）
        
        Args:
            subscription: Stripeサブスクリプション情報
            user_id: ユーザーID
            
        Returns:
            Dict[str, Any]: 処理結果
        """
        try:
            current_time = get_current_jst()
            
            # サブスクリプションを削除状態に更新（完全削除はしない）
            update_data = {
                "status": SubscriptionStatus.CANCELED.value,
                "plan_type": PlanType.FREE.value,  # フリープランに戻す
                "canceled_at": subscription.canceled_at or int(current_time.timestamp()),
                "cancel_at": subscription.cancel_at,
                "synced_at": to_jst_string(current_time),
                "deleted": True,
                "deleted_at": to_jst_string(current_time)
            }
            
            await self.db_client.update_item(
                pk=f"USER#{user_id}",
                sk="SUBSCRIPTION",
                update_data=update_data
            )
            
            # ユーザープロフィールをフリープランに戻す
            await self._update_user_plan_status(user_id, PlanType.FREE, SubscriptionStatus.CANCELED)
            
            logger.info("Subscription deleted successfully", extra={
                "user_id": user_id,
                "subscription_id": subscription.id,
                "canceled_at": subscription.canceled_at
            })
            
            return {
                "status": "success",
                "action": "deleted",
                "subscription_id": subscription.id,
                "reverted_to_plan": PlanType.FREE.value
            }
            
        except Exception as e:
            logger.error("Failed to delete subscription", extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "user_id": user_id,
                "subscription_id": subscription.id if subscription else None
            })
            raise DatabaseError(f"サブスクリプション削除に失敗しました: {str(e)}")
    
    async def get_subscription(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        ユーザーのサブスクリプション情報取得
        
        Args:
            user_id: ユーザーID
            
        Returns:
            Optional[Dict[str, Any]]: サブスクリプション情報
        """
        try:
            subscription_item = await self.db_client.get_item(
                pk=f"USER#{user_id}",
                sk="SUBSCRIPTION"
            )
            
            return subscription_item
            
        except Exception as e:
            logger.error("Failed to get subscription", extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "user_id": user_id
            })
            return None
    
    async def get_subscription_by_stripe_id(self, stripe_subscription_id: str) -> Optional[Dict[str, Any]]:
        """
        Stripe Subscription IDからサブスクリプション情報取得
        
        Args:
            stripe_subscription_id: Stripe Subscription ID
            
        Returns:
            Optional[Dict[str, Any]]: サブスクリプション情報
        """
        try:
            # GSI1を使用してStripe IDから検索
            result = await self.db_client.query_gsi(
                gsi_name="GSI1",
                pk_value=f"STRIPE_SUB#{stripe_subscription_id}",
                limit=1
            )
            
            if result.items:
                return result.items[0]
            
            return None
            
        except Exception as e:
            logger.error("Failed to get subscription by Stripe ID", extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "stripe_subscription_id": stripe_subscription_id
            })
            return None
    
    async def _update_user_plan_status(
        self,
        user_id: str,
        plan_type: PlanType,
        status: SubscriptionStatus
    ) -> None:
        """
        ユーザープロフィールのプラン情報更新
        
        Args:
            user_id: ユーザーID
            plan_type: プランタイプ
            status: サブスクリプション状態
        """
        try:
            current_time = get_current_jst()
            
            # ユーザープロフィールのプラン情報を更新
            profile_update = {
                "current_plan": plan_type.value,
                "subscription_status": status.value,
                "plan_updated_at": to_jst_string(current_time)
            }
            
            await self.db_client.update_item(
                pk=f"USER#{user_id}",
                sk="PROFILE",
                update_data=profile_update
            )
            
            logger.debug("User plan status updated", extra={
                "user_id": user_id,
                "plan_type": plan_type.value,
                "status": status.value
            })
            
        except Exception as e:
            logger.warning("Failed to update user plan status", extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "user_id": user_id,
                "plan_type": plan_type.value
            })
            # プロフィール更新失敗は非致命的エラーとして扱う
"""
Stripe Subscription Updated Handler - EventBridge Version

customer.subscription.updated イベントを処理する専用Lambda関数
EventBridge経由でStripeイベントを受信し、サブスクリプション情報を同期
"""

import json
from typing import Dict, Any

from homebiyori_common import get_logger, success_response, error_response
from homebiyori_common.models import SubscriptionPlan

# 共通モジュールのインポート
try:
    from ..common.models import SubscriptionData, SubscriptionStatus
    from ..common.subscription_sync import SubscriptionSyncService
except ImportError:
    # Lambda実行時の直接インポート（デプロイ時はフラット構造）
    from common.models import SubscriptionData, SubscriptionStatus
    from common.subscription_sync import SubscriptionSyncService

# ログ設定
logger = get_logger(__name__)

async def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    EventBridge から受信したStripe subscription_updated イベントを処理
    
    Args:
        event: EventBridge event with Stripe payload in 'detail' field
        context: Lambda context
        
    Returns:
        Dict[str, Any]: 処理結果
    """
    try:
        # EventBridge event 構造: event['detail'] にStripe webhook payloadが含まれる
        stripe_event = event.get('detail', {})
        event_id = stripe_event.get('id')
        event_type = stripe_event.get('type')
        
        logger.info("Processing subscription updated event via EventBridge", extra={
            "event_id": event_id,
            "event_type": event_type,
            "eventbridge_source": event.get('source'),
            "eventbridge_detail_type": event.get('detail-type')
        })
        
        # Stripe イベント検証
        if event_type != 'customer.subscription.updated':
            logger.warning("Unexpected event type", extra={
                "expected": "customer.subscription.updated",
                "received": event_type,
                "event_id": event_id
            })
            return success_response(
                data={"processed": False, "reason": "unexpected_event_type"},
                message="Event type not handled by this Lambda"
            )
        
        # Subscription データ抽出
        stripe_data = stripe_event.get('data', {})
        subscription_object = stripe_data.get('object', {})
        
        if not subscription_object:
            logger.error("No subscription object in event", extra={
                "event_id": event_id
            })
            return error_response(
                error_code="MISSING_SUBSCRIPTION_DATA",
                message="No subscription data in event"
            )
        
        # user_id の取得（billing_service/stripe_client.pyに合わせて修正）
        metadata = subscription_object.get('metadata', {})
        user_id = metadata.get('user_id')
        
        if not user_id:
            logger.error("No user_id in subscription metadata", extra={
                "event_id": event_id,
                "subscription_id": subscription_object.get('id'),
                "metadata": metadata
            })
            return error_response(
                error_code="MISSING_USER_ID",
                message="No user_id in subscription metadata"
            )
        
        # 処理結果
        result = await process_subscription_updated(subscription_object, user_id, event_id)
        
        logger.info("Subscription updated event processed successfully", extra={
            "event_id": event_id,
            "user_id": user_id,
            "processing_result": result
        })
        
        return success_response(
            data={"processed": True, "event_id": event_id, "result": result},
            message="Subscription updated event processed successfully"
        )
        
    except Exception as e:
        logger.error("Failed to process subscription updated event", extra={
            "error": str(e),
            "error_type": type(e).__name__,
            "event_id": stripe_event.get('id') if 'stripe_event' in locals() else None,
            "eventbridge_event": json.dumps(event, default=str)
        })
        
        # EventBridge の場合はエラーを返してリトライさせる
        return error_response(
            error_code="PROCESSING_FAILED",
            message=f"Subscription updated processing failed: {str(e)}"
        )


async def process_subscription_updated(subscription_object: Dict[str, Any], user_id: str, event_id: str) -> Dict[str, Any]:
    """
    サブスクリプション更新処理のメインロジック（既存webhook_serviceから移植）
    
    Args:
        subscription_object: Stripe subscription object
        user_id: Homebiyori user ID
        event_id: Stripe event ID
        
    Returns:
        Dict[str, Any]: 処理結果
    """
    actions = []
    subscription_sync = SubscriptionSyncService()
    
    try:
        # StripeデータをSubscriptionDataモデルに変換
        subscription_data = SubscriptionData(
            id=subscription_object['id'],
            customer=subscription_object['customer'],
            status=SubscriptionStatus(subscription_object['status']),
            current_period_start=subscription_object['current_period_start'],
            current_period_end=subscription_object['current_period_end'],
            cancel_at_period_end=subscription_object.get('cancel_at_period_end', False),
            canceled_at=subscription_object.get('canceled_at'),
            cancel_at=subscription_object.get('cancel_at'),
            trial_start=subscription_object.get('trial_start'),
            trial_end=subscription_object.get('trial_end'),
            metadata=subscription_object.get('metadata', {}),
            items_data=subscription_object.get('items', {}).get('data', []),
            raw_data=subscription_object
        )
        
        # 1. 現在のサブスクリプション情報を取得
        current_subscription = await subscription_sync.get_subscription(user_id)
        
        # 2. サブスクリプション情報を更新
        sync_result = await subscription_sync.update_subscription(subscription_data, user_id)
        actions.append({"action": "sync_subscription", "result": sync_result})
        
        # 3. プラン変更ログ記録（簡素化）
        if current_subscription and current_subscription.get("plan_type") != subscription_data.plan_type.value:
            old_plan = SubscriptionPlan(current_subscription.get("plan_type", "trial"))
            new_plan = subscription_data.plan_type
            
            logger.info("Subscription plan changed", extra={
                "user_id": user_id,
                "old_plan": old_plan.value,
                "new_plan": new_plan.value,
                "subscription_id": subscription_data.id,
                "event_id": event_id
            })
            actions.append({"action": "log_plan_change", "result": "logged"})
        
        # 4. 解約予定ログ記録（簡素化）
        if subscription_data.will_cancel and not (current_subscription and current_subscription.get("cancel_at")):
            logger.info("Subscription will cancel", extra={
                "user_id": user_id,
                "cancel_at": subscription_data.cancel_at,
                "subscription_id": subscription_data.id,
                "event_id": event_id
            })
            actions.append({"action": "log_cancel_scheduled", "result": "logged"})
        
        # 5. 解約完了ログ記録
        if subscription_data.status == SubscriptionStatus.CANCELED:
            logger.info("Subscription canceled", extra={
                "user_id": user_id,
                "canceled_at": subscription_data.canceled_at,
                "subscription_id": subscription_data.id,
                "event_id": event_id
            })
            actions.append({"action": "log_cancellation", "result": "logged"})
        
        # 6. 再開ログ記録（キャンセル予定から復活した場合）
        if (current_subscription and current_subscription.get("cancel_at_period_end") and 
            not subscription_data.cancel_at_period_end and 
            subscription_data.status == SubscriptionStatus.ACTIVE):
            logger.info("Subscription reactivated", extra={
                "user_id": user_id,
                "subscription_id": subscription_data.id,
                "event_id": event_id
            })
            actions.append({"action": "log_reactivation", "result": "logged"})
        
        return {
            "status": "success", 
            "actions": actions, 
            "user_id": user_id,
            "subscription_status": subscription_data.status.value
        }
        
    except Exception as e:
        logger.error("Failed to process subscription update", extra={
            "error": str(e),
            "user_id": user_id,
            "subscription_id": subscription_object.get('id'),
            "event_id": event_id
        })
        return {
            "status": "failed", 
            "error": str(e),
            "user_id": user_id
        }


# ==============================================
# EventBridge Event Payload Sample
# ==============================================
"""
EventBridge経由で受信するイベント構造例:

{
  "version": "0",
  "id": "12345678-1234-1234-1234-123456789012",
  "detail-type": "Customer Subscription Updated",
  "source": "aws.partner/stripe.com/acct_XXXXXXXXXXXXXXXXXX",
  "account": "123456789012",
  "time": "2024-08-25T12:00:00Z",
  "region": "us-east-1",
  "detail": {
    "id": "evt_1Nxxx...",
    "type": "customer.subscription.updated",
    "api_version": "2020-08-27",
    "created": 1690000000,
    "data": {
      "object": {
        "id": "sub_1Nxxx...",
        "customer": "cus_Nxxx...",
        "status": "active",
        "current_period_start": 1690000000,
        "current_period_end": 1692678400,
        "cancel_at_period_end": false,
        "canceled_at": null,
        "cancel_at": null,
        "trial_start": null,
        "trial_end": null,
        "metadata": {
          "homebiyori_user_id": "user_123..."
        },
        "items": {
          "data": [{
            "price": {
              "id": "price_monthly",
              "nickname": "月額プラン"
            }
          }]
        }
      }
    }
  }
}
"""
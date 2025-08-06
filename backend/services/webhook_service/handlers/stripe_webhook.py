"""
Stripe Webhook Handler

Stripe からのWebhookイベントを処理するメインハンドラー。
- サブスクリプション変更処理
- 支払い結果処理
- TTL更新キュー送信
- 通知作成
"""

import json
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime, timezone

from homebiyori_common import get_logger, success_response, error_response
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.utils.datetime_utils import get_current_jst

from ..core.dependencies import verify_webhook_signature, validate_webhook_event, get_current_settings
from ..core.config import WebhookSettings
from ..models.stripe_models import (
    WebhookEvent, WebhookEventType, SubscriptionStatus, PlanType,
    TTLUpdateMessage, NotificationMessage
)
from ..services.subscription_sync import SubscriptionSyncService
from ..services.queue_service import QueueService
from ..services.notification_service import NotificationService

# ログ設定
logger = get_logger(__name__)

# ルーター初期化
stripe_webhook_router = APIRouter()

# サービス初期化
subscription_sync = SubscriptionSyncService()
queue_service = QueueService()
notification_service = NotificationService()


@stripe_webhook_router.post("/stripe")
async def handle_stripe_webhook(
    request: Request,
    event: Dict[str, Any] = Depends(verify_webhook_signature),
    validated_event: Dict[str, Any] = Depends(validate_webhook_event),
    settings: WebhookSettings = Depends(get_current_settings)
):
    """
    Stripe Webhook メインハンドラー
    
    Args:
        request: FastAPI Request
        event: 署名検証済みStripeイベント
        validated_event: バリデーション済みイベント
        settings: アプリケーション設定
        
    Returns:
        FastAPI Response
    """
    try:
        # イベント情報をログ出力
        event_id = event.get("id")
        event_type = event.get("type")
        
        logger.info("Processing Stripe webhook", extra={
            "event_id": event_id,
            "event_type": event_type,
            "created": event.get("created"),
            "api_version": event.get("api_version")
        })
        
        # Webhookイベントモデル作成
        webhook_event = WebhookEvent(**event)
        
        # イベントタイプ別処理
        result = await _process_webhook_event(webhook_event, settings)
        
        logger.info("Stripe webhook processed successfully", extra={
            "event_id": event_id,
            "event_type": event_type,
            "processing_result": result
        })
        
        return success_response(
            data={"processed": True, "event_id": event_id},
            message="Webhook processed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to process Stripe webhook", extra={
            "error": str(e),
            "error_type": type(e).__name__,
            "event_id": event.get("id"),
            "event_type": event.get("type")
        })
        
        # Stripe には 200 を返す（再送を避ける）
        return success_response(
            data={"processed": False, "error": "processing_failed"},
            message="Webhook received but processing failed"
        )


async def _process_webhook_event(
    event: WebhookEvent,
    settings: WebhookSettings
) -> Dict[str, Any]:
    """
    Webhookイベントの具体的処理
    
    Args:
        event: Webhookイベント
        settings: アプリケーション設定
        
    Returns:
        Dict[str, Any]: 処理結果
    """
    event_type = event.type
    result = {"event_type": event_type, "actions": []}
    
    try:
        if event_type == WebhookEventType.SUBSCRIPTION_CREATED:
            result.update(await _handle_subscription_created(event, settings))
            
        elif event_type == WebhookEventType.SUBSCRIPTION_UPDATED:
            result.update(await _handle_subscription_updated(event, settings))
            
        elif event_type == WebhookEventType.SUBSCRIPTION_DELETED:
            result.update(await _handle_subscription_deleted(event, settings))
            
        elif event_type == WebhookEventType.PAYMENT_SUCCEEDED:
            result.update(await _handle_payment_succeeded(event, settings))
            
        elif event_type == WebhookEventType.PAYMENT_FAILED:
            result.update(await _handle_payment_failed(event, settings))
            
        elif event_type == WebhookEventType.TRIAL_WILL_END:
            result.update(await _handle_trial_will_end(event, settings))
            
        else:
            logger.warning("Unhandled webhook event type", extra={
                "event_type": event_type,
                "event_id": event.id
            })
            result["status"] = "ignored"
            
        return result
        
    except Exception as e:
        logger.error("Error processing webhook event", extra={
            "error": str(e),
            "error_type": type(e).__name__,
            "event_type": event_type,
            "event_id": event.id
        })
        result["status"] = "failed"
        result["error"] = str(e)
        return result


async def _handle_subscription_created(
    event: WebhookEvent,
    settings: WebhookSettings
) -> Dict[str, Any]:
    """サブスクリプション作成処理"""
    subscription = event.subscription_data
    if not subscription:
        return {"status": "failed", "error": "No subscription data"}
        
    user_id = subscription.homebiyori_user_id
    if not user_id:
        return {"status": "failed", "error": "No homebiyori_user_id in metadata"}
        
    actions = []
    
    # 1. サブスクリプション情報をDynamoDBに同期
    sync_result = await subscription_sync.create_subscription(subscription, user_id)
    actions.append({"action": "sync_subscription", "result": sync_result})
    
    # 2. ウェルカム通知作成
    welcome_notification = NotificationMessage(
        user_id=user_id,
        type="subscription_welcome",
        title="プラン登録完了",
        message=f"{subscription.plan_type.value}プランにご登録いただき、ありがとうございます！",
        priority="high",
        metadata={"subscription_id": subscription.id, "plan": subscription.plan_type.value}
    )
    
    notification_result = await notification_service.create_notification(welcome_notification)
    actions.append({"action": "create_welcome_notification", "result": notification_result})
    
    return {"status": "success", "actions": actions}


async def _handle_subscription_updated(
    event: WebhookEvent,
    settings: WebhookSettings
) -> Dict[str, Any]:
    """サブスクリプション更新処理"""
    subscription = event.subscription_data
    if not subscription:
        return {"status": "failed", "error": "No subscription data"}
        
    user_id = subscription.homebiyori_user_id
    if not user_id:
        return {"status": "failed", "error": "No homebiyori_user_id in metadata"}
        
    actions = []
    
    # 1. 現在のサブスクリプション情報を取得
    current_subscription = await subscription_sync.get_subscription(user_id)
    
    # 2. サブスクリプション情報を更新
    sync_result = await subscription_sync.update_subscription(subscription, user_id)
    actions.append({"action": "sync_subscription", "result": sync_result})
    
    # 3. プラン変更の場合、TTL更新キューに送信
    if current_subscription and current_subscription.get("plan_type") != subscription.plan_type.value:
        old_plan = PlanType(current_subscription.get("plan_type", "free"))
        new_plan = subscription.plan_type
        
        ttl_message = TTLUpdateMessage(
            user_id=user_id,
            old_plan=old_plan,
            new_plan=new_plan,
            subscription_id=subscription.id,
            change_reason="plan_change",
            request_id=event.id
        )
        
        queue_result = await queue_service.send_ttl_update_message(ttl_message)
        actions.append({"action": "send_ttl_update", "result": queue_result})
        
        # プラン変更通知
        plan_change_notification = NotificationMessage(
            user_id=user_id,
            type="plan_changed",
            title="プラン変更完了",
            message=f"プランが{old_plan.value}から{new_plan.value}に変更されました。",
            priority="normal",
            metadata={"old_plan": old_plan.value, "new_plan": new_plan.value}
        )
        
        notification_result = await notification_service.create_notification(plan_change_notification)
        actions.append({"action": "create_plan_change_notification", "result": notification_result})
    
    # 4. 解約予定設定の場合
    if subscription.will_cancel and not (current_subscription and current_subscription.get("cancel_at")):
        cancel_notification = NotificationMessage(
            user_id=user_id,
            type="subscription_will_cancel",
            title="解約予定のお知らせ",
            message="サブスクリプションは現在の期間終了時に解約予定です。",
            priority="normal",
            metadata={"cancel_at": subscription.cancel_at}
        )
        
        notification_result = await notification_service.create_notification(cancel_notification)
        actions.append({"action": "create_cancel_notification", "result": notification_result})
    
    return {"status": "success", "actions": actions}


async def _handle_subscription_deleted(
    event: WebhookEvent,
    settings: WebhookSettings
) -> Dict[str, Any]:
    """サブスクリプション削除処理"""
    subscription = event.subscription_data
    if not subscription:
        return {"status": "failed", "error": "No subscription data"}
        
    user_id = subscription.homebiyori_user_id
    if not user_id:
        return {"status": "failed", "error": "No homebiyori_user_id in metadata"}
        
    actions = []
    
    # 1. サブスクリプション情報を削除状態に更新
    sync_result = await subscription_sync.delete_subscription(subscription, user_id)
    actions.append({"action": "sync_subscription_deletion", "result": sync_result})
    
    # 2. TTL更新キューに送信（フリープランに戻す）
    ttl_message = TTLUpdateMessage(
        user_id=user_id,
        old_plan=subscription.plan_type,
        new_plan=PlanType.FREE,
        subscription_id=subscription.id,
        change_reason="subscription_canceled",
        request_id=event.id
    )
    
    queue_result = await queue_service.send_ttl_update_message(ttl_message)
    actions.append({"action": "send_ttl_update", "result": queue_result})
    
    # 3. 解約完了通知
    cancel_notification = NotificationMessage(
        user_id=user_id,
        type="subscription_canceled",
        title="解約完了",
        message="サブスクリプションが解約されました。引き続きフリープランでご利用いただけます。",
        priority="normal",
        metadata={"canceled_plan": subscription.plan_type.value}
    )
    
    notification_result = await notification_service.create_notification(cancel_notification)
    actions.append({"action": "create_cancel_complete_notification", "result": notification_result})
    
    return {"status": "success", "actions": actions}


async def _handle_payment_succeeded(
    event: WebhookEvent,
    settings: WebhookSettings
) -> Dict[str, Any]:
    """支払い成功処理"""
    invoice = event.invoice_data
    if not invoice or not invoice.subscription:
        return {"status": "skipped", "reason": "No subscription invoice"}
        
    # サブスクリプション情報から user_id を取得
    subscription = await subscription_sync.get_subscription_by_stripe_id(invoice.subscription)
    if not subscription:
        return {"status": "failed", "error": "Subscription not found"}
        
    user_id = subscription.get("user_id")
    if not user_id:
        return {"status": "failed", "error": "No user_id in subscription"}
        
    actions = []
    
    # 支払い成功通知（初回以外）
    if invoice.period_start > subscription.get("created", 0):
        payment_notification = NotificationMessage(
            user_id=user_id,
            type="payment_succeeded",
            title="お支払い完了",
            message=f"月額料金（¥{invoice.amount_paid_yen}）のお支払いが完了しました。",
            priority="low",
            metadata={
                "amount": invoice.amount_paid_yen,
                "period_start": invoice.period_start,
                "period_end": invoice.period_end
            }
        )
        
        notification_result = await notification_service.create_notification(payment_notification)
        actions.append({"action": "create_payment_notification", "result": notification_result})
    
    return {"status": "success", "actions": actions}


async def _handle_payment_failed(
    event: WebhookEvent,
    settings: WebhookSettings
) -> Dict[str, Any]:
    """支払い失敗処理"""
    invoice = event.invoice_data
    if not invoice or not invoice.subscription:
        return {"status": "skipped", "reason": "No subscription invoice"}
        
    # サブスクリプション情報から user_id を取得
    subscription = await subscription_sync.get_subscription_by_stripe_id(invoice.subscription)
    if not subscription:
        return {"status": "failed", "error": "Subscription not found"}
        
    user_id = subscription.get("user_id")
    if not user_id:
        return {"status": "failed", "error": "No user_id in subscription"}
        
    actions = []
    
    # 支払い失敗通知
    payment_failed_notification = NotificationMessage(
        user_id=user_id,
        type="payment_failed",
        title="お支払いエラー",
        message="月額料金のお支払いに失敗しました。お支払い方法をご確認ください。",
        priority="high",
        metadata={
            "amount_due": invoice.amount_due,
            "invoice_id": invoice.id
        }
    )
    
    notification_result = await notification_service.create_notification(payment_failed_notification)
    actions.append({"action": "create_payment_failed_notification", "result": notification_result})
    
    return {"status": "success", "actions": actions}


async def _handle_trial_will_end(
    event: WebhookEvent,
    settings: WebhookSettings
) -> Dict[str, Any]:
    """トライアル終了予告処理"""
    subscription = event.subscription_data
    if not subscription:
        return {"status": "failed", "error": "No subscription data"}
        
    user_id = subscription.homebiyori_user_id
    if not user_id:
        return {"status": "failed", "error": "No homebiyori_user_id in metadata"}
        
    actions = []
    
    # トライアル終了予告通知
    trial_notification = NotificationMessage(
        user_id=user_id,
        type="trial_will_end",
        title="無料トライアル終了予告",
        message="無料トライアルがもうすぐ終了します。継続利用には有料プランへの切り替えが必要です。",
        priority="high",
        metadata={
            "trial_end": subscription.trial_end,
            "subscription_id": subscription.id
        }
    )
    
    notification_result = await notification_service.create_notification(trial_notification)
    actions.append({"action": "create_trial_notification", "result": notification_result})
    
    return {"status": "success", "actions": actions}
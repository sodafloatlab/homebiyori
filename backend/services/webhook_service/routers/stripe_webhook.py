"""
Stripe Webhook Handler

Stripe からのWebhookイベントを処理するメインハンドラー。
Issue #15統一戦略対応版：
- サブスクリプション変更処理
- 支払い結果処理  
- 通知作成（簡素化）
※TTL更新機能削除: 統一機能提供によりTTL制御不要
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
    WebhookEvent, WebhookEventType, SubscriptionStatus
    # TTLUpdateMessage削除: Issue #15統一戦略によりTTL制御不要
    # NotificationMessage簡素化: 複雑な通知処理を削除
)
from ..models import PaymentHistory  # PaymentEventDataは削除済み（未使用のため、2024-08-24）
from homebiyori_common.models import SubscriptionPlan
from ..services.subscription_sync import SubscriptionSyncService
from ..database import get_webhook_database
# QueueService削除: TTL更新キュー送信が不要
# from ..services.queue_service import QueueService
# NotificationService簡素化: 複雑な通知処理を削除
# from ..services.notification_service import NotificationService

# ログ設定
logger = get_logger(__name__)

# ルーター初期化
stripe_webhook_router = APIRouter()

# サービス初期化（Issue #15統一戦略対応版）
subscription_sync = SubscriptionSyncService()
# queue_service削除: TTL更新キュー送信が不要
# notification_service削除: 複雑な通知処理を簡素化


# =====================================
# webhook_service 最適化後の処理ラインナップ
# =====================================
#
# 🎯 **webhook_serviceの明確な責任分離完了**
#
# ✅ **保持機能（webhook_serviceのコア責任）：**
# 1. SUBSCRIPTION_UPDATED - サブスクリプション状態のDynamoDB同期
# 2. PAYMENT_SUCCEEDED - 決済成功時のPaymentHistory保存（Phase 1）
# 3. PAYMENT_FAILED - 決済失敗時のPaymentHistory保存（Phase 1）
# 4. TRIAL_WILL_END - トライアル終了通知（簡素化済み）
#
# ❌ **削除機能（責任分離違反により削除）：**
# 1. SUBSCRIPTION_CREATED - billing_serviceで作成済み、webhook不要
# 2. SUBSCRIPTION_DELETED - billing_serviceで削除済み、webhook不要
# 3. create_subscription() - 作成機能はbilling_serviceの責任
# 4. delete_subscription() - 削除機能はbilling_serviceの責任
# 5. _update_user_plan_status() - プロフィール管理はuser_serviceの責任
#
# 🔄 **アーキテクチャフロー最適化：**
#
# **サブスクリプション作成フロー：**
# User Action → billing_service.create_subscription() → Stripe API → webhook（無視）
#
# **サブスクリプション更新フロー：**
# Stripe → webhook → subscription_sync.update_subscription() → DynamoDB同期
#
# **解約フロー：**
# User Action → billing_service.cancel_subscription(+解約理由) → Stripe API → webhook（無視）
#
# **決済処理フロー：**
# Stripe → webhook → PaymentHistory.save() → DynamoDB保存（コンプライアンス対応）
#
# 💡 **責任分離明確化の効果：**
# - billing_service: サブスクリプション・決済のCRUD操作
# - webhook_service: Stripe → DynamoDB同期のみ
# - user_service: ユーザープロフィール管理
# - 各サービスが単一責任を持ち、保守性・テスト性が向上
#

@stripe_webhook_router.post("/")
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
    Webhookイベントの具体的処理（不要処理削除済み）
    
    Args:
        event: Webhookイベント
        settings: アプリケーション設定
        
    Returns:
        Dict[str, Any]: 処理結果
    """
    event_type = event.type
    result = {"event_type": event_type, "actions": []}
    
    try:
        if event_type == WebhookEventType.SUBSCRIPTION_UPDATED:
            # ✅ 保持：webhook_serviceのコア機能
            result.update(await _handle_subscription_updated(event, settings))
            
        elif event_type == WebhookEventType.PAYMENT_SUCCEEDED:
            # ✅ 保持：PaymentHistory機能Phase 1（DB保存）
            result.update(await _handle_payment_succeeded(event, settings))
            
        elif event_type == WebhookEventType.PAYMENT_FAILED:
            # ✅ 保持：PaymentHistory機能Phase 1（DB保存）
            result.update(await _handle_payment_failed(event, settings))
            
        # ❌ 削除：_handle_trial_will_end
        # 理由：ほめびより内部でトライアル管理を行っており、Stripeトライアル機能は未使用
        # billing_serviceのget_trial_status()でトライアル期限管理を実装済み
            
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
    
    # Issue #15統一戦略対応: TTL更新・複雑な通知処理を削除
    # 3. プラン変更ログ記録（簡素化）
    if current_subscription and current_subscription.get("plan_type") != subscription.plan_type.value:
        old_plan = SubscriptionPlan(current_subscription.get("plan_type", "trial"))
        new_plan = subscription.plan_type
        
        logger.info("Subscription plan changed", extra={
            "user_id": user_id,
            "old_plan": old_plan.value,
            "new_plan": new_plan.value,
            "subscription_id": subscription.id
        })
        actions.append({"action": "log_plan_change", "result": "logged"})
    
    # 4. 解約予定ログ記録（簡素化）
    if subscription.will_cancel and not (current_subscription and current_subscription.get("cancel_at")):
        logger.info("Subscription will cancel", extra={
            "user_id": user_id,
            "cancel_at": subscription.cancel_at,
            "subscription_id": subscription.id
        })
        actions.append({"action": "log_cancel_scheduled", "result": "logged"})
    
    return {"status": "success", "actions": actions}


async def _handle_payment_succeeded(
    event: WebhookEvent,
    settings: WebhookSettings
) -> Dict[str, Any]:
    """支払い成功処理（GSI2最適化版）"""
    invoice = event.invoice_data
    if not invoice or not invoice.subscription:
        return {"status": "skipped", "reason": "No subscription invoice"}
        
    # customer_idを使用して効率的にサブスクリプション情報を取得（GSI2活用）
    customer_id = invoice.customer
    if not customer_id:
        return {"status": "failed", "error": "No customer_id in invoice"}
    
    # GSI2を使用してcustomer_idから直接サブスクリプション情報を取得
    db = get_webhook_database()
    subscription = await db.get_subscription_by_customer_id(customer_id)
    if not subscription:
        return {"status": "failed", "error": "Subscription not found for customer_id"}
        
    user_id = subscription.get("user_id")
    if not user_id:
        return {"status": "failed", "error": "No user_id in subscription"}
        
    actions = []
    
    # Phase 1実装: PaymentHistory DB保存
    try:
        # Invoiceから決済履歴を作成
        payment_history = PaymentHistory.from_stripe_invoice(invoice.raw_data, user_id)
        
        # DynamoDBに保存
        save_success = await db.save_payment_history(payment_history.to_dynamodb_item())
        
        if save_success:
            actions.append({"action": "save_payment_history", "result": "success"})
            logger.info("Payment history saved", extra={
                "user_id": user_id,
                "customer_id": customer_id,
                "payment_intent_id": payment_history.stripe_payment_intent_id,
                "amount": payment_history.amount
            })
        else:
            actions.append({"action": "save_payment_history", "result": "failed"})
            
    except Exception as e:
        logger.error("Failed to save payment history", extra={
            "error": str(e),
            "user_id": user_id,
            "customer_id": customer_id,
            "invoice_id": invoice.id
        })
        actions.append({"action": "save_payment_history", "result": "error"})
    
    # Issue #15統一戦略対応: 複雑な通知処理を削除
    # 支払い成功ログ記録（簡素化）
    if invoice.period_start > subscription.get("created", 0):
        logger.info("Payment succeeded", extra={
            "user_id": user_id,
            "customer_id": customer_id,
            "amount_paid": invoice.amount_paid_yen,
            "period_start": invoice.period_start,
            "period_end": invoice.period_end
        })
        actions.append({"action": "log_payment_success", "result": "logged"})
    
    return {"status": "success", "actions": actions}


async def _handle_payment_failed(
    event: WebhookEvent,
    settings: WebhookSettings
) -> Dict[str, Any]:
    """支払い失敗処理（GSI2最適化版）"""
    invoice = event.invoice_data
    if not invoice or not invoice.subscription:
        return {"status": "skipped", "reason": "No subscription invoice"}
        
    # customer_idを使用して効率的にサブスクリプション情報を取得（GSI2活用）
    customer_id = invoice.customer
    if not customer_id:
        return {"status": "failed", "error": "No customer_id in invoice"}
    
    # GSI2を使用してcustomer_idから直接サブスクリプション情報を取得
    db = get_webhook_database()
    subscription = await db.get_subscription_by_customer_id(customer_id)
    if not subscription:
        return {"status": "failed", "error": "Subscription not found for customer_id"}
        
    user_id = subscription.get("user_id")
    if not user_id:
        return {"status": "failed", "error": "No user_id in subscription"}
        
    actions = []
    
    # Phase 1実装: PaymentHistory DB保存（失敗分も記録）
    try:
        # Invoiceから決済履歴を作成（失敗ケース）
        payment_history = PaymentHistory.from_stripe_invoice(invoice.raw_data, user_id)
        
        # DynamoDBに保存
        save_success = await db.save_payment_history(payment_history.to_dynamodb_item())
        
        if save_success:
            actions.append({"action": "save_payment_history", "result": "success"})
            logger.info("Payment failure history saved", extra={
                "user_id": user_id,
                "customer_id": customer_id,
                "payment_intent_id": payment_history.stripe_payment_intent_id,
                "amount": payment_history.amount
            })
        else:
            actions.append({"action": "save_payment_history", "result": "failed"})
            
    except Exception as e:
        logger.error("Failed to save payment failure history", extra={
            "error": str(e),
            "user_id": user_id,
            "customer_id": customer_id,
            "invoice_id": invoice.id
        })
        actions.append({"action": "save_payment_history", "result": "error"})
    
    # Issue #15統一戦略対応: 複雑な通知処理を削除
    # 支払い失敗ログ記録（簡素化）
    logger.warning("Payment failed", extra={
        "user_id": user_id,
        "customer_id": customer_id,
        "amount_due": invoice.amount_due,
        "invoice_id": invoice.id
    })
    actions.append({"action": "log_payment_failed", "result": "logged"})
    
    return {"status": "success", "actions": actions}


# =====================================
# Stripe Webhook Event Samples - 実際に受信するイベントの構造例
# =====================================

"""
1. SUBSCRIPTION_UPDATED - サブスクリプション状態変更
{
  "id": "evt_1Nxxx...",
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_1Nxxx...",
      "customer": "cus_Nxxx...",
      "status": "active",
      "current_period_start": 1690000000,
      "current_period_end": 1692678400,
      "cancel_at_period_end": false,
      "canceled_at": null,
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

2. PAYMENT_SUCCEEDED - 決済成功（invoice.payment_succeeded）
{
  "id": "evt_1Nxxx...",
  "type": "invoice.payment_succeeded",
  "data": {
    "object": {
      "id": "in_1Nxxx...",
      "customer": "cus_Nxxx...",
      "subscription": "sub_1Nxxx...",
      "payment_intent": "pi_1Nxxx...",
      "amount_paid": 98000,
      "paid": true,
      "period_start": 1690000000,
      "period_end": 1692678400,
      "currency": "jpy"
    }
  }
}

3. PAYMENT_FAILED - 決済失敗（invoice.payment_failed）
{
  "id": "evt_1Nxxx...",
  "type": "invoice.payment_failed",
  "data": {
    "object": {
      "id": "in_1Nxxx...",
      "customer": "cus_Nxxx...",
      "subscription": "sub_1Nxxx...",
      "payment_intent": "pi_1Nxxx...",
      "amount_due": 98000,
      "paid": false,
      "period_start": 1690000000,
      "period_end": 1692678400,
      "currency": "jpy"
    }
  }
}

※注意: customer.subscription.trial_will_endイベントは未使用
理由: ほめびよりではトライアルをStripe外で内部管理しているため
billing_service/main.py の get_trial_status() でトライアル制御を実装
"""
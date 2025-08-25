"""
Stripe Payment Failed Handler - EventBridge Version

invoice.payment_failed イベントを処理する専用Lambda関数
EventBridge経由でStripeイベントを受信し、PaymentHistoryをDynamoDBに保存
"""

import json
from typing import Dict, Any

from homebiyori_common import get_logger, success_response, error_response

# 共通モジュールのインポート
try:
    from ..common.models import PaymentHistory
    from ..common.database import get_webhook_database
except ImportError:
    # Lambda実行時の直接インポート（デプロイ時はフラット構造）
    from common.models import PaymentHistory
    from common.database import get_webhook_database

# ログ設定
logger = get_logger(__name__)

async def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    EventBridge から受信したStripe payment_failed イベントを処理
    
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
        
        logger.info("Processing payment failed event via EventBridge", extra={
            "event_id": event_id,
            "event_type": event_type,
            "eventbridge_source": event.get('source'),
            "eventbridge_detail_type": event.get('detail-type')
        })
        
        # Stripe イベント検証
        if event_type != 'invoice.payment_failed':
            logger.warning("Unexpected event type", extra={
                "expected": "invoice.payment_failed",
                "received": event_type,
                "event_id": event_id
            })
            return success_response(
                data={"processed": False, "reason": "unexpected_event_type"},
                message="Event type not handled by this Lambda"
            )
        
        # Invoice データ抽出
        stripe_data = stripe_event.get('data', {})
        invoice_data = stripe_data.get('object', {})
        
        if not invoice_data or not invoice_data.get('subscription'):
            logger.info("Non-subscription invoice, skipping", extra={
                "event_id": event_id,
                "invoice_id": invoice_data.get('id')
            })
            return success_response(
                data={"processed": False, "reason": "non_subscription_invoice"},
                message="Non-subscription invoice skipped"
            )
        
        # 処理結果
        result = await process_payment_failed(invoice_data, event_id)
        
        logger.info("Payment failed event processed successfully", extra={
            "event_id": event_id,
            "processing_result": result
        })
        
        return success_response(
            data={"processed": True, "event_id": event_id, "result": result},
            message="Payment failed event processed successfully"
        )
        
    except Exception as e:
        logger.error("Failed to process payment failed event", extra={
            "error": str(e),
            "error_type": type(e).__name__,
            "event_id": stripe_event.get('id') if 'stripe_event' in locals() else None,
            "eventbridge_event": json.dumps(event, default=str)
        })
        
        # EventBridge の場合はエラーを返してリトライさせる
        return error_response(
            error_code="PROCESSING_FAILED",
            message=f"Payment failed processing failed: {str(e)}"
        )


async def process_payment_failed(invoice_data: Dict[str, Any], event_id: str) -> Dict[str, Any]:
    """
    支払い失敗処理のメインロジック（既存webhook_serviceから移植）
    
    Args:
        invoice_data: Stripe invoice object
        event_id: Stripe event ID
        
    Returns:
        Dict[str, Any]: 処理結果
    """
    actions = []
    customer_id = invoice_data.get('customer')
    
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
    
    # PaymentHistory DB保存（失敗ケース）
    try:
        # Invoiceから決済履歴を作成（失敗ステータスで）
        payment_history = PaymentHistory.from_stripe_invoice(invoice_data, user_id)
        
        # DynamoDBに保存
        save_success = await db.save_payment_history(payment_history.to_dynamodb_item())
        
        if save_success:
            actions.append({"action": "save_payment_history", "result": "success"})
            logger.info("Payment failure history saved successfully", extra={
                "user_id": user_id,
                "customer_id": customer_id,
                "payment_intent_id": payment_history.stripe_payment_intent_id,
                "amount": payment_history.amount,
                "status": payment_history.status,
                "event_id": event_id
            })
        else:
            actions.append({"action": "save_payment_history", "result": "failed"})
            
    except Exception as e:
        logger.error("Failed to save payment failure history", extra={
            "error": str(e),
            "user_id": user_id,
            "customer_id": customer_id,
            "invoice_id": invoice_data.get('id'),
            "event_id": event_id
        })
        actions.append({"action": "save_payment_history", "result": "error"})
    
    # 支払い失敗ログ記録（アラート用）
    amount_due_cents = invoice_data.get('amount_due', 0)
    amount_due_yen = amount_due_cents  # JPYの場合は既にyen単位
    
    logger.warning("Payment failed - requires attention", extra={
        "user_id": user_id,
        "customer_id": customer_id,
        "amount_due": amount_due_yen,
        "invoice_id": invoice_data.get('id'),
        "attempt_count": invoice_data.get('attempt_count', 1),
        "next_payment_attempt": invoice_data.get('next_payment_attempt'),
        "event_id": event_id
    })
    actions.append({"action": "log_payment_failed", "result": "logged"})
    
    # 失敗理由の詳細ログ
    payment_intent_id = invoice_data.get('payment_intent')
    if payment_intent_id:
        logger.warning("Payment intent failed details", extra={
            "user_id": user_id,
            "customer_id": customer_id,
            "payment_intent_id": payment_intent_id,
            "invoice_id": invoice_data.get('id'),
            "event_id": event_id
        })
    
    return {"status": "success", "actions": actions, "user_id": user_id}


# ==============================================
# EventBridge Event Payload Sample
# ==============================================
"""
EventBridge経由で受信するイベント構造例:

{
  "version": "0",
  "id": "12345678-1234-1234-1234-123456789012",
  "detail-type": "Invoice Payment Failed",
  "source": "aws.partner/stripe.com/acct_XXXXXXXXXXXXXXXXXX",
  "account": "123456789012",
  "time": "2024-08-25T12:00:00Z",
  "region": "us-east-1",
  "detail": {
    "id": "evt_1Nxxx...",
    "type": "invoice.payment_failed",
    "api_version": "2020-08-27",
    "created": 1690000000,
    "data": {
      "object": {
        "id": "in_1Nxxx...",
        "customer": "cus_Nxxx...",
        "subscription": "sub_1Nxxx...",
        "payment_intent": "pi_1Nxxx...",
        "amount_due": 98000,
        "paid": false,
        "attempt_count": 1,
        "next_payment_attempt": 1690086400,
        "period_start": 1690000000,
        "period_end": 1692678400,
        "currency": "jpy"
      }
    }
  }
}
"""
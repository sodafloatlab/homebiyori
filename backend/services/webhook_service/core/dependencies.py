"""
FastAPI Dependencies

Webhook Service で使用する依存性注入関数群。
- Stripe署名検証
- レート制限
- リクエスト検証
"""

import stripe
from fastapi import Request, HTTPException, Depends
from typing import Dict, Any

from homebiyori_common import get_logger
from homebiyori_common.exceptions import ValidationError

from .config import get_settings, WebhookSettings

logger = get_logger(__name__)


async def verify_webhook_signature(
    request: Request,
    settings: WebhookSettings = Depends(get_settings)
) -> Dict[str, Any]:
    """
    Stripe Webhook 署名検証
    
    Args:
        request: FastAPI Request オブジェクト
        settings: アプリケーション設定
        
    Returns:
        Dict[str, Any]: 検証済みStripeイベント
        
    Raises:
        HTTPException: 署名検証失敗時
    """
    try:
        # 署名検証が無効化されている場合はスキップ（開発環境用）
        if not settings.enable_webhook_validation:
            logger.warning("Webhook signature validation is disabled")
            body = await request.body()
            # 簡易的なJSON解析を試みる
            try:
                import json
                return json.loads(body.decode('utf-8'))
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid JSON payload"
                )
        
        # リクエストボディとヘッダーを取得
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        if not sig_header:
            logger.warning("Missing Stripe signature header")
            raise HTTPException(
                status_code=400,
                detail="Missing Stripe signature header"
            )
            
        if not payload:
            logger.warning("Empty webhook payload")
            raise HTTPException(
                status_code=400,
                detail="Empty webhook payload"
            )
            
        # Stripe署名検証
        try:
            event = stripe.Webhook.construct_event(
                payload,
                sig_header,
                settings.stripe_webhook_secret
            )
            
            logger.info("Stripe webhook signature verified", extra={
                "event_type": event.get("type"),
                "event_id": event.get("id"),
                "api_version": event.get("api_version"),
                "payload_size": len(payload)
            })
            
            return event
            
        except stripe.error.SignatureVerificationError as e:
            logger.error("Stripe signature verification failed", extra={
                "error": str(e),
                "signature_present": bool(sig_header),
                "payload_size": len(payload)
            })
            raise HTTPException(
                status_code=401,
                detail="Invalid Stripe signature"
            )
            
        except ValueError as e:
            logger.error("Invalid webhook payload", extra={
                "error": str(e),
                "payload_preview": payload[:100].decode('utf-8', errors='ignore')
            })
            raise HTTPException(
                status_code=400,
                detail="Invalid webhook payload"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error in webhook signature verification", extra={
            "error": str(e),
            "error_type": type(e).__name__
        })
        raise HTTPException(
            status_code=500,
            detail="Webhook signature verification failed"
        )


async def validate_webhook_event(
    event: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Webhook イベントの基本検証
    
    Args:
        event: Stripe イベント
        
    Returns:
        Dict[str, Any]: 検証済みイベント
        
    Raises:
        HTTPException: 検証失敗時
    """
    try:
        # 必須フィールドの確認
        required_fields = ["id", "type", "data", "created"]
        missing_fields = [field for field in required_fields if field not in event]
        
        if missing_fields:
            logger.warning("Webhook event missing required fields", extra={
                "missing_fields": missing_fields,
                "event_id": event.get("id"),
                "event_type": event.get("type")
            })
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
            
        # サポートされているイベントタイプの確認
        supported_event_types = {
            "customer.subscription.created",
            "customer.subscription.updated", 
            "customer.subscription.deleted",
            "invoice.payment_succeeded",
            "invoice.payment_failed",
            "customer.subscription.trial_will_end"
        }
        
        event_type = event.get("type")
        if event_type not in supported_event_types:
            logger.info("Unsupported webhook event type", extra={
                "event_type": event_type,
                "event_id": event.get("id"),
                "supported_types": list(supported_event_types)
            })
            # サポートされていないイベントは200で応答（Stripeの推奨）
            raise HTTPException(
                status_code=200,
                detail=f"Event type '{event_type}' is not processed by this service"
            )
            
        logger.debug("Webhook event validation successful", extra={
            "event_type": event_type,
            "event_id": event.get("id"),
            "created": event.get("created")
        })
        
        return event
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error in webhook event validation", extra={
            "error": str(e),
            "error_type": type(e).__name__,
            "event_id": event.get("id") if event else None
        })
        raise HTTPException(
            status_code=500,
            detail="Webhook event validation failed"
        )


def get_current_settings() -> WebhookSettings:
    """
    現在の設定を取得する依存性関数
    
    Returns:
        WebhookSettings: 設定インスタンス
    """
    return get_settings()
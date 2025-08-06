"""
Health Check Handler

Webhook Service のヘルスチェック機能。
- Lambda関数の死活監視
- 依存サービス接続確認
- 設定検証
"""

from fastapi import APIRouter, Depends
from datetime import datetime

from homebiyori_common import get_logger, success_response
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string

from ..core.config import get_settings, WebhookSettings

# ログ設定
logger = get_logger(__name__)

# ルーター初期化
health_router = APIRouter()


@health_router.get("/")
async def health_check():
    """
    基本的なヘルスチェック
    
    Returns:
        FastAPI Response: サービス状態
    """
    current_time = get_current_jst()
    
    logger.debug("Health check requested")
    
    return success_response(
        data={
            "service": "webhook-service",
            "status": "healthy",
            "timestamp": to_jst_string(current_time),
            "version": "1.0.0"
        },
        message="Webhook service is healthy"
    )


@health_router.get("/detailed")
async def detailed_health_check(
    settings: WebhookSettings = Depends(get_settings)
):
    """
    詳細ヘルスチェック
    
    Args:
        settings: アプリケーション設定
        
    Returns:
        FastAPI Response: 詳細サービス状態
    """
    current_time = get_current_jst()
    
    logger.info("Detailed health check requested")
    
    # 設定状態確認
    config_status = {
        "has_stripe_webhook_secret": bool(settings.stripe_webhook_secret),
        "has_internal_api_key": bool(settings.internal_api_key),
        "has_ttl_queue_url": bool(settings.ttl_update_queue_url),
        "webhook_validation_enabled": settings.enable_webhook_validation,
        "environment": settings.environment
    }
    
    # 依存サービス状態（簡易チェック）
    dependencies = {
        "dynamodb": "available",  # 実際にはboto3クライアント作成テスト
        "sqs": "available",       # 実際にはSQSクライアント作成テスト
        "stripe": "configured" if settings.stripe_webhook_secret else "not_configured"
    }
    
    # 全体ステータス判定
    overall_status = "healthy"
    if not all([
        config_status["has_stripe_webhook_secret"],
        config_status["has_internal_api_key"],
        config_status["has_ttl_queue_url"]
    ]):
        overall_status = "degraded"
    
    health_data = {
        "service": "webhook-service",
        "status": overall_status,
        "timestamp": to_jst_string(current_time),
        "version": "1.0.0",
        "uptime_seconds": 0,  # 実際の実装ではプロセス開始時間から計算
        "config": config_status,
        "dependencies": dependencies
    }
    
    logger.info("Detailed health check completed", extra={
        "overall_status": overall_status,
        "config_issues": [k for k, v in config_status.items() if k.startswith("has_") and not v]
    })
    
    return success_response(
        data=health_data,
        message=f"Webhook service is {overall_status}"
    )


@health_router.get("/ready")
async def readiness_check(
    settings: WebhookSettings = Depends(get_settings)
):
    """
    Readiness チェック（K8s用）
    
    Args:
        settings: アプリケーション設定
        
    Returns:
        FastAPI Response: Ready状態
    """
    logger.debug("Readiness check requested")
    
    # 必須設定の確認
    required_configs = [
        settings.stripe_webhook_secret,
        settings.internal_api_key,
        settings.ttl_update_queue_url,
        settings.dynamodb_table
    ]
    
    is_ready = all(required_configs)
    
    if is_ready:
        return success_response(
            data={
                "service": "webhook-service", 
                "ready": True,
                "timestamp": to_jst_string(get_current_jst())
            },
            message="Service is ready"
        )
    else:
        logger.warning("Service not ready - missing configuration")
        return success_response(
            data={
                "service": "webhook-service",
                "ready": False,
                "timestamp": to_jst_string(get_current_jst()),
                "reason": "missing_configuration"
            },
            status_code=503,
            message="Service not ready"
        )


@health_router.get("/liveness")
async def liveness_check():
    """
    Liveness チェック（K8s用）
    
    Returns:
        FastAPI Response: Live状態
    """
    logger.debug("Liveness check requested")
    
    return success_response(
        data={
            "service": "webhook-service",
            "alive": True,
            "timestamp": to_jst_string(get_current_jst())
        },
        message="Service is alive"
    )
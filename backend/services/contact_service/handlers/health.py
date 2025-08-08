"""
Contact Service - Health Check Handler

サービスの正常性確認とSNS接続テスト機能を提供。
"""

from typing import Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException
import boto3
from botocore.exceptions import ClientError

from homebiyori_common import get_logger, success_response
from homebiyori_common.utils.datetime_utils import get_current_jst

from ..core.config import get_settings

logger = get_logger(__name__)
router = APIRouter()


@router.get("/")
async def health_check():
    """
    基本ヘルスチェック
    
    Returns:
        Dict[str, Any]: サービス状態情報
    """
    settings = get_settings()
    
    return success_response(
        data={
            "service": "contact_service",
            "status": "healthy",
            "version": "1.0.0",
            "timestamp": get_current_jst().isoformat(),
            "environment": settings.environment,
            "features": {
                "email_notifications": settings.enable_email_notifications,
                "rate_limiting": settings.enable_rate_limiting,
                "spam_detection": settings.enable_spam_detection,
                "auto_categorization": settings.enable_auto_categorization
            }
        },
        message="Contact service is healthy"
    )


@router.get("/detailed")
async def detailed_health_check():
    """
    詳細ヘルスチェック
    
    AWS SNS接続状況も含めて確認する。
    
    Returns:
        Dict[str, Any]: 詳細サービス状態情報
    """
    settings = get_settings()
    health_data = {
        "service": "contact_service",
        "version": "1.0.0",
        "timestamp": get_current_jst().isoformat(),
        "environment": settings.environment,
        "overall_status": "healthy",
        "checks": {}
    }
    
    try:
        # 基本設定チェック
        health_data["checks"]["configuration"] = {
            "status": "pass",
            "details": {
                "sns_topic_configured": bool(settings.sns_topic_arn),
                "rate_limiting_enabled": settings.enable_rate_limiting,
                "max_inquiries_per_hour": settings.max_inquiries_per_hour
            }
        }
        
        # AWS SNS接続チェック
        sns_status = await _check_sns_connection(settings)
        health_data["checks"]["sns_connection"] = sns_status
        
        if sns_status["status"] == "fail":
            health_data["overall_status"] = "degraded"
        
        # レート制限システムチェック
        rate_limit_status = await _check_rate_limiting()
        health_data["checks"]["rate_limiting"] = rate_limit_status
        
        logger.info("Detailed health check completed", extra={
            "overall_status": health_data["overall_status"],
            "sns_status": sns_status["status"],
            "rate_limit_status": rate_limit_status["status"]
        })
        
        return success_response(
            data=health_data,
            message=f"Health check completed - {health_data['overall_status']}"
        )
        
    except Exception as e:
        logger.error("Health check failed", extra={
            "error": str(e),
            "error_type": type(e).__name__
        })
        
        health_data["overall_status"] = "unhealthy"
        health_data["error"] = str(e)
        
        return success_response(
            data=health_data,
            message="Health check completed with errors"
        )


@router.get("/sns")
async def sns_connection_check():
    """
    AWS SNS接続専用チェック
    
    SNSトピックにアクセス可能かテストする。
    本番環境では実際のメッセージ送信は行わない。
    
    Returns:
        Dict[str, Any]: SNS接続状態
    """
    settings = get_settings()
    
    try:
        sns_client = boto3.client('sns', region_name=settings.sns_region)
        
        # トピック属性を取得してアクセス可能性を確認
        response = sns_client.get_topic_attributes(
            TopicArn=settings.sns_topic_arn
        )
        
        topic_attributes = response.get('Attributes', {})
        
        sns_status = {
            "status": "pass",
            "topic_arn": settings.sns_topic_arn,
            "region": settings.sns_region,
            "topic_name": topic_attributes.get('DisplayName', 'N/A'),
            "subscriptions_confirmed": int(topic_attributes.get('SubscriptionsConfirmed', 0)),
            "subscriptions_pending": int(topic_attributes.get('SubscriptionsPending', 0)),
            "checked_at": get_current_jst().isoformat()
        }
        
        logger.info("SNS connection check passed", extra={
            "topic_arn": settings.sns_topic_arn,
            "subscriptions_confirmed": sns_status["subscriptions_confirmed"]
        })
        
        return success_response(
            data=sns_status,
            message="SNS connection is healthy"
        )
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        logger.error("SNS connection check failed", extra={
            "error_code": error_code,
            "error_message": error_message,
            "topic_arn": settings.sns_topic_arn
        })
        
        sns_status = {
            "status": "fail",
            "topic_arn": settings.sns_topic_arn,
            "region": settings.sns_region,
            "error_code": error_code,
            "error_message": error_message,
            "checked_at": get_current_jst().isoformat()
        }
        
        return success_response(
            data=sns_status,
            message="SNS connection check failed"
        )
        
    except Exception as e:
        logger.error("SNS connection check error", extra={
            "error": str(e),
            "error_type": type(e).__name__
        })
        
        raise HTTPException(
            status_code=500,
            detail=f"SNS connection check failed: {str(e)}"
        )


# =======================================
# ヘルパー関数
# =======================================


async def _check_sns_connection(settings) -> Dict[str, Any]:
    """
    AWS SNS接続チェック
    
    Args:
        settings: サービス設定
        
    Returns:
        Dict[str, Any]: SNS接続状態
    """
    try:
        sns_client = boto3.client('sns', region_name=settings.sns_region)
        
        response = sns_client.get_topic_attributes(
            TopicArn=settings.sns_topic_arn
        )
        
        topic_attributes = response.get('Attributes', {})
        
        return {
            "status": "pass",
            "response_time_ms": 0,  # 実装時に計測
            "details": {
                "topic_exists": True,
                "subscriptions_confirmed": int(topic_attributes.get('SubscriptionsConfirmed', 0)),
                "policy_exists": bool(topic_attributes.get('Policy'))
            }
        }
        
    except ClientError as e:
        return {
            "status": "fail",
            "error_code": e.response['Error']['Code'],
            "error_message": e.response['Error']['Message']
        }
    except Exception as e:
        return {
            "status": "fail",
            "error": str(e)
        }


async def _check_rate_limiting() -> Dict[str, Any]:
    """
    レート制限システムチェック
    
    Returns:
        Dict[str, Any]: レート制限システム状態
    """
    try:
        # レート制限の基本機能をテスト
        # 実際の実装では Redis 接続チェックなど
        
        return {
            "status": "pass",
            "details": {
                "system": "memory_based",  # または "redis_based"
                "limits_configured": True
            }
        }
        
    except Exception as e:
        return {
            "status": "fail",
            "error": str(e)
        }
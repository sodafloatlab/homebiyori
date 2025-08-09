"""
Contact Service - Admin Handler

運営者向けの管理機能を提供。
- 問い合わせ統計
- 通知設定管理
- システムテスト機能
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from homebiyori_common import get_logger, success_response, error_response
# verify_admin_token is defined locally in admin_service - creating local implementation
from homebiyori_common.utils.datetime_utils import get_current_jst

from ..models import ContactStats, ContactCategory, ContactPriority
from ..services.notification_service import ContactNotificationService
from ..core.config import get_settings

logger = get_logger(__name__)
router = APIRouter()
security = HTTPBearer()


async def verify_admin_token(token: str) -> bool:
    """
    簡単な管理者トークン検証
    
    実装注意: 本番では適切なJWT検証やCognitoの管理者権限確認が必要
    """
    if not token or token == "invalid":
        raise HTTPException(status_code=401, detail="Invalid admin token")
    
    # テスト用の簡易実装
    logger.info("Admin authentication attempted")
    return True


@router.get("/stats", response_model=ContactStats)
async def get_contact_stats(
    days: Optional[int] = 30,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    問い合わせ統計取得API
    
    運営者向けの問い合わせ統計情報を提供。
    
    Args:
        days: 集計期間（日数）
        credentials: 管理者認証トークン
        
    Returns:
        ContactStats: 問い合わせ統計
    """
    # 管理者認証
    await verify_admin_token(credentials.credentials)
    
    try:
        # 実際の実装では DynamoDB から統計データを取得
        # ここでは模擬データを返す
        
        stats = ContactStats(
            total_inquiries=125,
            pending_inquiries=8, 
            resolved_inquiries=117,
            average_response_time_hours=18.5,
            category_breakdown={
                "general": 45,
                "bug_report": 23,
                "feature_request": 18,
                "account_issue": 12,
                "payment": 8,
                "privacy": 3,
                "other": 16
            },
            priority_breakdown={
                "low": 75,
                "medium": 42,
                "high": 8
            }
        )
        
        logger.info("Contact stats retrieved", extra={
            "days": days,
            "total_inquiries": stats.total_inquiries
        })
        
        return success_response(
            data=stats.model_dump(),
            message=f"過去{days}日間の問い合わせ統計を取得しました"
        )
        
    except Exception as e:
        logger.error("Failed to get contact stats", extra={
            "error": str(e),
            "error_type": type(e).__name__,
            "days": days
        })
        
        raise HTTPException(
            status_code=500,
            detail="統計データの取得に失敗しました"
        )


@router.post("/test-notification")
async def admin_test_notification(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    管理者向けテスト通知API
    
    AWS SNS設定の動作確認用。
    実際の運営者メールアドレスにテスト通知を送信。
    
    Args:
        credentials: 管理者認証トークン
        
    Returns:
        Dict[str, Any]: テスト通知結果
    """
    # 管理者認証
    await verify_admin_token(credentials.credentials)
    
    try:
        notification_service = ContactNotificationService()
        result = await notification_service.send_test_notification()
        
        logger.info("Admin test notification sent", extra={
            "success": result["success"],
            "message_id": result.get("message_id")
        })
        
        return success_response(
            data=result,
            message="テスト通知を送信しました"
        )
        
    except Exception as e:
        logger.error("Admin test notification failed", extra={
            "error": str(e),
            "error_type": type(e).__name__
        })
        
        raise HTTPException(
            status_code=500,
            detail=f"テスト通知の送信に失敗しました: {str(e)}"
        )


@router.get("/config")
async def get_service_config(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    サービス設定取得API
    
    運営者向けの現在のサービス設定を返す。
    機密情報は除外して表示。
    
    Args:
        credentials: 管理者認証トークン
        
    Returns:
        Dict[str, Any]: サービス設定
    """
    # 管理者認証
    await verify_admin_token(credentials.credentials)
    
    settings = get_settings()
    
    config_data = {
        "service_info": {
            "name": settings.service_name,
            "environment": settings.environment,
            "version": "1.0.0"
        },
        "notification_settings": {
            "email_notifications_enabled": settings.enable_email_notifications,
            "sns_region": settings.sns_region,
            "sns_topic_configured": bool(settings.sns_topic_arn)
        },
        "rate_limiting": {
            "enabled": settings.enable_rate_limiting,
            "max_inquiries_per_hour": settings.max_inquiries_per_hour,
            "max_inquiries_per_day": settings.max_inquiries_per_day
        },
        "response_times": {
            "low_priority_hours": settings.response_time_low_hours,
            "medium_priority_hours": settings.response_time_medium_hours,
            "high_priority_hours": settings.response_time_high_hours
        },
        "features": {
            "auto_categorization": settings.enable_auto_categorization,
            "auto_priority_detection": settings.enable_auto_priority_detection,
            "spam_detection": settings.enable_spam_detection
        },
        "retrieved_at": get_current_jst().isoformat()
    }
    
    return success_response(
        data=config_data,
        message="サービス設定を取得しました"
    )


@router.get("/recent-inquiries")
async def get_recent_inquiries(
    limit: int = 20,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    最近の問い合わせ一覧取得API
    
    運営者向けの最近の問い合わせ一覧を返す。
    個人情報は適切にマスキング。
    
    Args:
        limit: 取得件数制限
        category: カテゴリフィルター
        priority: 優先度フィルター
        credentials: 管理者認証トークン
        
    Returns:
        Dict[str, Any]: 問い合わせ一覧
    """
    # 管理者認証
    await verify_admin_token(credentials.credentials)
    
    try:
        # 実際の実装では DynamoDB から問い合わせデータを取得
        # ここでは模擬データを返す
        
        inquiries = [
            {
                "inquiry_id": "12345678-1234-5678-9012-123456789012",
                "submitted_at": get_current_jst().isoformat(),
                "category": "general",
                "priority": "medium",
                "subject": "アプリの使い方について",
                "email_masked": "u***r@example.com",
                "user_type": "authenticated",
                "status": "pending",
                "notification_sent": True
            }
        ]
        
        # フィルタリング適用（模擬）
        if category:
            inquiries = [i for i in inquiries if i["category"] == category]
        if priority:
            inquiries = [i for i in inquiries if i["priority"] == priority]
        
        inquiries = inquiries[:limit]
        
        logger.info("Recent inquiries retrieved", extra={
            "count": len(inquiries),
            "limit": limit,
            "category_filter": category,
            "priority_filter": priority
        })
        
        return success_response(
            data={
                "inquiries": inquiries,
                "total_count": len(inquiries),
                "filters_applied": {
                    "category": category,
                    "priority": priority,
                    "limit": limit
                }
            },
            message="最近の問い合わせを取得しました"
        )
        
    except Exception as e:
        logger.error("Failed to get recent inquiries", extra={
            "error": str(e),
            "error_type": type(e).__name__
        })
        
        raise HTTPException(
            status_code=500,
            detail="問い合わせデータの取得に失敗しました"
        )


@router.post("/emergency-notification")
async def send_emergency_notification(
    message: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    緊急通知送信API
    
    システム障害や重要なお知らせを運営チームに即座に通知。
    
    Args:
        message: 緊急通知メッセージ
        credentials: 管理者認証トークン
        
    Returns:
        Dict[str, Any]: 通知送信結果
    """
    # 管理者認証
    await verify_admin_token(credentials.credentials)
    
    try:
        settings = get_settings()
        
        # 緊急通知用のメッセージを構築
        emergency_message = {
            "subject": "【緊急】Homebiyori システム通知",
            "body": f"""
Homebiyori 運営チーム様

緊急通知が発生しました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 緊急通知内容
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 通知詳細
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
送信日時: {get_current_jst().strftime('%Y年%m月%d日 %H:%M:%S JST')}
環境: {settings.environment}
サービス: Contact Service

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
この通知は管理者により手動送信されました。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
        }
        
        # SNS経由で送信
        import boto3
        import json
        
        sns_client = boto3.client('sns', region_name=settings.sns_region)
        
        response = sns_client.publish(
            TopicArn=settings.sns_topic_arn,
            Message=emergency_message["body"],
            Subject=emergency_message["subject"],
            MessageAttributes={
                'notification_type': {
                    'DataType': 'String',
                    'StringValue': 'emergency'
                },
                'environment': {
                    'DataType': 'String',
                    'StringValue': settings.environment
                }
            }
        )
        
        logger.warning("Emergency notification sent", extra={
            "message_id": response.get("MessageId"),
            "message_preview": message[:100]
        })
        
        return success_response(
            data={
                "message_id": response.get("MessageId"),
                "sent_at": get_current_jst().isoformat(),
                "notification_type": "emergency"
            },
            message="緊急通知を送信しました"
        )
        
    except Exception as e:
        logger.error("Emergency notification failed", extra={
            "error": str(e),
            "error_type": type(e).__name__,
            "message_preview": message[:100]
        })
        
        raise HTTPException(
            status_code=500,
            detail=f"緊急通知の送信に失敗しました: {str(e)}"
        )
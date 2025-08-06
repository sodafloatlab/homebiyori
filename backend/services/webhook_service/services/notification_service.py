"""
Notification Service

内部API経由での通知作成サービス。
- notification-service への HTTP API 呼び出し
- Lambda間認証
- エラーハンドリング
"""

import httpx
import os
from typing import Dict, Any
from datetime import datetime

from homebiyori_common import get_logger
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string
from homebiyori_common.exceptions import ExternalServiceError

from ..models.stripe_models import NotificationMessage

logger = get_logger(__name__)


class NotificationService:
    """通知サービス"""
    
    def __init__(self):
        self.internal_api_base_url = os.getenv("INTERNAL_API_BASE_URL")
        self.internal_api_key = os.getenv("INTERNAL_API_KEY")
        
        if not self.internal_api_base_url:
            raise ValueError("INTERNAL_API_BASE_URL environment variable is required")
        if not self.internal_api_key:
            raise ValueError("INTERNAL_API_KEY environment variable is required")
        
        # HTTPクライアント設定
        self.timeout = httpx.Timeout(10.0, connect=5.0)
        self.headers = {
            'X-API-Key': self.internal_api_key,
            'Content-Type': 'application/json',
            'X-Source-Lambda': 'webhook_service',
            'User-Agent': 'webhook_service/1.0.0'
        }
    
    async def create_notification(
        self,
        notification: NotificationMessage
    ) -> Dict[str, Any]:
        """
        内部API経由で通知作成
        
        Args:
            notification: 通知メッセージ
            
        Returns:
            Dict[str, Any]: 作成結果
        """
        try:
            url = f"{self.internal_api_base_url}/internal/notifications/create"
            
            # リクエストペイロード準備
            payload = notification.dict()
            if payload.get('expires_at'):
                payload['expires_at'] = payload['expires_at'].isoformat()
            
            logger.debug("Creating notification via internal API", extra={
                "user_id": notification.user_id,
                "notification_type": notification.type,
                "title": notification.title,
                "url": url
            })
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=self.headers
                )
                
                # レスポンス確認
                response.raise_for_status()
                result = response.json()
                
                logger.info("Notification created successfully", extra={
                    "user_id": notification.user_id,
                    "notification_type": notification.type,
                    "notification_id": result.get("data", {}).get("notification_id"),
                    "status_code": response.status_code
                })
                
                return {
                    "status": "success",
                    "notification_id": result.get("data", {}).get("notification_id"),
                    "created_at": result.get("data", {}).get("created_at")
                }
                
        except httpx.HTTPStatusError as e:
            error_detail = "Unknown error"
            try:
                error_response = e.response.json()
                error_detail = error_response.get("message", str(e))
            except Exception:
                error_detail = str(e)
            
            logger.error("HTTP error creating notification", extra={
                "error": error_detail,
                "status_code": e.response.status_code,
                "user_id": notification.user_id,
                "notification_type": notification.type,
                "url": url
            })
            
            # 通知作成失敗は非致命的エラーとして扱う
            return {
                "status": "failed",
                "error": error_detail,
                "status_code": e.response.status_code
            }
            
        except httpx.RequestError as e:
            logger.error("Request error creating notification", extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "user_id": notification.user_id,
                "notification_type": notification.type,
                "url": url
            })
            
            # ネットワークエラーも非致命的として扱う
            return {
                "status": "failed",
                "error": f"Request error: {str(e)}"
            }
            
        except Exception as e:
            logger.error("Unexpected error creating notification", extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "user_id": notification.user_id,
                "notification_type": notification.type
            })
            
            return {
                "status": "failed", 
                "error": f"Unexpected error: {str(e)}"
            }
    
    async def create_notifications_batch(
        self,
        notifications: list[NotificationMessage]
    ) -> Dict[str, Any]:
        """
        複数通知のバッチ作成
        
        Args:
            notifications: 通知メッセージリスト
            
        Returns:
            Dict[str, Any]: バッチ作成結果
        """
        if not notifications:
            return {"status": "success", "total": 0, "successful": 0, "failed": 0}
        
        results = []
        successful = 0
        failed = 0
        
        logger.info("Creating notification batch", extra={
            "notification_count": len(notifications)
        })
        
        for notification in notifications:
            try:
                result = await self.create_notification(notification)
                results.append({
                    "user_id": notification.user_id,
                    "type": notification.type,
                    "result": result
                })
                
                if result.get("status") == "success":
                    successful += 1
                else:
                    failed += 1
                    
            except Exception as e:
                logger.error("Error in batch notification creation", extra={
                    "error": str(e),
                    "user_id": notification.user_id,
                    "notification_type": notification.type
                })
                
                results.append({
                    "user_id": notification.user_id,
                    "type": notification.type,
                    "result": {"status": "failed", "error": str(e)}
                })
                failed += 1
        
        logger.info("Notification batch completed", extra={
            "total": len(notifications),
            "successful": successful,
            "failed": failed
        })
        
        return {
            "status": "completed",
            "total": len(notifications),
            "successful": successful,
            "failed": failed,
            "results": results
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """
        通知サービスのヘルスチェック
        
        Returns:
            Dict[str, Any]: ヘルスチェック結果
        """
        try:
            url = f"{self.internal_api_base_url}/health"
            
            async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                
                result = response.json()
                
                logger.debug("Notification service health check successful", extra={
                    "status_code": response.status_code,
                    "service_status": result.get("data", {}).get("status")
                })
                
                return {
                    "status": "healthy",
                    "service_status": result.get("data", {}).get("status"),
                    "response_time_ms": response.elapsed.total_seconds() * 1000
                }
                
        except httpx.HTTPStatusError as e:
            logger.warning("Notification service health check failed", extra={
                "status_code": e.response.status_code,
                "url": url
            })
            
            return {
                "status": "unhealthy",
                "error": f"HTTP {e.response.status_code}",
                "url": url
            }
            
        except httpx.RequestError as e:
            logger.warning("Notification service unreachable", extra={
                "error": str(e),
                "url": url
            })
            
            return {
                "status": "unreachable",
                "error": str(e),
                "url": url
            }
            
        except Exception as e:
            logger.warning("Unexpected error in notification service health check", extra={
                "error": str(e),
                "error_type": type(e).__name__
            })
            
            return {
                "status": "unknown",
                "error": str(e)
            }
"""
Lambda Handler for Notification Service

AWS Lambda エントリーポイント。
メンテナンスモード対応とエラーハンドリングを統合。
"""

import json
from typing import Dict, Any

# 共通Layer機能インポート
from homebiyori_common import get_logger, error_response
from homebiyori_common.maintenance import maintenance_required

from .main import handler as fastapi_handler

# ログ設定
logger = get_logger(__name__)


@maintenance_required(skip_paths=["/health", "/internal/notifications/health"])
async def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda エントリーポイント
    
    Args:
        event: API Gateway イベント
        context: Lambda コンテキスト
        
    Returns:
        Dict[str, Any]: HTTP レスポンス
    """
    try:
        logger.info("Notification service invoked", extra={
            "request_id": context.aws_request_id,
            "function_name": context.function_name,
            "path": event.get("path"),
            "method": event.get("httpMethod"),
            "source_ip": event.get("requestContext", {}).get("identity", {}).get("sourceIp")
        })
        
        # FastAPI アプリケーションに処理を委譲
        response = fastapi_handler(event, context)
        
        logger.debug("Notification service response", extra={
            "request_id": context.aws_request_id,
            "status_code": response.get("statusCode"),
            "response_size": len(str(response.get("body", "")))
        })
        
        return response
        
    except Exception as e:
        logger.error("Fatal error in notification handler", extra={
            "error": str(e),
            "error_type": type(e).__name__,
            "request_id": getattr(context, 'aws_request_id', 'unknown'),
            "event_keys": list(event.keys()) if event else []
        })
        
        # 最後の砦としてのエラーレスポンス
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "success": False,
                "message": "通知処理中に予期しないエラーが発生しました", 
                "error": "fatal_error"
            }, ensure_ascii=False)
        }




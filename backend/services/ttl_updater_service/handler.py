"""
Lambda Handler for TTL Updater Service

SQSメッセージ駆動によるDynamoDB TTL更新処理。
Stripe Webhookからのサブスクリプション変更を受けて
チャット履歴の保持期間を動的に調整。
"""

import json
from typing import Dict, Any, List

# 共通Layer機能インポート
from homebiyori_common import get_logger, success_response, error_response
from homebiyori_common.utils.datetime_utils import get_current_jst

from .main import TTLUpdaterService

# ログ設定
logger = get_logger(__name__)


async def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda エントリーポイント（SQS イベント処理）
    
    Args:
        event: SQS イベント
        context: Lambda コンテキスト
        
    Returns:
        Dict[str, Any]: 処理結果
    """
    try:
        logger.info("TTL Updater service invoked", extra={
            "request_id": context.aws_request_id,
            "function_name": context.function_name,
            "event_source": event.get("eventSource", "unknown"),
            "records_count": len(event.get("Records", []))
        })
        
        if not event.get("Records"):
            logger.warning("No SQS records found in event")
            return success_response({"message": "No records to process"})
        
        # TTL更新サービス初期化
        updater_service = TTLUpdaterService()
        
        # 処理結果追跡
        processed_count = 0
        failed_count = 0
        failed_records = []
        
        # SQSレコード処理
        for record in event["Records"]:
            try:
                # SQSメッセージ解析
                message_body = json.loads(record.get("body", "{}"))
                message_id = record.get("messageId")
                receipt_handle = record.get("receiptHandle")
                
                logger.debug("Processing SQS record", extra={
                    "message_id": message_id,
                    "message_type": message_body.get("type"),
                    "user_id": message_body.get("user_id")
                })
                
                # TTL更新処理実行
                result = await updater_service.process_ttl_update_message(message_body)
                
                if result.get("success", False):
                    processed_count += 1
                    logger.info("TTL update completed", extra={
                        "message_id": message_id,
                        "user_id": message_body.get("user_id"),
                        "updated_records": result.get("updated_count", 0)
                    })
                else:
                    failed_count += 1
                    failed_records.append({
                        "message_id": message_id,
                        "error": result.get("error", "Unknown error")
                    })
                    logger.error("TTL update failed", extra={
                        "message_id": message_id,
                        "error": result.get("error")
                    })
                
            except Exception as record_error:
                failed_count += 1
                message_id = record.get("messageId", "unknown")
                failed_records.append({
                    "message_id": message_id,
                    "error": str(record_error)
                })
                logger.error("Failed to process SQS record", extra={
                    "message_id": message_id,
                    "error": str(record_error),
                    "error_type": type(record_error).__name__
                })
        
        # 全体処理結果
        total_records = len(event["Records"])
        success_rate = (processed_count / total_records) * 100 if total_records > 0 else 0
        
        logger.info("TTL Updater batch completed", extra={
            "request_id": context.aws_request_id,
            "total_records": total_records,
            "processed_count": processed_count,
            "failed_count": failed_count,
            "success_rate": success_rate
        })
        
        # 部分的失敗の場合はSQSに失敗レコードを返す
        if failed_count > 0:
            return {
                "statusCode": 200,  # SQSでは200で部分失敗を示す
                "body": json.dumps({
                    "success": True,
                    "message": f"Processed {processed_count}/{total_records} records",
                    "processed_count": processed_count,
                    "failed_count": failed_count,
                    "failed_records": failed_records,
                    "timestamp": get_current_jst().isoformat()
                }, ensure_ascii=False),
                "batchItemFailures": [
                    {"itemIdentifier": record["message_id"]} 
                    for record in failed_records
                ]
            }
        
        return success_response({
            "message": f"Successfully processed {processed_count} records",
            "processed_count": processed_count,
            "failed_count": failed_count,
            "timestamp": get_current_jst().isoformat()
        })
        
    except Exception as e:
        logger.error("Fatal error in TTL updater handler", extra={
            "error": str(e),
            "error_type": type(e).__name__,
            "request_id": getattr(context, 'aws_request_id', 'unknown'),
            "event_keys": list(event.keys()) if event else []
        })
        
        # SQS処理でのエラーは500を返してリトライさせる
        return {
            "statusCode": 500,
            "body": json.dumps({
                "success": False,
                "message": "TTL更新処理中に予期しないエラーが発生しました",
                "error": "fatal_error",
                "timestamp": get_current_jst().isoformat()
            }, ensure_ascii=False)
        }
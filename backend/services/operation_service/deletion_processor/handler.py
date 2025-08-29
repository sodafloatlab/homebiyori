"""
Deletion Processor Lambda Handler

アカウント削除に伴う非同期データ削除処理を実行するLambda関数
SQSキューからメッセージを受信し、対象テーブルからユーザーデータを削除
"""

import json
import os
from typing import Dict, Any
from homebiyori_common import get_logger

logger = get_logger(__name__)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda エントリーポイント
    
    Args:
        event: SQSイベント（Records配列）
        context: Lambda実行コンテキスト
        
    Returns:
        Dict[str, Any]: 処理結果
    """
    logger.info("Starting deletion processor Lambda", extra={
        "function_name": context.function_name,
        "request_id": context.aws_request_id
    })
    
    try:
        # SQSレコード処理
        records = event.get('Records', [])
        processed_count = 0
        failed_count = 0
        
        for record in records:
            try:
                # SQSメッセージ解析
                body = json.loads(record['body'])
                message_id = record['messageId']
                
                logger.info(f"Processing deletion message: {message_id}", extra={
                    "message_id": message_id,
                    "user_id": body.get('user_id', '')[:8] + "****"
                })
                
                # 削除処理実行
                await process_deletion_message(body)
                processed_count += 1
                
                logger.info(f"Successfully processed message: {message_id}")
                
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to process message: {record.get('messageId')}", extra={
                    "error": str(e),
                    "message_id": record.get('messageId'),
                    "user_id": body.get('user_id', '')[:8] + "****" if 'body' in locals() else "unknown"
                })
                # SQSの場合、例外を再発生させるとメッセージはDLQに送信される
                raise
        
        result = {
            "statusCode": 200,
            "body": {
                "processed": processed_count,
                "failed": failed_count,
                "total": len(records)
            }
        }
        
        logger.info("Deletion processor completed", extra=result["body"])
        return result
        
    except Exception as e:
        logger.error(f"Lambda execution failed: {str(e)}", extra={
            "function_name": context.function_name,
            "request_id": context.aws_request_id
        })
        raise


async def process_deletion_message(message: Dict[str, Any]) -> None:
    """
    削除メッセージ処理（超シンプル版 - Cognito削除除外）
    
    Args:
        message: SQSメッセージボディ
        
    Raises:
        Exception: 削除処理失敗時
    """
    user_id = message.get('user_id')
    deletion_type = message.get('deletion_type')
    tasks = message.get('tasks', [])
    
    if not user_id:
        raise ValueError("user_id is required in deletion message")
    
    logger.info(f"Starting account cleanup for user: {user_id[:8]}****", extra={
        "deletion_type": deletion_type,
        "tasks": tasks
    })
    
    try:
        # 1. DynamoDB対象テーブルからユーザーデータ削除
        if "dynamodb_cleanup" in tasks:
            await cleanup_dynamodb_tables(user_id)
        
        # 2. ❌ Cognito削除は実行しない（sub維持のため）
        # if "cognito_deletion" in tasks:
        #     await delete_cognito_account(user_id)  # コメントアウト
        
        logger.info(f"Account cleanup completed (Cognito preserved): {user_id[:8]}****")
        
    except Exception as e:
        logger.error(f"Account cleanup failed: {str(e)}", extra={
            "user_id": user_id[:8] + "****"
        })
        raise


async def cleanup_dynamodb_tables(user_id: str) -> None:
    """
    DynamoDB対象テーブルからユーザーデータ削除
    
    Args:
        user_id: 削除対象のユーザーID
        
    Raises:
        Exception: データベース操作失敗時
    """
    from .database import get_deletion_database
    
    logger.info(f"Starting DynamoDB cleanup for user: {user_id[:8]}****")
    
    try:
        database = get_deletion_database()
        
        # 物理削除対象テーブル
        deletion_results = await database.delete_user_data({
            "chats": True,         # チャット履歴削除
            "fruits": True,        # 実データ削除  
            "notifications": False, # 通知データは90日TTLによる自動削除待ち
            "feedback": False,     # feedbackテーブルは保持
            "core_profile": False  # Coreテーブルのプロフィールは論理削除のみ
        }, user_id)
        
        logger.info(f"DynamoDB cleanup completed for user: {user_id[:8]}****", extra={
            "deletion_results": deletion_results
        })
        
    except Exception as e:
        logger.error(f"DynamoDB cleanup failed: {str(e)}", extra={
            "user_id": user_id[:8] + "****"
        })
        raise
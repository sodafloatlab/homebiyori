"""
Queue Service

SQS キューとの連携処理。
- TTL更新キューへのメッセージ送信
- DLQ エラーハンドリング
- バッチ処理対応
"""

import json
import os
import boto3
from typing import Dict, Any, List
from datetime import datetime
from botocore.exceptions import ClientError

from homebiyori_common import get_logger
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string
from homebiyori_common.exceptions import ExternalServiceError

from ..models.stripe_models import TTLUpdateMessage

logger = get_logger(__name__)


class QueueService:
    """SQS キューサービス"""
    
    def __init__(self):
        self.sqs_client = boto3.client('sqs', region_name='ap-northeast-1')
        self.ttl_queue_url = os.getenv("TTL_UPDATE_QUEUE_URL")
        
        if not self.ttl_queue_url:
            raise ValueError("TTL_UPDATE_QUEUE_URL environment variable is required")
    
    async def send_ttl_update_message(
        self,
        message: TTLUpdateMessage
    ) -> Dict[str, Any]:
        """
        TTL更新キューにメッセージ送信
        
        Args:
            message: TTL更新メッセージ
            
        Returns:
            Dict[str, Any]: 送信結果
        """
        try:
            # メッセージを JSON にシリアライズ
            message_body = message.json(ensure_ascii=False)
            
            # SQS メッセージ属性を設定
            message_attributes = {
                'user_id': {
                    'StringValue': message.user_id,
                    'DataType': 'String'
                },
                'old_plan': {
                    'StringValue': message.old_plan.value,
                    'DataType': 'String'
                },
                'new_plan': {
                    'StringValue': message.new_plan.value,
                    'DataType': 'String'
                },
                'change_reason': {
                    'StringValue': message.change_reason,
                    'DataType': 'String'
                },
                'source': {
                    'StringValue': 'webhook_service',
                    'DataType': 'String'
                }
            }
            
            # SQS にメッセージ送信
            response = self.sqs_client.send_message(
                QueueUrl=self.ttl_queue_url,
                MessageBody=message_body,
                MessageAttributes=message_attributes,
                MessageGroupId=f"user_{message.user_id}",  # FIFO キューの場合
                MessageDeduplicationId=f"{message.user_id}_{message.request_id}_{int(message.effective_date.timestamp())}"
            )
            
            logger.info("TTL update message sent successfully", extra={
                "user_id": message.user_id,
                "old_plan": message.old_plan.value,
                "new_plan": message.new_plan.value,
                "message_id": response.get('MessageId'),
                "request_id": message.request_id
            })
            
            return {
                "status": "success",
                "message_id": response.get('MessageId'),
                "md5_of_body": response.get('MD5OfBody'),
                "sequence_number": response.get('SequenceNumber')
            }
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            
            logger.error("Failed to send TTL update message to SQS", extra={
                "error_code": error_code,
                "error_message": error_message,
                "user_id": message.user_id,
                "queue_url": self.ttl_queue_url
            })
            
            raise ExternalServiceError(f"SQS送信エラー: {error_message}")
            
        except Exception as e:
            logger.error("Unexpected error sending TTL update message", extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "user_id": message.user_id
            })
            
            raise ExternalServiceError(f"TTL更新メッセージ送信に失敗しました: {str(e)}")
    
    async def send_ttl_update_batch(
        self,
        messages: List[TTLUpdateMessage]
    ) -> Dict[str, Any]:
        """
        TTL更新キューにバッチメッセージ送信
        
        Args:
            messages: TTL更新メッセージリスト（最大10件）
            
        Returns:
            Dict[str, Any]: バッチ送信結果
        """
        if len(messages) > 10:
            raise ValueError("SQS batch size cannot exceed 10 messages")
        
        try:
            entries = []
            
            for i, message in enumerate(messages):
                entry = {
                    'Id': str(i),
                    'MessageBody': message.json(ensure_ascii=False),
                    'MessageAttributes': {
                        'user_id': {
                            'StringValue': message.user_id,
                            'DataType': 'String'
                        },
                        'old_plan': {
                            'StringValue': message.old_plan.value,
                            'DataType': 'String'
                        },
                        'new_plan': {
                            'StringValue': message.new_plan.value,
                            'DataType': 'String'
                        },
                        'source': {
                            'StringValue': 'webhook_service',
                            'DataType': 'String'
                        }
                    },
                    'MessageGroupId': f"user_{message.user_id}",
                    'MessageDeduplicationId': f"{message.user_id}_{message.request_id}_{i}_{int(message.effective_date.timestamp())}"
                }
                entries.append(entry)
            
            # SQS バッチ送信
            response = self.sqs_client.send_message_batch(
                QueueUrl=self.ttl_queue_url,
                Entries=entries
            )
            
            successful_count = len(response.get('Successful', []))
            failed_count = len(response.get('Failed', []))
            
            logger.info("TTL update batch sent", extra={
                "total_messages": len(messages),
                "successful": successful_count,
                "failed": failed_count,
                "failed_messages": response.get('Failed', [])
            })
            
            return {
                "status": "completed",
                "total": len(messages),
                "successful": successful_count,
                "failed": failed_count,
                "successful_messages": response.get('Successful', []),
                "failed_messages": response.get('Failed', [])
            }
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            
            logger.error("Failed to send TTL update batch to SQS", extra={
                "error_code": error_code,
                "error_message": error_message,
                "message_count": len(messages),
                "queue_url": self.ttl_queue_url
            })
            
            raise ExternalServiceError(f"SQSバッチ送信エラー: {error_message}")
            
        except Exception as e:
            logger.error("Unexpected error sending TTL update batch", extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "message_count": len(messages)
            })
            
            raise ExternalServiceError(f"TTL更新バッチ送信に失敗しました: {str(e)}")
    
    async def get_queue_attributes(self) -> Dict[str, Any]:
        """
        キューの属性情報取得
        
        Returns:
            Dict[str, Any]: キュー属性
        """
        try:
            response = self.sqs_client.get_queue_attributes(
                QueueUrl=self.ttl_queue_url,
                AttributeNames=[
                    'ApproximateNumberOfMessages',
                    'ApproximateNumberOfMessagesNotVisible',
                    'ApproximateNumberOfMessagesDelayed',
                    'CreatedTimestamp',
                    'LastModifiedTimestamp'
                ]
            )
            
            attributes = response.get('Attributes', {})
            
            logger.debug("TTL queue attributes retrieved", extra={
                "queue_url": self.ttl_queue_url,
                "messages_available": attributes.get('ApproximateNumberOfMessages'),
                "messages_in_flight": attributes.get('ApproximateNumberOfMessagesNotVisible')
            })
            
            return {
                "queue_url": self.ttl_queue_url,
                "messages_available": int(attributes.get('ApproximateNumberOfMessages', 0)),
                "messages_in_flight": int(attributes.get('ApproximateNumberOfMessagesNotVisible', 0)),
                "messages_delayed": int(attributes.get('ApproximateNumberOfMessagesDelayed', 0)),
                "created_timestamp": attributes.get('CreatedTimestamp'),
                "last_modified_timestamp": attributes.get('LastModifiedTimestamp')
            }
            
        except ClientError as e:
            logger.warning("Failed to get queue attributes", extra={
                "error": str(e),
                "queue_url": self.ttl_queue_url
            })
            return {"error": "Failed to retrieve queue attributes"}
        
        except Exception as e:
            logger.warning("Unexpected error getting queue attributes", extra={
                "error": str(e),
                "error_type": type(e).__name__
            })
            return {"error": "Unexpected error retrieving queue attributes"}
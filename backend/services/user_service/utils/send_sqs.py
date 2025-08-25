import json
import os
from typing import Dict, Any
import boto3
from botocore.exceptions import ClientError

from homebiyori_common import get_logger
from homebiyori_common.utils.datetime_utils import get_current_jst

logger = get_logger(__name__)

# SQSクライアント初期化
sqs_client = boto3.client('sqs')

async def send_deletion_task_to_sqs(user_id: str, deletion_type: str = "account_deletion") -> bool:
    """
    SQS経由で非同期削除タスクを送信
    
    ■機能概要■
    アカウント削除時に、当サービス内でのUserProfile削除後、
    他のサービスでの関連データ削除（チャット履歴、Cognitoユーザー等）を
    非同期で実行するためのSQSキューを送信。
    
    ■送信データ■
    - user_id: 削除対象ユーザーID
    - deletion_type: 削除タイプ（固定値: "account_deletion"）
    - requested_at: 削除要求日時（JST）
    - services_to_cleanup: 削除対象サービス一覧
    
    Args:
        user_id: 削除対象ユーザーID
        deletion_type: 削除タイプ（デフォルト: "account_deletion"）
        
    Returns:
        bool: SQS送信成功可否
    """
    try:
        queue_url = os.environ.get('ACCOUNT_DELETION_QUEUE_URL')
        if not queue_url:
            logger.error("ACCOUNT_DELETION_QUEUE_URL environment variable not set")
            return False

        # SQS送信メッセージ構築
        message_body = {
            "user_id": user_id,
            "deletion_type": deletion_type,
            "requested_at": get_current_jst().isoformat(),
            "services_to_cleanup": [
                "chat_service",     # チャット履歴削除
                "tree_service",     # 木・実の成長データ削除  
                "cognito_service"   # Cognitoユーザー削除（最後に実行）
            ],
            "originating_service": "user_service"
        }

        # SQSメッセージ送信
        response = _send_sqs_message(queue_url, message_body)
        
        if response:
            logger.info(
                "Account deletion task successfully queued to SQS",
                extra={
                    "user_id": user_id[:8] + "****",
                    "deletion_type": deletion_type,
                    "message_id": response.get('MessageId'),
                    "services_count": len(message_body["services_to_cleanup"])
                }
            )
            return True
        else:
            return False
        
    except Exception as e:
        logger.error(
            "Failed to send deletion task to SQS",
            extra={
                "error": str(e),
                "user_id": user_id[:8] + "****",
                "deletion_type": deletion_type
            }
        )
        return False


def _send_sqs_message(queue_url: str, message_body: Dict[str, Any]) -> Dict[str, Any]:
    """
    SQSメッセージ送信のヘルパー関数
    
    Args:
        queue_url: SQSキューURL
        message_body: 送信メッセージ本体
        
    Returns:
        Dict[str, Any]: SQS送信レスポンス、失敗時はNone
    """
    try:
        response = sqs_client.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(message_body, ensure_ascii=False),
            MessageAttributes={
                'deletion_type': {
                    'StringValue': message_body['deletion_type'],
                    'DataType': 'String'
                },
                'user_id': {
                    'StringValue': message_body['user_id'],
                    'DataType': 'String'
                },
                'originating_service': {
                    'StringValue': 'user_service',
                    'DataType': 'String'
                }
            }
        )
        
        logger.debug(
            "SQS message sent successfully",
            extra={
                "message_id": response.get('MessageId'),
                "queue_url": queue_url[:50] + "..." if len(queue_url) > 50 else queue_url
            }
        )
        
        return response
        
    except ClientError as e:
        logger.error(
            "SQS ClientError occurred",
            extra={
                "error_code": e.response['Error']['Code'],
                "error_message": e.response['Error']['Message'],
                "queue_url": queue_url[:50] + "..." if len(queue_url) > 50 else queue_url
            }
        )
        return None
    except Exception as e:
        logger.error(
            "Unexpected error in SQS message sending",
            extra={
                "error": str(e),
                "queue_url": queue_url[:50] + "..." if len(queue_url) > 50 else queue_url
            }
        )
        return None
    
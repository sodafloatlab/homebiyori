"""
s3_client.py - 簡素化版

現在の設計変更により画像機能は削除されましたが、
将来的にファイルアップロード機能が必要になる可能性があるため
最小限のS3クライアントとして保持しています。

現在は使用されていません。
"""

import boto3
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class S3Client:
    """簡素化されたS3クライアント（現在未使用）"""
    
    def __init__(self, bucket_name: str):
        self.bucket_name = bucket_name
        self.s3_client = boto3.client('s3')
    
    def generate_presigned_url(self, key: str, expiration: int = 3600) -> Optional[str]:
        """プリサインドURL生成（将来の拡張用）"""
        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expiration
            )
            return response
        except Exception as e:
            logger.error(f"プリサインドURL生成エラー: {e}")
            return None

def get_s3_client() -> S3Client:
    """S3クライアント取得（現在未使用）"""
    bucket_name = "homebiyori-content"  # 将来的に使用予定
    return S3Client(bucket_name)"""
s3_client.py - 簡素化版

現在の設計変更により画像機能は削除されましたが、
将来的にファイルアップロード機能が必要になる可能性があるため
最小限のS3クライアントとして保持しています。

現在は使用されていません。
"""

import boto3
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class S3Client:
    """簡素化されたS3クライアント（現在未使用）"""
    
    def __init__(self, bucket_name: str):
        self.bucket_name = bucket_name
        self.s3_client = boto3.client('s3')
    
    def generate_presigned_url(self, key: str, expiration: int = 3600) -> Optional[str]:
        """プリサインドURL生成（将来の拡張用）"""
        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expiration
            )
            return response
        except Exception as e:
            logger.error(f"プリサインドURL生成エラー: {e}")
            return None

def get_s3_client() -> S3Client:
    """S3クライアント取得（現在未使用）"""
    bucket_name = "homebiyori-content"  # 将来的に使用予定
    return S3Client(bucket_name)
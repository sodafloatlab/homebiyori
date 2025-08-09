"""
統一データベースアクセスモジュール

Homebiyori（ほめびより）全体で使用されるDynamoDB操作を統一。
- Single Table Design対応
- 高性能非同期操作
- エラーハンドリング統一
- ページネーション対応
"""

from .client import DynamoDBClient, QueryResult, ScanResult

__all__ = [
    "DynamoDBClient",
    "QueryResult",
    "ScanResult"
]
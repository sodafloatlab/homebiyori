"""
Deletion Processor Database Client

データ削除処理専用のデータベースクライアント
複数テーブルからの一括削除処理を効率的に実行
"""

import os
import boto3
from typing import Dict, Any, List, Optional
from homebiyori_common import get_logger

logger = get_logger(__name__)


class DeletionDatabaseClient:
    """削除処理専用データベースクライアント"""
    
    def __init__(self):
        """初期化"""
        self.dynamodb = boto3.client('dynamodb')
        
        # 環境変数からテーブル名取得
        self.table_names = {
            "core": os.environ.get('CORE_TABLE_NAME'),
            "chats": os.environ.get('CHATS_TABLE_NAME'),
            "fruits": os.environ.get('FRUITS_TABLE_NAME'),
            "feedback": os.environ.get('FEEDBACK_TABLE_NAME')
        }
        
        # テーブル名検証
        missing_tables = [name for name, value in self.table_names.items() if not value]
        if missing_tables:
            raise ValueError(f"Missing table environment variables: {missing_tables}")
    
    async def delete_user_data(self, deletion_config: Dict[str, bool], user_id: str) -> Dict[str, Any]:
        """
        指定されたテーブルからユーザーデータを削除
        
        Args:
            deletion_config: テーブル別削除設定
            user_id: 削除対象ユーザーID
            
        Returns:
            Dict[str, Any]: 削除結果詳細
            
        Raises:
            Exception: 削除処理失敗時
        """
        logger.info(f"Starting user data deletion: {user_id[:8]}****", extra={
            "deletion_config": deletion_config
        })
        
        deletion_results = {}
        
        try:
            # 各テーブルの削除処理
            for table_type, should_delete in deletion_config.items():
                if should_delete and table_type in self.table_names:
                    table_name = self.table_names[table_type]
                    
                    try:
                        result = await self._delete_from_table(table_name, table_type, user_id)
                        deletion_results[table_type] = {
                            "success": True,
                            "deleted_items": result.get("deleted_count", 0),
                            "table_name": table_name
                        }
                        
                        logger.info(f"Deleted from {table_type}: {result.get('deleted_count', 0)} items")
                        
                    except Exception as e:
                        deletion_results[table_type] = {
                            "success": False,
                            "error": str(e),
                            "table_name": table_name
                        }
                        logger.error(f"Failed to delete from {table_type}: {str(e)}")
                        # 1つのテーブルで失敗しても他のテーブルの削除は継続
                
                else:
                    deletion_results[table_type] = {
                        "success": True,
                        "skipped": True,
                        "reason": "deletion_disabled" if not should_delete else "table_not_found"
                    }
            
            # 削除結果サマリ
            successful_deletions = sum(1 for r in deletion_results.values() if r.get("success", False) and not r.get("skipped", False))
            failed_deletions = sum(1 for r in deletion_results.values() if not r.get("success", False))
            
            logger.info(f"User data deletion completed: {user_id[:8]}****", extra={
                "successful_deletions": successful_deletions,
                "failed_deletions": failed_deletions,
                "deletion_results": deletion_results
            })
            
            return {
                "user_id": user_id[:8] + "****",
                "successful_deletions": successful_deletions,
                "failed_deletions": failed_deletions,
                "details": deletion_results
            }
            
        except Exception as e:
            logger.error(f"User data deletion failed: {str(e)}", extra={
                "user_id": user_id[:8] + "****"
            })
            raise
    
    async def _delete_from_table(self, table_name: str, table_type: str, user_id: str) -> Dict[str, Any]:
        """
        指定テーブルからユーザーデータを削除
        
        Args:
            table_name: 削除対象テーブル名
            table_type: テーブルタイプ
            user_id: ユーザーID
            
        Returns:
            Dict[str, Any]: 削除結果
        """
        logger.info(f"Deleting from table: {table_name} (type: {table_type})")
        
        try:
            # テーブルタイプに応じた削除処理
            if table_type == "chats":
                return await self._delete_chat_data(table_name, user_id)
            elif table_type == "fruits":
                return await self._delete_fruits_data(table_name, user_id)
            else:
                logger.warning(f"Unknown table type for deletion: {table_type}")
                return {"deleted_count": 0}
                
        except Exception as e:
            logger.error(f"Failed to delete from {table_name}: {str(e)}")
            raise
    
    async def _delete_chat_data(self, table_name: str, user_id: str) -> Dict[str, Any]:
        """チャットテーブルからデータ削除（独立テーブル）"""
        return await self._delete_by_pk_pattern(table_name, f"USER#{user_id}")
    
    async def _delete_fruits_data(self, table_name: str, user_id: str) -> Dict[str, Any]:
        """実テーブルからデータ削除（独立テーブル）"""
        return await self._delete_by_pk_pattern(table_name, f"USER#{user_id}")
    
    
    async def _delete_by_pk_pattern(self, table_name: str, pk_pattern: str) -> Dict[str, Any]:
        """
        指定されたPKパターンに一致する全アイテムを削除（独立テーブル用）
        
        Args:
            table_name: テーブル名
            pk_pattern: 削除対象のPKパターン
            
        Returns:
            Dict[str, Any]: 削除結果
        """
        deleted_count = 0
        
        try:
            # PKでクエリして対象アイテムを取得
            response = self.dynamodb.query(
                TableName=table_name,
                KeyConditionExpression="PK = :pk",
                ExpressionAttributeValues={
                    ":pk": {"S": pk_pattern}
                },
                ProjectionExpression="PK, SK"  # キーのみ取得（効率化）
            )
            
            items = response.get('Items', [])
            
            # バッチ削除（最大25件ずつ）
            for i in range(0, len(items), 25):
                batch_items = items[i:i+25]
                
                if batch_items:
                    batch_request = {
                        table_name: [
                            {
                                'DeleteRequest': {
                                    'Key': {
                                        'PK': item['PK'],
                                        'SK': item['SK']
                                    }
                                }
                            }
                            for item in batch_items
                        ]
                    }
                    
                    batch_response = self.dynamodb.batch_write_item(
                        RequestItems=batch_request
                    )
                    
                    # 未処理アイテムの処理
                    unprocessed = batch_response.get('UnprocessedItems', {})
                    if unprocessed:
                        logger.warning(f"Some items were not deleted: {len(unprocessed)}")
                    
                    deleted_count += len(batch_items) - len(unprocessed.get(table_name, []))
            
            logger.info(f"Deleted {deleted_count} items from {table_name}")
            
            return {"deleted_count": deleted_count}
            
        except Exception as e:
            logger.error(f"Failed to delete by PK pattern {pk_pattern}: {str(e)}")
            raise


def get_deletion_database() -> DeletionDatabaseClient:
    """削除データベースクライアントのファクトリー関数"""
    return DeletionDatabaseClient()
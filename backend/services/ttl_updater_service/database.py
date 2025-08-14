"""
TTL Updater Service Database Layer

TTLアップデーター専用のDynamoDB接続とTTL管理機能。
チャット履歴の保持期間をプラン別に動的制御。
"""

import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
from homebiyori_common import get_logger
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string

logger = get_logger(__name__)


class TTLUpdaterServiceDatabase:
    """TTL更新サービス専用データベースクライアント"""
    
    def __init__(self):
        """4テーブル構成のDynamoDBクライアント初期化"""
        # 4テーブル構成対応：環境変数からテーブル名取得
        self.chats_client = DynamoDBClient(os.environ["CHATS_TABLE_NAME"])
        self.core_client = DynamoDBClient(os.environ["CORE_TABLE_NAME"])
    
    async def get_user_chat_items(self, user_id: str) -> List[Dict[str, Any]]:
        """ユーザーのチャット履歴を取得"""
        try:
            # ユーザーのチャット履歴を取得
            result = await self.chats_client.query_by_prefix(
                pk=f"USER#{user_id}",
                sk_prefix="CHAT#"
            )
            return result.get('items', [])
            
        except Exception as e:
            logger.error(f"Failed to get user chat items: {str(e)}")
            return []
    
    async def update_chat_ttl(
        self, 
        pk: str, 
        sk: str, 
        new_ttl: int
    ) -> bool:
        """チャット履歴のTTL更新"""
        try:
            success = await self.chats_client.update_item(
                pk=pk,
                sk=sk,
                update_expression="SET #ttl = :ttl",
                expression_names={"#ttl": "ttl"},
                expression_values={":ttl": new_ttl}
            )
            return success
            
        except Exception as e:
            logger.error(f"Failed to update chat TTL: {str(e)}")
            return False
    
    async def update_user_chat_ttl_bulk(
        self, 
        user_id: str, 
        plan: str, 
        plan_ttl_mapping: Dict[str, int]
    ) -> int:
        """
        ユーザーのチャット履歴TTL一括更新
        
        Args:
            user_id: ユーザーID
            plan: 新しいプラン
            plan_ttl_mapping: プラン別TTL日数マッピング
            
        Returns:
            int: 更新されたレコード数
        """
        try:
            # TTL日数とタイムスタンプ計算
            ttl_days = plan_ttl_mapping.get(plan.lower(), 7)  # デフォルト7日
            current_time = get_current_jst()
            
            logger.debug("Calculating new TTL", extra={
                "user_id": user_id,
                "plan": plan,
                "ttl_days": ttl_days
            })
            
            # ユーザーのチャット履歴を取得
            chat_items = await self.get_user_chat_items(user_id)
            
            if not chat_items:
                logger.info("No chat records found for user", extra={
                    "user_id": user_id
                })
                return 0
            
            # 各チャット履歴のTTL更新
            updated_count = 0
            
            for chat_item in chat_items:
                try:
                    # チャット作成日時取得
                    created_at_str = chat_item.get("created_at")
                    if not created_at_str:
                        logger.warning("Chat record missing created_at", extra={
                            "user_id": user_id,
                            "chat_id": chat_item.get("chat_id")
                        })
                        continue
                    
                    # 作成日時ベースでTTL再計算
                    created_at = datetime.fromisoformat(created_at_str)
                    ttl_datetime = created_at + timedelta(days=ttl_days)
                    chat_specific_ttl = int(ttl_datetime.timestamp())
                    
                    # 過去のチャットが新しいプランで既に期限切れの場合はスキップ
                    if chat_specific_ttl < current_time.timestamp():
                        logger.debug("Chat already expired with new plan", extra={
                            "user_id": user_id,
                            "chat_id": chat_item.get("chat_id"),
                            "created_at": created_at_str,
                            "calculated_ttl": chat_specific_ttl
                        })
                        continue
                    
                    # TTL更新
                    pk = chat_item["PK"]
                    sk = chat_item["SK"]
                    
                    success = await self.update_chat_ttl(pk, sk, chat_specific_ttl)
                    
                    if success:
                        updated_count += 1
                        logger.debug("Chat TTL updated", extra={
                            "user_id": user_id,
                            "chat_id": chat_item.get("chat_id"),
                            "old_ttl": chat_item.get("ttl"),
                            "new_ttl": chat_specific_ttl
                        })
                    
                except Exception as item_error:
                    logger.error("Failed to update chat TTL", extra={
                        "user_id": user_id,
                        "chat_item": chat_item,
                        "error": str(item_error)
                    })
            
            logger.info("User chat TTL update completed", extra={
                "user_id": user_id,
                "plan": plan,
                "total_chats": len(chat_items),
                "updated_count": updated_count
            })
            
            return updated_count
            
        except Exception as e:
            logger.error("Failed to update user chat TTL", extra={
                "user_id": user_id,
                "plan": plan,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def health_check(self) -> Dict[str, Any]:
        """
        ヘルスチェック
        
        Returns:
            Dict[str, Any]: ヘルス状態
        """
        try:
            # DynamoDB疎通確認
            test_pk = "HEALTH_CHECK"
            test_sk = "TTL_UPDATER_TEST"
            current_time = get_current_jst()
            
            # テストアイテム書き込み・削除
            test_ttl = int((current_time + timedelta(minutes=1)).timestamp())
            
            await self.chats_client.put_item({
                "PK": test_pk,
                "SK": test_sk,
                "timestamp": to_jst_string(current_time),
                "ttl": test_ttl
            })
            
            item = await self.chats_client.get_item(pk=test_pk, sk=test_sk)
            if item:
                await self.chats_client.delete_item(pk=test_pk, sk=test_sk)
            
            return {
                "service": "ttl_updater_service",
                "status": "healthy",
                "timestamp": to_jst_string(current_time),
                "database_connected": True
            }
            
        except Exception as e:
            logger.error("TTL Updater health check failed", extra={
                "error": str(e),
                "error_type": type(e).__name__
            })
            return {
                "service": "ttl_updater_service", 
                "status": "unhealthy",
                "timestamp": to_jst_string(get_current_jst()),
                "error": str(e)
            }


# =====================================
# ファクトリー関数
# =====================================

_ttl_updater_database_instance = None

def get_ttl_updater_database() -> TTLUpdaterServiceDatabase:
    """
    TTLUpdaterServiceDatabaseインスタンスを取得（シングルトンパターン）
    
    Returns:
        TTLUpdaterServiceDatabase: データベース操作クライアント
    """
    global _ttl_updater_database_instance
    if _ttl_updater_database_instance is None:
        _ttl_updater_database_instance = TTLUpdaterServiceDatabase()
    return _ttl_updater_database_instance
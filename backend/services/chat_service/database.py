"""
chat-service データベース操作クラス

■システム概要■
Homebiyori（ほめびより）チャット機能専用のDynamoDB操作。
Single Table Design による効率的なデータ管理と、
JST時刻統一、DynamoDB直接保存によるLangChain最適化を提供。

■データ設計改訂■
DynamoDB Single Table Design:
- PK: USER#{user_id}
- SK: CHAT#{jst_timestamp}#{message_id}
- GSI1: キャラクター別検索
- TTL: サブスクリプションプラン連動自動削除
- 直接保存: user_message, ai_response (LangChain最適化)

■設計変更■
- 時刻管理: UTC → JST統一
- コンテンツ保存: S3 → DynamoDB直接保存
- 画像機能: 完全削除
- パフォーマンス: LangChain用50ms応答時間実現

■依存関係■
homebiyori-common-layer:
- DynamoDBClient: 高レベルDB操作
- Logger: 構造化ログ
- Exceptions: 統一例外処理

■TTL管理設計■
- 無料プラン: 30日保持
- プレミアムプラン: 180日保持
- プラン変更時: ttl-updater Lambda で一括更新
"""

from typing import List, Optional, Dict, Any, Tuple
import os
import uuid
from datetime import datetime, timezone, timedelta
import json
import pytz

# Lambda Layers からの共通機能インポート
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import DatabaseError, NotFoundError, ValidationError
from homebiyori_common.utils.datetime_utils import get_current_jst

# ローカルモジュール
from .models import (
    ChatMessage,
    FruitInfo,
    ChatHistoryRequest,
    AICharacterType
    # 統計関連機能削除：EmotionType, MoodType import削除
)

# 構造化ログ設定
logger = get_logger(__name__)


# =====================================
# データベースクライアント初期化
# =====================================

class ChatServiceDatabase:
    """
    チャットサービス専用データベース操作クラス
    
    ■機能概要■
    homebiyori-common-layer の DynamoDBClient をベースに、
    チャット機能固有のデータ操作を提供。
    
    ■設計利点■
    - 型安全性: Pydantic v2モデルとの完全統合
    - TTL管理: サブスクリプションプラン連動
    - パフォーマンス: Single Table Design最適化
    - 保守性: 責務分離とテスタビリティ
    """
    
    def __init__(self):
        """
    チャットサービス用データベースクライアント初期化
    
    ■4テーブル統合対応■
    - core: ユーザープロフィール、サブスクリプション、木統計、通知
    - chats: チャット履歴（TTL管理）
    - fruits: 実の情報（永続保存）
    - feedback: フィードバック（分析用）
    """
        # 4テーブル構成対応：環境変数からテーブル名取得
        # chat_serviceが実際に使用するテーブルのみ初期化
        self.core_client = DynamoDBClient(os.environ["CORE_TABLE_NAME"])      # ユーザープロフィール、AI設定、木統計
        self.chats_client = DynamoDBClient(os.environ["CHATS_TABLE_NAME"])    # チャット履歴
        self.fruits_client = DynamoDBClient(os.environ["FRUITS_TABLE_NAME"])  # 実の情報
        self.logger = get_logger(__name__)
    
    # =====================================
    # チャットメッセージ管理
    # =====================================
    
    async def save_chat_message(self, chat_message: ChatMessage) -> ChatMessage:
        """
        チャットメッセージをDynamoDBに保存
        
        ■機能概要■
        - Single Table Design対応
        - TTL自動設定
        - GSI用インデックス作成
        - S3キー参照管理
        
        Args:
            chat_message: 保存するチャットメッセージ
            
        Returns:
            ChatMessage: 保存後のメッセージ情報
            
        Raises:
            DatabaseError: DynamoDB保存エラー
            ValidationError: メッセージデータ不正
        """
        try:
            self.logger.debug(
                "Saving chat message to DynamoDB",
                extra={
                    "user_id": chat_message.user_id[:8] + "****",
                    "message_id": chat_message.message_id,
                    "ai_character": chat_message.ai_character,
                    "has_ttl": bool(chat_message.ttl)
                }
            )
            
            # DynamoDB保存用データ準備
            item_data = chat_message.model_dump()
            
            # DynamoDB Keys設定
            timestamp_str = chat_message.created_at.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            item_data["PK"] = f"USER#{chat_message.user_id}"
            item_data["SK"] = f"CHAT#{timestamp_str}#{chat_message.message_id}"
            
            # GSI1用フィールド設定（キャラクター別検索）
            item_data["GSI1PK"] = f"USER#{chat_message.user_id}#CHARACTER#{chat_message.ai_character}"
            item_data["GSI1SK"] = f"CHAT#{timestamp_str}"
            
            # 日時をISO8601文字列に変換
            item_data["created_at"] = chat_message.created_at.isoformat()
            
            # DynamoDB保存実行（chatsテーブル）
            await self.chats_client.put_item(item_data)
            
            self.logger.info(
                "Chat message saved successfully",
                extra={
                    "user_id": chat_message.user_id[:8] + "****",
                    "message_id": chat_message.message_id,
                    "character": chat_message.ai_character,
                    "ttl_set": bool(chat_message.ttl)
                }
            )
            
            return chat_message
            
        except Exception as e:
            self.logger.error(
                "Failed to save chat message",
                extra={
                    "error": str(e),
                    "user_id": chat_message.user_id[:8] + "****",
                    "message_id": chat_message.message_id
                }
            )
            raise DatabaseError(f"Failed to save chat message: {str(e)}")
    
    async def get_chat_history(
        self, 
        user_id: str, 
        request: ChatHistoryRequest
    ) -> Dict[str, Any]:
        """
        チャット履歴取得
        
        ■機能概要■
        - 期間指定フィルタ対応
        - キャラクター別フィルタ対応
        - ページネーション対応
        - DynamoDB Query最適化
        
        Args:
            user_id: 取得対象ユーザーID
            request: 履歴取得リクエスト
            
        Returns:
            Dict: 履歴データとページネーション情報
            
        Raises:
            DatabaseError: DynamoDB操作エラー
        """
        try:
            self.logger.debug(
                "Fetching chat history from DynamoDB",
                extra={
                    "user_id": user_id[:8] + "****",
                    "start_date": request.start_date,
                    "end_date": request.end_date,
                    "character_filter": request.character_filter,
                    "limit": request.limit
                }
            )
            
            # クエリ条件構築
            if request.character_filter:
                # キャラクター別検索（GSI1使用）
                pk = f"USER#{user_id}#CHARACTER#{request.character_filter}"
                sk_prefix = "CHAT#"
                use_gsi = True
            else:
                # 全メッセージ検索（メインテーブル）
                pk = f"USER#{user_id}"
                sk_prefix = "CHAT#"
                use_gsi = False
            
            # 期間フィルタ対応
            sk_condition = None
            if request.start_date or request.end_date:
                # 日付範囲でSK絞り込み
                if request.start_date and request.end_date:
                    sk_condition = {
                        "between": [
                            f"CHAT#{request.start_date}",
                            f"CHAT#{request.end_date}T23:59:59.999Z"
                        ]
                    }
                elif request.start_date:
                    sk_condition = {">=" : f"CHAT#{request.start_date}"}
                elif request.end_date:
                    sk_condition = {"<=" : f"CHAT#{request.end_date}T23:59:59.999Z"}
            
            # DynamoDB Query実行（chatsテーブル）
            if use_gsi:
                items = await self.chats_client.query_gsi(
                    gsi_name="GSI1",
                    pk=pk,
                    sk_prefix=sk_prefix,
                    sk_condition=sk_condition,
                    limit=request.limit,
                    next_token=request.next_token,
                    scan_index_forward=False  # 新しい順
                )
            else:
                items = await self.chats_client.query_by_prefix(
                    pk=pk,
                    sk_prefix=sk_prefix,
                    sk_condition=sk_condition,
                    limit=request.limit,
                    next_token=request.next_token,
                    scan_index_forward=False  # 新しい順
                )
            
            # レスポンス形式に変換
            messages = []
            for item_data in items.get("items", []):
                try:
                    # ChatMessageモデルから必要フィールド抽出
                    message_item = {
                        "message_id": item_data.get("message_id"),
                        "ai_character": item_data.get("ai_character"),
                        "mood": item_data.get("mood"),
                        "emotion_detected": item_data.get("emotion_detected"),
                        "fruit_generated": item_data.get("fruit_generated", False),
                        "fruit_id": item_data.get("fruit_id"),
                        "created_at": item_data.get("created_at"),
                        "user_message_s3_key": item_data.get("user_message_s3_key"),
                        "ai_response_s3_key": item_data.get("ai_response_s3_key"),
                        "image_s3_key": item_data.get("image_s3_key"),
                        "character_count": item_data.get("character_count", 0),
                        "tree_stage_before": item_data.get("tree_stage_before", 0),
                        "tree_stage_after": item_data.get("tree_stage_after", 0)
                    }
                    messages.append(message_item)
                    
                except Exception as e:
                    self.logger.warning(
                        "Failed to parse chat history item",
                        extra={
                            "error": str(e),
                            "item_pk": item_data.get("PK"),
                            "item_sk": item_data.get("SK")
                        }
                    )
            
            result = {
                "messages": messages,
                "next_token": items.get("next_token"),
                "has_more": bool(items.get("next_token")),
                "total_count": len(messages)  # 簡易実装、必要に応じて正確な総数計算
            }
            
            self.logger.info(
                "Chat history retrieved successfully",
                extra={
                    "user_id": user_id[:8] + "****",
                    "returned_count": len(messages),
                    "has_more": result["has_more"],
                    "used_gsi": use_gsi
                }
            )
            
            return result
            
        except Exception as e:
            self.logger.error(
                "Failed to get chat history",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****"
                }
            )
            raise DatabaseError(f"Failed to retrieve chat history: {str(e)}")
    
    async def get_recent_chat_context(
        self, 
        user_id: str, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        最近のチャット文脈取得（AI応答生成用）
        
        ■機能概要■
        - 最新N件のメッセージ取得
        - AI応答品質向上のための文脈提供
        - S3参照なし（メタデータのみ）
        
        Args:
            user_id: ユーザーID
            limit: 取得件数制限
            
        Returns:
            List[Dict]: 最近のメッセージメタデータ
        """
        try:
            self.logger.debug(
                "Fetching recent chat context",
                extra={
                    "user_id": user_id[:8] + "****",
                    "limit": limit
                }
            )
            
            # 最新メッセージ取得
            pk = f"USER#{user_id}"
            sk_prefix = "CHAT#"
            
            items = await self.chats_client.query_by_prefix(
                pk=pk,
                sk_prefix=sk_prefix,
                limit=limit,
                scan_index_forward=False  # 新しい順
            )
            
            # 文脈用データ抽出
            context = []
            for item_data in items.get("items", []):
                context_item = {
                    "ai_character": item_data.get("ai_character"),
                    "mood": item_data.get("mood"),
                    "emotion_detected": item_data.get("emotion_detected"),
                    "created_at": item_data.get("created_at"),
                    "character_count": item_data.get("character_count", 0)
                }
                context.append(context_item)
            
            self.logger.debug(
                "Recent chat context retrieved",
                extra={
                    "user_id": user_id[:8] + "****",
                    "context_count": len(context)
                }
            )
            
            return context
            
        except Exception as e:
            self.logger.error(
                "Failed to get recent chat context",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****"
                }
            )
            # 文脈取得失敗は致命的でないため、空リスト返却
            return []
    
    # =====================================
    # 木の成長・統計管理（tree_serviceに移譲）
    # =====================================
    
    # get_user_tree_stats 関数は tree_service/http_client 経由で呼び出し
    # update_tree_stats 関数は tree_service/http_client 経由で呼び出し
    
    # =====================================
    # 実（褒めメッセージ）管理（tree_serviceに移譲）
    # =====================================
    
    # save_fruit_info 関数は tree_service/http_client 経由で呼び出し
    # get_last_fruit_date 関数は tree_service/http_client 経由で呼び出し
    
    # =====================================
    # TTL管理
    # =====================================
    
    # =====================================
    # ユーザー情報管理（user_serviceに移譲）
    # =====================================
    
    # get_user_subscription_info 関数は user_service/http_client 経由で呼び出し
    # get_user_ai_preferences 関数は user_service/http_client 経由で呼び出し
    
    async def calculate_message_ttl(
        self, 
        subscription_plan: str, 
        created_at: datetime
    ) -> int:
        """
        メッセージTTL計算
        
        ■TTL設定■
        - 無料プラン: 30日保持
        - プレミアムプラン: 180日保持
        
        Args:
            subscription_plan: サブスクリプションプラン
            created_at: メッセージ作成日時
            
        Returns:
            int: TTL（UNIXタイムスタンプ）
        """
        try:
            # プランに応じた保持期間設定
            if subscription_plan in ["monthly", "yearly"]:
                retention_days = 180  # プレミアムプラン: 6ヶ月
            else:
                retention_days = 30   # 無料プラン: 1ヶ月
            
            # TTL計算
            ttl_datetime = created_at + timedelta(days=retention_days)
            ttl_timestamp = int(ttl_datetime.timestamp())
            
            self.logger.debug(
                "Calculated message TTL",
                extra={
                    "subscription_plan": subscription_plan,
                    "retention_days": retention_days,
                    "ttl_timestamp": ttl_timestamp
                }
            )
            
            return ttl_timestamp
            
        except Exception as e:
            self.logger.error(
                "Failed to calculate message TTL",
                extra={
                    "error": str(e),
                    "subscription_plan": subscription_plan
                }
            )
            # エラー時はデフォルト（30日）
            default_ttl = created_at + timedelta(days=30)
            return int(default_ttl.timestamp())

    async def health_check(self) -> Dict[str, Any]:
        """
        データベース接続ヘルスチェック
        
        Returns:
            Dict: ヘルスチェック結果
        """
        try:
            # メインテーブル（core）の存在確認
            await self.core_client.describe_table()
            
            self.logger.info("チャットサービス ヘルスチェック成功")
            return {
                "status": "healthy",
                "service": "chat_service",
                "database": "connected"
            }
            
        except Exception as e:
            self.logger.error(f"チャットサービス ヘルスチェック失敗: {e}")
            raise DatabaseError(f"ヘルスチェックに失敗しました: {e}")
            # 記録失敗は致命的でないため、処理継続


# =====================================
# ファクトリー関数
# =====================================

_chat_database_instance = None

def get_chat_database() -> ChatServiceDatabase:
    """
    ChatServiceDatabaseインスタンスを取得（シングルトンパターン）
    
    Returns:
        ChatServiceDatabase: データベース操作クライアント
    """
    global _chat_database_instance
    if _chat_database_instance is None:
        _chat_database_instance = ChatServiceDatabase()
    return _chat_database_instance
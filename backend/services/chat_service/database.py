"""
chat-service データベース操作クラス

■システム概要■
Homebiyori（ほめびより）チャット機能専用のDynamoDB操作。
Single Table Design による効率的なデータ管理と、
JST時刻統一、DynamoDB直接保存によるLangChain最適化を提供。

■データ設計改訂■
DynamoDB chatsテーブル設計:
- PK: USER#{user_id}
- SK: CHAT#{jst_timestamp}
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

from typing import Dict, Any
import os
from datetime import datetime

# Lambda Layers からの共通機能インポート
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import DatabaseError, NotFoundError, ValidationError
from homebiyori_common.utils.datetime_utils import get_current_jst

# ローカルモジュール
from .models import (
    ChatMessage,
    ChatHistoryRequest,
    ChatHistoryResponse
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
        チャットメッセージをDynamoDBに保存（1:1・グループチャット統合版）
        
        ■機能概要■
        - chatsテーブルへの直接保存
        - 1:1・グループチャット統合対応
        - SKフォーマット: CHAT#{chat_type}#{timestamp}
        - TTL自動設定
        - JST時刻統一
        - DynamoDB直接保存（S3なし）
        
        Args:
            chat_message: 保存するチャットメッセージ（統合モデル）
            
        Returns:
            ChatMessage: 保存後のメッセージ情報
            
        Raises:
            DatabaseError: DynamoDB保存エラー
            ValidationError: メッセージデータ不正
        """
        try:
            self.logger.debug(
                "Saving integrated chat message to DynamoDB",
                extra={
                    "user_id": chat_message.user_id[:8] + "****",
                    "chat_id": chat_message.chat_id,
                    "chat_type": chat_message.chat_type,
                    "ai_character": chat_message.ai_character,
                    "has_expires_at": bool(chat_message.expires_at)
                }
            )
            
            # DynamoDB保存用データ準備（統合モデル対応）
            timestamp_str = chat_message.created_at.strftime("%Y-%m-%dT%H:%M:%S+09:00")
            
            item_data = {
                "PK": f"USER#{chat_message.user_id}",
                "SK": f"CHAT#{chat_message.chat_type}#{timestamp_str}",  # 改善されたSKフォーマット
                "chat_id": chat_message.chat_id,
                "user_id": chat_message.user_id,
                
                # チャットタイプ（統合管理）
                "chat_type": chat_message.chat_type,
                
                # メッセージ内容（DynamoDB直接保存）
                "user_message": chat_message.user_message,
                "ai_response": chat_message.ai_response,
                
                # AI設定メタデータ
                "ai_character": chat_message.ai_character.value,
                "praise_level": chat_message.praise_level.value,
                "interaction_mode": chat_message.interaction_mode.value,
                
                # 木の成長関連
                "growth_points_gained": chat_message.growth_points_gained,
                "tree_stage_at_time": chat_message.tree_stage_at_time,
                
                # タイムスタンプ（JST統一）
                "created_at": timestamp_str,
                
                # プラン別TTL設定
                "expires_at": chat_message.expires_at
            }
            
            # グループチャット専用フィールド（条件付き追加・最適化版）
            if chat_message.chat_type == "group":
                if chat_message.active_characters:
                    item_data["active_characters"] = [char.value for char in chat_message.active_characters]
                
                if chat_message.group_ai_responses:
                    # GroupAIResponseオブジェクトをDynamoDB保存形式に変換
                    group_responses_data = []
                    representative_response = None
                    
                    for response in chat_message.group_ai_responses:
                        response_data = {
                            "character": response.character.value,
                            "response": response.response,
                            "is_representative": response.is_representative
                        }
                        group_responses_data.append(response_data)
                        
                        # 代表応答を抽出（LangChain文脈用）
                        if response.is_representative:
                            representative_response = response.response
                    
                    item_data["group_ai_responses"] = group_responses_data
                    
                    # 代表応答が指定されている場合、ai_responseフィールドを上書き（LangChain対応）
                    if representative_response:
                        item_data["ai_response"] = representative_response
                        self.logger.debug(
                            "Representative response copied to ai_response for LangChain compatibility",
                            extra={
                                "user_id": chat_message.user_id[:8] + "****",
                                "representative_character": next(
                                    (r.character.value for r in chat_message.group_ai_responses if r.is_representative), 
                                    "unknown"
                                )
                            }
                        )
            
            # DynamoDB保存実行（chatsテーブル）
            await self.chats_client.put_item(item_data)
            
            self.logger.info(
                "Integrated chat message saved successfully",
                extra={
                    "user_id": chat_message.user_id[:8] + "****",
                    "chat_id": chat_message.chat_id,
                    "chat_type": chat_message.chat_type,
                    "character": chat_message.ai_character,
                    "sk_format": f"CHAT#{chat_message.chat_type}#{timestamp_str}",
                    "expires_at": chat_message.expires_at
                }
            )
            
            return chat_message
            
        except Exception as e:
            self.logger.error(
                "Failed to save integrated chat message",
                extra={
                    "error": str(e),
                    "user_id": chat_message.user_id[:8] + "****",
                    "chat_id": chat_message.chat_id,
                    "chat_type": getattr(chat_message, 'chat_type', 'unknown')
                }
            )
            raise DatabaseError(f"Failed to save integrated chat message: {str(e)}")
    
    async def get_chat_history(
        self, 
        user_id: str, 
        request: ChatHistoryRequest
    ) -> ChatHistoryResponse:
        """
        チャット履歴取得（1:1・グループチャット統合版）
        
        ■機能概要■
        - 期間指定フィルタ対応（JST基準）
        - ページネーション対応
        - 1:1・グループチャット統合表示
        - SKフォーマット: CHAT#{chat_type}#{timestamp} 対応
        - DynamoDB Query最適化
        - GSI未使用（メインテーブルのみ）
        
        Args:
            user_id: 取得対象ユーザーID
            request: 履歴取得リクエスト
            
        Returns:
            ChatHistoryResponse: 履歴データとページネーション情報（統合モデル）
            
        Raises:
            DatabaseError: DynamoDB操作エラー
        """
        try:
            self.logger.debug(
                "Fetching integrated chat history from DynamoDB",
                extra={
                    "user_id": user_id[:8] + "****",
                    "start_date": request.start_date,
                    "end_date": request.end_date,
                    "limit": request.limit
                }
            )
            
            # クエリ条件構築（新しいSKフォーマット対応）
            pk = f"USER#{user_id}"
            sk_prefix = "CHAT#"  # 全チャットタイプを取得（統合表示）
            
            # 期間フィルタ対応（JST前提・新SKフォーマット対応）
            sk_condition = None
            if request.start_date or request.end_date:
                # 新SKフォーマット: CHAT#{chat_type}#{timestamp} に対応した期間フィルタ
                # 全chat_typeを包含する範囲指定（single < group のアルファベット順を活用）
                if request.start_date and request.end_date:
                    sk_condition = {
                        "between": [
                            f"CHAT#group#{request.start_date}T00:00:00+09:00",  # groupが先頭（アルファベット順）
                            f"CHAT#single#{request.end_date}T23:59:59+09:00"   # singleが末尾
                        ]
                    }
                elif request.start_date:
                    sk_condition = {">=" : f"CHAT#group#{request.start_date}T00:00:00+09:00"}
                elif request.end_date:
                    sk_condition = {"<=" : f"CHAT#single#{request.end_date}T23:59:59+09:00"}
            
            # DynamoDB Query実行（chatsテーブル・メインテーブルのみ）
            items = await self.chats_client.query_by_prefix(
                pk=pk,
                sk_prefix=sk_prefix,
                sk_condition=sk_condition,
                limit=request.limit,
                next_token=request.next_token,
                scan_index_forward=False  # 新しい順（時系列統合表示）
            )
            
            # レスポンス形式に変換（統合ChatMessageモデル構造対応）
            messages = []
            for item_data in items.get("items", []):
                try:
                    # 統合ChatMessageモデル構造に対応したフィールド抽出
                    from homebiyori_common.models import AICharacterType, PraiseLevel, InteractionMode
                    
                    # 基本フィールド（後方互換性対応）
                    chat_type = item_data.get("chat_type", "single")  # 後方互換性
                    
                    # グループチャット専用フィールド（条件付き取得）
                    active_characters = None
                    group_ai_responses = None
                    
                    if chat_type == "group":
                        if "active_characters" in item_data:
                            active_characters = [AICharacterType(char) for char in item_data["active_characters"]]
                        if "group_ai_responses" in item_data:
                            # DynamoDB形式からGroupAIResponseオブジェクトに変換
                            from .models import GroupAIResponse
                            group_ai_responses = [
                                GroupAIResponse(
                                    character=AICharacterType(resp["character"]),
                                    response=resp["response"],
                                    is_representative=resp.get("is_representative", False)
                                )
                                for resp in item_data["group_ai_responses"]
                            ]
                    
                    message_item = ChatMessage(
                        chat_id=item_data.get("chat_id"),
                        user_id=item_data.get("user_id"),
                        chat_type=chat_type,
                        user_message=item_data.get("user_message", ""),
                        ai_response=item_data.get("ai_response", ""),
                        ai_character=AICharacterType(item_data.get("ai_character")),
                        praise_level=PraiseLevel(item_data.get("praise_level")),
                        interaction_mode=InteractionMode(item_data.get("interaction_mode")),
                        active_characters=active_characters,
                        group_ai_responses=group_ai_responses,
                        growth_points_gained=item_data.get("growth_points_gained", 0),
                        tree_stage_at_time=item_data.get("tree_stage_at_time", 0),
                        created_at=datetime.fromisoformat(item_data.get("created_at")),
                        expires_at=item_data.get("expires_at")
                    )
                    messages.append(message_item)
                    
                except Exception as e:
                    self.logger.warning(
                        "Failed to parse integrated chat history item",
                        extra={
                            "error": str(e),
                            "item_pk": item_data.get("PK"),
                            "item_sk": item_data.get("SK"),
                            "chat_type": item_data.get("chat_type", "unknown")
                        }
                    )
            
            # ChatHistoryResponse作成
            result = ChatHistoryResponse(
                messages=messages,
                next_token=items.get("next_token"),
                has_more=bool(items.get("next_token")),
                total_count=len(messages)  # 簡易実装、必要に応じて正確な総数計算
            )
            
            self.logger.info(
                "Integrated chat history retrieved successfully",
                extra={
                    "user_id": user_id[:8] + "****",
                    "returned_count": len(messages),
                    "has_more": result.has_more,
                    "single_chats": len([m for m in messages if m.chat_type == "single"]),
                    "group_chats": len([m for m in messages if m.chat_type == "group"]),
                    "sk_format": "CHAT#{chat_type}#{timestamp}"
                }
            )
            
            return result
            
        except Exception as e:
            self.logger.error(
                "Failed to get integrated chat history",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****"
                }
            )
            raise DatabaseError(f"Failed to retrieve integrated chat history: {str(e)}")
    
    
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
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
    AICharacterType,
    EmotionType,
    MoodType
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
        データベースクライアント初期化
        
        homebiyori-common-layer の DynamoDBClient を使用し、
        高レベルなデータベース操作機能を活用。
        """
        self.db_client = DynamoDBClient()
        self.logger = logger
    
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
            
            # DynamoDB保存実行
            await self.db_client.put_item(item_data)
            
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
                    sk_condition = {">=": f"CHAT#{request.start_date}"}
                elif request.end_date:
                    sk_condition = {"<=": f"CHAT#{request.end_date}T23:59:59.999Z"}
            
            # DynamoDB Query実行
            if use_gsi:
                items = await self.db_client.query_gsi(
                    gsi_name="GSI1",
                    pk=pk,
                    sk_prefix=sk_prefix,
                    sk_condition=sk_condition,
                    limit=request.limit,
                    next_token=request.next_token,
                    scan_index_forward=False  # 新しい順
                )
            else:
                items = await self.db_client.query_by_prefix(
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
            
            items = await self.db_client.query_by_prefix(
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
    # 木の成長・統計管理
    # =====================================
    
    async def get_user_tree_stats(self, user_id: str) -> Dict[str, int]:
        """
        ユーザーの木の成長統計取得
        
        ■統計項目■
        - total_characters: 累計文字数
        - current_stage: 現在の成長段階
        - message_count: 総メッセージ数
        - last_message_date: 最終メッセージ日
        
        Args:
            user_id: ユーザーID
            
        Returns:
            Dict: 木の成長統計データ
        """
        try:
            self.logger.debug(
                "Fetching user tree stats",
                extra={"user_id": user_id[:8] + "****"}
            )
            
            # 統計データ取得（専用アイテム）
            pk = f"USER#{user_id}"
            sk = "TREE_STATS"
            
            item_data = await self.db_client.get_item(pk, sk)
            
            if item_data:
                stats = {
                    "total_characters": item_data.get("total_characters", 0),
                    "current_stage": item_data.get("current_stage", 0),
                    "message_count": item_data.get("message_count", 0),
                    "last_message_date": item_data.get("last_message_date")
                }
            else:
                # 初回アクセス時のデフォルト値
                stats = {
                    "total_characters": 0,
                    "current_stage": 0,
                    "message_count": 0,
                    "last_message_date": None
                }
            
            return stats
            
        except Exception as e:
            self.logger.error(
                "Failed to get user tree stats",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****"
                }
            )
            # エラー時はデフォルト値返却
            return {
                "total_characters": 0,
                "current_stage": 0,
                "message_count": 0,
                "last_message_date": None
            }
    
    async def update_tree_stats(
        self, 
        user_id: str, 
        new_total_characters: int, 
        new_stage: int
    ) -> None:
        """
        木の成長統計更新
        
        ■更新項目■
        - total_characters: 累計文字数
        - current_stage: 現在の成長段階
        - message_count: メッセージ数インクリメント
        - last_message_date: 最終更新日時
        
        Args:
            user_id: ユーザーID
            new_total_characters: 新しい累計文字数
            new_stage: 新しい成長段階
        """
        try:
            self.logger.debug(
                "Updating tree stats",
                extra={
                    "user_id": user_id[:8] + "****",
                    "new_total_characters": new_total_characters,
                    "new_stage": new_stage
                }
            )
            
            # 統計データ更新
            pk = f"USER#{user_id}"
            sk = "TREE_STATS"
            
            # 現在の統計取得
            current_stats = await self.get_user_tree_stats(user_id)
            
            # 更新データ準備
            updated_stats = {
                "PK": pk,
                "SK": sk,
                "total_characters": new_total_characters,
                "current_stage": new_stage,
                "message_count": current_stats.get("message_count", 0) + 1,
                "last_message_date": get_current_jst().isoformat(),
                "updated_at": get_current_jst().isoformat()
            }
            
            # DynamoDB更新実行
            await self.db_client.put_item(updated_stats)
            
            self.logger.info(
                "Tree stats updated successfully",
                extra={
                    "user_id": user_id[:8] + "****",
                    "total_characters": new_total_characters,
                    "stage": new_stage,
                    "message_count": updated_stats["message_count"]
                }
            )
            
        except Exception as e:
            self.logger.error(
                "Failed to update tree stats",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****"
                }
            )
            raise DatabaseError(f"Failed to update tree stats: {str(e)}")
    
    # =====================================
    # 実（褒めメッセージ）管理
    # =====================================
    
    async def save_fruit_info(self, user_id: str, fruit_info: FruitInfo) -> FruitInfo:
        """
        実（褒めメッセージ）情報保存
        
        ■保存設計■
        - PK: USER#{user_id}
        - SK: FRUIT#{created_at}#{fruit_id}
        - 1日1回制限チェック用インデックス
        
        Args:
            user_id: ユーザーID
            fruit_info: 実情報
            
        Returns:
            FruitInfo: 保存後の実情報
        """
        try:
            self.logger.debug(
                "Saving fruit info",
                extra={
                    "user_id": user_id[:8] + "****",
                    "fruit_id": fruit_info.fruit_id,
                    "emotion_trigger": fruit_info.emotion_trigger
                }
            )
            
            # DynamoDB保存用データ準備
            item_data = fruit_info.model_dump()
            
            # DynamoDB Keys設定
            timestamp_str = fruit_info.created_at.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            item_data["PK"] = f"USER#{user_id}"
            item_data["SK"] = f"FRUIT#{timestamp_str}#{fruit_info.fruit_id}"
            
            # 日時をISO8601文字列に変換
            item_data["created_at"] = fruit_info.created_at.isoformat()
            
            # 実生成日付（1日1回制限用）
            item_data["fruit_date"] = fruit_info.created_at.strftime("%Y-%m-%d")
            
            # DynamoDB保存実行
            await self.db_client.put_item(item_data)
            
            self.logger.info(
                "Fruit info saved successfully",
                extra={
                    "user_id": user_id[:8] + "****",
                    "fruit_id": fruit_info.fruit_id,
                    "character": fruit_info.character
                }
            )
            
            return fruit_info
            
        except Exception as e:
            self.logger.error(
                "Failed to save fruit info",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****",
                    "fruit_id": fruit_info.fruit_id
                }
            )
            raise DatabaseError(f"Failed to save fruit info: {str(e)}")
    
    async def get_last_fruit_date(self, user_id: str) -> Optional[datetime]:
        """
        最後に実を生成した日時取得（1日1回制限チェック用）
        
        Args:
            user_id: ユーザーID
            
        Returns:
            Optional[datetime]: 最後の実生成日時
        """
        try:
            self.logger.debug(
                "Fetching last fruit date",
                extra={"user_id": user_id[:8] + "****"}
            )
            
            # 最新の実を取得
            pk = f"USER#{user_id}"
            sk_prefix = "FRUIT#"
            
            items = await self.db_client.query_by_prefix(
                pk=pk,
                sk_prefix=sk_prefix,
                limit=1,
                scan_index_forward=False  # 新しい順
            )
            
            if items.get("items"):
                last_fruit = items["items"][0]
                created_at_str = last_fruit.get("created_at")
                if created_at_str:
                    # ISO8601文字列をdatetimeに変換
                    return datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
            
            return None
            
        except Exception as e:
            self.logger.error(
                "Failed to get last fruit date",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****"
                }
            )
            # エラー時はNone返却（実生成可能として扱う）
            return None
    
    # =====================================
    # TTL管理
    # =====================================
    
    async def get_user_subscription_info(self, user_id: str) -> Dict[str, str]:
        """
        ユーザーのサブスクリプション情報取得
        
        ■取得情報■
        - plan: サブスクリプションプラン（free, monthly, yearly）
        - status: サブスクリプション状態
        - expires_at: 有効期限
        
        Args:
            user_id: ユーザーID
            
        Returns:
            Dict: ユーザーサブスクリプション情報
        """
        try:
            self.logger.debug(
                "Fetching user subscription info",
                extra={"user_id": user_id[:8] + "****"}
            )
            
            # ユーザープロフィールからサブスクリプションプラン取得
            # user-service との連携を想定
            pk = f"USER#{user_id}"
            sk = "PROFILE"
            
            profile_data = await self.db_client.get_item(pk, sk)
            
            if profile_data:
                subscription_info = {
                    "plan": profile_data.get("subscription_plan", "free"),
                    "status": profile_data.get("subscription_status", "active"),
                    "expires_at": profile_data.get("subscription_expires_at")
                }
            else:
                # デフォルト（無料プラン）
                subscription_info = {
                    "plan": "free",
                    "status": "active",
                    "expires_at": None
                }
            
            return subscription_info
            
        except Exception as e:
            self.logger.error(
                "Failed to get user subscription info",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****"
                }
            )
            # エラー時はデフォルト（無料プラン）返却
            return {
                "plan": "free",
                "status": "active",
                "expires_at": None
            }

    async def get_user_ai_preferences(self, user_id: str) -> Dict[str, str]:
        """
        ユーザーのAI設定情報取得
        
        ■取得情報■
        - ai_character: AIキャラクター（tama, madoka, hide）
        - praise_level: 褒めレベル（normal, deep）  
        - interaction_mode: 対話モード（praise, listen）
        
        Args:
            user_id: ユーザーID
            
        Returns:
            Dict: ユーザーAI設定情報
        """
        try:
            self.logger.debug(
                "Fetching user AI preferences",
                extra={"user_id": user_id[:8] + "****"}
            )
            
            # ユーザープロフィールからAI設定情報取得
            pk = f"USER#{user_id}"
            sk = "PROFILE"
            
            profile_data = await self.db_client.get_item(pk, sk)
            
            if profile_data:
                ai_preferences = {
                    "ai_character": profile_data.get("ai_character", "tama"),
                    "praise_level": profile_data.get("praise_level", "normal"),
                    "interaction_mode": profile_data.get("interaction_mode", "praise")
                }
            else:
                # デフォルト設定
                ai_preferences = {
                    "ai_character": "tama",
                    "praise_level": "normal", 
                    "interaction_mode": "praise"
                }
            
            self.logger.debug(
                "User AI preferences retrieved successfully",
                extra={
                    "user_id": user_id[:8] + "****",
                    "ai_character": ai_preferences["ai_character"],
                    "interaction_mode": ai_preferences["interaction_mode"]
                }
            )
            
            return ai_preferences
            
        except Exception as e:
            self.logger.error(
                "Failed to get user AI preferences",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****"
                }
            )
            # エラー時はデフォルト設定返却
            return {
                "ai_character": "tama",
                "praise_level": "normal",
                "interaction_mode": "praise"
            }
    
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
    
    # =====================================
    # ユーザー設定管理
    # =====================================
    
    async def update_user_mood(self, user_id: str, mood: MoodType) -> None:
        """
        ユーザーの気分設定更新
        
        Args:
            user_id: ユーザーID
            mood: 新しい気分設定
        """
        try:
            self.logger.debug(
                "Updating user mood",
                extra={
                    "user_id": user_id[:8] + "****",
                    "mood": mood
                }
            )
            
            # ユーザー設定更新
            pk = f"USER#{user_id}"
            sk = "CHAT_SETTINGS"
            
            settings_data = {
                "PK": pk,
                "SK": sk,
                "current_mood": mood,
                "mood_updated_at": get_current_jst().isoformat(),
                "updated_at": get_current_jst().isoformat()
            }
            
            await self.db_client.put_item(settings_data)
            
            self.logger.info(
                "User mood updated successfully",
                extra={
                    "user_id": user_id[:8] + "****",
                    "mood": mood
                }
            )
            
        except Exception as e:
            self.logger.error(
                "Failed to update user mood",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****",
                    "mood": mood
                }
            )
            raise DatabaseError(f"Failed to update user mood: {str(e)}")
    
    async def save_emotion_stamp(
        self,
        user_id: str,
        stamp_id: str,
        emotion: EmotionType,
        intensity: float,
        timestamp: datetime
    ) -> None:
        """
        感情スタンプ保存
        
        Args:
            user_id: ユーザーID
            stamp_id: スタンプID
            emotion: 感情タイプ
            intensity: 感情強度
            timestamp: 送信日時
        """
        try:
            self.logger.debug(
                "Saving emotion stamp",
                extra={
                    "user_id": user_id[:8] + "****",
                    "stamp_id": stamp_id,
                    "emotion": emotion,
                    "intensity": intensity
                }
            )
            
            # 感情スタンプデータ
            timestamp_str = timestamp.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            item_data = {
                "PK": f"USER#{user_id}",
                "SK": f"EMOTION#{timestamp_str}#{stamp_id}",
                "stamp_id": stamp_id,
                "emotion": emotion,
                "intensity": intensity,
                "created_at": timestamp.isoformat(),
                "stamp_date": timestamp.strftime("%Y-%m-%d")
            }
            
            await self.db_client.put_item(item_data)
            
            self.logger.info(
                "Emotion stamp saved successfully",
                extra={
                    "user_id": user_id[:8] + "****",
                    "stamp_id": stamp_id,
                    "emotion": emotion
                }
            )
            
        except Exception as e:
            self.logger.error(
                "Failed to save emotion stamp",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****",
                    "stamp_id": stamp_id
                }
            )
            raise DatabaseError(f"Failed to save emotion stamp: {str(e)}")
    
    # =====================================
    # 分析・統計機能
    # =====================================
    
    async def increment_character_usage(
        self, 
        user_id: str, 
        character: AICharacterType
    ) -> None:
        """
        キャラクター使用統計更新
        
        Args:
            user_id: ユーザーID
            character: 使用されたAIキャラクター
        """
        try:
            # キャラクター使用統計更新
            pk = f"USER#{user_id}"
            sk = f"CHAR_STATS#{character}"
            
            # 現在の使用回数取得
            current_stats = await self.db_client.get_item(pk, sk) or {}
            current_count = current_stats.get("usage_count", 0)
            
            # 使用回数インクリメント
            updated_stats = {
                "PK": pk,
                "SK": sk,
                "character": character,
                "usage_count": current_count + 1,
                "last_used_at": get_current_jst().isoformat(),
                "updated_at": get_current_jst().isoformat()
            }
            
            await self.db_client.put_item(updated_stats)
            
        except Exception as e:
            self.logger.error(
                "Failed to increment character usage",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****",
                    "character": character
                }
            )
            # 統計更新失敗は致命的でないため、処理継続
    
    async def increment_emotion_detection(
        self, 
        user_id: str, 
        emotion: EmotionType
    ) -> None:
        """
        感情検出統計更新
        
        Args:
            user_id: ユーザーID
            emotion: 検出された感情
        """
        try:
            # 感情検出統計更新
            pk = f"USER#{user_id}"
            sk = f"EMOTION_STATS#{emotion}"
            
            # 現在の検出回数取得
            current_stats = await self.db_client.get_item(pk, sk) or {}
            current_count = current_stats.get("detection_count", 0)
            
            # 検出回数インクリメント
            updated_stats = {
                "PK": pk,
                "SK": sk,
                "emotion": emotion,
                "detection_count": current_count + 1,
                "last_detected_at": get_current_jst().isoformat(),
                "updated_at": get_current_jst().isoformat()
            }
            
            await self.db_client.put_item(updated_stats)
            
        except Exception as e:
            self.logger.error(
                "Failed to increment emotion detection",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****",
                    "emotion": emotion
                }
            )
            # 統計更新失敗は致命的でないため、処理継続
    
    async def record_stage_change(self, user_id: str, timestamp: datetime) -> None:
        """
        成長段階変化記録
        
        Args:
            user_id: ユーザーID
            timestamp: 段階変化日時
        """
        try:
            # 成長段階変化記録
            timestamp_str = timestamp.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            item_data = {
                "PK": f"USER#{user_id}",
                "SK": f"STAGE_CHANGE#{timestamp_str}",
                "changed_at": timestamp.isoformat(),
                "change_date": timestamp.strftime("%Y-%m-%d")
            }
            
            await self.db_client.put_item(item_data)
            
        except Exception as e:
            self.logger.error(
                "Failed to record stage change",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****"
                }
            )
            # 記録失敗は致命的でないため、処理継続


# =====================================
# データベースクライアント取得関数
# =====================================

def get_chat_database() -> ChatServiceDatabase:
    """
    チャットサービス専用データベースクライアント取得
    
    ■シングルトンパターン■
    Lambda実行環境での効率的なリソース利用のため、
    データベースクライアントはシングルトンとして管理。
    
    Returns:
        ChatServiceDatabase: データベース操作クライアント
    """
    # Lambda実行環境でのグローバル変数活用
    if not hasattr(get_chat_database, "_instance"):
        get_chat_database._instance = ChatServiceDatabase()
    
    return get_chat_database._instance
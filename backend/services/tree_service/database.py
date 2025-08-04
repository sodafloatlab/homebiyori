"""
tree-service データベース操作クラス

■システム概要■
Homebiyori（ほめびより）木の成長システム専用のDynamoDB操作。
Single Table Design による効率的なデータ管理と、
JST時刻統一、高速な成長計算・実管理を提供。

■データ設計■
DynamoDB Single Table Design:
- PK: USER#{user_id}
- SK: TREE_STATS / FRUIT#{timestamp}#{fruit_id} / GROWTH#{stage}#{timestamp}
- GSI1: 実の検索・フィルタリング用
- TTL: 実は永続保存（TTL設定なし）

■設計の特徴■
- 木統計: リアルタイム更新
- 実保存: 永続化（削除なし）
- 成長履歴: 段階変化時自動記録
- JST時刻: 日本のユーザーに最適化

■依存関係■
homebiyori-common-layer:
- DynamoDBClient: 高レベルDB操作
- Logger: 構造化ログ
- Exceptions: 統一例外処理
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

# ローカルモジュール
from .models import (
    TreeStatus,
    FruitInfo,
    GrowthHistoryItem,
    TreeStage,
    AICharacterType,
    EmotionType,
    TreeTheme,
    get_current_jst,
    to_jst_string,
    calculate_tree_stage,
    get_characters_to_next_stage,
    calculate_progress_percentage,
    TREE_STAGE_CONFIG
)

# 構造化ログ設定
logger = get_logger(__name__)

class TreeDatabase:
    """
    木の成長システム専用データベースクラス
    
    ■主要機能■
    1. 木統計の管理（成長段階、文字数、実数）
    2. 実（褒めメッセージ）の保存・取得
    3. 成長履歴の記録・分析
    4. テーマカラー管理
    """
    
    def __init__(self, table_name: str = "homebiyori-data"):
        """
        データベースクライアント初期化
        
        Args:
            table_name: DynamoDBテーブル名
        """
        self.table_name = table_name
        self.db_client = DynamoDBClient(table_name)
        self.logger = get_logger(__name__)
    
    # =====================================
    # 木統計管理
    # =====================================
    
    async def get_user_tree_stats(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        ユーザーの木統計を取得
        
        Args:
            user_id: ユーザーID
            
        Returns:
            Dict: 木統計データ（存在しない場合はNone）
        """
        try:
            pk = f"USER#{user_id}"
            sk = "TREE_STATS"
            
            item = await self.db_client.get_item(pk, sk)
            
            if item:
                # JST時刻に変換
                for date_field in ["created_at", "updated_at", "last_message_date", "last_fruit_date"]:
                    if date_field in item and item[date_field]:
                        if isinstance(item[date_field], str):
                            # ISO文字列をdatetimeに変換
                            dt = datetime.fromisoformat(item[date_field].replace('Z', '+00:00'))
                            jst = pytz.timezone('Asia/Tokyo')
                            item[date_field] = dt.astimezone(jst)
                
                self.logger.info(f"木統計取得成功: user_id={user_id}")
                return item
            
            self.logger.info(f"木統計未作成: user_id={user_id}")
            return None
            
        except Exception as e:
            self.logger.error(f"木統計取得エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"木統計の取得に失敗しました: {e}")
    
    async def create_initial_tree(self, user_id: str) -> Dict[str, Any]:
        """
        新規ユーザー用の初期木統計を作成
        
        Args:
            user_id: ユーザーID
            
        Returns:
            Dict: 作成された初期木統計
        """
        try:
            now = get_current_jst()
            
            initial_stats = {
                "PK": f"USER#{user_id}",
                "SK": "TREE_STATS",
                "user_id": user_id,
                "current_stage": 0,
                "total_characters": 0,
                "total_messages": 0,
                "total_fruits": 0,
                "theme_color": "rose",
                "created_at": to_jst_string(now),
                "updated_at": to_jst_string(now),
                "last_message_date": None,
                "last_fruit_date": None
            }
            
            await self.db_client.put_item(initial_stats)
            
            # レスポンス用にdatetime型に変換
            initial_stats["created_at"] = now
            initial_stats["updated_at"] = now
            
            self.logger.info(f"初期木統計作成完了: user_id={user_id}")
            return initial_stats
            
        except Exception as e:
            self.logger.error(f"初期木統計作成エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"初期木統計の作成に失敗しました: {e}")
    
    async def update_tree_growth(
        self, 
        user_id: str, 
        added_characters: int, 
        new_total_characters: int
    ) -> None:
        """
        木の成長を更新（文字数・段階・メッセージ数）
        
        Args:
            user_id: ユーザーID
            added_characters: 追加文字数
            new_total_characters: 新しい累計文字数
        """
        try:
            now = get_current_jst()
            new_stage = calculate_tree_stage(new_total_characters)
            
            pk = f"USER#{user_id}"
            sk = "TREE_STATS"
            
            # 更新式でアトミックに更新
            update_expression = """
                SET 
                    total_characters = :new_total,
                    current_stage = :new_stage,
                    total_messages = total_messages + :one,
                    last_message_date = :now,
                    updated_at = :now
            """
            
            expression_values = {
                ":new_total": new_total_characters,
                ":new_stage": new_stage,
                ":one": 1,
                ":now": to_jst_string(now)
            }
            
            await self.db_client.update_item(
                pk, sk, 
                update_expression, 
                expression_values
            )
            
            self.logger.info(
                f"木成長更新完了: user_id={user_id}, "
                f"added={added_characters}, total={new_total_characters}, stage={new_stage}"
            )
            
        except Exception as e:
            self.logger.error(f"木成長更新エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"木の成長更新に失敗しました: {e}")
    
    async def update_tree_theme(self, user_id: str, theme_color: str) -> None:
        """
        木のテーマカラーを更新
        
        Args:
            user_id: ユーザーID
            theme_color: 新しいテーマカラー
        """
        try:
            now = get_current_jst()
            pk = f"USER#{user_id}"
            sk = "TREE_STATS"
            
            update_expression = "SET theme_color = :theme, updated_at = :now"
            expression_values = {
                ":theme": theme_color,
                ":now": to_jst_string(now)
            }
            
            await self.db_client.update_item(
                pk, sk,
                update_expression,
                expression_values
            )
            
            self.logger.info(f"テーマカラー更新完了: user_id={user_id}, theme={theme_color}")
            
        except Exception as e:
            self.logger.error(f"テーマカラー更新エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"テーマカラーの更新に失敗しました: {e}")
    
    # =====================================
    # 実（褒めメッセージ）管理
    # =====================================
    
    async def save_fruit(self, fruit_info: FruitInfo) -> None:
        """
        実（褒めメッセージ）を保存
        
        Args:
            fruit_info: 実の情報
        """
        try:
            now = get_current_jst()
            timestamp_str = now.strftime("%Y%m%d%H%M%S")
            
            item = {
                "PK": f"USER#{fruit_info.user_id}",
                "SK": f"FRUIT#{timestamp_str}#{fruit_info.fruit_id}",
                "fruit_id": fruit_info.fruit_id,
                "user_id": fruit_info.user_id,
                "message": fruit_info.message,
                "emotion_trigger": fruit_info.emotion_trigger.value,
                "emotion_score": fruit_info.emotion_score,
                "ai_character": fruit_info.ai_character.value,
                "character_color": fruit_info.character_color.value,
                "trigger_message_id": fruit_info.trigger_message_id,
                "created_at": to_jst_string(fruit_info.created_at),
                "viewed_at": None,
                "view_count": 0,
                # GSI1用（実の検索・フィルタリング）
                "GSI1PK": f"FRUIT#{fruit_info.user_id}",
                "GSI1SK": f"{fruit_info.ai_character.value}#{fruit_info.emotion_trigger.value}#{timestamp_str}",
                # TTL設定なし（実は永続保存）
            }
            
            await self.db_client.put_item(item)
            
            self.logger.info(f"実保存完了: user_id={fruit_info.user_id}, fruit_id={fruit_info.fruit_id}")
            
        except Exception as e:
            self.logger.error(f"実保存エラー: fruit_id={fruit_info.fruit_id}, error={e}")
            raise DatabaseError(f"実の保存に失敗しました: {e}")
    
    async def get_fruit_detail(self, user_id: str, fruit_id: str) -> Optional[FruitInfo]:
        """
        実の詳細情報を取得
        
        Args:
            user_id: ユーザーID
            fruit_id: 実のID
            
        Returns:
            FruitInfo: 実の詳細情報（存在しない場合はNone）
        """
        try:
            # SKパターンでクエリ（fruit_idで検索）
            pk = f"USER#{user_id}"
            
            # Query with begins_with for SK
            items = await self.db_client.query(
                pk,
                sk_condition=f"begins_with(SK, :sk_prefix)",
                expression_values={":sk_prefix": "FRUIT#"},
                filter_expression="fruit_id = :fruit_id",
                filter_values={":fruit_id": fruit_id}
            )
            
            if not items:
                self.logger.warning(f"実が見つかりません: user_id={user_id}, fruit_id={fruit_id}")
                return None
            
            item = items[0]  # 最初のマッチ
            
            # FruitInfoオブジェクトに変換
            fruit_info = FruitInfo(
                fruit_id=item["fruit_id"],
                user_id=item["user_id"],
                message=item["message"],
                emotion_trigger=EmotionType(item["emotion_trigger"]),
                emotion_score=item["emotion_score"],
                ai_character=AICharacterType(item["ai_character"]),
                character_color=TreeTheme(item["character_color"]),
                trigger_message_id=item.get("trigger_message_id"),
                created_at=datetime.fromisoformat(item["created_at"]),
                viewed_at=datetime.fromisoformat(item["viewed_at"]) if item.get("viewed_at") else None,
                view_count=item.get("view_count", 0)
            )
            
            self.logger.info(f"実詳細取得完了: user_id={user_id}, fruit_id={fruit_id}")
            return fruit_info
            
        except Exception as e:
            self.logger.error(f"実詳細取得エラー: user_id={user_id}, fruit_id={fruit_id}, error={e}")
            raise DatabaseError(f"実の詳細取得に失敗しました: {e}")
    
    async def get_user_fruits(
        self,
        user_id: str,
        filters: Dict[str, Any] = None,
        limit: int = 20,
        next_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        ユーザーの実一覧を取得
        
        Args:
            user_id: ユーザーID
            filters: フィルター条件
            limit: 取得件数制限
            next_token: ページネーショントークン
            
        Returns:
            Dict: 実一覧とメタデータ
        """
        try:
            pk = f"USER#{user_id}"
            
            # 基本クエリ条件
            query_params = {
                "pk": pk,
                "sk_condition": "begins_with(SK, :sk_prefix)",
                "expression_values": {":sk_prefix": "FRUIT#"},
                "limit": limit,
                "scan_index_forward": False  # 新しい順
            }
            
            # フィルター条件追加
            filter_conditions = []
            filter_values = {}
            
            if filters:
                if filters.get("character"):
                    filter_conditions.append("ai_character = :character")
                    filter_values[":character"] = filters["character"]
                
                if filters.get("emotion"):
                    filter_conditions.append("emotion_trigger = :emotion")
                    filter_values[":emotion"] = filters["emotion"]
                
                if filters.get("start_date"):
                    filter_conditions.append("created_at >= :start_date")
                    filter_values[":start_date"] = f"{filters['start_date']}T00:00:00"
                
                if filters.get("end_date"):
                    filter_conditions.append("created_at <= :end_date")
                    filter_values[":end_date"] = f"{filters['end_date']}T23:59:59"
            
            if filter_conditions:
                query_params["filter_expression"] = " AND ".join(filter_conditions)
                query_params["filter_values"] = filter_values
            
            if next_token:
                query_params["next_token"] = next_token
            
            # クエリ実行
            result = await self.db_client.query_with_pagination(**query_params)
            
            # FruitInfoオブジェクトに変換
            fruits = []
            character_counts = {}
            emotion_counts = {}
            
            for item in result["items"]:
                fruit_info = FruitInfo(
                    fruit_id=item["fruit_id"],
                    user_id=item["user_id"],
                    message=item["message"],
                    emotion_trigger=EmotionType(item["emotion_trigger"]),
                    emotion_score=item["emotion_score"],
                    ai_character=AICharacterType(item["ai_character"]),
                    character_color=TreeTheme(item["character_color"]),
                    trigger_message_id=item.get("trigger_message_id"),
                    created_at=datetime.fromisoformat(item["created_at"]),
                    viewed_at=datetime.fromisoformat(item["viewed_at"]) if item.get("viewed_at") else None,
                    view_count=item.get("view_count", 0)
                )
                fruits.append(fruit_info)
                
                # 統計カウント
                char = item["ai_character"]
                emotion = item["emotion_trigger"]
                character_counts[char] = character_counts.get(char, 0) + 1
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            
            self.logger.info(f"実一覧取得完了: user_id={user_id}, count={len(fruits)}")
            
            return {
                "items": fruits,
                "total_count": len(fruits),  # TODO: 正確な総数計算（別クエリが必要）
                "character_counts": character_counts,
                "emotion_counts": emotion_counts,
                "next_token": result.get("next_token"),
                "has_more": result.get("has_more", False)
            }
            
        except Exception as e:
            self.logger.error(f"実一覧取得エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"実一覧の取得に失敗しました: {e}")
    
    async def update_fruit_view_stats(self, user_id: str, fruit_id: str) -> None:
        """
        実の閲覧統計を更新
        
        Args:
            user_id: ユーザーID
            fruit_id: 実のID
        """
        try:
            now = get_current_jst()
            
            # fruit_idから該当アイテムを検索
            pk = f"USER#{user_id}"
            items = await self.db_client.query(
                pk,
                sk_condition="begins_with(SK, :sk_prefix)",
                expression_values={":sk_prefix": "FRUIT#"},
                filter_expression="fruit_id = :fruit_id",
                filter_values={":fruit_id": fruit_id}
            )
            
            if not items:
                raise NotFoundError(f"実が見つかりません: fruit_id={fruit_id}")
            
            item = items[0]
            sk = item["SK"]
            
            # 閲覧統計更新
            update_expression = """
                SET 
                    view_count = view_count + :one,
                    viewed_at = if_not_exists(viewed_at, :now)
            """
            
            expression_values = {
                ":one": 1,
                ":now": to_jst_string(now)
            }
            
            await self.db_client.update_item(
                pk, sk,
                update_expression,
                expression_values
            )
            
            self.logger.info(f"実閲覧統計更新完了: user_id={user_id}, fruit_id={fruit_id}")
            
        except Exception as e:
            self.logger.error(f"実閲覧統計更新エラー: user_id={user_id}, fruit_id={fruit_id}, error={e}")
            raise DatabaseError(f"閲覧統計の更新に失敗しました: {e}")
    
    async def increment_fruit_count(self, user_id: str) -> None:
        """
        木統計の実カウントを増加
        
        Args:
            user_id: ユーザーID
        """
        try:
            now = get_current_jst()
            pk = f"USER#{user_id}"
            sk = "TREE_STATS"
            
            update_expression = """
                SET 
                    total_fruits = total_fruits + :one,
                    last_fruit_date = :now,
                    updated_at = :now
            """
            
            expression_values = {
                ":one": 1,
                ":now": to_jst_string(now)
            }
            
            await self.db_client.update_item(
                pk, sk,
                update_expression,
                expression_values
            )
            
            self.logger.info(f"実カウント増加完了: user_id={user_id}")
            
        except Exception as e:
            self.logger.error(f"実カウント増加エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"実カウントの増加に失敗しました: {e}")
    
    # =====================================
    # 成長履歴管理
    # =====================================
    
    async def record_growth_achievement(
        self,
        user_id: str,
        new_stage: int,
        total_characters: int
    ) -> None:
        """
        成長段階到達を履歴に記録
        
        Args:
            user_id: ユーザーID
            new_stage: 新しい成長段階
            total_characters: 到達時の累計文字数
        """
        try:
            now = get_current_jst()
            timestamp_str = now.strftime("%Y%m%d%H%M%S")
            
            stage_config = TREE_STAGE_CONFIG[new_stage]
            
            item = {
                "PK": f"USER#{user_id}",
                "SK": f"GROWTH#{new_stage:02d}#{timestamp_str}",
                "user_id": user_id,
                "stage": new_stage,
                "stage_name": stage_config["name"],
                "achieved_at": to_jst_string(now),
                "total_characters_at_achievement": total_characters,
                "celebration_message": stage_config["description"],
                "milestone_fruit_id": None  # 将来的に特別な実のID
            }
            
            await self.db_client.put_item(item)
            
            self.logger.info(f"成長履歴記録完了: user_id={user_id}, stage={new_stage}")
            
        except Exception as e:
            self.logger.error(f"成長履歴記録エラー: user_id={user_id}, stage={new_stage}, error={e}")
            raise DatabaseError(f"成長履歴の記録に失敗しました: {e}")
    
    async def get_growth_history(self, user_id: str) -> List[GrowthHistoryItem]:
        """
        成長履歴を取得
        
        Args:
            user_id: ユーザーID
            
        Returns:
            List[GrowthHistoryItem]: 成長履歴リスト（古い順）
        """
        try:
            pk = f"USER#{user_id}"
            
            items = await self.db_client.query(
                pk,
                sk_condition="begins_with(SK, :sk_prefix)",
                expression_values={":sk_prefix": "GROWTH#"},
                scan_index_forward=True  # 古い順
            )
            
            history = []
            for item in items:
                history_item = GrowthHistoryItem(
                    stage=item["stage"],
                    stage_name=item["stage_name"],
                    achieved_at=datetime.fromisoformat(item["achieved_at"]),
                    total_characters_at_achievement=item["total_characters_at_achievement"],
                    celebration_message=item.get("celebration_message"),
                    milestone_fruit_id=item.get("milestone_fruit_id")
                )
                history.append(history_item)
            
            self.logger.info(f"成長履歴取得完了: user_id={user_id}, count={len(history)}")
            return history
            
        except Exception as e:
            self.logger.error(f"成長履歴取得エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"成長履歴の取得に失敗しました: {e}")
    
    # =====================================
    # ヘルスチェック
    # =====================================
    
    async def health_check(self) -> bool:
        """
        データベース接続ヘルスチェック
        
        Returns:
            bool: 接続が正常かどうか
        """
        try:
            # テーブル存在確認
            await self.db_client.describe_table()
            return True
            
        except Exception as e:
            self.logger.error(f"ヘルスチェック失敗: {e}")
            return False


# =====================================
# ファクトリー関数
# =====================================

def get_tree_database() -> TreeDatabase:
    """
    TreeDatabaseインスタンスを取得
    
    Returns:
        TreeDatabase: データベースクライアント
    """
    table_name = os.getenv("DYNAMODB_TABLE_NAME", "homebiyori-data")
    return TreeDatabase(table_name)
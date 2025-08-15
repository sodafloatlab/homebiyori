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
- 木情報: リアルタイム更新
- 実保存: 永続化（削除なし）
- 成長履歴: 段階変化時自動記録
- JST時刻: 日本のユーザーに最適化

■依存関係■
homebiyori-common-layer:
- DynamoDBClient: 高レベルDB操作
- Logger: 構造化ログ
- Exceptions: 統一例外処理
"""

from typing import List, Optional, Dict, Any, TYPE_CHECKING
import os
from datetime import datetime

if TYPE_CHECKING:
    from .models import FruitsListResponse

# Lambda Layers からの共通機能インポート
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import DatabaseError
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string
from homebiyori_common.utils.parameter_store import get_tree_stage

# 共通Layerからモデルをインポート
from homebiyori_common.models import (
    FruitInfo,
    AICharacterType,
    EmotionType
)

# 構造化ログ設定
logger = get_logger(__name__)

class TreeDatabase:
    """
    木の成長システム専用データベースクラス
    
    ■主要機能■
    1. 木の状態管理（成長段階、文字数、実数）
    2. 実（褒めメッセージ）の保存・取得
    """
    
    def __init__(self):
        """
    データベースクライアント初期化
    
    ■テーブル構成■
    - core: 木の状態（TREE）を保存
    - fruits: 実の情報を独立保存
    """
        # 必要なテーブル用のクライアントを初期化
        self.core_client = DynamoDBClient(os.environ["CORE_TABLE_NAME"])
        self.fruits_client = DynamoDBClient(os.environ["FRUITS_TABLE_NAME"])
        self.logger = get_logger(__name__)
    
    # =====================================
    # 木の状態管理
    # =====================================
    
    async def get_user_tree_status(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
    ユーザーの木の状態を取得（4テーブル統合対応）
    
    ■coreテーブル対応■
    - PK: USER#{user_id}, SK: TREE
    
    Args:
        user_id: ユーザーID
        
    Returns:
        Dict: 木の状態データ（存在しない場合はNone）
    """
        try:
            pk = f"USER#{user_id}"
            sk = "TREE"
            
            item = await self.core_client.get_item(pk, sk)
            
            if item:
                # JST時刻に変換
                for date_field in ["created_at", "updated_at", "last_message_date", "last_fruit_date"]:
                    if date_field in item and item[date_field]:
                        if isinstance(item[date_field], str):
                            # ISO文字列をdatetimeに変換（既にJST文字列として保存されているため、そのまま使用）
                            item[date_field] = datetime.fromisoformat(item[date_field].replace('Z', '+09:00'))
                
                self.logger.info(f"木情報取得成功: user_id={user_id}")
                return item
            
            self.logger.info(f"木情報未作成: user_id={user_id}")
            return None
            
        except Exception as e:
            self.logger.error(f"木情報取得エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"木情報の取得に失敗しました: {e}")
    
    async def create_initial_tree(self, user_id: str) -> Dict[str, Any]:
        """
        新規ユーザー用の初期木状態を作成
        
        Args:
            user_id: ユーザーID
            
        Returns:
            Dict: 作成された初期木状態
        """
        try:
            now = get_current_jst()
            
            initial_stats = {
                "PK": f"USER#{user_id}",
                "SK": "TREE",
                "user_id": user_id,
                "current_stage": 0,
                "total_characters": 0,
                "total_messages": 0,
                "total_fruits": 0,
                "created_at": to_jst_string(now),
                "updated_at": to_jst_string(now),
                "last_message_date": None,
                "last_fruit_date": None
            }
            
            await self.core_client.put_item(initial_stats)
            
            # レスポンス用にdatetime型に変換
            initial_stats["created_at"] = now
            initial_stats["updated_at"] = now
            
            self.logger.info(f"初期木情報作成完了: user_id={user_id}")
            return initial_stats
            
        except Exception as e:
            self.logger.error(f"初期木情報作成エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"初期木情報の作成に失敗しました: {e}")
    
    async def update_tree_growth(
        self, 
        user_id: str, 
        added_characters: int
    ) -> Dict[str, Any]:
        """
        木の成長を更新（文字数・段階・メッセージ数）
        
        内部で現在の累計文字数を取得し、新しい累計を計算して更新
        
        Args:
            user_id: ユーザーID
            added_characters: 追加文字数
            
        Returns:
            Dict: 更新後の成長情報
        """
        try:
            # 現在の木の状態を取得して累計文字数を算出
            current_tree_data = await self.get_user_tree_status(user_id)
            if not current_tree_data:
                raise DatabaseError(f"木の状態が存在しません: user_id={user_id}")
            
            current_total_characters = current_tree_data.get("total_characters", 0)
            new_total_characters = current_total_characters + added_characters
            
            now = get_current_jst()
            new_stage = get_tree_stage(new_total_characters)
            
            pk = f"USER#{user_id}"
            sk = "TREE"
            
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
            
            await self.core_client.update_item(
                pk, sk, 
                update_expression, 
                expression_values
            )
            
            self.logger.info(
                f"木成長更新完了: user_id={user_id}, "
                f"added={added_characters}, total={new_total_characters}, stage={new_stage}"
            )
            
            # 更新情報を返却
            return {
                "user_id": user_id,
                "added_characters": added_characters,
                "new_total_characters": new_total_characters,
                "current_stage": new_stage,
                "updated_at": to_jst_string(now)
            }
            
        except Exception as e:
            self.logger.error(f"木成長更新エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"木の成長更新に失敗しました: {e}")
    
    # =====================================
    # 実（褒めメッセージ）管理
    # =====================================
    
    async def save_fruit(self, fruit_info: FruitInfo) -> None:
        """
        実（褒めメッセージ）を保存（4テーブル統合対応）
        
        ■fruitsテーブル対応■
        - PK: USER#{user_id}, SK: FRUIT#{timestamp}
        
        Args:
            fruit_info: 実の情報
        """
        try:
            now = get_current_jst()
            timestamp_str = now.strftime("%Y-%m-%dT%H:%M:%S+09:00")
            
            item = {
                "PK": f"USER#{fruit_info.user_id}",
                "SK": f"FRUIT#{timestamp_str}",
                "fruit_id": fruit_info.fruit_id,
                "user_id": fruit_info.user_id,
                "user_message": fruit_info.user_message,
                "ai_response": fruit_info.ai_response,
                "ai_character": fruit_info.ai_character.value,
                "detected_emotion": fruit_info.detected_emotion.value,
                "interaction_mode": fruit_info.interaction_mode,
                "created_at": timestamp_str,
                # fruitsテーブルはTTL設定なし（永続保存）
            }
            
            # fruitsテーブルに保存
            await self.fruits_client.put_item(item)
            
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
            result = await self.fruits_client.query(
                pk,
                sk_condition="begins_with(SK, :sk_prefix)",
                expression_values={":sk_prefix": "FRUIT#", ":fruit_id": fruit_id},
                filter_expression="fruit_id = :fruit_id"
            )
            items = result.get("items", [])
            
            if not items:
                self.logger.warning(f"実が見つかりません: user_id={user_id}, fruit_id={fruit_id}")
                return None
            
            item = items[0]  # 最初のマッチ
            
            # FruitInfoオブジェクトに変換
            fruit_info = FruitInfo(
                fruit_id=item["fruit_id"],
                user_id=item["user_id"],
                user_message=item["user_message"],
                ai_response=item["ai_response"],
                ai_character=AICharacterType(item["ai_character"]),
                interaction_mode=item.get("interaction_mode", "praise"),
                detected_emotion=EmotionType(item["detected_emotion"]),
                created_at=item["created_at"]
            )
            
            self.logger.info(f"実詳細取得完了: user_id={user_id}, fruit_id={fruit_id}")
            return fruit_info
            
        except Exception as e:
            self.logger.error(f"実詳細取得エラー: user_id={user_id}, fruit_id={fruit_id}, error={e}")
            raise DatabaseError(f"実の詳細取得に失敗しました: {e}")
    
    async def get_fruits_list(
        self,
        user_id: str,
        filters: Dict[str, Any] = None,
        limit: int = 20,
        next_token: Optional[str] = None
    ) -> 'FruitsListResponse':
        """
        ユーザーの実一覧を取得（簡素化版）
        
        Args:
            user_id: ユーザーID
            filters: フィルター条件
            limit: 取得件数制限
            next_token: ページネーショントークン
            
        Returns:
            FruitsListResponse: 実一覧とメタデータ
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
            if filters:
                if filters.get("character"):
                    filter_conditions.append("ai_character = :character")
                    query_params["expression_values"][":character"] = filters["character"]
                
                if filters.get("emotion"):
                    filter_conditions.append("detected_emotion = :emotion")
                    query_params["expression_values"][":emotion"] = filters["emotion"]
                
                if filters.get("start_date"):
                    filter_conditions.append("created_at >= :start_date")
                    query_params["expression_values"][":start_date"] = f"{filters['start_date']}T00:00:00"
                
                if filters.get("end_date"):
                    filter_conditions.append("created_at <= :end_date")
                    query_params["expression_values"][":end_date"] = f"{filters['end_date']}T23:59:59"
            
            if filter_conditions:
                query_params["filter_expression"] = " AND ".join(filter_conditions)
            
            if next_token:
                query_params["exclusive_start_key"] = self.fruits_client._decode_pagination_token(next_token)
            
            # クエリ実行
            result = await self.fruits_client.query(**query_params)
            
            # FruitInfoオブジェクトに変換
            fruits = []
            
            for item in result["items"]:
                fruit_info = FruitInfo(
                    fruit_id=item["fruit_id"],
                    user_id=item["user_id"],
                    user_message=item["user_message"],
                    ai_response=item["ai_response"],
                    ai_character=AICharacterType(item["ai_character"]),
                    interaction_mode=item.get("interaction_mode", "praise"),
                    detected_emotion=EmotionType(item["detected_emotion"]),
                    created_at=item["created_at"]
                )
                fruits.append(fruit_info)
            
            # 木の状態からtotal_fruitsを取得
            tree_data = await self.get_user_tree_status(user_id)
            total_fruits = tree_data.get("total_fruits", 0) if tree_data else 0
            
            self.logger.info(f"実一覧取得完了: user_id={user_id}, count={len(fruits)}")
            
            # FruitsListResponseインスタンスを作成するため、遅延インポート
            from .models import FruitsListResponse
            
            return FruitsListResponse(
                items=fruits,
                total_count=total_fruits,  # 木の状態から正確な総数を取得
                next_token=result.get("next_token"),
                has_more=result.get("has_more", False)
            )
            
        except Exception as e:
            self.logger.error(f"実一覧取得エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"実一覧の取得に失敗しました: {e}")
    
    async def increment_fruit_count(self, user_id: str) -> None:
        """
        木情報の実カウントを増加
        
        Args:
            user_id: ユーザーID
        """
        try:
            now = get_current_jst()
            pk = f"USER#{user_id}"
            sk = "TREE"
            
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
            
            await self.core_client.update_item(
                pk, sk,
                update_expression,
                expression_values
            )
            
            self.logger.info(f"実カウント増加完了: user_id={user_id}")
            
        except Exception as e:
            self.logger.error(f"実カウント増加エラー: user_id={user_id}, error={e}")
            raise DatabaseError(f"実カウントの増加に失敗しました: {e}")
    
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
            # テーブル存在確認（coreテーブル）
            await self.core_client.describe_table()
            return True
            
        except Exception as e:
            self.logger.error(f"ヘルスチェック失敗: {e}")
            return False


# =====================================
# ファクトリー関数
# =====================================

_tree_database_instance = None

def get_tree_database() -> TreeDatabase:
    """
    TreeDatabaseインスタンスを取得（シングルトンパターン）
    
    Returns:
        TreeDatabase: データベースクライアント
    """
    global _tree_database_instance
    if _tree_database_instance is None:
        _tree_database_instance = TreeDatabase()
    return _tree_database_instance
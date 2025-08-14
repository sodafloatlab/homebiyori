"""
tree-service データベース操作テストスイート

■テスト項目■
[D001] 木統計CRUD操作
[D002] 実（褒めメッセージ）保存・取得
[D003] 成長履歴記録・取得
[D004] JST時刻変換機能
[D005] エラーハンドリング
[D006] テーマカラー更新
[D007] 実カウント・閲覧統計
[D008] フィルタリング機能
[D009] ページネーション
[D010] データベース接続確認
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
import pytz

# テスト対象のインポート
from backend.services.tree_service.database import TreeDatabase
from backend.services.tree_service.models import (
    TreeStage, FruitInfo, GrowthHistoryItem, TreeTheme,
    AICharacterType, EmotionType, get_current_jst, 
    calculate_tree_stage
)
from homebiyori_common.exceptions import DatabaseError, NotFoundError


class TestTreeDatabase:
    """TreeDatabase メイン機能テストクラス"""
    
    @pytest.fixture
    def mock_db_client(self):
        """DynamoDBClientのモック"""
        mock_client = AsyncMock()
        return mock_client
    
    @pytest.fixture
    def tree_db(self, mock_db_client):
        """TreeDatabaseインスタンス"""
        with patch('backend.services.tree_service.database.DynamoDBClient') as mock_client_class:
            mock_client_class.return_value = mock_db_client
            db = TreeDatabase()
            # 4テーブル構成用のモック設定
            db.core_client = mock_db_client
            db.fruits_client = mock_db_client
            db.chats_client = mock_db_client
            db.feedback_client = mock_db_client
            return db
    
    @pytest.fixture
    def sample_user_id(self):
        """テスト用ユーザーID"""
        return "test-user-789"
    
    @pytest.fixture
    def sample_fruit_data(self):
        """テスト用実データ"""
        return FruitInfo(
            fruit_id="test-fruit-456",
            user_id="test-user-789",
            message="子供と一緒に料理を作りました。とても楽しい時間でした。",
            emotion_trigger=EmotionType.JOY,
            emotion_score=0.85,
            ai_character=AICharacterType.TAMA,
            character_color=TreeTheme.WARM_PINK,
            trigger_message_id="msg_789"
        )

    # =====================================
    # D001: 木統計CRUD操作テスト
    # =====================================
    
    @pytest.mark.asyncio
    async def test_get_user_tree_stats_existing(self, tree_db, mock_db_client, sample_user_id):
        """
        [D001-1] 既存ユーザーの木統計取得成功
        """
        # モック設定
        mock_stats_data = {
            "PK": f"USER#{sample_user_id}",
            "SK": "TREE",
            "user_id": sample_user_id,
            "total_characters": 250,
            "total_messages": 8,
            "total_fruits": 3,
            "created_at": "2024-08-01T10:00:00+09:00",
            "updated_at": "2024-08-05T15:30:00+09:00",
            "last_message_date": "2024-08-05T15:30:00+09:00",
            "last_fruit_date": "2024-08-04T12:00:00+09:00"
        }
        mock_db_client.get_item.return_value = mock_stats_data
        
        # テスト実行
        result = await tree_db.get_user_tree_stats(sample_user_id)
        
        # 結果検証
        assert result is not None
        assert result["user_id"] == sample_user_id
        assert result["total_characters"] == 250
        assert result["total_messages"] == 8
        assert result["total_fruits"] == 3
        # theme_colorは削除されたため確認しない
        # assert result["theme_color"] == "warm_pink"
        
        # DynamoDBクライアント呼び出し確認
        mock_db_client.get_item.assert_called_once_with(
            f"USER#{sample_user_id}", "TREE"
        )
    
    @pytest.mark.asyncio
    async def test_get_user_tree_stats_not_found(self, tree_db, mock_db_client, sample_user_id):
        """
        [D001-2] 存在しないユーザーの木統計取得（None返却）
        """
        # モック設定（データなし）
        mock_db_client.get_item.return_value = None
        
        # テスト実行
        result = await tree_db.get_user_tree_stats(sample_user_id)
        
        # 結果検証
        assert result is None
        mock_db_client.get_item.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_initial_tree(self, tree_db, mock_db_client, sample_user_id):
        """
        [D001-3] 初期木統計作成成功
        """
        # テスト実行
        result = await tree_db.create_initial_tree(sample_user_id)
        
        # 結果検証
        assert result["user_id"] == sample_user_id
        assert result["total_characters"] == 0
        assert result["total_messages"] == 0
        assert result["total_fruits"] == 0
        # theme_colorは削除されたため確認しない
        # assert result["theme_color"] == "warm_pink"
        assert "created_at" in result
        assert "updated_at" in result
        
        # データベース保存呼び出し確認
        mock_db_client.put_item.assert_called_once()
        call_args = mock_db_client.put_item.call_args[0][0]
        assert call_args["PK"] == f"USER#{sample_user_id}"
        assert call_args["SK"] == "TREE"
    
    @pytest.mark.asyncio
    async def test_update_tree_growth(self, tree_db, mock_db_client, sample_user_id):
        """
        [D001-4] 木の成長更新成功
        """
        # テスト実行
        await tree_db.update_tree_growth(
            user_id=sample_user_id,
            added_characters=75,
            new_total_characters=325
        )
        
        # データベース更新呼び出し確認
        mock_db_client.update_item.assert_called_once()
        call_args = mock_db_client.update_item.call_args
        
        assert call_args[0][0] == f"USER#{sample_user_id}"  # PK
        assert call_args[0][1] == "TREE"              # SK
        
        # 更新式確認
        update_expression = call_args[0][2]
        expression_values = call_args[0][3]
        
        assert ":new_total" in expression_values
        assert expression_values[":new_total"] == 325
        assert expression_values[":new_stage"] == calculate_tree_stage(325)
    
    @pytest.mark.asyncio
    async def test_update_tree_theme(self, tree_db, mock_db_client, sample_user_id):
        """
        [D001-5] テーマカラー更新成功
        """
        # テスト実行
        await tree_db.update_tree_theme(sample_user_id, "cool_blue")
        
        # データベース更新呼び出し確認
        mock_db_client.update_item.assert_called_once()
        call_args = mock_db_client.update_item.call_args
        
        expression_values = call_args[0][3]
        assert expression_values[":theme"] == "cool_blue"

    # =====================================
    # D002: 実（褒めメッセージ）操作テスト
    # =====================================
    
    @pytest.mark.asyncio
    async def test_save_fruit(self, tree_db, mock_db_client, sample_fruit_data):
        """
        [D002-1] 実（褒めメッセージ）保存成功
        """
        # テスト実行
        await tree_db.save_fruit(sample_fruit_data)
        
        # データベース保存呼び出し確認
        mock_db_client.put_item.assert_called_once()
        call_args = mock_db_client.put_item.call_args[0][0]
        
        assert call_args["PK"] == f"USER#{sample_fruit_data.user_id}"
        assert call_args["SK"].startswith("FRUIT#")
        assert call_args["fruit_id"] == sample_fruit_data.fruit_id
        assert call_args["user_message"] == sample_fruit_data.message
        assert call_args["detected_emotion"] == sample_fruit_data.emotion_trigger
        assert call_args["ai_character"] == sample_fruit_data.ai_character
        # GSI削除により、GSI1PKは存在しない
        # assert call_args["view_count"] == 0
        # assert call_args["viewed_at"] is None
    
    @pytest.mark.asyncio
    async def test_get_fruit_detail_success(self, tree_db, mock_db_client, sample_fruit_data):
        """
        [D002-2] 実詳細取得成功
        """
        # モック設定
        mock_fruit_item = {
            "fruit_id": sample_fruit_data.fruit_id,
            "user_id": sample_fruit_data.user_id,
            "message": sample_fruit_data.message,
            "emotion_trigger": sample_fruit_data.emotion_trigger,
            "emotion_score": sample_fruit_data.emotion_score,
            "ai_character": sample_fruit_data.ai_character,
            "character_color": sample_fruit_data.character_color.value,
            "trigger_message_id": sample_fruit_data.trigger_message_id,
            "created_at": sample_fruit_data.created_at.isoformat(),
            "viewed_at": None,
            "view_count": 0
        }
        mock_db_client.query.return_value = {"items": [mock_fruit_item]}
        
        # テスト実行
        result = await tree_db.get_fruit_detail(
            sample_fruit_data.user_id, 
            sample_fruit_data.fruit_id
        )
        
        # 結果検証
        assert result is not None
        assert result.fruit_id == sample_fruit_data.fruit_id
        assert result.message == sample_fruit_data.message
        assert result.emotion_trigger == sample_fruit_data.emotion_trigger
        assert result.ai_character == sample_fruit_data.ai_character
        assert result.view_count == 0
        assert result.viewed_at is None
        
        # クエリ呼び出し確認
        mock_db_client.query.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_fruit_detail_not_found(self, tree_db, mock_db_client, sample_user_id):
        """
        [D002-3] 存在しない実の詳細取得（None返却）
        """
        # モック設定（データなし）
        mock_db_client.query.return_value = {"items": []}
        
        # テスト実行
        result = await tree_db.get_fruit_detail(sample_user_id, "nonexistent_fruit")
        
        # 結果検証
        assert result is None
    
    @pytest.mark.asyncio
    async def test_increment_fruit_count(self, tree_db, mock_db_client, sample_user_id):
        """
        [D002-4] 実カウント増加成功
        """
        # テスト実行
        await tree_db.increment_fruit_count(sample_user_id)
        
        # データベース更新呼び出し確認
        mock_db_client.update_item.assert_called_once()
        call_args = mock_db_client.update_item.call_args
        
        assert call_args[0][0] == f"USER#{sample_user_id}"
        assert call_args[0][1] == "TREE"
        
        expression_values = call_args[0][3]
        assert expression_values[":one"] == 1
    
    @pytest.mark.asyncio
    async def test_update_fruit_view_stats(self, tree_db, mock_db_client, sample_fruit_data):
        """
        [D002-5] 実閲覧統計更新成功
        """
        # モック設定（実検索結果）
        mock_fruit_item = {
            "SK": f"FRUIT#20240805120000#{sample_fruit_data.fruit_id}",
            "fruit_id": sample_fruit_data.fruit_id
        }
        mock_db_client.query.return_value = {"items": [mock_fruit_item]}
        
        # テスト実行
        await tree_db.update_fruit_view_stats(
            sample_fruit_data.user_id,
            sample_fruit_data.fruit_id
        )
        
        # データベース呼び出し確認
        assert mock_db_client.query.call_count == 1  # 実検索
        assert mock_db_client.update_item.call_count == 1  # 閲覧統計更新
        
        # 更新呼び出し詳細確認
        update_call_args = mock_db_client.update_item.call_args
        expression_values = update_call_args[0][3]
        assert expression_values[":one"] == 1

    # =====================================
    # D003: 成長履歴操作テスト
    # =====================================
    
    @pytest.mark.asyncio
    async def test_record_growth_achievement(self, tree_db, mock_db_client, sample_user_id):
        """
        [D003-1] 成長段階到達履歴記録成功
        """
        # テスト実行
        await tree_db.record_growth_achievement(
            user_id=sample_user_id,
            new_stage=2,
            total_characters=350
        )
        
        # データベース保存呼び出し確認
        mock_db_client.put_item.assert_called_once()
        call_args = mock_db_client.put_item.call_args[0][0]
        
        assert call_args["PK"] == f"USER#{sample_user_id}"
        assert call_args["SK"].startswith("GROWTH#02#")
        assert call_args["stage"] == 2
        assert call_args["stage_name"] == "苗"
        assert call_args["total_characters_at_achievement"] == 350
        assert "achieved_at" in call_args
    
    @pytest.mark.asyncio
    async def test_get_growth_history(self, tree_db, mock_db_client, sample_user_id):
        """
        [D003-2] 成長履歴取得成功
        """
        # モック設定
        mock_history_items = [
            {
                "stage": 1,
                "stage_name": "芽",
                "achieved_at": "2024-08-01T10:00:00+09:00",
                "total_characters_at_achievement": 100,
                "celebration_message": "小さな芽が顔を出しました",
                "milestone_fruit_id": None
            },
            {
                "stage": 2,
                "stage_name": "苗",
                "achieved_at": "2024-08-03T14:30:00+09:00",
                "total_characters_at_achievement": 350,
                "celebration_message": "青々とした若い苗に成長",
                "milestone_fruit_id": None
            }
        ]
        mock_db_client.query.return_value = {"items": mock_history_items}
        
        # テスト実行
        result = await tree_db.get_growth_history(sample_user_id)
        
        # 結果検証
        assert len(result) == 2
        assert result[0].stage == 1
        assert result[0].stage_name == "芽"
        assert result[1].stage == 2
        assert result[1].stage_name == "苗"
        
        # クエリ呼び出し確認
        mock_db_client.query.assert_called_once()

    # =====================================
    # D004: 実一覧取得・フィルタリングテスト
    # =====================================
    
    @pytest.mark.asyncio
    async def test_get_user_fruits_basic(self, tree_db, mock_db_client, sample_user_id):
        """
        [D004-1] 基本的な実一覧取得成功
        """
        # モック設定
        mock_fruits_items = [
            {
                "fruit_id": "fruit_1",
                "user_id": sample_user_id,
                "message": "楽しい公園遊び",
                "emotion_trigger": "joy",
                "emotion_score": 0.8,
                "ai_character": "mittyan",
                "character_color": "warm_pink",
                "trigger_message_id": "msg_1",
                "created_at": "2024-08-05T15:00:00+09:00",
                "viewed_at": None,
                "view_count": 0
            },
            {
                "fruit_id": "fruit_2",
                "user_id": sample_user_id,
                "message": "達成感のある一日",
                "emotion_trigger": "accomplishment",
                "emotion_score": 0.9,
                "ai_character": "madokasan",
                "character_color": "cool_blue",
                "trigger_message_id": "msg_2",
                "created_at": "2024-08-04T12:00:00+09:00",
                "viewed_at": "2024-08-04T13:00:00+09:00",
                "view_count": 2
            }
        ]
        
        mock_result = {
            "items": mock_fruits_items,
            "next_token": None,
            "has_more": False
        }
        mock_db_client.query.return_value = mock_result
        
        # テスト実行
        result = await tree_db.get_user_fruits(sample_user_id)
        
        # 結果検証
        assert len(result["items"]) == 2
        assert result["total_count"] == 2
        assert result["character_counts"]["mittyan"] == 1
        assert result["character_counts"]["madokasan"] == 1
        assert result["emotion_counts"]["joy"] == 1
        assert result["emotion_counts"]["accomplishment"] == 1
        assert result["has_more"] == False
        
        # FruitInfoオブジェクト変換確認
        fruit_1 = result["items"][0]
        assert fruit_1.fruit_id == "fruit_1"
        assert fruit_1.emotion_trigger == EmotionType.JOY
        assert fruit_1.ai_character == AICharacterType.TAMA
    
    @pytest.mark.asyncio
    async def test_get_user_fruits_with_filters(self, tree_db, mock_db_client, sample_user_id):
        """
        [D004-2] フィルター条件付き実一覧取得
        """
        # フィルター条件
        filters = {
            "character": "mittyan",
            "emotion": "joy",
            "start_date": "2024-08-01",
            "end_date": "2024-08-05"
        }
        
        mock_result = {
            "items": [],
            "next_token": None,
            "has_more": False
        }
        mock_db_client.query.return_value = mock_result
        
        # テスト実行
        await tree_db.get_user_fruits(
            user_id=sample_user_id,
            filters=filters,
            limit=10
        )
        
        # クエリ呼び出し確認
        mock_db_client.query.assert_called_once()
        call_args = mock_db_client.query.call_args[1]
        
        # フィルター条件が正しく設定されているか確認
        assert "filter_expression" in call_args
        assert "ai_character = :character" in call_args["filter_expression"]
        assert "emotion_trigger = :emotion" in call_args["filter_expression"]
        assert "created_at >= :start_date" in call_args["filter_expression"]
        assert "created_at <= :end_date" in call_args["filter_expression"]
        
        expression_values = call_args["expression_values"]
        assert expression_values[":character"] == "mittyan"
        assert expression_values[":emotion"] == "joy"

    # =====================================
    # D005: エラーハンドリングテスト
    # =====================================
    
    @pytest.mark.asyncio
    async def test_database_error_handling(self, tree_db, mock_db_client, sample_user_id):
        """
        [D005-1] データベースエラー時の例外処理
        """
        # モック設定（例外発生）
        mock_db_client.get_item.side_effect = Exception("DynamoDB connection error")
        
        # テスト実行・例外検証
        with pytest.raises(DatabaseError) as exc_info:
            await tree_db.get_user_tree_stats(sample_user_id)
        
        assert "木統計の取得に失敗しました" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_update_fruit_view_stats_not_found(self, tree_db, mock_db_client, sample_user_id):
        """
        [D005-2] 存在しない実の閲覧統計更新エラー
        """
        # モック設定（実が見つからない）
        mock_db_client.query.return_value = {"items": []}
        
        # テスト実行・例外検証
        with pytest.raises(DatabaseError) as exc_info:
            await tree_db.update_fruit_view_stats(sample_user_id, "nonexistent_fruit")
        
        assert "閲覧統計の更新に失敗しました" in str(exc_info.value)

    # =====================================
    # D006: ヘルスチェックテスト
    # =====================================
    
    @pytest.mark.asyncio
    async def test_health_check_success(self, tree_db, mock_db_client):
        """
        [D006-1] ヘルスチェック成功
        """
        # モック設定
        mock_db_client.describe_table.return_value = {"Table": {"TableStatus": "ACTIVE"}}
        
        # テスト実行
        result = await tree_db.health_check()
        
        # 結果検証
        assert result == True
        mock_db_client.describe_table.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self, tree_db, mock_db_client):
        """
        [D006-2] ヘルスチェック失敗
        """
        # モック設定（例外発生）
        mock_db_client.describe_table.side_effect = Exception("Table not found")
        
        # テスト実行
        result = await tree_db.health_check()
        
        # 結果検証
        assert result == False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
"""
tree-service Lambda テストスイート

■テスト項目■
[T001] 木の状態取得成功（初回・既存）
[T002] 木の成長更新機能
[T003] 実（褒めメッセージ）生成機能
[T004] 実一覧取得・フィルタリング
[T005] 実詳細表示・閲覧統計更新
[T006] 成長履歴取得
[T007] テーマカラー更新
[T008] 1日1回実生成制限
[T009] 不正リクエスト時のエラーハンドリング
[T010] 認証失敗時の適切な応答
"""

import pytest
import asyncio
import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

# テスト対象のインポート
from backend.services.tree_service.main import app
from homebiyori_common import get_current_user_id
from backend.services.tree_service.models import (
    TreeStatus, TreeGrowthInfo, FruitInfo, EmotionType, 
    AICharacterType, TreeTheme, get_current_jst,
    calculate_tree_stage, get_characters_to_next_stage
)
from backend.services.tree_service.database import TreeDatabase


class TestTreeService:
    """tree-service メイン機能テストクラス"""
    
    @pytest.fixture
    def client(self):
        """FastAPIテストクライアント"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_tree_database(self):
        """TreeDatabaseのモック"""
        mock_db = AsyncMock(spec=TreeDatabase)
        return mock_db
    
    @pytest.fixture
    def sample_user_id(self):
        """テスト用ユーザーID"""
        return "test-user-123"
    
    @pytest.fixture
    def sample_tree_stats(self):
        """テスト用木統計データ"""
        return {
            "user_id": "test-user-123",
            "total_characters": 150,
            "total_messages": 5,
            "total_fruits": 2,
            "theme_color": "warm_pink",
            "created_at": get_current_jst(),
            "updated_at": get_current_jst(),
            "last_message_date": get_current_jst(),
            "last_fruit_date": get_current_jst() - timedelta(hours=25)  # 昨日
        }
    
    @pytest.fixture
    def sample_fruit_info(self):
        """テスト用実データ"""
        return FruitInfo(
            user_id="test-user-123",
            message="今日は子供と一緒に公園で遊びました。楽しい時間を過ごせて良かったです。",
            emotion_trigger=EmotionType.JOY,
            emotion_score=0.8,
            ai_character=AICharacterType.TAMA,
            character_color=TreeTheme.WARM_PINK,
            trigger_message_id="msg_123"
        )
    
    @pytest.fixture
    def mock_cognito_event(self, sample_user_id):
        """Cognito認証済みイベント"""
        return {
            "requestContext": {
                "authorizer": {
                    "claims": {
                        "sub": sample_user_id,
                        "email": "test@example.com"
                    }
                }
            }
        }

    # =====================================
    # T001: 木の状態取得テスト
    # =====================================
    
    def test_get_tree_status_existing_user(self, client, mock_tree_database, sample_tree_stats, mock_cognito_event):
        """
        [T001-1] 既存ユーザーの木の状態取得成功
        """
        # モック設定
        mock_tree_database.get_user_tree_status.return_value = sample_tree_stats
        
        # FastAPI依存性オーバーライド（推奨方式）
        app.dependency_overrides[get_current_user_id] = lambda: "test-user-123"
        
        try:
            with patch('backend.services.tree_service.main.db', mock_tree_database):
                response = client.get("/api/tree/status")
        finally:
            # テスト後にクリーンアップ
            app.dependency_overrides.clear()
        
        # レスポンス検証
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == "test-user-123"
        assert data["current_stage"] == 1  # 150文字 → Stage 1
        assert data["stage_name"] == "芽"
        assert data["total_characters"] == 150
        assert data["total_messages"] == 5
        assert data["total_fruits"] == 2
        assert data["theme_color"] == "warm_pink"
        assert data["characters_to_next"] > 0
        assert 0 <= data["progress_percentage"] <= 100
    
    @patch('backend.services.tree_service.main.get_tree_database')
    def test_get_tree_status_not_initialized(self, mock_get_db, client, mock_tree_database, mock_cognito_event):
        """
        [T001-2] 新規ユーザー（未初期化）のGETリクエスト - 404エラー
        """
        # モック設定（既存データなし）
        mock_get_db.return_value = mock_tree_database
        mock_tree_database.get_user_tree_status.return_value = None
        
        # FastAPI依存性オーバーライド
        app.dependency_overrides[get_current_user_id] = lambda: "new-user-456"
        
        try:
            response = client.get("/api/tree/status")
        finally:
            app.dependency_overrides.clear()
        
        # レスポンス検証（404エラーが期待される）
        assert response.status_code == 404
        data = response.json()
        assert "初期化" in data["detail"]
    
    def test_initialize_tree_status_new_user(self, client, mock_tree_database):
        """
        [T001-3] 新規ユーザーの木初期化（PUT API）
        """
        # モック設定
        mock_tree_database.get_user_tree_status.return_value = None  # 未初期化
        
        initial_stats = {
            "user_id": "new-user-456",
            "current_stage": 0,
            "total_characters": 0,
            "total_messages": 0,
            "total_fruits": 0,
            "last_message_date": None,
            "last_fruit_date": None,
            "created_at": "2024-08-14T12:00:00+09:00",
            "updated_at": "2024-08-14T12:00:00+09:00"
        }
        mock_tree_database.create_initial_tree.return_value = initial_stats
        
        # FastAPI依存性オーバーライド
        app.dependency_overrides[get_current_user_id] = lambda: "new-user-456"
        
        try:
            with patch('backend.services.tree_service.main.db', mock_tree_database):
                response = client.put("/api/tree/status")
        finally:
            app.dependency_overrides.clear()
        
        # レスポンス検証
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == "new-user-456"
        assert data["current_stage"] == 0  # 初期段階
        assert data["total_characters"] == 0
        assert data["total_messages"] == 0
        assert data["total_fruits"] == 0
    
    def test_initialize_tree_status_already_exists(self, client, mock_tree_database, sample_tree_stats):
        """
        [T001-4] 既に初期化済みユーザーの木初期化（PUT API） - 409エラー
        """
        # モック設定（既に存在する）
        mock_tree_database.get_user_tree_status.return_value = sample_tree_stats
        
        # FastAPI依存性オーバーライド
        app.dependency_overrides[get_current_user_id] = lambda: "test-user-123"
        
        try:
            with patch('backend.services.tree_service.main.db', mock_tree_database):
                response = client.put("/api/tree/status")
        finally:
            app.dependency_overrides.clear()
        
        # レスポンス検証（409エラーが期待される）
        assert response.status_code == 409
        data = response.json()
        assert "既に初期化" in data["detail"]

    # =====================================
    # T002: 木の成長更新テスト
    # =====================================
    
    @patch('backend.services.tree_service.main.get_tree_database')
    def test_update_tree_growth_success(self, mock_get_db, client, mock_tree_database, sample_tree_stats):
        """
        [T002-1] 木の成長更新成功（段階変化なし）
        """
        # モック設定
        mock_get_db.return_value = mock_tree_database
        mock_tree_database.get_user_tree_status.return_value = sample_tree_stats
        
        # FastAPI依存性オーバーライド
        app.dependency_overrides[get_current_user_id] = lambda: "test-user-123"
        
        try:
            response = client.post("/api/tree/update-growth?added_characters=50")
        finally:
            app.dependency_overrides.clear()
        
        # レスポンス検証
        assert response.status_code == 200
        data = response.json()
        
        assert data["previous_stage"] == 1  # 150文字 → Stage 1
        assert data["current_stage"] == 1   # 200文字 → Stage 1 (段階変化なし)
        assert data["previous_total"] == 150
        assert data["current_total"] == 200
        assert data["added_characters"] == 50
        assert data["stage_changed"] == False
        assert data["characters_to_next"] > 0
        assert data["growth_celebration"] is None
        
        # データベース更新呼び出し確認
        mock_tree_database.update_tree_growth.assert_called_once_with(
            user_id="test-user-123",
            added_characters=50,
            new_total_characters=200
        )
    
    @patch('backend.services.tree_service.main.get_tree_database')
    def test_update_tree_growth_stage_change(self, mock_get_db, client, mock_tree_database):
        """
        [T002-2] 木の成長更新成功（段階変化あり）
        """
        # 段階変化するケース：250文字 → 350文字 (Stage 1 → Stage 2)
        current_stats = {
            "user_id": "test-user-123",
            "total_characters": 250,
            "total_messages": 8,
            "total_fruits": 1
        }
        
        mock_get_db.return_value = mock_tree_database
        mock_tree_database.get_user_tree_stats.return_value = current_stats
        
        # リクエスト実行
        with patch('backend.services.tree_service.main.get_user_id') as mock_get_user:
            mock_get_user.return_value = "test-user-123"
            
            response = client.post("/api/tree/update-growth?added_characters=100")
        
        # レスポンス検証
        assert response.status_code == 200
        data = response.json()
        
        assert data["previous_stage"] == 1  # Stage 1 (芽)
        assert data["current_stage"] == 2   # Stage 2 (苗)
        assert data["stage_changed"] == True
        assert data["growth_celebration"] is not None
        assert "苗" in data["growth_celebration"]  # お祝いメッセージに段階名が含まれる
        
        # 成長履歴記録呼び出し確認
        mock_tree_database.record_growth_achievement.assert_called_once_with(
            user_id="test-user-123",
            new_stage=2,
            total_characters=350
        )
    
    def test_update_tree_growth_invalid_characters(self, client):
        """
        [T002-3] 不正な文字数での成長更新エラー
        """
        with patch('backend.services.tree_service.main.get_user_id') as mock_get_user:
            mock_get_user.return_value = "test-user-123"
            
            # ゼロ以下の文字数
            response = client.post("/api/tree/update-growth?added_characters=0")
            assert response.status_code == 400
            
            # 負の文字数
            response = client.post("/api/tree/update-growth?added_characters=-10")
            assert response.status_code == 400

    # =====================================
    # T003: 実生成テスト
    # =====================================
    
    @patch('backend.services.tree_service.main.get_tree_database')
    def test_generate_fruit_success(self, mock_get_db, client, mock_tree_database, sample_tree_stats):
        """
        [T003-1] 実生成成功
        """
        # 1日1回制限をクリア（昨日の実）
        sample_tree_stats["last_fruit_date"] = get_current_jst() - timedelta(hours=25)
        
        mock_get_db.return_value = mock_tree_database
        mock_tree_database.get_user_tree_status.return_value = sample_tree_stats
        
        request_data = {
            "message": "今日は子供と公園で楽しく遊びました",
            "emotion": "joy",
            "emotion_score": 0.8,
            "ai_character": "mittyan",
            "trigger_message_id": "msg_123"
        }
        
        # リクエスト実行
        with patch('backend.services.tree_service.main.get_user_id') as mock_get_user:
            mock_get_user.return_value = "test-user-123"
            
            response = client.post("/api/tree/generate-fruit", json=request_data)
        
        # レスポンス検証
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == "test-user-123"
        assert data["message"] == request_data["message"]
        assert data["emotion_trigger"] == "joy"
        assert data["emotion_score"] == 0.8
        assert data["ai_character"] == "mittyan"
        assert data["character_color"] == "warm_pink"
        assert data["trigger_message_id"] == "msg_123"
        assert "fruit_id" in data
        
        # データベース保存呼び出し確認
        mock_tree_database.save_fruit.assert_called_once()
        mock_tree_database.increment_fruit_count.assert_called_once_with("test-user-123")
    
    @patch('backend.services.tree_service.main.get_tree_database')
    def test_generate_fruit_daily_limit(self, mock_get_db, client, mock_tree_database, sample_tree_stats):
        """
        [T003-2] 1日1回制限による実生成拒否
        """
        # 1時間前に実を生成済み
        sample_tree_stats["last_fruit_date"] = get_current_jst() - timedelta(hours=1)
        
        mock_get_db.return_value = mock_tree_database
        mock_tree_database.get_user_tree_status.return_value = sample_tree_stats
        
        request_data = {
            "message": "テストメッセージ",
            "emotion": "joy",
            "emotion_score": 0.7,
            "ai_character": "mittyan"
        }
        
        # リクエスト実行
        with patch('backend.services.tree_service.main.get_user_id') as mock_get_user:
            mock_get_user.return_value = "test-user-123"
            
            response = client.post("/api/tree/generate-fruit", json=request_data)
        
        # エラーレスポンス検証
        assert response.status_code == 429
        data = response.json()
        assert "1日1回まで" in data["detail"]
        
        # データベース保存が呼ばれていないことを確認
        mock_tree_database.save_fruit.assert_not_called()

    # =====================================
    # T004: 実一覧取得テスト
    # =====================================
    
    @patch('backend.services.tree_service.main.get_tree_database')
    def test_get_fruits_list_success(self, mock_get_db, client, mock_tree_database):
        """
        [T004-1] 実一覧取得成功
        """
        # モック実データ
        mock_fruits = [
            FruitInfo(
                fruit_id="fruit_1",
                user_id="test-user-123",
                message="楽しい公園遊び",
                emotion_trigger=EmotionType.JOY,
                emotion_score=0.8,
                ai_character=AICharacterType.TAMA,
                character_color=TreeTheme.WARM_PINK
            ),
            FruitInfo(
                fruit_id="fruit_2",
                user_id="test-user-123",
                message="達成感のある一日",
                emotion_trigger=EmotionType.ACCOMPLISHMENT,
                emotion_score=0.9,
                ai_character=AICharacterType.MADOKA,
                character_color=TreeTheme.COOL_BLUE
            )
        ]
        
        mock_fruits_data = {
            "items": mock_fruits,
            "total_count": 2,
            "character_counts": {"mittyan": 1, "madokasan": 1},
            "emotion_counts": {"joy": 1, "accomplishment": 1},
            "next_token": None,
            "has_more": False
        }
        
        mock_get_db.return_value = mock_tree_database
        mock_tree_database.get_user_fruits_list.return_value = mock_fruits_data
        
        # リクエスト実行
        with patch('backend.services.tree_service.main.get_user_id') as mock_get_user:
            mock_get_user.return_value = "test-user-123"
            
            response = client.get("/api/tree/fruits?limit=10")
        
        # レスポンス検証
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["fruits"]) == 2
        assert data["total_count"] == 2
        assert data["character_counts"]["mittyan"] == 1
        assert data["character_counts"]["madokasan"] == 1
        assert data["emotion_counts"]["joy"] == 1
        assert data["emotion_counts"]["accomplishment"] == 1
        assert data["has_more"] == False

    # =====================================
    # T005: 実詳細表示テスト
    # =====================================
    
    @patch('backend.services.tree_service.main.get_tree_database')
    def test_get_fruit_detail_success(self, mock_get_db, client, mock_tree_database, sample_fruit_info):
        """
        [T005-1] 実詳細表示成功
        """
        mock_get_db.return_value = mock_tree_database
        mock_tree_database.get_fruit_detail.return_value = sample_fruit_info
        
        # リクエスト実行
        with patch('backend.services.tree_service.main.get_user_id') as mock_get_user:
            mock_get_user.return_value = "test-user-123"
            
            response = client.get("/api/tree/fruits/fruit_123")
        
        # レスポンス検証
        assert response.status_code == 200
        data = response.json()
        
        assert data["fruit_info"]["fruit_id"] == sample_fruit_info.fruit_id
        assert data["fruit_info"]["message"] == sample_fruit_info.message
        assert data["character_info"]["name"] == "たまさん"
        assert data["character_info"]["theme_color"] == "warm_pink"
        assert "is_new_view" in data
        
        # 閲覧統計更新呼び出し確認
        mock_tree_database.update_fruit_view_stats.assert_called_once_with(
            "test-user-123", "fruit_123"
        )
    
    @patch('backend.services.tree_service.main.get_tree_database')
    def test_get_fruit_detail_not_found(self, mock_get_db, client, mock_tree_database):
        """
        [T005-2] 存在しない実の詳細表示エラー
        """
        mock_get_db.return_value = mock_tree_database
        mock_tree_database.get_fruit_detail.return_value = None
        
        # リクエスト実行
        with patch('backend.services.tree_service.main.get_user_id') as mock_get_user:
            mock_get_user.return_value = "test-user-123"
            
            response = client.get("/api/tree/fruits/nonexistent_fruit")
        
        # エラーレスポンス検証
        assert response.status_code == 404
        data = response.json()
        assert "実が見つかりません" in data["detail"]

    # =====================================
    # T006: テーマカラー更新テスト
    # =====================================
    
    @patch('backend.services.tree_service.main.get_tree_database')
    def test_update_tree_theme_success(self, mock_get_db, client, mock_tree_database, sample_tree_stats):
        """
        [T006-1] テーマカラー更新成功
        """
        # 更新後のデータ
        updated_stats = sample_tree_stats.copy()
        updated_stats["theme_color"] = "cool_blue"
        
        mock_get_db.return_value = mock_tree_database
        mock_tree_database.get_user_tree_stats.return_value = updated_stats
        
        # リクエスト実行
        with patch('backend.services.tree_service.main.get_user_id') as mock_get_user:
            mock_get_user.return_value = "test-user-123"
            
            response = client.put("/api/tree/theme?theme_color=cool_blue")
        
        # レスポンス検証
        assert response.status_code == 200
        data = response.json()
        assert data["theme_color"] == "cool_blue"
        
        # データベース更新呼び出し確認
        mock_tree_database.update_tree_theme.assert_called_once_with(
            "test-user-123", "cool_blue"
        )

    # =====================================
    # T007: 認証エラーテスト
    # =====================================
    
    def test_unauthorized_access(self, client):
        """
        [T007-1] 認証失敗時の適切なエラー応答
        """
        # 認証なしでアクセス
        with patch('backend.services.tree_service.main.get_user_id') as mock_get_user:
            mock_get_user.side_effect = Exception("認証が必要です")
            
            response = client.get("/api/tree/status")
            assert response.status_code == 401


class TestTreeModels:
    """tree-service モデル・ユーティリティ関数テスト"""
    
    def test_calculate_tree_stage(self):
        """成長段階計算のテスト"""
        assert calculate_tree_stage(0) == 0     # 種
        assert calculate_tree_stage(50) == 0    # 種
        assert calculate_tree_stage(100) == 1   # 芽
        assert calculate_tree_stage(250) == 1   # 芽
        assert calculate_tree_stage(300) == 2   # 苗
        assert calculate_tree_stage(500) == 2   # 苗
        assert calculate_tree_stage(600) == 3   # 若木
        assert calculate_tree_stage(1000) == 4  # 成木
        assert calculate_tree_stage(1500) == 5  # 大木
        assert calculate_tree_stage(2000) == 5  # 大木（最高段階）
    
    def test_get_characters_to_next_stage(self):
        """次段階まで必要文字数計算のテスト"""
        assert get_characters_to_next_stage(50) == 50   # 100 - 50 = 50
        assert get_characters_to_next_stage(250) == 50  # 300 - 250 = 50  
        assert get_characters_to_next_stage(1500) == 0  # 最高段階は0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
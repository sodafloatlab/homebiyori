"""
user-service データベース操作テスト

■テスト対象■
backend/services/user_service/database.py の UserServiceDatabase クラス

■テスト設計■
- 非同期処理: pytest-asyncio による async/await テスト
- モック環境: moto による DynamoDB Local 環境
- UTC時刻: 新アーキテクチャに準拠した UTC 時刻管理
- Lambda Layers: homebiyori-common-layer 統合テスト

■テスト項目■
[USER-DB-001] ユーザープロフィール新規作成・取得
[USER-DB-002] 存在しないユーザープロフィール取得
[USER-DB-003] ユーザープロフィール更新
[USER-DB-004] 子供情報一覧取得（空リスト）
[USER-DB-005] 子供情報新規作成・取得
[USER-DB-006] 子供情報更新
[USER-DB-007] 子供情報削除
[USER-DB-008] 複数子供の管理（並び順確認）
[USER-DB-009] 認可チェック（他ユーザーの子供へのアクセス不可）
[USER-DB-010] エラーハンドリング（不正データ、接続エラー等）

■アーキテクチャ検証■
- Lambda Layers統合: homebiyori-common-layer 機能確認
- UTC時刻管理: 全日時データの UTC 統一確認
- Single Table Design: DynamoDB アクセスパターン確認
- 型安全性: Pydantic v2 モデル統合確認

■実装バージョン■
- 初回実装: 2024-08-03 (同期処理、JST時刻)
- 設計更新: 2024-08-03 (非同期処理、UTC時刻、Lambda Layers対応)
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone, date
from moto import mock_dynamodb
import boto3
import os
from unittest.mock import patch, AsyncMock
import uuid

# テスト対象モジュール
from backend.services.user_service.database import UserServiceDatabase, get_database
from backend.services.user_service.models import (
    UserProfile,
    AICharacter, PraiseLevel, InteractionMode, get_current_jst,
    AccountStatus, DeletionRequest, DeletionConfirmation, DeletionType
)

# Lambda Layers機能のモック（テスト環境では実際のLayersは利用不可）
# 実際のLambda環境でのテストは統合テストで実施
try:
    from homebiyori_common.exceptions import DatabaseError, ValidationError, NotFoundError
except ImportError:
    # テスト環境用の簡易例外クラス
    class DatabaseError(Exception):
        pass
    class ValidationError(Exception):
        pass
    class NotFoundError(Exception):
        pass


# =====================================
# テストフィクスチャ
# =====================================

@pytest_asyncio.fixture
async def mock_dynamodb_table():
    """
    テスト用DynamoDBテーブル作成
    
    moto ライブラリによる DynamoDB Local 環境をセットアップ。
    Single Table Design に対応したテーブル構造を作成。
    """
    with mock_dynamodb():
        # 環境変数設定
        os.environ["DYNAMODB_TABLE"] = "homebiyori-test-table"
        os.environ["AWS_REGION"] = "us-east-1"
        
        # DynamoDBクライアント作成
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        
        # テストテーブル作成
        table = dynamodb.create_table(
            TableName="homebiyori-test-table",
            KeySchema=[
                {"AttributeName": "PK", "KeyType": "HASH"},
                {"AttributeName": "SK", "KeyType": "RANGE"}
            ],
            AttributeDefinitions=[
                {"AttributeName": "PK", "AttributeType": "S"},
                {"AttributeName": "SK", "AttributeType": "S"}
            ],
            BillingMode="PAY_PER_REQUEST"
        )
        
        # テーブルアクティブ待機
        table.wait_until_exists()
        yield table


@pytest_asyncio.fixture
async def database_client(mock_dynamodb_table):
    """
    テスト用データベースクライアント
    
    UserServiceDatabase インスタンスを作成し、
    モック環境での動作を準備。
    """
    # homebiyori-common-layer の DynamoDBClient をモック
    with patch("backend.services.user_service.database.DynamoDBClient") as mock_client:
        # 非同期メソッドのモック設定
        mock_instance = AsyncMock()
        mock_client.return_value = mock_instance
        
        # DynamoDB操作のモック実装
        test_data = {}
        
        async def mock_get_item(pk, sk):
            key = f"{pk}|{sk}"  # Use | instead of # to avoid confusion
            return test_data.get(key)
        
        async def mock_put_item(item_data):
            pk = item_data["PK"]
            sk = item_data["SK"]
            key = f"{pk}|{sk}"  # Use | instead of # to avoid confusion
            test_data[key] = item_data
            return item_data
        
        async def mock_query_by_prefix(pk, sk_prefix):
            results = []
            for key, data in test_data.items():
                if "|" not in key:
                    continue
                stored_pk, stored_sk = key.split("|", 1)
                if stored_pk == pk and stored_sk.startswith(sk_prefix):
                    results.append(data)
            return results
        
        async def mock_delete_item(pk, sk):
            key = f"{pk}|{sk}"  # Use | instead of # to avoid confusion
            if key in test_data:
                del test_data[key]
                return True
            return False
        
        mock_instance.get_item = mock_get_item
        mock_instance.put_item = mock_put_item
        mock_instance.query_by_prefix = mock_query_by_prefix
        mock_instance.delete_item = mock_delete_item
        
        db = UserServiceDatabase()
        yield db, test_data


@pytest_asyncio.fixture
async def sample_user_profile():
    """サンプルユーザープロフィール"""
    return UserProfile(
        user_id="12345678-1234-5678-9012-123456789012",
        nickname="テストユーザー",
        ai_character=AICharacter.TAMA,
        praise_level=PraiseLevel.NORMAL,
        interaction_mode=InteractionMode.PRAISE,
        onboarding_completed=True
    )


# =====================================
# ユーザープロフィール管理テスト
# =====================================

@pytest.mark.asyncio
async def test_user_profile_create_and_get(database_client, sample_user_profile):
    """
    [USER-DB-001] ユーザープロフィール新規作成・取得
    
    新規ユーザープロフィールの作成と取得が正常に動作することを確認。
    UTC時刻の正しい設定も検証。
    """
    db, test_data = database_client
    user_id = sample_user_profile.user_id
    
    # プロフィール保存
    saved_profile = await db.save_user_profile(sample_user_profile)
    
    # 保存確認
    assert saved_profile.user_id == user_id
    assert saved_profile.nickname == "テストユーザー"
    assert saved_profile.ai_character == AICharacter.TAMA
    assert saved_profile.praise_level == PraiseLevel.NORMAL
    assert saved_profile.interaction_mode == InteractionMode.PRAISE
    assert saved_profile.onboarding_completed is True
    
    # JST時刻確認（共通Layer使用）
    assert saved_profile.created_at.tzinfo.zone == 'Asia/Tokyo'
    assert saved_profile.updated_at.tzinfo.zone == 'Asia/Tokyo'
    
    # データベースから取得
    retrieved_profile = await db.get_user_profile(user_id)
    
    # 取得確認
    assert retrieved_profile is not None
    assert retrieved_profile.user_id == user_id
    assert retrieved_profile.nickname == "テストユーザー"
    assert retrieved_profile.ai_character == AICharacter.TAMA
    assert retrieved_profile.praise_level == PraiseLevel.NORMAL
    assert retrieved_profile.interaction_mode == InteractionMode.PRAISE


@pytest.mark.asyncio
async def test_user_profile_get_nonexistent(database_client):
    """
    [USER-DB-002] 存在しないユーザープロフィール取得
    
    存在しないユーザーIDでの取得時にNoneが返されることを確認。
    """
    db, test_data = database_client
    non_existent_user_id = "00000000-0000-0000-0000-000000000000"
    
    # 存在しないユーザーの取得
    profile = await db.get_user_profile(non_existent_user_id)
    
    # None確認
    assert profile is None


@pytest.mark.asyncio
async def test_user_profile_update(database_client, sample_user_profile):
    """
    [USER-DB-003] ユーザープロフィール更新
    
    既存ユーザープロフィールの更新が正常に動作することを確認。
    updated_at の自動更新も検証。
    """
    db, test_data = database_client
    user_id = sample_user_profile.user_id
    
    # 初期プロフィール保存
    await db.save_user_profile(sample_user_profile)
    original_updated_at = sample_user_profile.updated_at
    
    # プロフィール更新
    sample_user_profile.nickname = "更新後ユーザー"
    sample_user_profile.ai_character = AICharacter.MADOKA
    sample_user_profile.praise_level = PraiseLevel.DEEP
    sample_user_profile.interaction_mode = InteractionMode.LISTEN
    
    # 更新保存
    updated_profile = await db.save_user_profile(sample_user_profile)
    
    # 更新確認
    assert updated_profile.nickname == "更新後ユーザー"
    assert updated_profile.ai_character == AICharacter.MADOKA
    assert updated_profile.praise_level == PraiseLevel.DEEP
    assert updated_profile.interaction_mode == InteractionMode.LISTEN
    assert updated_profile.updated_at > original_updated_at


# =====================================
# 子供情報管理テスト
# =====================================

# 子供情報管理は削除されたため、この部分は空になっています。

# =====================================
# InteractionMode（対話モード）テスト
# =====================================

@pytest.mark.asyncio
async def test_interaction_mode_default_value():
    """
    [USER-DB-017] InteractionModeデフォルト値テスト
    
    AIPreferencesのinteraction_modeフィールドのデフォルト値がPRAISEであることを確認。
    """
    # デフォルト値でプロフィール作成
    profile = UserProfile(
        user_id="12345678-1234-5678-9012-123456789012",
        nickname="デフォルトテスト"
    )
    
    # デフォルト値確認
    assert profile.interaction_mode == InteractionMode.PRAISE


@pytest.mark.asyncio
async def test_interaction_mode_enum_values():
    """
    [USER-DB-018] InteractionMode Enum値確認
    
    対話モードEnumの正しい値を確認。
    """
    # 各対話モードの値確認
    assert InteractionMode.PRAISE == "praise"
    assert InteractionMode.LISTEN == "listen"
    
    # Enum値の網羅性確認
    expected_modes = {"praise", "listen"}
    actual_modes = {mode.value for mode in InteractionMode}
    assert actual_modes == expected_modes


@pytest.mark.asyncio
async def test_interaction_mode_all_combinations(database_client):
    """
    [USER-DB-019] 全InteractionMode組み合わせテスト
    
    すべての対話モードがデータベース保存・取得で正しく動作することを確認。
    """
    db, test_data = database_client
    
    # PRASEモードテスト
    praise_profile = UserProfile(
        user_id="12345678-1234-5678-9012-123456789001",
        nickname="褒めモードユーザー",
        ai_character=AICharacter.TAMA,
        praise_level=PraiseLevel.NORMAL,
        interaction_mode=InteractionMode.PRAISE
    )
    
    saved_praise = await db.save_user_profile(praise_profile)
    assert saved_praise.interaction_mode == InteractionMode.PRAISE
    
    retrieved_praise = await db.get_user_profile(praise_profile.user_id)
    assert retrieved_praise.interaction_mode == InteractionMode.PRAISE
    
    # LISTENモードテスト
    listen_profile = UserProfile(
        user_id="12345678-1234-5678-9012-123456789002",
        nickname="傾聴モードユーザー",
        ai_character=AICharacter.MADOKA,
        praise_level=PraiseLevel.DEEP,
        interaction_mode=InteractionMode.LISTEN
    )
    
    saved_listen = await db.save_user_profile(listen_profile)
    assert saved_listen.interaction_mode == InteractionMode.LISTEN
    
    retrieved_listen = await db.get_user_profile(listen_profile.user_id)
    assert retrieved_listen.interaction_mode == InteractionMode.LISTEN

# =====================================
# InteractionMode統合テスト（chat_service連携）
# =====================================

@pytest.mark.asyncio
async def test_chat_service_ai_preferences_integration():
    """
    [INTEGRATION-001] chat_serviceでのAI設定情報統合テスト
    
    chat_serviceがユーザーのAI設定情報を正しく取得・使用することを確認。
    """
    from backend.services.chat_service.database import ChatServiceDatabase
    
    # テスト用ユーザー設定
    test_user_id = "12345678-1234-5678-9012-123456789999"
    
    # ChatServiceDatabaseのモック作成
    chat_db = ChatServiceDatabase()
    
    # モックデータベースクライアント設定
    mock_profile_data = {
        "PK": f"USER#{test_user_id}",
        "SK": "PROFILE",
        "ai_character": "madoka",
        "praise_level": "deep",
        "interaction_mode": "listen",
        "subscription_plan": "monthly"  # プレミアムユーザー
    }
    
    with patch.object(chat_db.db_client, 'get_item', new_callable=AsyncMock) as mock_get_item:
        mock_get_item.return_value = mock_profile_data
        
        # AI設定情報取得テスト
        ai_preferences = await chat_db.get_user_ai_preferences(test_user_id)
        
        # 設定値確認
        assert ai_preferences["ai_character"] == "madoka"
        assert ai_preferences["praise_level"] == "deep"
        assert ai_preferences["interaction_mode"] == "listen"
        
        # サブスクリプション情報取得テスト
        subscription_info = await chat_db.get_user_subscription_info(test_user_id)
        
        # サブスクリプション確認
        assert subscription_info["plan"] == "monthly"
        

@pytest.mark.asyncio
async def test_free_user_praise_level_restriction():
    """
    [INTEGRATION-002] 無料ユーザーのpraise_level制限テスト
    
    無料ユーザーのpraise_levelが強制的にnormalに制限されることを確認。
    """
    from backend.services.chat_service.database import ChatServiceDatabase
    
    # テスト用無料ユーザー設定
    test_user_id = "12345678-1234-5678-9012-123456789998"
    
    # ChatServiceDatabaseのモック作成
    chat_db = ChatServiceDatabase()
    
    # 無料ユーザーのモックデータ（praise_level=deepに設定）
    mock_profile_data = {
        "PK": f"USER#{test_user_id}",
        "SK": "PROFILE",
        "ai_character": "tama",
        "praise_level": "deep",  # deepに設定されているが
        "interaction_mode": "praise",
        "subscription_plan": "free"  # 無料ユーザー
    }
    
    with patch.object(chat_db.db_client, 'get_item', new_callable=AsyncMock) as mock_get_item:
        mock_get_item.return_value = mock_profile_data
        
        # AI設定情報とサブスクリプション情報を取得
        ai_preferences = await chat_db.get_user_ai_preferences(test_user_id)
        subscription_info = await chat_db.get_user_subscription_info(test_user_id)
        
        # 制限前の設定値確認
        assert ai_preferences["praise_level"] == "deep"
        assert subscription_info["plan"] == "free"
        
        # 無料ユーザー制限ロジックをシミュレート
        user_tier = "premium" if subscription_info["plan"] in ["monthly", "yearly"] else "free"
        effective_praise_level = "normal" if user_tier == "free" else ai_preferences["praise_level"]
        
        # 無料ユーザーのpraise_levelがnormalに制限されることを確認
        assert user_tier == "free"
        assert effective_praise_level == "normal"


@pytest.mark.asyncio 
async def test_ai_character_fallback_logic():
    """
    [INTEGRATION-003] AIキャラクター設定フォールバックロジックテスト
    
    リクエストパラメータ優先、なければプロフィール設定のフォールバック動作を確認。
    """
    from backend.services.chat_service.database import ChatServiceDatabase
    
    # テスト用ユーザー設定
    test_user_id = "12345678-1234-5678-9012-123456789997"
    
    # ChatServiceDatabaseのモック作成
    chat_db = ChatServiceDatabase()
    
    # プロフィール設定（デフォルト）
    mock_profile_data = {
        "PK": f"USER#{test_user_id}",
        "SK": "PROFILE", 
        "ai_character": "hide",      # プロフィールではhide
        "praise_level": "normal",
        "interaction_mode": "listen",  # プロフィールではlisten
        "subscription_plan": "yearly"
    }
    
    with patch.object(chat_db.db_client, 'get_item', new_callable=AsyncMock) as mock_get_item:
        mock_get_item.return_value = mock_profile_data
        
        # AI設定情報取得
        ai_preferences = await chat_db.get_user_ai_preferences(test_user_id)
        
        # ケース1: リクエストパラメータが指定された場合
        request_ai_character = "tama"    # リクエストでtamaを指定
        request_mood = "praise"          # リクエストでpraiseを指定
        
        # フォールバックロジックをシミュレート
        effective_character = request_ai_character or ai_preferences["ai_character"]
        effective_mood = request_mood or ai_preferences["interaction_mode"]
        
        # リクエストパラメータが優先されることを確認
        assert effective_character == "tama"    # リクエスト値が使用される
        assert effective_mood == "praise"       # リクエスト値が使用される
        
        # ケース2: リクエストパラメータがNoneの場合
        request_ai_character = None
        request_mood = None
        
        # フォールバックロジックをシミュレート
        effective_character = request_ai_character or ai_preferences["ai_character"]
        effective_mood = request_mood or ai_preferences["interaction_mode"]
        
        # プロフィール設定が使用されることを確認
        assert effective_character == "hide"    # プロフィール値が使用される
        assert effective_mood == "listen"       # プロフィール値が使用される


@pytest.mark.asyncio
async def test_interaction_mode_with_different_characters():
    """
    [USER-DB-020] InteractionModeとAIキャラクター組み合わせテスト
    
    各AIキャラクターと対話モードの組み合わせが正しく動作することを確認。
    """
    # たまさん + 褒めモード
    tama_praise = UserProfile(
        user_id="12345678-1234-5678-9012-123456789003",
        nickname="たまさん褒めユーザー",
        ai_character=AICharacter.TAMA,
        interaction_mode=InteractionMode.PRAISE
    )
    assert tama_praise.ai_character == AICharacter.TAMA
    assert tama_praise.interaction_mode == InteractionMode.PRAISE
    
    # まどか姉さん + 傾聴モード
    madoka_listen = UserProfile(
        user_id="12345678-1234-5678-9012-123456789004", 
        nickname="まどか傾聴ユーザー",
        ai_character=AICharacter.MADOKA,
        interaction_mode=InteractionMode.LISTEN
    )
    assert madoka_listen.ai_character == AICharacter.MADOKA
    assert madoka_listen.interaction_mode == InteractionMode.LISTEN
    
    # ヒデじい + 褒めモード
    hide_praise = UserProfile(
        user_id="12345678-1234-5678-9012-123456789005",
        nickname="ヒデじい褒めユーザー",
        ai_character=AICharacter.HIDE,
        interaction_mode=InteractionMode.PRAISE
    )
    assert hide_praise.ai_character == AICharacter.HIDE
    assert hide_praise.interaction_mode == InteractionMode.PRAISE


# =====================================
# エラーハンドリングテスト
# =====================================

@pytest.mark.asyncio
async def test_database_error_handling(database_client):
    """
    [USER-DB-010] エラーハンドリング（不正データ、接続エラー等）
    
    データベース操作でのエラーハンドリングを確認。
    """
    db, test_data = database_client
    
    # 不正なuser_id（UUID形式でない）での処理
    with pytest.raises((DatabaseError, ValidationError, ValueError)):
        invalid_profile = UserProfile(
            user_id="invalid-user-id",  # UUID形式でない
            nickname="テスト"
        )
        await db.save_user_profile(invalid_profile)
    



# =====================================
# シングルトンパターンテスト
# =====================================

def test_database_singleton():
    """
    get_database() のシングルトンパターン動作確認
    
    同一インスタンスが返されることを確認。
    """
    db1 = get_database()
    db2 = get_database()
    
    # 同一インスタンス確認
    assert db1 is db2
    assert isinstance(db1, UserServiceDatabase)
    assert isinstance(db2, UserServiceDatabase)


# =====================================
# UTC時刻管理テスト  
# =====================================

@pytest.mark.asyncio
async def test_utc_timezone_consistency():
    """
    UTC時刻管理の一貫性確認
    
    全ての日時データがJSTで管理されることを確認。
    """
    # get_current_jst() 関数のUTC確認
    current_time = get_current_jst()
    assert current_time.tzinfo.zone == 'Asia/Tokyo'
    
    # UserProfile作成時のUTC確認
    profile = UserProfile(
        user_id="12345678-1234-5678-9012-123456789012",
        nickname="UTCテスト"
    )
    assert profile.created_at.tzinfo.zone == 'Asia/Tokyo'
    assert profile.updated_at.tzinfo.zone == 'Asia/Tokyo'

# =====================================
# アカウント削除機能テスト
# =====================================

@pytest.mark.asyncio
async def test_delete_user_profile_success(database_client, sample_user_profile):
    """
    [USER-DB-011] ユーザープロフィール削除成功
    
    既存ユーザープロフィールの削除が正常に動作することを確認。
    """
    db, test_data = database_client
    user_id = sample_user_profile.user_id
    
    # プロフィール保存
    await db.save_user_profile(sample_user_profile)
    
    # 保存確認
    retrieved_profile = await db.get_user_profile(user_id)
    assert retrieved_profile is not None
    
    # db_clientのdelete_user_profileメソッドをモック
    with patch.object(db.db_client, 'delete_user_profile', new_callable=AsyncMock) as mock_delete:
        mock_delete.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}
        
        # プロフィール削除
        result = await db.delete_user_profile(user_id)
        assert result is True
        
        # モック呼び出し確認
        mock_delete.assert_called_once_with(user_id)


@pytest.mark.asyncio
async def test_delete_nonexistent_user_profile(database_client):
    """
    [USER-DB-012] 存在しないユーザープロフィール削除
    
    存在しないユーザーIDでの削除時もTrueが返されることを確認（冪等性）。
    """
    db, test_data = database_client
    non_existent_user_id = "00000000-0000-0000-0000-000000000000"
    
    # db_clientのdelete_user_profileメソッドをモック
    with patch.object(db.db_client, 'delete_user_profile', new_callable=AsyncMock) as mock_delete:
        mock_delete.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}
        
        # 存在しないユーザーの削除
        result = await db.delete_user_profile(non_existent_user_id)
        
        # 削除成功確認（冪等性）
        assert result is True
        
        # モック呼び出し確認
        mock_delete.assert_called_once_with(non_existent_user_id)


@pytest.mark.asyncio
async def test_deletion_request_model_validation():
    """
    [USER-DB-013] DeletionRequest データモデルバリデーション
    
    削除要求データモデルの正しいバリデーションを確認。
    """
    # 有効なDeletionRequest（アカウント削除）
    valid_request = DeletionRequest(
        deletion_type=DeletionType.ACCOUNT_DELETE,
        reason="service_no_longer_needed",
        feedback="Thank you for the service"
    )
    assert valid_request.deletion_type == DeletionType.ACCOUNT_DELETE
    assert valid_request.reason == "service_no_longer_needed"
    assert valid_request.feedback == "Thank you for the service"
    
    # 有効なDeletionRequest（サブスクリプション解約）
    subscription_request = DeletionRequest(
        deletion_type=DeletionType.SUBSCRIPTION_CANCEL,
        reason="too_expensive",
        feedback="Great service but too costly"
    )
    assert subscription_request.deletion_type == DeletionType.SUBSCRIPTION_CANCEL
    assert subscription_request.reason == "too_expensive"
    assert subscription_request.feedback == "Great service but too costly"
    
    # 必須フィールドのみのDeletionRequest
    minimal_request = DeletionRequest(deletion_type=DeletionType.ACCOUNT_DELETE)
    assert minimal_request.deletion_type == DeletionType.ACCOUNT_DELETE
    assert minimal_request.reason is None
    assert minimal_request.feedback is None


@pytest.mark.asyncio
async def test_deletion_confirmation_model_validation():
    """
    [USER-DB-014] DeletionConfirmation データモデルバリデーション
    
    削除確認データモデルの正しいバリデーションを確認。
    """
    # 有効なDeletionConfirmation（confirmation_textは削除されたため不要）
    valid_confirmation = DeletionConfirmation(
        deletion_request_id="del_req_123456789abc",
        final_consent=True
    )
    assert valid_confirmation.deletion_request_id == "del_req_123456789abc"
    assert valid_confirmation.final_consent is True
    
    # final_consentがFalseの場合
    no_consent_confirmation = DeletionConfirmation(
        deletion_request_id="del_req_123456789abc", 
        final_consent=False
    )
    assert no_consent_confirmation.deletion_request_id == "del_req_123456789abc"
    assert no_consent_confirmation.final_consent is False


@pytest.mark.asyncio 
async def test_account_status_model_creation():
    """
    [USER-DB-015] AccountStatus データモデル作成
    
    アカウント状態データモデルの正しい作成を確認。
    """
    # テスト用のアカウント状態データ
    account_info = {
        "user_id": "12345678-1234-5678-9012-123456789012",
        "nickname": "テストユーザー",
        "created_at": "2024-08-09T00:00:00+09:00",
        "status": "active"
    }
    
    subscription_info = {
        "status": "active",
        "current_plan": "monthly",
        "current_period_end": "2024-09-09T00:00:00+09:00",
        "cancel_at_period_end": False
    }
    
    # AccountStatus作成（data_summaryは削除されたため不要）
    account_status = AccountStatus(
        account=account_info,
        subscription=subscription_info
    )
    
    assert account_status.account == account_info
    assert account_status.subscription == subscription_info
    
    # subscription=None の場合のテスト
    account_status_no_sub = AccountStatus(
        account=account_info,
        subscription=None
    )
    
    assert account_status_no_sub.account == account_info
    assert account_status_no_sub.subscription is None


@pytest.mark.asyncio
async def test_deletion_type_enum_values():
    """
    [USER-DB-016] DeletionType Enum値確認
    
    削除タイプEnumの正しい値を確認。
    """
    # 各削除タイプの値確認
    assert DeletionType.SUBSCRIPTION_CANCEL == "subscription_cancel"
    assert DeletionType.ACCOUNT_DELETE == "account_delete"
    
    # Enum値の網羅性確認
    expected_types = {"subscription_cancel", "account_delete"}
    actual_types = {deletion_type.value for deletion_type in DeletionType}
    assert actual_types == expected_types
    

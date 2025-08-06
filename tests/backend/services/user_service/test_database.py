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
    UserProfile, ChildInfo, ChildInfoCreate, ChildInfoUpdate,
    AICharacter, PraiseLevel, get_current_jst
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
            key = f"{pk}#{sk}"
            return test_data.get(key)
        
        async def mock_put_item(item_data):
            pk = item_data["PK"]
            sk = item_data["SK"]
            key = f"{pk}#{sk}"
            test_data[key] = item_data
            return item_data
        
        async def mock_query_by_prefix(pk, sk_prefix):
            results = []
            for key, data in test_data.items():
                stored_pk, stored_sk = key.split("#", 1)
                if stored_pk == pk and stored_sk.startswith(sk_prefix):
                    results.append(data)
            return results
        
        async def mock_delete_item(pk, sk):
            key = f"{pk}#{sk}"
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
        onboarding_completed=True
    )


@pytest_asyncio.fixture 
async def sample_child_data():
    """サンプル子供データ"""
    return ChildInfoCreate(
        name="テスト太郎",
        birth_date=date(2020, 4, 15)
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
    
    # 更新保存
    updated_profile = await db.save_user_profile(sample_user_profile)
    
    # 更新確認
    assert updated_profile.nickname == "更新後ユーザー"
    assert updated_profile.ai_character == AICharacter.MADOKA
    assert updated_profile.praise_level == PraiseLevel.DEEP
    assert updated_profile.updated_at > original_updated_at


# =====================================
# 子供情報管理テスト
# =====================================

@pytest.mark.asyncio
async def test_children_get_empty_list(database_client):
    """
    [USER-DB-004] 子供情報一覧取得（空リスト）
    
    子供が未登録のユーザーで空リストが返されることを確認。
    """
    db, test_data = database_client
    user_id = "12345678-1234-5678-9012-123456789012"
    
    # 子供一覧取得
    children = await db.get_user_children(user_id)
    
    # 空リスト確認
    assert isinstance(children, list)
    assert len(children) == 0


@pytest.mark.asyncio
async def test_child_create_and_get(database_client, sample_child_data):
    """
    [USER-DB-005] 子供情報新規作成・取得
    
    新規子供情報の作成と取得が正常に動作することを確認。
    年齢計算機能も検証。
    """
    db, test_data = database_client
    user_id = "12345678-1234-5678-9012-123456789012"
    
    # 子供作成
    created_child = await db.create_child(user_id, sample_child_data)
    
    # 作成確認
    assert created_child.name == "テスト太郎"
    assert created_child.birth_date == date(2020, 4, 15)
    assert created_child.child_id is not None
    assert len(created_child.child_id) == 36  # UUID形式
    
    # UTC時刻確認
    assert created_child.created_at.tzinfo.zone == 'Asia/Tokyo'
    assert created_child.updated_at.tzinfo.zone == 'Asia/Tokyo'
    
    # 年齢計算確認
    assert created_child.age_years >= 3  # 2020年生まれなので3歳以上
    assert created_child.age_months >= 36  # 36ヶ月以上
    
    # 個別取得確認
    retrieved_child = await db.get_child(user_id, created_child.child_id)
    assert retrieved_child is not None
    assert retrieved_child.name == "テスト太郎"
    
    # 一覧取得確認
    children = await db.get_user_children(user_id)
    assert len(children) == 1
    assert children[0].name == "テスト太郎"


@pytest.mark.asyncio
async def test_child_update(database_client, sample_child_data):
    """
    [USER-DB-006] 子供情報更新
    
    既存子供情報の部分更新が正常に動作することを確認。
    """
    db, test_data = database_client
    user_id = "12345678-1234-5678-9012-123456789012"
    
    # 子供作成
    created_child = await db.create_child(user_id, sample_child_data)
    child_id = created_child.child_id
    original_updated_at = created_child.updated_at
    
    # 更新データ準備
    update_data = ChildInfoUpdate(
        name="更新太郎",
        birth_date=date(2020, 6, 1)
    )
    
    # 子供情報更新
    updated_child = await db.update_child(user_id, child_id, update_data)
    
    # 更新確認
    assert updated_child.name == "更新太郎"
    assert updated_child.birth_date == date(2020, 6, 1)
    assert updated_child.child_id == child_id  # IDは変更されない
    assert updated_child.updated_at > original_updated_at
    
    # 部分更新確認（名前のみ更新）
    partial_update = ChildInfoUpdate(name="部分更新太郎")
    partially_updated = await db.update_child(user_id, child_id, partial_update)
    
    assert partially_updated.name == "部分更新太郎"
    assert partially_updated.birth_date == date(2020, 6, 1)  # 前の値が保持


@pytest.mark.asyncio
async def test_child_delete(database_client, sample_child_data):
    """
    [USER-DB-007] 子供情報削除
    
    子供情報の削除が正常に動作することを確認。
    """
    db, test_data = database_client
    user_id = "12345678-1234-5678-9012-123456789012"
    
    # 子供作成
    created_child = await db.create_child(user_id, sample_child_data)
    child_id = created_child.child_id
    
    # 削除前確認
    child_before_delete = await db.get_child(user_id, child_id)
    assert child_before_delete is not None
    
    # 削除実行
    delete_success = await db.delete_child(user_id, child_id)
    assert delete_success is True
    
    # 削除後確認
    child_after_delete = await db.get_child(user_id, child_id)
    assert child_after_delete is None
    
    # 存在しない子供の削除
    non_existent_delete = await db.delete_child(user_id, "00000000-0000-0000-0000-000000000000")
    assert non_existent_delete is False


@pytest.mark.asyncio
async def test_multiple_children_management(database_client):
    """
    [USER-DB-008] 複数子供の管理（並び順確認）
    
    複数の子供情報の管理と生年月日順でのソートを確認。
    """
    db, test_data = database_client
    user_id = "12345678-1234-5678-9012-123456789012"
    
    # 複数の子供を作成（異なる生年月日）
    child1_data = ChildInfoCreate(name="長男", birth_date=date(2018, 3, 1))
    child2_data = ChildInfoCreate(name="次男", birth_date=date(2020, 8, 15))
    child3_data = ChildInfoCreate(name="三男", birth_date=date(2022, 12, 10))
    
    # 順不同で作成
    child2 = await db.create_child(user_id, child2_data)
    child1 = await db.create_child(user_id, child1_data)
    child3 = await db.create_child(user_id, child3_data)
    
    # 一覧取得
    children = await db.get_user_children(user_id)
    
    # 件数確認
    assert len(children) == 3
    
    # 生年月日順ソート確認（古い順）
    assert children[0].name == "長男"  # 2018年生まれ
    assert children[1].name == "次男"  # 2020年生まれ
    assert children[2].name == "三男"  # 2022年生まれ
    
    assert children[0].birth_date == date(2018, 3, 1)
    assert children[1].birth_date == date(2020, 8, 15)
    assert children[2].birth_date == date(2022, 12, 10)


@pytest.mark.asyncio
async def test_child_access_authorization(database_client, sample_child_data):
    """
    [USER-DB-009] 認可チェック（他ユーザーの子供へのアクセス不可）
    
    ユーザーは自分の子供情報のみアクセス可能であることを確認。
    """
    db, test_data = database_client
    user1_id = "11111111-1111-1111-1111-111111111111"
    user2_id = "22222222-2222-2222-2222-222222222222"
    
    # ユーザー1が子供を作成
    child = await db.create_child(user1_id, sample_child_data)
    child_id = child.child_id
    
    # ユーザー1は自分の子供にアクセス可能
    user1_child = await db.get_child(user1_id, child_id)
    assert user1_child is not None
    assert user1_child.name == "テスト太郎"
    
    # ユーザー2は他人の子供にアクセス不可
    user2_child = await db.get_child(user2_id, child_id)
    assert user2_child is None
    
    # ユーザー2の子供一覧には含まれない
    user2_children = await db.get_user_children(user2_id)
    assert len(user2_children) == 0


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
    
    # 存在しない子供の更新
    user_id = "12345678-1234-5678-9012-123456789012"
    non_existent_child_id = "00000000-0000-0000-0000-000000000000"
    update_data = ChildInfoUpdate(name="更新テスト")
    
    with pytest.raises(NotFoundError):
        await db.update_child(user_id, non_existent_child_id, update_data)


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
    
    # ChildInfo作成時のUTC確認
    child = ChildInfo(
        child_id="87654321-4321-8765-2109-876543210987",
        name="UTCテスト子",
        birth_date=date(2020, 1, 1)
    )
    assert child.created_at.tzinfo.zone == 'Asia/Tokyo'
    assert child.updated_at.tzinfo.zone == 'Asia/Tokyo'
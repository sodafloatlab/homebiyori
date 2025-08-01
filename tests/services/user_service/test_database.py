# データベース操作のテスト (test_database.py)
#
# ■役割
# このファイルは、`backend/services/user_service/database.py`内の関数が
# 正しく動作するかを検証するためのテストコードを記述します。

# --- テスト項目一覧 ---
# [DATABASE-001] ユーザープロフィールの新規作成が成功すること
# [DATABASE-002] 作成したユーザープロフィールを正しく取得できること
# [DATABASE-003] 存在しないユーザーIDで取得した場合、Noneが返ること
# [DATABASE-004] 既存のユーザープロフィールを正しく更新できること
# [DATABASE-005] 作成・更新日時のタイムゾーンがJSTになっていること

# --- 非同期テストについて ---
# @pytest.mark.asyncio という目印をつけている理由:
# FastAPIは非同期処理を前提としたフレームワークであり、APIエンドポイントは
# `async def`で定義されます。そのため、テストコードもアプリケーションの
# 実行環境に合わせて非同期で記述するのが自然です。
# `pytest-asyncio`プラグインがこの目印を認識し、非同期関数を
# 正しくテスト実行してくれます。

import pytest
from datetime import datetime
from moto import mock_aws

# テスト対象のモジュールをインポート

@mock_aws
def test_create_and_get_user_profile(setup_test_table):
    """
    [DATABASE-001], [DATABASE-002], [DATABASE-005]
    ユーザープロフィールの新規作成と取得、タイムゾーンの検証を行います。
    """
    from backend.services.user_service import database
    from backend.services.user_service.models import UserProfile, JST
    # 1. 準備 (Arrange)
    user_id = "test-user-001"
    test_profile = UserProfile(user_id=user_id, nickname="テスト太郎")

    # 2. 実行 (Act)
    created = database.create_or_update_user_profile(test_profile)
    retrieved = database.get_user_profile(user_id)

    # 3. 検証 (Assert)
    assert created is not None
    assert retrieved is not None
    assert retrieved.user_id == user_id
    assert retrieved.nickname == "テスト太郎"
    assert retrieved.onboarding_completed is False
    # タイムゾーンがJSTになっていることを確認
    assert retrieved.created_at.tzinfo == JST
    assert retrieved.updated_at.tzinfo == JST

@mock_aws
def test_get_non_existent_user(setup_test_table):
    """
    [DATABASE-003]
    存在しないユーザーを取得しようとした場合に、Noneが返ることをテストします。
    """
    from backend.services.user_service import database
    # 1. 準備 (Arrange)
    user_id = "non-existent-user"

    # 2. 実行 (Act)
    retrieved = database.get_user_profile(user_id)

    # 3. 検証 (Assert)
    assert retrieved is None

@mock_aws
def test_update_user_profile(setup_test_table):
    """
    [DATABASE-004]
    既存のユーザープロフィールの更新が正しく行えるかをテストします。
    """
    from backend.services.user_service import database
    from backend.services.user_service.models import UserProfile
    # 1. 準備 (Arrange)
    user_id = "test-user-002"
    # まずは初期データを作成
    initial_profile = UserProfile(user_id=user_id, nickname="更新前ニックネーム")
    database.create_or_update_user_profile(initial_profile)
    
    # 更新用データを用意
    profile_to_update = UserProfile(
        user_id=user_id, 
        nickname="更新後ニックネーム", 
        onboarding_completed=True
    )

    # 2. 実行 (Act)
    updated = database.create_or_update_user_profile(profile_to_update)
    retrieved = database.get_user_profile(user_id)

    # 3. 検証 (Assert)
    assert updated is not None
    assert retrieved is not None
    assert retrieved.nickname == "更新後ニックネーム"
    assert retrieved.onboarding_completed is True
    # created_atは更新されず、updated_atが更新されていることを確認
    assert retrieved.updated_at > retrieved.created_at

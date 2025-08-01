# pytest設定ファイル (conftest.py)
#
# ■役割
# このファイルは、テスト全体で共有する設定や準備処理を定義するための特別なファイルです。
# ここに定義した「フィクスチャ」と呼ばれる関数は、各テストコードから呼び出して利用できます。
#
# ■フィクスチャとは？
# テストを実行する前の「準備」と、テストが終わった後の「後片付け」を自動化する仕組みです。
# 例えば、「テスト用データベースに接続する」「テストデータを投入する」といった準備をフィクスチャとして定義しておけば、
# 複数のテストコードでその準備処理を使い回すことができます。

import pytest
import os
import boto3
from moto import mock_aws

# --- フィクスチャの定義 ---

@pytest.fixture(scope="function")
def aws_credentials():
    """テスト用のAWS認証情報を環境変数に設定します。"""
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"
    os.environ["AWS_DEFAULT_REGION"] = "ap-northeast-1" # 東京リージョン

@pytest.fixture(scope="function")
def mock_dynamodb_resource(monkeypatch, aws_credentials):
    """
    motoライブラリを使い、DynamoDBをメモリ上でシミュレート(モック)します。
    これにより、実際のAWSに接続せずにテストを実行できます。
    `yield`キーワードで、このフィクスチャを使うテストの間だけモックが有効になります。
    """
    with mock_aws():
        mock_resource = boto3.resource("dynamodb", region_name="ap-northeast-1")
        monkeypatch.setattr(boto3, "resource", lambda service_name, **kwargs: mock_resource if service_name == "dynamodb" else boto3.resource(service_name, **kwargs))
        yield mock_resource

@pytest.fixture(scope="function")
def setup_test_table(mock_dynamodb_resource):
    """
    テスト用のDynamoDBテーブルを作成し、テスト終了後に削除します。
    テストで使うテーブル名を環境変数に設定する役割も担います。
    """
    table_name = "homebiyori-data-test"
    os.environ["DYNAMODB_TABLE"] = table_name

    table = mock_dynamodb_resource.create_table(
        TableName=table_name,
        KeySchema=[
            {'AttributeName': 'PK', 'KeyType': 'HASH'},
            {'AttributeName': 'SK', 'KeyType': 'RANGE'}
        ],
        AttributeDefinitions=[
            {'AttributeName': 'PK', 'AttributeType': 'S'},
            {'AttributeName': 'SK', 'AttributeType': 'S'}
        ],
        BillingMode='PAY_PER_REQUEST'
    )
    
    # テストコード本体へテーブルオブジェクトを渡す
    yield table

    # テスト終了後にテーブルを削除 (yieldより後の処理が後片付けに相当します)
    table.delete()

# --- フィクスチャの呼び出し方サンプル ---
#
# 実際のテストコード(例: tests/services/user_service/test_database.py)では、
# 以下のようにテスト関数の引数にフィクスチャ名を指定するだけで、準備処理が自動で実行されます。
#
# def test_user_profile_creation(setup_test_table):
#     """
#     ユーザープロフィールが正しく作成されるかをテストする関数の例
#     
#     引数に `setup_test_table` を指定するだけで、以下の準備が整った状態でテストが始まります。
#     1. AWSのダミー認証情報が設定される (aws_credentialsフィクスチャ)
#     2. メモリ上に偽のDynamoDBが用意される (dynamodb_mockフィクスチャ)
#     3. その中にテスト用のテーブルが作成される (setup_test_tableフィクスチャ)
#     """
#     
#     # `setup_test_table` が準備してくれたテーブルを使ってテストを実行
#     from backend.services.user_service.database import create_or_update_user_profile
#     from backend.services.user_service.models import UserProfile
#
#     # 1. 準備 (Arrange)
#     test_user = UserProfile(user_id="test-user-01", nickname="テストユーザー")
#
#     # 2. 実行 (Act)
#     created_profile = create_or_update_user_profile(test_user)
#
#     # 3. 検証 (Assert)
#     assert created_profile is not None
#     assert created_profile.nickname == "テストユーザー"
#
#     # このテストが終わると、`setup_test_table` の後片付け処理が実行され、
#     # 作成されたテーブルは自動的に削除されます。

# DynamoDB操作 (database.py)
#
# ■役割
# このファイルは、データベース(DynamoDB)に関する全ての処理をまとめる場所です。
# データの取得、保存、更新、削除といった操作を関数として定義し、
# アプリケーションの他の部分から呼び出せるようにします。
#
# ■このファイルを分離するメリット
# 1. 関心の分離: APIのロジックとデータベース操作を分離し、コードを整理します。
# 2. 再利用性: 同じデータベース操作を複数の場所から呼び出せるようになります。
# 3. テストの容易性: データベース部分をモックに差し替えてテストしやすくなります。

import os
import boto3
from boto3.dynamodb.conditions import Key
from datetime import datetime

# internal import
from .models import UserProfile, get_now_jst

# DynamoDBクライアントの初期化
# 環境変数からテーブル名を取得します。
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get("DYNAMODB_TABLE", "homebiyori-data")
table = dynamodb.Table(table_name)

def get_user_profile(user_id: str) -> UserProfile | None:
    """
    指定されたuser_idに対応するユーザープロフィールをDynamoDBから取得します。

    Args:
        user_id: 取得したいユーザーのID (Cognito sub)

    Returns:
        UserProfile: 見つかったユーザー情報。見つからない場合はNone。
    """
    response = table.get_item(
        Key={
            'PK': f"USER#{user_id}",
            'SK': 'PROFILE'
        }
    )
    item = response.get('Item')
    if item:
        return UserProfile(**item)
    return None

def create_or_update_user_profile(profile: UserProfile) -> UserProfile:
    """
    ユーザープロフィールをDynamoDBに作成または更新します。

    Args:
        profile: 保存するユーザープロフィール情報。

    Returns:
        UserProfile: 保存後のユーザープロフィール情報。
    """
    # 更新日時を現在のJST時刻に設定
    profile.updated_at = get_now_jst()

    # PydanticモデルをDynamoDBが受け入れられる辞書形式に変換
    # datetimeオブジェクトはISO 8601形式の文字列に変換します。
    item_to_save = profile.model_dump()
    item_to_save['created_at'] = profile.created_at.isoformat()
    item_to_save['updated_at'] = profile.updated_at.isoformat()

    # DynamoDBのパーティションキー(PK)とソートキー(SK)を設定
    item_to_save['PK'] = f"USER#{profile.user_id}"
    item_to_save['SK'] = 'PROFILE'

    table.put_item(Item=item_to_save)

    return profile

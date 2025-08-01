# Pydanticモデル (models.py)
#
# ■役割
# このファイルは、アプリケーションで扱うデータの「設計図」を定義します。
# Pydanticを使い、データの型やルールを厳密に決めることで、プログラムの安全性を高めます。
#
# ■タイムゾーンについて
# このシステムでは、全ての時刻情報をJST(日本標準時)で統一します。
# Pythonのdatetimeライブラリを使い、タイムゾーンをUTC+9時間に設定して扱います。

from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta

# JST(日本標準時)のタイムゾーンを定義 (UTC+9)
JST = timezone(timedelta(hours=9))

# 現在のJST時刻を取得するための関数
# Pydanticモデルのデフォルト値として使用します。
def get_now_jst():
    return datetime.now(JST)

# UserProfileモデル
# ユーザーのプロフィール情報を表現するための設計図です。
class UserProfile(BaseModel):
    """
    ユーザープロフィール情報のデータ構造を定義します。
    APIリクエストのボディや、データベースのレコードとしてこのモデルを使用します。
    """
    # ユーザーID (必須)
    # Cognitoから発行される一意の識別子(sub)を保存します。
    user_id: str

    # ニックネーム (任意)
    # オンボーディングが完了するまでは存在しないため、None(空)を許容します。
    nickname: str | None = None

    # オンボーディング完了フラグ (デフォルトはFalse)
    # ユーザーが初期設定を完了したかを示すフラグです。
    onboarding_completed: bool = False

    # アカウント作成日時 (デフォルトは現在のJST時刻)
    # データ作成時に自動で現在のJST時刻が入ります。
    created_at: datetime = Field(default_factory=get_now_jst)

    # アカウント更新日時 (デフォルトは現在のJST時刻)
    # データ作成時・更新時に自動で現在のJST時刻が入ります。
    updated_at: datetime = Field(default_factory=get_now_jst)

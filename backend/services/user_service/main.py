# FastAPIアプリケーション (main.py)
#
# ■役割
# このファイルは、user-serviceのAPIエンドポイントを定義する中心的なファイルです。
# FastAPIフレームワークを使い、各URLへのリクエストに対してどの処理を実行するかを決定します。
#
# ■主な処理
# 1. FastAPIアプリケーションの初期化
# 2. APIエンドポイント(ルート)の定義 (例: /api/users/profile)
# 3. リクエストデータの検証 (Pydanticモデルを利用)
# 4. データベース操作の呼び出し (database.pyの関数を利用)
# 5. 処理結果をレスポンスとしてクライアントに返却

from fastapi import FastAPI, HTTPException, Depends
from typing import Dict

# internal imports
from . import database
from .models import UserProfile

# --- 認証機能 (仮) ---
# 本来はAPI GatewayとCognito Authorizerから渡される認証情報を利用します。
# ここでは開発初期段階として、固定のユーザーIDを返すダミー関数を定義します。
# TODO: 最終的にCognitoと連携した認証デコレータに置き換える。
async def get_current_user_id() -> str:
    """ダミーの認証関数。固定のユーザーIDを返す。"""
    return "dummy-user-id-12345"

# --- FastAPIアプリケーション本体 ---
app = FastAPI()

@app.get("/api/users/profile", response_model=UserProfile)
async def get_my_profile(user_id: str = Depends(get_current_user_id)):
    """
    現在認証されているユーザーのプロフィール情報を取得します。
    ユーザーIDは認証情報から自動的に取得されます。
    """
    profile = database.get_user_profile(user_id)
    if not profile:
        # プロフィールが存在しない場合は404エラーを返す
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@app.put("/api/users/profile", response_model=UserProfile)
async def update_my_profile(profile_update: UserProfile, user_id: str = Depends(get_current_user_id)):
    """
    現在認証されているユーザーのプロフィール情報を更新します。
    リクエストボディで受け取った情報でプロフィールを更新・作成します。
    """
    # 認証されたユーザーIDをリクエストデータに設定し、なりすましを防ぐ
    profile_update.user_id = user_id
    
    updated_profile = database.create_or_update_user_profile(profile_update)
    return updated_profile

# オンボーディング完了のためのエンドポイント
@app.post("/api/users/complete-onboarding", response_model=UserProfile)
async def complete_onboarding(nickname_data: Dict[str, str], user_id: str = Depends(get_current_user_id)):
    """
    ユーザーのオンボーディングを完了させます。
    主にニックネームの初期登録を行います。
    """
    nickname = nickname_data.get('nickname')
    if not nickname:
        raise HTTPException(status_code=400, detail="Nickname is required")

    # 既存のプロフィールを取得、なければ新規作成
    profile = database.get_user_profile(user_id)
    if not profile:
        profile = UserProfile(user_id=user_id)
    
    # ニックネームを設定し、オンボーディングを完了済みにする
    profile.nickname = nickname
    profile.onboarding_completed = True

    updated_profile = database.create_or_update_user_profile(profile)
    return updated_profile

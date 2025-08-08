"""
user-service Lambda FastAPIアプリケーション

■システム概要■
Homebiyori（ほめびより）のユーザー管理マイクロサービス。
ユーザープロフィール、AI設定を行う。

■アーキテクチャ■
- AWS Lambda (Python 3.11)
- FastAPI + Mangum
- Lambda Layers: homebiyori-common-layer使用
- 認証: API Gateway + Cognito Authorizer
- データストア: DynamoDB 7テーブル構成 (prod-homebiyori-users)

■設計原則■
- プライバシーファースト: 個人情報永続化最小限
- API Gateway認証統合: JWT検証は Gateway で実施
- Lambda Layers活用: 共通機能の再利用
- GEMINI.md準拠: 包括的コメントによる保守性確保

■エンドポイント構造■
- GET /users/profile - ユーザープロフィール取得
- PUT /users/profile - ユーザープロフィール更新
- PUT /users/ai-preferences - AI設定更新

■データモデル■
ユーザープロフィール:
- user_id: Cognito sub (UUID)
- nickname: 表示名
- ai_character: 選択AIキャラクター
- praise_level: 褒めレベル設定
- onboarding_completed: 初期設定完了フラグ

■セキュリティ■
- 認証: API Gateway + Cognito Authorizer (JWT)
- 認可: ユーザー自身のデータのみアクセス可能
- 入力検証: Pydantic v2による厳密なバリデーション
- プライバシー: 個人情報の最小限保存

■監視・ログ■
- 構造化ログ: homebiyor_common.logger使用
- CloudWatch統合: Lambda実行ログとエラートラッキング
- メンテナンス連携: Parameter Store経由での停止制御

■依存関係■
- homebiyori-common-layer: auth, database, logger, exceptions
- API Gateway: 認証とルーティング
- DynamoDB: ユーザーデータ永続化
- Parameter Store: メンテナンス設定

■実装バージョン■
- 初回実装: 2024-08-03 (デモ版)
- 設計更新: 2024-08-03 (Lambda Layers + design.md準拠)
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from typing import List
import os

# Lambda Layers からの共通機能インポート
# homebiyori-common-layer が提供する機能を活用
from homebiyori_common.auth import get_user_id_from_event
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import (
    ValidationError,
    AuthenticationError,
    DatabaseError,
    MaintenanceError,
)
from homebiyori_common.maintenance import check_maintenance_mode

# ローカルモジュール
from .models import (
    UserProfile,
    AIPreferences,
    UserProfileUpdate,
)
from .database import get_database

# 構造化ログ設定
# CloudWatch統合による高度な監視とデバッグ機能
logger = get_logger(__name__)

# データベースクライアント取得
# UserServiceDatabaseクラスを使用してユーザーサービス固有の操作を提供
db = get_database()

# FastAPIアプリケーション初期化
# プロダクション環境でのパフォーマンス最適化設定
app = FastAPI(
    title="Homebiyori User Service",
    description="ユーザー管理マイクロサービス - プロフィール、AI設定",
    version="1.0.0",
    docs_url=None if os.getenv("ENVIRONMENT") == "prod" else "/docs",  # 本番では無効化
    redoc_url=None if os.getenv("ENVIRONMENT") == "prod" else "/redoc",
)

# =====================================
# ミドルウェア・共通処理
# =====================================


@app.middleware("http")
async def maintenance_check_middleware(request: Request, call_next):
    """
    メンテナンス状態チェックミドルウェア

    全APIリクエストに対してメンテナンス状態を確認し、
    メンテナンス中の場合は503エラーを返却する。

    ■処理フロー■
    1. Parameter Store からメンテナンス状態取得
    2. メンテナンス中の場合、503エラーレスポンス返却
    3. 通常時は次の処理に継続

    ■例外処理■
    - Parameter Store接続エラー: 処理継続（可用性優先）
    - メンテナンス設定不正: 処理継続（フェイルセーフ）
    """
    try:
        check_maintenance_mode()
        response = await call_next(request)
        return response
    except MaintenanceError as e:
        logger.warning(
            "API blocked due to maintenance mode",
            extra={"maintenance_message": str(e), "request_path": request.url.path},
        )
        return JSONResponse(
            status_code=503,
            content={
                "error": "MAINTENANCE_MODE",
                "message": str(e),
                "status": "maintenance",
            },
        )
    except Exception as e:
        logger.error(
            "Maintenance check failed, allowing request",
            extra={"error": str(e), "request_path": request.url.path},
        )
        response = await call_next(request)
        return response


def get_authenticated_user_id(request: Request) -> str:
    """
    API Gateway + Cognito AuthorizerからユーザーID取得

    ■認証フロー■
    1. API Gateway が Cognito JWT を検証
    2. 検証成功時、JWT Claims を Lambda event に付与
    3. homebiyori_common.auth.get_user_id_from_event() でユーザーID抽出

    ■戻り値■
    str: Cognito User Pool の sub (UUID形式)

    ■例外■
    - AuthenticationError: JWT無効・期限切れ
    - ValidationError: event構造不正

    ■プライバシー保護■
    この関数で取得するuser_idは、API Gateway経由で一時的に取得される
    Cognito subであり、個人情報ではない。永続化は最小限に留める。
    """
    try:
        # FastAPI Request から Lambda event を取得
        # API Gateway Proxyインテグレーションの場合、request.scope["aws.event"] に格納
        event = request.scope.get("aws.event")
        if not event:
            logger.error("Lambda event not found in request scope")
            raise AuthenticationError("Authentication context missing")

        user_id = get_user_id_from_event(event)
        logger.debug(
            "User authenticated successfully",
            extra={
                "user_id": user_id[:8] + "****",  # プライバシー保護のためマスク
                "request_path": request.url.path,
            },
        )
        return user_id

    except Exception as e:
        logger.error(
            "Authentication failed",
            extra={"error": str(e), "request_path": request.url.path},
        )
        raise AuthenticationError("User authentication failed")


# =====================================
# ユーザープロフィール管理エンドポイント
# =====================================


@app.get("/users/profile", response_model=UserProfile)
async def get_user_profile(request: Request):
    """
    現在認証されているユーザーのプロフィール情報取得

    ■機能概要■
    - ユーザープロフィール（ニックネーム、AI設定等）を返却
    - 存在しない場合はデフォルトプロフィールを返却
    - オンボーディング状態も含めて返却

    ■認証・認可■
    - 認証: API Gateway + Cognito Authorizer
    - 認可: 自分自身のプロフィールのみアクセス可能

    ■レスポンス■
    - 200: ユーザープロフィール情報
    - 401: 認証エラー
    - 503: メンテナンス中

    ■データベース設計■
    DynamoDB アクセスパターン:
    - PK: USER#{user_id}
    - SK: PROFILE
    - GSI: 使用なし（ユーザー個別アクセスのみ）
    """
    user_id = get_authenticated_user_id(request)

    try:
        logger.info("Fetching user profile", extra={"user_id": user_id[:8] + "****"})

        # DynamoDB からプロフィール取得
        profile = await db.get_user_profile(user_id)

        if not profile:
            # プロフィール未作成の場合、デフォルトプロフィールを返却
            logger.info(
                "Profile not found, returning default",
                extra={"user_id": user_id[:8] + "****"},
            )
            profile = UserProfile(user_id=user_id)

        return profile

    except DatabaseError as e:
        logger.error(
            "Database error in get_user_profile",
            extra={"error": str(e), "user_id": user_id[:8] + "****"},
        )
        raise HTTPException(status_code=500, detail="Internal server error")
    except Exception as e:
        logger.error(
            "Unexpected error in get_user_profile",
            extra={"error": str(e), "user_id": user_id[:8] + "****"},
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/users/profile", response_model=UserProfile)
async def update_user_profile(profile_update: UserProfileUpdate, request: Request):
    """
    ユーザープロフィール更新

    ■機能概要■
    - ニックネーム、オンボーディング状態等を更新
    - AI設定（キャラクター、褒めレベル）は別エンドポイントで管理
    - なりすまし防止: 認証ユーザーのデータのみ更新可能

    ■バリデーション■
    - ニックネーム: 1-20文字、基本文字のみ
    - 不適切語句チェック
    - XSS防止のためHTMLエスケープ

    ■レスポンス■
    - 200: 更新後のプロフィール
    - 400: バリデーションエラー
    - 401: 認証エラー
    - 503: メンテナンス中

    ■データベース更新■
    - updated_at フィールド自動更新
    - created_at は初回作成時のみ設定
    """
    user_id = get_authenticated_user_id(request)

    try:
        logger.info(
            "Updating user profile",
            extra={
                "user_id": user_id[:8] + "****",
                "fields_updated": list(
                    profile_update.model_dump(exclude_unset=True).keys()
                ),
            },
        )

        # 既存プロフィール取得または新規作成
        existing_profile = await db.get_user_profile(user_id)
        if existing_profile:
            # 既存プロフィール更新
            updated_profile = existing_profile.model_copy(
                update=profile_update.model_dump(exclude_unset=True)
            )
        else:
            # 新規プロフィール作成
            updated_profile = UserProfile(
                user_id=user_id, **profile_update.model_dump(exclude_unset=True)
            )

        # データベース保存
        saved_profile = await db.save_user_profile(updated_profile)

        logger.info(
            "User profile updated successfully", extra={"user_id": user_id[:8] + "****"}
        )
        return saved_profile

    except ValidationError as e:
        logger.warning(
            "Validation error in update_user_profile",
            extra={"error": str(e), "user_id": user_id[:8] + "****"},
        )
        raise HTTPException(status_code=400, detail=str(e))
    except DatabaseError as e:
        logger.error(
            "Database error in update_user_profile",
            extra={"error": str(e), "user_id": user_id[:8] + "****"},
        )
        raise HTTPException(status_code=500, detail="Internal server error")
    except Exception as e:
        logger.error(
            "Unexpected error in update_user_profile",
            extra={"error": str(e), "user_id": user_id[:8] + "****"},
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/users/ai-preferences", response_model=AIPreferences)
async def update_ai_preferences(ai_preferences: AIPreferences, request: Request):
    """
    AI設定（キャラクター・褒めレベル）更新

    ■機能概要■
    - AIキャラクター選択（たまさん、まどか姉さん、ヒデじい）
    - 褒めレベル設定（ライト、スタンダード、ディープ）
    - プロフィールとは独立した設定として管理

    ■バリデーション■
    - ai_character: 'tama', 'madoka', 'hide' のみ許可
    - praise_level: 'light', 'standard', 'deep' のみ許可
    - characters.py の AVAILABLE_CHARACTERS と連携

    ■レスポンス■
    - 200: 更新後のAI設定
    - 400: 無効なキャラクター・レベル指定
    - 401: 認証エラー

    ■AI連携■
    この設定は chat-service Lambda での AI応答生成時に参照される。
    homebiyori-ai-layer の characters.py と連携。
    """
    user_id = get_authenticated_user_id(request)

    try:
        logger.info(
            "Updating AI preferences",
            extra={
                "user_id": user_id[:8] + "****",
                "ai_character": ai_preferences.ai_character,
                "praise_level": ai_preferences.praise_level,
            },
        )

        # AI設定をプロフィールに反映
        existing_profile = await db.get_user_profile(user_id)
        if existing_profile:
            existing_profile.ai_character = ai_preferences.ai_character
            existing_profile.praise_level = ai_preferences.praise_level
            updated_profile = existing_profile
        else:
            # プロフィール未作成の場合は新規作成
            updated_profile = UserProfile(
                user_id=user_id,
                ai_character=ai_preferences.ai_character,
                praise_level=ai_preferences.praise_level,
            )

        await db.save_user_profile(updated_profile)

        logger.info(
            "AI preferences updated successfully",
            extra={"user_id": user_id[:8] + "****"},
        )
        return ai_preferences

    except ValidationError as e:
        logger.warning(
            "Validation error in update_ai_preferences",
            extra={"error": str(e), "user_id": user_id[:8] + "****"},
        )
        raise HTTPException(status_code=400, detail=str(e))
    except DatabaseError as e:
        logger.error(
            "Database error in update_ai_preferences",
            extra={"error": str(e), "user_id": user_id[:8] + "****"},
        )
        raise HTTPException(status_code=500, detail="Internal server error")


# =====================================
# オンボーディング管理エンドポイント
# =====================================


@app.get("/users/onboarding-status")
async def get_onboarding_status(request: Request):
    """
    オンボーディング状態確認

    ■機能概要■
    - 現在認証されているユーザーのオンボーディング状態を確認
    - ニックネーム設定状況とオンボーディング完了フラグを返却
    - フロントエンド側でのルーティング制御に使用

    ■レスポンス■
    - 200: オンボーディング状態情報
    - 401: 認証エラー
    """
    user_id = get_authenticated_user_id(request)

    try:
        logger.info("Checking onboarding status", extra={"user_id": user_id[:8] + "****"})

        profile = await db.get_user_profile(user_id)
        
        if not profile:
            # プロフィール未作成 = オンボーディング未完了
            return {
                "onboarding_completed": False,
                "has_nickname": False,
                "nickname": None
            }

        return {
            "onboarding_completed": profile.onboarding_completed,
            "has_nickname": profile.nickname is not None,
            "nickname": profile.nickname
        }

    except DatabaseError as e:
        logger.error(
            "Database error in get_onboarding_status",
            extra={"error": str(e), "user_id": user_id[:8] + "****"},
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/users/complete-onboarding")
async def complete_onboarding(
    onboarding_data: dict, request: Request
):
    """
    ニックネーム登録・オンボーディング完了

    ■機能概要■
    - 初回ユーザーのニックネーム設定とオンボーディング完了処理
    - プロフィール未作成の場合は新規作成
    - 既存プロフィールの場合は更新

    ■バリデーション■
    - ニックネーム: 1-20文字、基本文字のみ必須
    - オンボーディング完了フラグ自動設定

    ■レスポンス■
    - 200: 更新後のプロフィール
    - 400: バリデーションエラー
    - 401: 認証エラー
    """
    user_id = get_authenticated_user_id(request)

    try:
        nickname = onboarding_data.get("nickname")
        if not nickname or not isinstance(nickname, str):
            raise HTTPException(status_code=400, detail="ニックネームは必須です")

        logger.info(
            "Completing onboarding",
            extra={"user_id": user_id[:8] + "****", "nickname": nickname},
        )

        # 既存プロフィール取得
        existing_profile = await db.get_user_profile(user_id)
        
        if existing_profile:
            # 既存プロフィール更新
            existing_profile.nickname = nickname
            existing_profile.onboarding_completed = True
            updated_profile = existing_profile
        else:
            # 新規プロフィール作成
            updated_profile = UserProfile(
                user_id=user_id,
                nickname=nickname,
                onboarding_completed=True
            )

        # データベース保存
        saved_profile = await db.save_user_profile(updated_profile)

        logger.info(
            "Onboarding completed successfully",
            extra={"user_id": user_id[:8] + "****"}
        )
        
        return {
            "success": True,
            "user": {
                "user_id": saved_profile.user_id,
                "nickname": saved_profile.nickname,
                "onboarding_completed": saved_profile.onboarding_completed
            }
        }

    except ValidationError as e:
        logger.warning(
            "Validation error in complete_onboarding",
            extra={"error": str(e), "user_id": user_id[:8] + "****"},
        )
        raise HTTPException(status_code=400, detail=str(e))
    except DatabaseError as e:
        logger.error(
            "Database error in complete_onboarding",
            extra={"error": str(e), "user_id": user_id[:8] + "****"},
        )
        raise HTTPException(status_code=500, detail="Internal server error")




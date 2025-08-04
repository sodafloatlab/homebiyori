"""
user-service Lambda FastAPIアプリケーション

■システム概要■
Homebiyori（ほめびより）のユーザー管理マイクロサービス。
ユーザープロフィール、AI設定、子供情報の管理を行う。

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
- GET /users/children - 子供一覧取得
- POST /users/children - 子供追加
- PUT /users/children/{child_id} - 子供情報更新
- DELETE /users/children/{child_id} - 子供削除

■データモデル■
ユーザープロフィール:
- user_id: Cognito sub (UUID)
- nickname: 表示名
- ai_character: 選択AIキャラクター
- praise_level: 褒めレベル設定
- onboarding_completed: 初期設定完了フラグ

子供情報:
- child_id: 子供一意ID
- name: 子供の名前
- birth_date: 生年月日
- parent_user_id: 親ユーザーID (外部キー)

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
    ChildInfo,
    UserProfileUpdate,
    ChildInfoCreate,
    ChildInfoUpdate,
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
    description="ユーザー管理マイクロサービス - プロフィール、AI設定、子供情報管理",
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
            updated_profile = existing_profile.copy(
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
# 子供情報管理エンドポイント
# =====================================


@app.get("/users/children", response_model=List[ChildInfo])
async def get_children(request: Request):
    """
    現在認証されているユーザーの子供一覧取得

    ■機能概要■
    - ユーザーに紐づく子供情報の一覧を返却
    - 生年月日から年齢を自動計算して返却
    - プライバシー保護: 他のユーザーの子供情報は取得不可

    ■データベース設計■
    DynamoDB アクセスパターン:
    - PK: USER#{user_id}
    - SK: CHILD#{child_id}
    - Query: PK="USER#{user_id}" AND SK begins_with "CHILD#"

    ■レスポンス■
    - 200: 子供情報配列（空配列も含む）
    - 401: 認証エラー
    """
    user_id = get_authenticated_user_id(request)

    try:
        logger.info("Fetching children list", extra={"user_id": user_id[:8] + "****"})

        children = await db.get_user_children(user_id)

        logger.info(
            "Children list retrieved",
            extra={"user_id": user_id[:8] + "****", "children_count": len(children)},
        )
        return children

    except DatabaseError as e:
        logger.error(
            "Database error in get_children",
            extra={"error": str(e), "user_id": user_id[:8] + "****"},
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/users/children", response_model=ChildInfo)
async def create_child(child_data: ChildInfoCreate, request: Request):
    """
    子供情報新規追加

    ■機能概要■
    - 新しい子供情報をユーザーに紐づけて作成
    - child_id は自動生成（UUID）
    - 生年月日バリデーション（未来日不可等）

    ■バリデーション■
    - 名前: 1-50文字、基本文字のみ
    - 生年月日: 過去の日付のみ許可
    - 同一ユーザーの子供数上限: 10人

    ■レスポンス■
    - 201: 作成された子供情報
    - 400: バリデーションエラー
    - 401: 認証エラー
    """
    user_id = get_authenticated_user_id(request)

    try:
        logger.info(
            "Creating new child",
            extra={"user_id": user_id[:8] + "****", "child_name": child_data.name},
        )

        # 子供数上限チェック
        existing_children = await db.get_user_children(user_id)
        if len(existing_children) >= 10:
            raise ValidationError("子供の登録数が上限（10人）に達しています")

        # 新しい子供情報作成
        child_info = await db.create_child(user_id, child_data)

        logger.info(
            "Child created successfully",
            extra={"user_id": user_id[:8] + "****", "child_id": child_info.child_id},
        )
        return child_info

    except ValidationError as e:
        logger.warning(
            "Validation error in create_child",
            extra={"error": str(e), "user_id": user_id[:8] + "****"},
        )
        raise HTTPException(status_code=400, detail=str(e))
    except DatabaseError as e:
        logger.error(
            "Database error in create_child",
            extra={"error": str(e), "user_id": user_id[:8] + "****"},
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/users/children/{child_id}", response_model=ChildInfo)
async def update_child(child_id: str, child_update: ChildInfoUpdate, request: Request):
    """
    子供情報更新

    ■機能概要■
    - 既存の子供情報を更新
    - 他のユーザーの子供は更新不可（認可チェック）
    - 部分更新対応

    ■認可チェック■
    1. child_id が認証ユーザーに属するかチェック
    2. 属さない場合は404返却（存在隠蔽のため）

    ■レスポンス■
    - 200: 更新後の子供情報
    - 400: バリデーションエラー
    - 404: 子供が見つからない or アクセス権なし
    """
    user_id = get_authenticated_user_id(request)

    try:
        logger.info(
            "Updating child",
            extra={"user_id": user_id[:8] + "****", "child_id": child_id},
        )

        # 既存の子供情報取得＆認可チェック
        existing_child = await db.get_child(user_id, child_id)
        if not existing_child:
            raise HTTPException(status_code=404, detail="Child not found")

        # 子供情報更新
        updated_child = await db.update_child(user_id, child_id, child_update)

        logger.info(
            "Child updated successfully",
            extra={"user_id": user_id[:8] + "****", "child_id": child_id},
        )
        return updated_child

    except HTTPException:
        raise
    except ValidationError as e:
        logger.warning(
            "Validation error in update_child",
            extra={
                "error": str(e),
                "user_id": user_id[:8] + "****",
                "child_id": child_id,
            },
        )
        raise HTTPException(status_code=400, detail=str(e))
    except DatabaseError as e:
        logger.error(
            "Database error in update_child",
            extra={
                "error": str(e),
                "user_id": user_id[:8] + "****",
                "child_id": child_id,
            },
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/users/children/{child_id}")
async def delete_child(child_id: str, request: Request):
    """
    子供情報削除

    ■機能概要■
    - 指定された子供情報を削除
    - 他のユーザーの子供は削除不可
    - ソフトデリート（物理削除）

    ■注意事項■
    削除された子供に関連するチャット履歴等は残存する。
    chat-service側で子供情報を参照する際は、削除チェックが必要。

    ■レスポンス■
    - 204: 削除成功
    - 404: 子供が見つからない or アクセス権なし
    """
    user_id = get_authenticated_user_id(request)

    try:
        logger.info(
            "Deleting child",
            extra={"user_id": user_id[:8] + "****", "child_id": child_id},
        )

        # 認可チェック＆削除実行
        success = await db.delete_child(user_id, child_id)
        if not success:
            raise HTTPException(status_code=404, detail="Child not found")

        logger.info(
            "Child deleted successfully",
            extra={"user_id": user_id[:8] + "****", "child_id": child_id},
        )
        return {"status": "deleted"}

    except HTTPException:
        raise
    except DatabaseError as e:
        logger.error(
            "Database error in delete_child",
            extra={
                "error": str(e),
                "user_id": user_id[:8] + "****",
                "child_id": child_id,
            },
        )
        raise HTTPException(status_code=500, detail="Internal server error")

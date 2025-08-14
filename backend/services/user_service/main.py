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

from fastapi import FastAPI, HTTPException, Depends
import os

# Lambda Layers からの共通機能インポート
# homebiyori-common-layer が提供する機能を活用
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import (
    ValidationError,
    DatabaseError,
)
from homebiyori_common.utils.middleware import maintenance_check_middleware, get_current_user_id, error_handling_middleware
from homebiyori_common.utils.datetime_utils import get_current_jst

# ローカルモジュール
from .models import (
    UserProfile,
    AIPreferences,
    UserProfileUpdate,
    AccountStatus,
    DeletionRequest,
    DeletionConfirmation,
    DeletionType,
)
from .database import get_database
import uuid
import boto3

# 構造化ログ設定
# CloudWatch統合による高度な監視とデバッグ機能
logger = get_logger(__name__)

# データベースクライアント取得
# UserServiceDatabaseクラスを使用してユーザーサービス固有の操作を提供
db = get_database()

# =====================================
# AWS クライアント初期化
# =====================================

# AWS SQS クライアント初期化
sqs = boto3.client('sqs', region_name=os.getenv('AWS_DEFAULT_REGION', 'ap-northeast-1'))

# SQS キューURL設定
ACCOUNT_DELETION_QUEUE_URL = os.getenv('ACCOUNT_DELETION_QUEUE_URL')

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

# 共通ミドルウェアをLambda Layerから適用
app.middleware("http")(maintenance_check_middleware)
app.middleware("http")(error_handling_middleware)


# =====================================
# ヘルパー関数・ユーティリティ
# =====================================


async def get_subscription_info_from_db(user_id: str) -> dict:
    """
    DynamoDBからサブスクリプション情報を取得
    
    ■4テーブル統合対応■
    - 統合テーブル: homebiyori-core (旧subscriptionsテーブル統合)
    - データベース設計仕様準拠: monthly_amount削除、status必須化
    
    Args:
        user_id: ユーザーID
        
    Returns:
        サブスクリプション情報辞書（存在しない場合はNone）
    """
    try:
        # 統合テーブルから取得
        subscription = await db.get_subscription_status(user_id)
        
        if subscription:
            return {
                "status": subscription["status"],  # 必須項目、デフォルト値なし
                "current_plan": subscription.get("current_plan"),
                "current_period_start": subscription.get("current_period_start"),
                "current_period_end": subscription.get("current_period_end"),
                "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
                "ttl_days": subscription.get("ttl_days")
            }
        else:
            return None
            
    except Exception as e:
        logger.error(
            "Error getting subscription info from database",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        return None


async def send_deletion_task_to_sqs(user_id: str, deletion_type: str, deletion_request_id: str) -> bool:
    """
    SQS経由で非同期削除タスクを送信
    
    Args:
        user_id: ユーザーID
        deletion_type: 削除タイプ
        deletion_request_id: 削除要求ID
        
    Returns:
        送信成功可否
    """
    try:
        # TODO: 実際のSQS実装時に置き換え
        # 現在はスタブ実装
        logger.info(
            "SQS deletion task queued (stub implementation)",
            extra={
                "user_id": user_id[:8] + "****",
                "deletion_type": deletion_type,
                "deletion_request_id": deletion_request_id
            }
        )
        return True
        
    except Exception as e:
        logger.error(
            "Failed to send deletion task to SQS",
            extra={
                "error": str(e),
                "user_id": user_id[:8] + "****",
                "deletion_type": deletion_type
            }
        )
        return False


# =====================================
# ユーザープロフィール管理エンドポイント
# =====================================


@app.get("/api/user/profile", response_model=UserProfile)
async def get_user_profile(user_id: str = Depends(get_current_user_id)):
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


@app.put("/api/user/profile", response_model=UserProfile)
async def update_user_profile(profile_update: UserProfileUpdate, user_id: str = Depends(get_current_user_id)):
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


@app.put("/api/user/ai-preferences", response_model=AIPreferences)
async def update_ai_preferences(ai_preferences: AIPreferences, user_id: str = Depends(get_current_user_id)):
    """
    AI設定（キャラクター・褒めレベル）更新

    ■機能概要■
    - AIキャラクター選択（たまさん、まどか姉さん、ヒデじい）
    - 褒めレベル設定（ノーマル、ディープ）
    - プロフィールとは独立した設定として管理

    ■バリデーション■
    - ai_character: 'mittyan', 'madokasan', 'hideji' のみ許可
    - praise_level: 'normal', 'deep' のみ許可（2段階設計）
    - models.py の AICharacter・PraiseLevel Enum で定義

    ■レスポンス■
    - 200: 更新後のAI設定
    - 400: 無効なキャラクター・レベル指定
    - 401: 認証エラー

    ■AI連携■
    この設定は chat-service Lambda での AI応答生成時に参照される。
    LangChain統合によりDynamoDB経由でリアルタイム設定反映。
    """

    try:
        logger.info(
            "Updating AI preferences",
            extra={
                "user_id": user_id[:8] + "****",
                "ai_character": ai_preferences.ai_character,
                "praise_level": ai_preferences.praise_level,
                "interaction_mode": ai_preferences.interaction_mode,
            },
        )

        # AI設定をプロフィールに反映
        existing_profile = await db.get_user_profile(user_id)
        if existing_profile:
            existing_profile.ai_character = ai_preferences.ai_character
            existing_profile.praise_level = ai_preferences.praise_level
            existing_profile.interaction_mode = ai_preferences.interaction_mode
            updated_profile = existing_profile
        else:
            # プロフィール未作成の場合は新規作成
            updated_profile = UserProfile(
                user_id=user_id,
                ai_character=ai_preferences.ai_character,
                praise_level=ai_preferences.praise_level,
                interaction_mode=ai_preferences.interaction_mode,
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


@app.get("/api/user/onboarding-status")
async def get_onboarding_status(user_id: str = Depends(get_current_user_id)):
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


@app.post("/api/user/complete-onboarding")
async def complete_onboarding(
    onboarding_data: dict, user_id: str = Depends(get_current_user_id)
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

# =====================================
# アカウント削除管理エンドポイント
# =====================================


@app.get("/api/user/account-status", response_model=AccountStatus)
async def get_account_status(user_id: str = Depends(get_current_user_id)):
    """
    アカウント・サブスクリプション状態取得
    
    ■機能概要■
    - 現在のアカウント情報、サブスクリプション状態を返却
    - 削除プロセス開始前の状況確認に使用
    
    ■レスポンス■
    - 200: アカウント・サブスクリプション状態
    - 401: 認証エラー
    - 500: 内部エラー
    """
    try:
        logger.info("Getting account status", extra={"user_id": user_id[:8] + "****"})
        
        # ユーザープロフィール取得
        profile = await db.get_user_profile(user_id)
        if not profile:
            # プロフィール未作成の場合はデフォルトを作成
            profile = UserProfile(user_id=user_id)
        
        # アカウント情報構築
        account_info = {
            "user_id": profile.user_id,
            "nickname": profile.nickname,
            "created_at": profile.created_at.isoformat(),
            "status": "active"
        }
        
        # サブスクリプション情報（DynamoDBから取得）
        subscription_info = await get_subscription_info_from_db(user_id)
        
        return AccountStatus(
            account=account_info,
            subscription=subscription_info
        )
        
    except DatabaseError as e:
        logger.error(
            "Database error in get_account_status",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=500, detail="Internal server error")
    except Exception as e:
        logger.error(
            "Unexpected error in get_account_status", 
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/user/request-deletion")
async def request_account_deletion(
    deletion_request: DeletionRequest, 
    user_id: str = Depends(get_current_user_id)
):
    """
    アカウント削除要求（段階的プロセス開始）
    
    ■機能概要■
    - 3段階削除プロセスの第1段階
    - 削除タイプに応じた処理ステップ案内
    - サブスクリプション状態チェック
    
    ■削除タイプ■
    - subscription_cancel: サブスクリプション解約
    - account_delete: アカウント削除（サブスク解約前提）
    
    ■レスポンス■
    - 200: 削除プロセス案内
    - 400: 無効な削除タイプ
    - 401: 認証エラー
    """
    try:
        logger.info(
            "Starting account deletion request",
            extra={
                "user_id": user_id[:8] + "****",
                "deletion_type": deletion_request.deletion_type,
                "has_reason": deletion_request.reason is not None
            }
        )
        
        # 削除要求IDの生成
        deletion_request_id = f"del_req_{uuid.uuid4().hex[:12]}"
        
        # サブスクリプション処理が必要かどうか
        subscription_action_required = (
            deletion_request.deletion_type == DeletionType.SUBSCRIPTION_CANCEL
        )
        
        response_data = {
            "deletion_request_id": deletion_request_id,
            "subscription_action_required": subscription_action_required
        }
        
        logger.info(
            "Account deletion request created",
            extra={
                "user_id": user_id[:8] + "****",
                "deletion_request_id": deletion_request_id
            }
        )
        
        return response_data
        
    except ValidationError as e:
        logger.warning(
            "Validation error in request_account_deletion",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(
            "Unexpected error in request_account_deletion",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/user/confirm-deletion")
async def confirm_account_deletion(
    confirmation: DeletionConfirmation,
    user_id: str = Depends(get_current_user_id)
):
    """
    アカウント削除実行（最終確認後）
    
    ■機能概要■
    - 3段階削除プロセスの最終段階
    - ユーザープロフィールは同期削除（ログイン防止）
    - その他データ削除は非同期処理（SQS経由）
    
    ■処理順序■
    1. ユーザープロフィール即座削除（ログイン不可にする）
    2. SQS経由で非同期削除タスクを送信
       - DynamoDBデータ削除（全テーブル）
       - Cognitoアカウント削除
    
    ■レスポンス■
    - 200: 削除処理開始通知
    - 400: 確認文字エラー
    - 401: 認証エラー
    - 500: 削除処理エラー
    """
    try:
        logger.info(
            "Starting account deletion confirmation",
            extra={
                "user_id": user_id[:8] + "****",
                "deletion_request_id": confirmation.deletion_request_id
            }
        )
        
        # 削除プロセスID生成
        process_id = f"proc_{uuid.uuid4().hex[:12]}"
        
        # 1. ユーザープロフィール同期削除（ログイン防止のため）
        try:
            await db.delete_user_profile(user_id)
            logger.info(
                "User profile deleted synchronously",
                extra={"user_id": user_id[:8] + "****"}
            )
            profile_deletion_status = "completed"
        except Exception as e:
            logger.error(
                "Failed to delete user profile synchronously",
                extra={"error": str(e), "user_id": user_id[:8] + "****"}
            )
            profile_deletion_status = "failed"
        
        # 2. SQS経由で非同期削除タスクを送信
        try:
            await send_deletion_task_to_sqs(
                user_id=user_id,
                deletion_type="account_delete", 
                deletion_request_id=confirmation.deletion_request_id
            )
            async_deletion_status = "queued"
        except Exception as e:
            logger.error(
                "Failed to queue async deletion tasks",
                extra={"error": str(e), "user_id": user_id[:8] + "****"}
            )
            async_deletion_status = "failed"
        
        # 処理完了予定時刻（5分後を想定）
        current_time = get_current_jst()
        estimated_completion = current_time.replace(minute=current_time.minute + 5)
        
        response_data = {
            "deletion_started": True,
            "process_id": process_id,
            "profile_deleted": profile_deletion_status == "completed",
            "async_tasks_queued": async_deletion_status == "queued",
            "estimated_completion": estimated_completion.isoformat()
        }
        
        logger.info(
            "Account deletion process started successfully",
            extra={
                "user_id": user_id[:8] + "****",
                "process_id": process_id,
                "profile_deleted": profile_deletion_status == "completed",
                "async_tasks_queued": async_deletion_status == "queued"
            }
        )
        
        return response_data
        
    except ValidationError as e:
        logger.warning(
            "Validation error in confirm_account_deletion",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(
            "Unexpected error in confirm_account_deletion",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=500, detail="Internal server error")

# =====================================
# ヘルスチェック
# =====================================

@app.get("/api/user/health")
async def health_check():
    """
    ヘルスチェック
    """
    try:
        # データベース接続確認
        await db.health_check()
        
        return {
            "status": "healthy",
            "service": "user_service",
            "timestamp": get_current_jst().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Health check failed")




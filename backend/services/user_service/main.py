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
from contextlib import asynccontextmanager
import os

# Lambda Layers からの共通機能インポート
# homebiyori-common-layer が提供する機能を活用
from homebiyori_common import get_logger, error_response
from homebiyori_common.middleware import maintenance_check_middleware, error_handling_middleware

from .database import get_user_database
from .core import get_settings
import boto3

# 構造化ログ設定
# CloudWatch統合による高度な監視とデバッグ機能
logger = get_logger(__name__)

# データベースクライアント取得
# UserServiceDatabaseクラスを使用してユーザーサービス固有の操作を提供
db = get_user_database()



# =====================================
# アプリケーションライフサイクル管理
# =====================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションライフサイクル管理（FastAPI 0.93.0+推奨方式）"""
    # Startup
    settings = get_settings()
    logger.info("User service starting up", extra={
        "environment": settings.environment,
        "service": "user-service",
        "version": "1.0.0",
        "core_table": settings.core_table_name,
        "chats_table": settings.chats_table_name,
        "fruits_table": settings.fruits_table_name,
        "feedback_table": settings.feedback_table_name
    })
    
    # データベース接続確認
    try:
        await db.health_check()
        logger.info("Database connection established successfully")
    except Exception as e:
        logger.error(f"Database connection failed during startup: {e}")
        
    yield
    
    # Shutdown
    logger.info("User service shutting down")


# FastAPIアプリケーション初期化
# プロダクション環境でのパフォーマンス最適化設定
app = FastAPI(
    title="Homebiyori User Service",
    description="ユーザー管理マイクロサービス - プロフィール、AI設定",
    version="1.0.0",
    docs_url=None if os.getenv("ENVIRONMENT") == "prod" else "/docs",  # 本番では無効化
    redoc_url=None if os.getenv("ENVIRONMENT") == "prod" else "/redoc",
    lifespan=lifespan  # ライフサイクル管理追加
)

# =====================================
# ミドルウェア・共通処理
# =====================================

# 共通ミドルウェアをLambda Layerから適用
app.middleware("http")(maintenance_check_middleware)
app.middleware("http")(error_handling_middleware)

# =====================================
# ルーター登録
# =====================================

# ルーターをインポートして登録
from .routers import profile, account, health

# /api/user プレフィックスで各ルーターを登録
app.include_router(profile.router, prefix="/api/user/profile", tags=["profile"])
app.include_router(account.router, prefix="/api/user/account", tags=["account"])
app.include_router(health.router, prefix="/api/user/health", tags=["health"])

# =====================================
# 例外処理
# =====================================
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTPException の統一ハンドリング"""
    logger.warning("HTTP exception occurred", extra={
        "status_code": exc.status_code,
        "detail": exc.detail,
        "path": request.url.path,
        "method": request.method
    })
    
    return error_response(
        message=exc.detail,
        status_code=exc.status_code,
        error_code="http_error"
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """一般的な例外の統一ハンドリング"""
    logger.error("Unexpected error occurred", extra={
        "error": str(exc),
        "error_type": type(exc).__name__,
        "path": request.url.path,
        "method": request.method
    })
    
    return error_response(
        message="内部サーバーエラーが発生しました",
        status_code=500,
        error_code="internal_error"
    )

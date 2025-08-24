"""
Webhook Service - FastAPI Application

Stripe Webhookイベントを受信・処理するマイクロサービス。
- Stripe署名検証
- サブスクリプション状態同期
- TTL更新キュー送信
- DLQ エラーハンドリング
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

# 共通Layer機能インポート
from homebiyori_common import get_logger, success_response, error_response
from homebiyori_common import maintenance_check_middleware, get_current_user_id
from homebiyori_common.middleware import error_handling_middleware

from .routers.stripe_webhook import stripe_webhook_router
from .routers.health import health_router
# PaymentHistory削除: billing_serviceがStripe Customer Portal方式に移行したため不要
# from .routers.payment_history import payment_history_router
from .core.config import get_settings
from .core.dependencies import verify_webhook_signature

# ログ設定
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションライフサイクル管理（FastAPI 0.93.0+推奨方式）"""
    # Startup
    settings = get_settings()
    logger.info("Webhook service starting up", extra={
        "environment": settings.environment,
        "service": "webhook-service",
        "version": "1.0.0"
    })
    yield
    # Shutdown
    logger.info("Webhook service shutting down")


# FastAPI アプリケーション初期化
app = FastAPI(
    title="Homebiyori Webhook Service",
    description="Stripe Webhook処理専用サービス",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "prod" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "prod" else None,
    lifespan=lifespan  # FastAPI 0.93.0+推奨方式
)

# CORS設定
# 注意: Stripe Webhookの仕様上、Originヘッダーがnullとなるため
# 通常のCORS設定は適用されません。
# 参考: https://docs.stripe.com/stripe-apps/build-backend#handle-cross-origin-resource-sharing-(cors)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Stripe Webhook: Origin=null対応
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 共通ミドルウェアをLambda Layerから適用
app.middleware("http")(error_handling_middleware)
app.middleware("http")(maintenance_check_middleware)

# ルーターの登録
app.include_router(
    stripe_webhook_router,
    prefix="/api/webhook/stripe",
    tags=["stripe-webhook"]
)

app.include_router(
    health_router,
    prefix="/api/webhook/health",
    tags=["health"]
)

# PaymentHistory削除: billing_serviceがStripe Customer Portal方式に移行
# 削除理由: webhook_serviceはStripe環境からしかアクセスを受け付けないため
# フロントエンドからの利用が困難、代替としてStripe Portalを使用
# app.include_router(
#     payment_history_router,
#     tags=["payment-history"]
# )


# FastAPI 0.93.0以降推奨のlifespan context managerを使用済み
# 上記でlifespan関数を定義し、FastAPIアプリケーション初期化時に指定


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


# Mangum adapter（Lambda Handler）はhandler.pyで定義
# handler.pyがLambdaエントリーポイントとしてapp変数を参照してMangumラッパーを適用
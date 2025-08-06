"""
Webhook Service - FastAPI Application

Stripe Webhookイベントを受信・処理するマイクロサービス。
- Stripe署名検証
- サブスクリプション状態同期
- TTL更新キュー送信
- DLQ エラーハンドリング
"""

import os
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

# 共通Layer機能インポート
from homebiyori_common import get_logger, success_response, error_response
from homebiyori_common.maintenance import maintenance_required

from .handlers.stripe_webhook import stripe_webhook_router
from .handlers.health import health_router
from .core.config import get_settings
from .core.dependencies import verify_webhook_signature

# ログ設定
logger = get_logger(__name__)

# FastAPI アプリケーション初期化
app = FastAPI(
    title="Homebiyori Webhook Service",
    description="Stripe Webhook処理専用サービス",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では制限
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターの登録
app.include_router(
    stripe_webhook_router,
    prefix="/webhook",
    tags=["stripe-webhook"]
)

app.include_router(
    health_router,
    prefix="/health",
    tags=["health"]
)


@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の初期化処理"""
    settings = get_settings()
    logger.info("Webhook service starting up", extra={
        "environment": settings.environment,
        "service": "webhook-service",
        "version": "1.0.0"
    })


@app.on_event("shutdown")
async def shutdown_event():
    """アプリケーション終了時のクリーンアップ処理"""
    logger.info("Webhook service shutting down")


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


# Lambda Handler (Mangum adapter)
handler = Mangum(app)
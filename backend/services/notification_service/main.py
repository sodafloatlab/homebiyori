"""
Notification Service - FastAPI Application

アプリ内通知管理専用マイクロサービス。
- ユーザー向け通知CRUD
- 内部API（他Lambda連携）
- 管理者によるメンテナンス通知
- TTL自動削除による効率的な通知管理
"""

import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

# 共通Layer機能インポート
from homebiyori_common import get_logger, success_response, error_response
from homebiyori_common import maintenance_check_middleware
from homebiyori_common.middleware import error_handling_middleware

# アクセス制御ミドルウェア
from homebiyori_common.middleware import require_basic_access

from .handlers.notifications import router as notification_router
from .handlers.internal import router as internal_router
from .handlers.admin import router as admin_router
from .handlers.health import router as health_router
from .core.config import get_settings

# ログ設定
logger = get_logger(__name__)

# FastAPI アプリケーション初期化
app = FastAPI(
    title="Homebiyori Notification Service",
    description="アプリ内通知管理専用サービス",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "prod" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "prod" else None
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(
    notification_router,
    prefix="/api/notification",
    tags=["notifications"]
)

app.include_router(
    internal_router,
    prefix="/internal/notification",
    tags=["internal-api"]
)

app.include_router(
    admin_router,
    prefix="/admin/notification",
    tags=["admin-notifications"]
)

app.include_router(
    health_router,
    prefix="/api/notification",
    tags=["health"]
)

# 共通ミドルウェアをLambda Layerから適用
app.middleware("http")(error_handling_middleware)
app.middleware("http")(maintenance_check_middleware)


@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の初期化処理"""
    settings = get_settings()
    logger.info("Notification service starting up", extra={
        "environment": settings.environment,
        "service": "notification_service",
        "version": "1.0.0"
    })


@app.on_event("shutdown")
async def shutdown_event():
    """アプリケーション終了時のクリーンアップ処理"""
    logger.info("Notification service shutting down")


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
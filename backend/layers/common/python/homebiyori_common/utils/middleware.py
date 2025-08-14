"""
Homebiyori共通Middleware
FastAPI アプリケーション用の共通ミドルウェア機能を提供

主要機能:
- メンテナンスモード自動チェック
- 認証済みユーザーID取得
- 構造化ログ対応
- エラーハンドリング統一

使用方法:
    from homebiyori_common.middleware import (
        maintenance_check_middleware,
        get_authenticated_user_id
    )
    
    app.middleware("http")(maintenance_check_middleware)
"""

from fastapi import Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Callable, Awaitable
import asyncio
import os

from ..logger import get_logger
from ..auth import get_user_id_from_event
from .maintenance import is_maintenance_mode, check_maintenance_mode
from ..exceptions import MaintenanceError

logger = get_logger(__name__)


async def maintenance_check_middleware(request: Request, call_next: Callable[[Request], Awaitable]) -> JSONResponse:
    """
    メンテナンス状態チェックミドルウェア
    
    全APIリクエストに対してメンテナンス状態を確認し、
    メンテナンス中の場合は503エラーを返却する。
    
    処理フロー:
    1. ヘルスチェックパス除外確認
    2. Parameter Store からメンテナンス状態取得
    3. メンテナンス中の場合、503エラーレスポンス返却
    4. 通常時は次の処理に継続
    
    例外処理:
    - Parameter Store接続エラー: 処理継続（可用性優先）
    - メンテナンス設定不正: 処理継続（フェイルセーフ）
    """
    try:
        # ヘルスチェックパスはメンテナンスチェックをスキップ
        if request.url.path in ["/health", "/api/health"]:
            return await call_next(request)
        # 同期版maintenance check（user_serviceなど）と非同期版（chat_serviceなど）の統一
        # Parameter Storeアクセスは基本的に同期なのでcheck_maintenance_modeを使用
        try:
            check_maintenance_mode()
        except Exception as check_error:
            # maintenance check自体のエラーは処理を継続（フェイルセーフ）
            logger.debug(
                "Maintenance check failed, allowing request",
                extra={"error": str(check_error)}
            )
        response = await call_next(request)
        return response
    except MaintenanceError as e:
        logger.warning(
            "API blocked due to maintenance mode",
            extra={
                "maintenance_message": str(e), 
                "request_path": request.url.path,
                "request_method": request.method
            }
        )
        return JSONResponse(
            status_code=503,
            content={
                "error": "MAINTENANCE_MODE",
                "message": str(e),
                "status": "maintenance",
                "retry_after": 3600  # 1時間後に再試行推奨
            }
        )
    except Exception as e:
        logger.error(
            "Maintenance check failed, allowing request",
            extra={
                "error": str(e), 
                "request_path": request.url.path,
                "request_method": request.method
            }
        )
        # メンテナンス確認に失敗した場合は処理を継続（フェイルセーフ）
        response = await call_next(request)
        return response




def get_current_user_id(request: Request) -> str:
    """
    FastAPI依存性注入用の認証関数
    
    Usage:
        @app.get("/api/endpoint")
        async def my_endpoint(user_id: str = Depends(get_current_user_id)):
            # user_idが自動で注入される
    
    Returns:
        str: Cognito User Pool の sub (UUID形式)
    
    Raises:
        HTTPException: 認証失敗時（FastAPI標準）
        
    Notes:
        - テスト時はapp.dependency_overrides[get_current_user_id]でオーバーライド可能
        - FastAPI OpenAPI仕様書に自動で認証要件が記載される
    """
    try:
        # FastAPI Request から Lambda event を取得
        # API Gateway Proxyインテグレーションの場合、request.scope["aws.event"] に格納
        event = request.scope.get("aws.event")
        if not event:
            # テスト環境では Lambda event が存在しない場合がある
            if os.getenv("ENVIRONMENT") in ["test", "development"]:
                logger.debug(
                    "Lambda event not found in test environment, using fallback",
                    extra={"request_path": request.url.path}
                )
                return "test-user-id-12345"  # テスト用ダミーID
            
            logger.error(
                "Lambda event not found in request scope",
                extra={"request_path": request.url.path}
            )
            raise HTTPException(status_code=401, detail="Authentication context missing")

        user_id = get_user_id_from_event(event)
        logger.debug(
            "User authenticated successfully",
            extra={
                "user_id": user_id[:8] + "****",  # プライバシー保護
                "request_path": request.url.path,
                "request_method": request.method
            }
        )
        return user_id

    except Exception as e:
        logger.error(
            "Authentication failed",
            extra={
                "error": str(e), 
                "request_path": request.url.path,
                "request_method": request.method
            }
        )
        raise HTTPException(status_code=401, detail="User authentication failed")
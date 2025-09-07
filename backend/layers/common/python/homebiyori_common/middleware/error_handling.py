"""
エラーハンドリングミドルウェア
FastAPI アプリケーション用の統一エラー処理機能を提供

主要機能:
- 統一エラーレスポンス
- 構造化ログ出力
- セキュリティ考慮済み

使用方法:
    from homebiyori_common.middleware import error_handling_middleware
    
    app.middleware("http")(error_handling_middleware)
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from typing import Callable, Awaitable

from ..logger import get_logger
from ..exceptions import ValidationError, DatabaseError, AuthenticationError

logger = get_logger(__name__)


async def error_handling_middleware(request: Request, call_next: Callable[[Request], Awaitable]) -> JSONResponse:
    """
    統一エラーハンドリングミドルウェア
    
    全サービス共通のエラーレスポンス処理を提供：
    - ValidationError: 400 Bad Request
    - DatabaseError: 500 Internal Server Error
    - AuthenticationError: 401 Unauthorized
    - 予期しないエラー: 500 Internal Server Error
    
    Features:
    - 構造化ログ出力
    - ユーザーフレンドリーなエラーメッセージ
    - セキュリティを考慮した情報制限
    """
    try:
        response = await call_next(request)
        return response
    except ValidationError as e:
        logger.warning(
            "Validation error occurred",
            extra={
                "error": str(e),
                "request_path": request.url.path,
                "request_method": request.method
            }
        )
        return JSONResponse(
            status_code=400,
            content={
                "error": "validation_error",
                "message": str(e)
            },
            headers={
                "Access-Control-Allow-Origin": "https://homebiyori.com",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Credentials": "true"
            }
        )
    except AuthenticationError as e:
        logger.warning(
            "Authentication error occurred", 
            extra={
                "error": str(e),
                "request_path": request.url.path,
                "request_method": request.method
            }
        )
        return JSONResponse(
            status_code=401,
            content={
                "error": "authentication_error",
                "message": "認証に失敗しました"
            },
            headers={
                "Access-Control-Allow-Origin": "https://homebiyori.com",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Credentials": "true"
            }
        )
    except DatabaseError as e:
        logger.error(
            "Database error occurred",
            extra={
                "error": str(e),
                "request_path": request.url.path,
                "request_method": request.method
            }
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "database_error",
                "message": "データベース処理でエラーが発生しました"
            },
            headers={
                "Access-Control-Allow-Origin": "https://homebiyori.com",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Credentials": "true"
            }
        )
    except Exception as e:
        logger.error(
            "Unexpected error occurred",
            extra={
                "error": str(e),
                "request_path": request.url.path,
                "request_method": request.method
            }
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_server_error",
                "message": "内部サーバーエラーが発生しました"
            },
            headers={
                "Access-Control-Allow-Origin": "https://homebiyori.com",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Credentials": "true"
            }
        )
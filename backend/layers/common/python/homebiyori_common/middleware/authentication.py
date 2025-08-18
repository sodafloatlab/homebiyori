"""
認証チェックミドルウェア
FastAPI アプリケーション用の認証機能を提供

主要機能:
- JWT認証トークン検証
- ユーザーID抽出
- 依存性注入対応

使用方法:
    from homebiyori_common.middleware import get_current_user_id
    
    @app.get("/api/endpoint")
    async def my_endpoint(user_id: str = Depends(get_current_user_id)):
        # user_idが自動で注入される
"""

from fastapi import Request, HTTPException
import os

from ..logger import get_logger
from ..auth import get_user_id_from_event

logger = get_logger(__name__)


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
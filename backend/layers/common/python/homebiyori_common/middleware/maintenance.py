"""
メンテナンスチェックミドルウェア
FastAPI アプリケーション用のメンテナンス状態監視機能を提供

主要機能:
- メンテナンスモード自動チェック
- Parameter Store連携
- フェイルセーフ機構付き

使用方法:
    from homebiyori_common.middleware import maintenance_check_middleware
    
    app.middleware("http")(maintenance_check_middleware)
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from typing import Callable, Awaitable

from ..logger import get_logger
from ..utils.maintenance import check_maintenance_mode
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
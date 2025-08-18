"""
アクセス制御ミドルウェア
全サービス共通でユーザーのアクセス権限をチェックする
"""

import asyncio
import logging
from typing import Callable, Dict, Any, Optional
from functools import wraps
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


logger = logging.getLogger(__name__)


class AccessControlError(Exception):
    """アクセス制御エラー"""
    pass


class AccessControlClient:
    """アクセス制御クライアント（billing_service連携）"""
    
    def __init__(self, billing_service_url: str):
        self.billing_service_url = billing_service_url
        self._http_client = None
        
    async def _get_http_client(self):
        """HTTPクライアントを遅延初期化"""
        if self._http_client is None:
            import aiohttp
            self._http_client = aiohttp.ClientSession()
        return self._http_client
        
    async def check_user_access(self, user_id: str) -> Dict[str, Any]:
        """
        ユーザーのアクセス制御状態をチェック（billing_service経由）
        
        Args:
            user_id: ユーザーID
            
        Returns:
            dict: アクセス制御情報
        """
        try:
            http_client = await self._get_http_client()
            
            async with http_client.get(
                f"{self.billing_service_url}/api/billing/access-control",
                headers={"X-User-ID": user_id}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("access_control", {})
                else:
                    logger.warning(f"Access control check failed with status {response.status}")
                    return self._get_error_fallback()
                    
        except Exception as e:
            logger.error(f"Failed to check user access control: {e}")
            return self._get_error_fallback()
    
    def _get_error_fallback(self) -> Dict[str, Any]:
        """エラー時のフォールバック（安全側に倒してアクセス拒否）"""
        return {
            "access_allowed": False,
            "access_level": "none",
            "restriction_reason": "system_error",
            "redirect_url": "/error"
        }
    
    async def close(self):
        """HTTPクライアントをクローズ"""
        if self._http_client:
            await self._http_client.close()


# グローバルインスタンス
_access_control_client: Optional[AccessControlClient] = None


def get_access_control_client() -> AccessControlClient:
    """アクセス制御クライアントを取得"""
    global _access_control_client
    if _access_control_client is None:
        import os
        billing_service_url = os.getenv(
            'BILLING_SERVICE_URL', 
            'http://localhost:8000'  # ローカル開発用デフォルト
        )
        _access_control_client = AccessControlClient(billing_service_url)
    return _access_control_client


def require_access(allow_during_trial: bool = True, require_premium: bool = False):
    """
    アクセス制御デコレータ
    
    Args:
        allow_during_trial: トライアル期間中のアクセスを許可するか
        require_premium: プレミアムプラン必須か
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # FastAPIのRequestオブジェクトを探す
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if request is None:
                logger.error("Request object not found in function arguments")
                raise HTTPException(status_code=500, detail="Internal server error")
            
            # X-User-IDヘッダーからユーザーIDを取得
            user_id = request.headers.get("X-User-ID")
            if not user_id:
                raise HTTPException(status_code=401, detail="User authentication required")
            
            # アクセス制御チェック
            try:
                access_client = get_access_control_client()
                access_info = await access_client.check_user_access(user_id)
                
                # アクセス許可判定
                if not access_info.get("access_allowed", False):
                    restriction_reason = access_info.get("restriction_reason", "unknown")
                    
                    if restriction_reason == "trial_expired":
                        return JSONResponse(
                            status_code=402,  # Payment Required
                            content={
                                "success": False,
                                "error": "trial_expired",
                                "message": "トライアル期間が終了しました。プレミアムプランにアップグレードしてください。",
                                "redirect_url": "/billing/subscribe"
                            }
                        )
                    elif restriction_reason == "subscription_required" and require_premium:
                        return JSONResponse(
                            status_code=402,  # Payment Required
                            content={
                                "success": False,
                                "error": "premium_required",
                                "message": "この機能にはプレミアムプランが必要です。",
                                "redirect_url": "/billing/subscribe"
                            }
                        )
                    else:
                        return JSONResponse(
                            status_code=403,
                            content={
                                "success": False,
                                "error": "access_denied",
                                "message": "アクセスが拒否されました。",
                                "redirect_url": access_info.get("redirect_url", "/")
                            }
                        )
                
                # トライアル期間中の制限チェック
                if not allow_during_trial:
                    access_level = access_info.get("access_level", "none")
                    if access_level == "trial":
                        return JSONResponse(
                            status_code=402,
                            content={
                                "success": False,
                                "error": "trial_limitation",
                                "message": "この機能はトライアル期間中はご利用いただけません。",
                                "redirect_url": "/billing/subscribe"
                            }
                        )
                
                # プレミアム必須機能の制限チェック
                if require_premium:
                    access_level = access_info.get("access_level", "none")
                    if access_level not in ["premium", "active"]:
                        return JSONResponse(
                            status_code=402,
                            content={
                                "success": False,
                                "error": "premium_required",
                                "message": "この機能にはプレミアムプランが必要です。",
                                "redirect_url": "/billing/subscribe"
                            }
                        )
                
                # アクセス許可 - 元の関数を実行
                return await func(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Access control check failed: {e}")
                raise HTTPException(status_code=500, detail="Access control system error")
        
        return wrapper
    return decorator


# 便利関数
def require_basic_access():
    """基本アクセス制御（トライアル期間中も許可）"""
    return require_access(allow_during_trial=True, require_premium=False)


def require_premium_access():
    """プレミアムアクセス制御（プレミアムプラン必須）"""
    return require_access(allow_during_trial=False, require_premium=True)


def require_paid_access():
    """有料プランアクセス制御（トライアル不可、プレミアム必須）"""
    return require_access(allow_during_trial=False, require_premium=True)
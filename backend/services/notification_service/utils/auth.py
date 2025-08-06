"""
認証ユーティリティ

内部API・管理者API用の認証機能。
"""

from typing import Optional
from fastapi import HTTPException, Header, status

from homebiyori_common import get_logger
from ..core.config import get_settings

logger = get_logger(__name__)


async def verify_internal_api_key(x_api_key: Optional[str] = Header(None)) -> str:
    """
    内部API認証
    
    Args:
        x_api_key: APIキー（ヘッダーから取得）
        
    Returns:
        str: 認証済みキー
        
    Raises:
        HTTPException: 認証失敗
    """
    settings = get_settings()
    
    if not x_api_key:
        logger.warning("Internal API key missing")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )
    
    if x_api_key != settings.internal_api_key:
        logger.warning("Invalid internal API key", extra={
            "provided_key": x_api_key[:8] + "..." if len(x_api_key) > 8 else x_api_key
        })
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    logger.debug("Internal API authenticated")
    return x_api_key


async def verify_admin_api_key(x_admin_key: Optional[str] = Header(None)) -> str:
    """
    管理者API認証
    
    Args:
        x_admin_key: 管理者APIキー（ヘッダーから取得）
        
    Returns:
        str: 認証済み管理者ID（簡易実装）
        
    Raises:
        HTTPException: 認証失敗
    """
    settings = get_settings()
    
    if not settings.enable_admin_notifications:
        logger.warning("Admin notifications disabled")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin notifications disabled"
        )
    
    if not x_admin_key:
        logger.warning("Admin API key missing")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin API key required"
        )
    
    if not settings.admin_api_key or x_admin_key != settings.admin_api_key:
        logger.warning("Invalid admin API key", extra={
            "provided_key": x_admin_key[:8] + "..." if len(x_admin_key) > 8 else x_admin_key
        })
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin API key"
        )
    
    # 簡易実装：APIキーから管理者IDを生成
    # 本格実装では別途管理者管理システムが必要
    admin_id = f"admin_{hash(x_admin_key) % 10000}"
    
    logger.info("Admin API authenticated", extra={
        "admin_id": admin_id
    })
    
    return admin_id
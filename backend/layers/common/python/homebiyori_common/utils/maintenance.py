"""
Homebiyori メンテナンスモード管理
Parameter Store連携によるメンテナンス状態制御

主要機能:
- Parameter Store からメンテナンス状態取得
- 同期・非同期両対応のメンテナンスチェック
- MaintenanceError 例外による統一エラーハンドリング

使用方法:
    from homebiyori_common.maintenance import (
        check_maintenance_mode,
        is_maintenance_mode
    )
    
    # 同期版（一般的なケース）
    check_maintenance_mode()  # MaintenanceErrorを投げる可能性
    
    # 非同期版（特定サービス用）
    if await is_maintenance_mode():
        # メンテナンス中処理
"""

import asyncio
from typing import Optional
import os

from ..logger import get_logger
from ..exceptions import MaintenanceError

logger = get_logger(__name__)

# 統一Parameter Store utilsを使用（古い個別実装は削除）


def check_maintenance_mode() -> None:
    """
    メンテナンスモード同期チェック（統一Parameter Store使用）
    
    Parameter Storeからメンテナンス状態を取得し、
    メンテナンス中の場合はMaintenanceErrorを発生させる。
    
    Raises:
        MaintenanceError: メンテナンス中の場合
        
    Notes:
        - フェイルセーフ設計: Parameter Store接続エラー時は処理継続
        - ログ出力による監視対応
        - 新しい統一Parameter Store utils使用
    """
    try:
        from .parameter_store import get_maintenance_config
        
        # 新しい統一Parameter Store機能を使用
        config = get_maintenance_config()
        
        if config.get('enabled', False):
            maintenance_message = config.get('message') or "システムメンテナンス中です。しばらくお待ちください。"
            
            logger.warning(
                "Maintenance mode is enabled",
                extra={"maintenance_message": maintenance_message}
            )
            raise MaintenanceError(maintenance_message)
            
    except MaintenanceError:
        # 既にMaintenanceErrorの場合は再発生
        raise
    except Exception as e:
        logger.warning(
            "Failed to check maintenance mode using unified utils, allowing request",
            extra={"error": str(e)}
        )
        return  # エラー時も利用可能とみなす（フェイルセーフ）  # 予期しないエラーでも利用可能とみなす


async def is_maintenance_mode() -> bool:
    """
    メンテナンスモード非同期チェック（統一Parameter Store使用）
    
    Parameter Storeからメンテナンス状態を非同期で取得する。
    
    Returns:
        bool: メンテナンス中の場合True、利用可能な場合False
        
    Notes:
        - フェイルセーフ設計: エラー時はFalse（利用可能）を返却
        - 新しい統一Parameter Store utils使用
    """
    try:
        from .parameter_store import get_maintenance_config
        
        # 新しい統一Parameter Store機能を使用
        config = get_maintenance_config()
        maintenance_enabled = config.get('enabled', False)
        
        if maintenance_enabled:
            logger.warning("Maintenance mode is enabled (async check)")
            
        return maintenance_enabled
        
    except Exception as e:
        logger.warning(
            "Failed to check maintenance mode using unified utils, assuming service is available",
            extra={"error": str(e)}
        )
        return False


def get_maintenance_message() -> Optional[str]:
    """
    メンテナンスメッセージ取得（統一Parameter Store使用）
    
    Returns:
        Optional[str]: メンテナンスメッセージ、取得できない場合はNone
    """
    try:
        from .parameter_store import get_maintenance_config
        
        # 新しい統一Parameter Store機能を使用
        config = get_maintenance_config()
        return config.get('message')
        
    except Exception as e:
        logger.debug(
            "Failed to get maintenance message using unified utils",
            extra={"error": str(e)}
        )
        return None


# maintenance_required デコレータは削除されました。
# メンテナンスチェックは FastAPI middleware (maintenance_check_middleware) で一元化されています。
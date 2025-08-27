"""
Notification Service Configuration

環境変数ベースの設定管理。
Pydantic Settings を使用した型安全な設定管理。
"""

import os
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field

from homebiyori_common import get_logger

logger = get_logger(__name__)


class NotificationSettings(BaseSettings):
    """Notification Service 設定
    
    ■実処理で必要な環境変数のみ■
    - CORE_TABLE_NAME: 通知データ管理で使用
    - ENVIRONMENT: FastAPI docs制御で使用
    """
    
    # 基本設定
    environment: str = Field(default="development", env="ENVIRONMENT")
    
    # DynamoDB設定（CORE_TABLE_NAMEのみ使用）
    core_table_name: str = Field(..., env="CORE_TABLE_NAME")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._log_config()
        
    def _log_config(self):
        """設定情報をログ出力（機密情報は除外）"""
        safe_config = {
            "environment": self.environment,
            "core_table_name": self.core_table_name
        }
        
        logger.info("Notification service configuration loaded", extra=safe_config)


@lru_cache()
def get_settings() -> NotificationSettings:
    """
    設定インスタンスのシングルトン取得
    
    Returns:
        NotificationSettings: 設定インスタンス
    """
    return NotificationSettings()
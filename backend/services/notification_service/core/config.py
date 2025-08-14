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
    """Notification Service 設定"""
    
    # 基本設定
    environment: str = Field(default="development", env="ENVIRONMENT")
    service_name: str = Field(default="notification_service", env="SERVICE_NAME")
    
    # DynamoDB設定
    dynamodb_table: str = Field(..., env="CORE_TABLE_NAME")
    dynamodb_region: str = Field(default="ap-northeast-1", env="AWS_DEFAULT_REGION")
    
    # 内部API設定
    internal_api_key: str = Field(..., env="INTERNAL_API_KEY")
    
    # 管理者API設定
    admin_api_key: Optional[str] = Field(None, env="ADMIN_API_KEY")
    
    # 通知設定
    default_notification_ttl_days: int = Field(default=30, env="DEFAULT_NOTIFICATION_TTL_DAYS")
    max_notifications_per_user: int = Field(default=100, env="MAX_NOTIFICATIONS_PER_USER")
    
    # ページネーション設定
    default_page_size: int = Field(default=20, env="DEFAULT_PAGE_SIZE")
    max_page_size: int = Field(default=100, env="MAX_PAGE_SIZE")
    
    # ログ設定
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # 機能フラグ
    enable_debug_logging: bool = Field(default=False, env="ENABLE_DEBUG_LOGGING")
    enable_admin_notifications: bool = Field(default=True, env="ENABLE_ADMIN_NOTIFICATIONS")
    enable_batch_operations: bool = Field(default=True, env="ENABLE_BATCH_OPERATIONS")
    
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
            "service_name": self.service_name,
            "dynamodb_table": self.dynamodb_table,
            "dynamodb_region": self.dynamodb_region,
            "default_notification_ttl_days": self.default_notification_ttl_days,
            "max_notifications_per_user": self.max_notifications_per_user,
            "default_page_size": self.default_page_size,
            "max_page_size": self.max_page_size,
            "log_level": self.log_level,
            "enable_debug_logging": self.enable_debug_logging,
            "enable_admin_notifications": self.enable_admin_notifications,
            "enable_batch_operations": self.enable_batch_operations,
            "has_internal_api_key": bool(self.internal_api_key),
            "has_admin_api_key": bool(self.admin_api_key)
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
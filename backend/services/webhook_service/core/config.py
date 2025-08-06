"""
Webhook Service Configuration

環境変数ベースの設定管理。
Pydantic Settings を使用した型安全な設定管理。
"""

import os
from functools import lru_cache
from typing import Optional
from pydantic import BaseSettings, Field

from homebiyori_common import get_logger

logger = get_logger(__name__)


class WebhookSettings(BaseSettings):
    """Webhook Service 設定"""
    
    # 基本設定
    environment: str = Field(default="development", env="ENVIRONMENT")
    service_name: str = Field(default="webhook-service", env="SERVICE_NAME")
    
    # DynamoDB設定
    dynamodb_table: str = Field(..., env="DYNAMODB_TABLE")
    dynamodb_region: str = Field(default="ap-northeast-1", env="AWS_DEFAULT_REGION")
    
    # Stripe設定
    stripe_webhook_secret: str = Field(..., env="STRIPE_WEBHOOK_SECRET")
    stripe_api_key: Optional[str] = Field(None, env="STRIPE_API_KEY")
    
    # SQS設定 (TTL更新キュー)
    ttl_update_queue_url: str = Field(..., env="TTL_UPDATE_QUEUE_URL")
    
    # 内部API設定
    internal_api_base_url: str = Field(..., env="INTERNAL_API_BASE_URL") 
    internal_api_key: str = Field(..., env="INTERNAL_API_KEY")
    
    # ログ設定
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # 機能フラグ
    enable_debug_logging: bool = Field(default=False, env="ENABLE_DEBUG_LOGGING")
    enable_webhook_validation: bool = Field(default=True, env="ENABLE_WEBHOOK_VALIDATION")
    
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
            "log_level": self.log_level,
            "enable_debug_logging": self.enable_debug_logging,
            "enable_webhook_validation": self.enable_webhook_validation,
            "has_stripe_webhook_secret": bool(self.stripe_webhook_secret),
            "has_stripe_api_key": bool(self.stripe_api_key),
            "has_internal_api_key": bool(self.internal_api_key)
        }
        
        logger.info("Webhook service configuration loaded", extra=safe_config)


@lru_cache()
def get_settings() -> WebhookSettings:
    """
    設定インスタンスのシングルトン取得
    
    Returns:
        WebhookSettings: 設定インスタンス
    """
    return WebhookSettings()
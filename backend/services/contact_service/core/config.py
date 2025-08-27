"""
Contact Service Configuration

環境変数ベースの設定管理。
Pydantic Settings を使用した型安全な設定管理。
AWS SNS通知設定を含む。
"""

import os
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field

from homebiyori_common import get_logger

logger = get_logger(__name__)


class ContactSettings(BaseSettings):
    """Contact Service 設定
    
    ■実処理で必要な環境変数のみ■
    - SNS_TOPIC_ARN: SNS通知で使用
    - ENVIRONMENT: FastAPI docs制御で使用
    """
    
    # 基本設定
    environment: str = Field(default="development", env="ENVIRONMENT")
    
    # AWS SNS設定（運営者通知用・必須）
    sns_topic_arn: str = Field(..., env="SNS_TOPIC_ARN")
    
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
            "has_sns_topic_arn": bool(self.sns_topic_arn)
        }
        
        logger.info("Contact service configuration loaded", extra=safe_config)


@lru_cache()
def get_settings() -> ContactSettings:
    """
    設定インスタンスのシングルトン取得
    
    Returns:
        ContactSettings: 設定インスタンス
    """
    return ContactSettings()
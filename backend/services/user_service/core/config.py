"""
User Service Configuration

環境変数ベースの設定管理。
Pydantic Settings を使用した型安全な設定管理。

webhook_serviceアーキテクチャに基づく統一設定パターン。
user_service固有の4テーブル構成に対応。
"""

import os
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field

from homebiyori_common import get_logger

logger = get_logger(__name__)


class UserSettings(BaseSettings):
    """User Service 設定
    
    ■DynamoDB 4テーブル構成■
    - core: ユーザープロフィール（永続保存）
    - chats: チャット履歴（TTL管理）
    - fruits: 実の情報（永続保存）
    - feedback: 解約理由アンケート（永続保存）
    """
    
    # 基本設定
    environment: str = Field(default="development", env="ENVIRONMENT")
    service_name: str = Field(default="user-service", env="SERVICE_NAME")
    
    # DynamoDB設定（4テーブル構成）
    core_table_name: str = Field(..., env="CORE_TABLE_NAME")
    chats_table_name: str = Field(..., env="CHATS_TABLE_NAME")
    fruits_table_name: str = Field(..., env="FRUITS_TABLE_NAME")
    feedback_table_name: str = Field(..., env="FEEDBACK_TABLE_NAME")
    dynamodb_region: str = Field(default="ap-northeast-1", env="AWS_DEFAULT_REGION")
    
    # 認証設定
    cognito_user_pool_id: Optional[str] = Field(None, env="COGNITO_USER_POOL_ID")
    cognito_client_id: Optional[str] = Field(None, env="COGNITO_CLIENT_ID")
    
    # 外部サービス連携
    billing_service_url: Optional[str] = Field(None, env="BILLING_SERVICE_URL")
    chat_service_url: Optional[str] = Field(None, env="CHAT_SERVICE_URL")
    tree_service_url: Optional[str] = Field(None, env="TREE_SERVICE_URL")
    
    # ログ設定
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # 機能フラグ
    enable_debug_logging: bool = Field(default=False, env="ENABLE_DEBUG_LOGGING")
    enable_profile_validation: bool = Field(default=True, env="ENABLE_PROFILE_VALIDATION")
    enable_onboarding_flow: bool = Field(default=True, env="ENABLE_ONBOARDING_FLOW")
    
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
            "core_table_name": self.core_table_name,
            "chats_table_name": self.chats_table_name,
            "fruits_table_name": self.fruits_table_name,
            "feedback_table_name": self.feedback_table_name,
            "dynamodb_region": self.dynamodb_region,
            "log_level": self.log_level,
            "enable_debug_logging": self.enable_debug_logging,
            "enable_profile_validation": self.enable_profile_validation,
            "enable_onboarding_flow": self.enable_onboarding_flow,
            "has_cognito_user_pool_id": bool(self.cognito_user_pool_id),
            "has_cognito_client_id": bool(self.cognito_client_id),
            "has_billing_service_url": bool(self.billing_service_url),
            "has_chat_service_url": bool(self.chat_service_url),
            "has_tree_service_url": bool(self.tree_service_url)
        }
        
        logger.info("User service configuration loaded", extra=safe_config)


@lru_cache()
def get_settings() -> UserSettings:
    """
    設定インスタンスのシングルトン取得
    
    Returns:
        UserSettings: 設定インスタンス
    """
    return UserSettings()
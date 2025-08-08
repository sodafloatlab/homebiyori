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
    """Contact Service 設定"""
    
    # 基本設定
    environment: str = Field(default="development", env="ENVIRONMENT")
    service_name: str = Field(default="contact_service", env="SERVICE_NAME")
    
    # DynamoDB設定（問い合わせ履歴保存用・オプション）
    dynamodb_table: Optional[str] = Field(None, env="DYNAMODB_TABLE")
    dynamodb_region: str = Field(default="ap-northeast-1", env="AWS_DEFAULT_REGION")
    
    # AWS SNS設定（運営者通知用）
    sns_topic_arn: str = Field(..., env="SNS_TOPIC_ARN")
    sns_region: str = Field(default="ap-northeast-1", env="AWS_DEFAULT_REGION")
    
    # 内部API設定
    internal_api_key: Optional[str] = Field(None, env="INTERNAL_API_KEY")
    
    # 管理者API設定
    admin_api_key: Optional[str] = Field(None, env="ADMIN_API_KEY")
    
    # 問い合わせ設定
    max_inquiries_per_hour: int = Field(default=10, env="MAX_INQUIRIES_PER_HOUR")
    max_inquiries_per_day: int = Field(default=50, env="MAX_INQUIRIES_PER_DAY")
    
    # 通知設定
    enable_email_notifications: bool = Field(default=True, env="ENABLE_EMAIL_NOTIFICATIONS")
    enable_slack_notifications: bool = Field(default=False, env="ENABLE_SLACK_NOTIFICATIONS")
    
    # 緊急度別返信時間設定（時間単位）
    response_time_low_hours: int = Field(default=72, env="RESPONSE_TIME_LOW_HOURS")  # 3日
    response_time_medium_hours: int = Field(default=24, env="RESPONSE_TIME_MEDIUM_HOURS")  # 1日
    response_time_high_hours: int = Field(default=4, env="RESPONSE_TIME_HIGH_HOURS")  # 4時間
    
    # 自動分類設定
    enable_auto_categorization: bool = Field(default=True, env="ENABLE_AUTO_CATEGORIZATION")
    enable_auto_priority_detection: bool = Field(default=True, env="ENABLE_AUTO_PRIORITY_DETECTION")
    
    # セキュリティ設定
    enable_rate_limiting: bool = Field(default=True, env="ENABLE_RATE_LIMITING")
    enable_spam_detection: bool = Field(default=True, env="ENABLE_SPAM_DETECTION")
    
    # ログ設定
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # 機能フラグ
    enable_debug_logging: bool = Field(default=False, env="ENABLE_DEBUG_LOGGING")
    enable_inquiry_history_saving: bool = Field(default=True, env="ENABLE_INQUIRY_HISTORY_SAVING")
    
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
            "sns_region": self.sns_region,
            "max_inquiries_per_hour": self.max_inquiries_per_hour,
            "max_inquiries_per_day": self.max_inquiries_per_day,
            "enable_email_notifications": self.enable_email_notifications,
            "enable_slack_notifications": self.enable_slack_notifications,
            "response_time_low_hours": self.response_time_low_hours,
            "response_time_medium_hours": self.response_time_medium_hours,
            "response_time_high_hours": self.response_time_high_hours,
            "enable_auto_categorization": self.enable_auto_categorization,
            "enable_auto_priority_detection": self.enable_auto_priority_detection,
            "enable_rate_limiting": self.enable_rate_limiting,
            "enable_spam_detection": self.enable_spam_detection,
            "log_level": self.log_level,
            "enable_debug_logging": self.enable_debug_logging,
            "enable_inquiry_history_saving": self.enable_inquiry_history_saving,
            "has_sns_topic_arn": bool(self.sns_topic_arn),
            "has_internal_api_key": bool(self.internal_api_key),
            "has_admin_api_key": bool(self.admin_api_key)
        }
        
        logger.info("Contact service configuration loaded", extra=safe_config)
        
    def get_response_time_text(self, priority: str) -> str:
        """緊急度に応じた返信時間テキストを取得"""
        time_mapping = {
            "low": f"{self.response_time_low_hours // 24}営業日以内",
            "medium": f"{self.response_time_medium_hours}時間以内", 
            "high": f"{self.response_time_high_hours}時間以内（緊急対応）"
        }
        return time_mapping.get(priority, "1-3営業日以内")


@lru_cache()
def get_settings() -> ContactSettings:
    """
    設定インスタンスのシングルトン取得
    
    Returns:
        ContactSettings: 設定インスタンス
    """
    return ContactSettings()
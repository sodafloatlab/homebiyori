"""
User Service Core Configuration

core設定モジュールの統合エクスポート。
webhook_serviceアーキテクチャに基づく設定管理パターン。
"""

from .config import UserSettings, get_settings

__all__ = [
    "UserSettings",
    "get_settings"
]
"""
統一例外処理モジュール

Homebiyori（ほめびより）全体で使用される例外クラスを定義。
- 基底例外クラス
- 各種専用例外
- エラーコード統一
- ログ連携機能
"""

from .custom_exceptions import (
    HomebiyoriError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    DatabaseError,
    ExternalServiceError,
    MaintenanceError,
    NotFoundError,
    ConflictError,
    RateLimitError
)

__all__ = [
    "HomebiyoriError",
    "ValidationError", 
    "AuthenticationError",
    "AuthorizationError",
    "DatabaseError",
    "ExternalServiceError",
    "MaintenanceError",
    "NotFoundError",
    "ConflictError", 
    "RateLimitError"
]
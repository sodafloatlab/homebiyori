"""
homebiyori-common-layer パッケージ

Homebiyori（ほめびより）の全Lambda関数で共通利用する基盤機能を提供。
- データベース操作統一
- 認証・認可処理
- ログ・例外処理
- 日時・バリデーション処理
- メンテナンス制御

Version: 1.0.0
"""

__version__ = "1.1.0"  # ミドルウェア機能追加によりバージョンアップ
__author__ = "Homebiyori Development Team"

# パッケージレベルでの主要クラス・関数エクスポート
from .utils.datetime_utils import get_current_jst, to_jst_string, parse_jst_datetime
from .utils.response_utils import success_response, error_response
from .database import DynamoDBClient
from .logger import get_logger
from .exceptions import (
    HomebiyoriError,
    ValidationError,
    AuthenticationError, 
    DatabaseError,
    ExternalServiceError,
    MaintenanceError
)

# 新規追加: 共通ミドルウェア機能（utilsに移動）
from .utils.middleware import (
    maintenance_check_middleware,
    get_current_user_id
)
from .utils.maintenance import (
    check_maintenance_mode,
    is_maintenance_mode,
    get_maintenance_message,
    maintenance_required
)

__all__ = [
    "get_current_jst",
    "to_jst_string", 
    "parse_jst_datetime",
    "success_response",
    "error_response", 
    "DynamoDBClient",
    "get_logger",
    "HomebiyoriError",
    "ValidationError",
    "AuthenticationError",
    "DatabaseError", 
    "ExternalServiceError",
    "MaintenanceError",
    # 新規追加: ミドルウェア・メンテナンス機能
    "maintenance_check_middleware",
    "get_current_user_id",
    "check_maintenance_mode",
    "is_maintenance_mode",
    "get_maintenance_message", 
    "maintenance_required"
]
"""
構造化ログシステム

Lambda環境に最適化されたJSON形式の構造化ログを提供。
- CloudWatch Logs最適化
- パフォーマンス重視
- セキュリティ情報フィルタリング
- 統一ログフォーマット
"""

import logging
import json
import os
import sys
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional, Union
from ..utils.datetime_utils import get_current_jst, to_jst_string


class LogLevel(Enum):
    """ログレベル定義"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class HomebiyoriFormatter(logging.Formatter):
    """
    Homebiyori専用構造化ログフォーマッター
    
    JSON形式でCloudWatch Logsに最適化されたログを出力。
    機密情報の自動マスキング機能付き。
    """
    
    # マスキング対象フィールド
    SENSITIVE_FIELDS = {
        'password', 'token', 'secret', 'key', 'auth', 'credential',
        'stripe_secret_key', 'jwt', 'session_id', 'api_key'
    }
    
    def format(self, record: logging.LogRecord) -> str:
        """ログレコードをJSON形式にフォーマット"""
        
        # 基本ログ情報
        log_entry = {
            "timestamp": to_jst_string(get_current_jst()),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Lambda環境情報
        if hasattr(record, 'aws_request_id'):
            log_entry["aws_request_id"] = record.aws_request_id
        
        # 環境情報
        log_entry["environment"] = os.getenv("ENVIRONMENT", "unknown")
        log_entry["service"] = os.getenv("SERVICE_NAME", "homebiyori")
        
        # 追加情報（extraフィールド）
        if hasattr(record, 'extra') and record.extra:
            extra_data = self._mask_sensitive_data(record.extra)
            log_entry["extra"] = extra_data
        
        # エラー情報
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info)
            }
        
        # ユーザーID（可能な場合）
        if hasattr(record, 'user_id'):
            log_entry["user_id"] = record.user_id
        
        # パフォーマンス情報
        if hasattr(record, 'duration_ms'):
            log_entry["duration_ms"] = record.duration_ms
        
        return json.dumps(log_entry, ensure_ascii=False, default=str)
    
    def _mask_sensitive_data(self, data: Any) -> Any:
        """機密データをマスキング"""
        if isinstance(data, dict):
            masked = {}
            for key, value in data.items():
                if any(sensitive in key.lower() for sensitive in self.SENSITIVE_FIELDS):
                    masked[key] = "***MASKED***"
                else:
                    masked[key] = self._mask_sensitive_data(value)
            return masked
        elif isinstance(data, list):
            return [self._mask_sensitive_data(item) for item in data]
        else:
            return data


class HomebiyoriLogger:
    """
    Homebiyori専用ロガークラス
    
    構造化ログ出力とLambda環境最適化機能を提供。
    """
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self._setup_logger()
    
    def _setup_logger(self):
        """ロガー初期設定"""
        if not self.logger.handlers:
            # コンソールハンドラー設定（Lambda環境用）
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(HomebiyoriFormatter())
            self.logger.addHandler(handler)
            self.logger.setLevel(self._get_log_level())
            self.logger.propagate = False
    
    def _get_log_level(self) -> int:
        """環境変数からログレベルを取得"""
        level_str = os.getenv("LOG_LEVEL", "INFO").upper()
        return getattr(logging, level_str, logging.INFO)
    
    def debug(self, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs):
        """デバッグログ出力"""
        self._log(logging.DEBUG, message, extra, **kwargs)
    
    def info(self, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs):
        """情報ログ出力"""
        self._log(logging.INFO, message, extra, **kwargs)
    
    def warning(self, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs):
        """警告ログ出力"""
        self._log(logging.WARNING, message, extra, **kwargs)
    
    def error(self, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs):
        """エラーログ出力"""
        self._log(logging.ERROR, message, extra, **kwargs)
    
    def critical(self, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs):
        """致命的エラーログ出力"""
        self._log(logging.CRITICAL, message, extra, **kwargs)
    
    def _log(self, level: int, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs):
        """内部ログ出力処理"""
        # extraデータを統合
        log_extra = {}
        if extra:
            log_extra.update(extra)
        log_extra.update(kwargs)
        
        # ログレコード作成時にextraを設定
        record = self.logger.makeRecord(
            name=self.logger.name,
            level=level,
            fn="",
            lno=0,
            msg=message,
            args=(),
            exc_info=None
        )
        
        if log_extra:
            record.extra = log_extra
        
        self.logger.handle(record)


# モジュールレベルロガーキャッシュ
_loggers: Dict[str, HomebiyoriLogger] = {}


def get_logger(name: str) -> HomebiyoriLogger:
    """
    構造化ロガーを取得
    
    Args:
        name: ロガー名（通常は__name__を使用）
    
    Returns:
        HomebiyoriLogger: 構造化ロガーインスタンス
    
    Example:
        >>> logger = get_logger(__name__)
        >>> logger.info("処理開始", extra={"user_id": "123"})
    """
    if name not in _loggers:
        _loggers[name] = HomebiyoriLogger(name)
    return _loggers[name]


def setup_logging(
    level: Union[str, LogLevel] = LogLevel.INFO,
    service_name: Optional[str] = None
) -> None:
    """
    ログシステム初期設定
    
    Args:
        level: ログレベル
        service_name: サービス名（環境変数に設定）
    """
    # 環境変数設定
    if service_name:
        os.environ["SERVICE_NAME"] = service_name
    
    # ログレベル設定
    if isinstance(level, LogLevel):
        os.environ["LOG_LEVEL"] = level.value
    else:
        os.environ["LOG_LEVEL"] = str(level).upper()
    
    # 既存ロガーキャッシュクリア
    _loggers.clear()


def log_performance(func):
    """
    パフォーマンス測定デコレータ
    
    関数の実行時間を自動ログ出力する。
    """
    import functools
    import time
    
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        logger = get_logger(func.__module__)
        start_time = time.time()
        
        try:
            result = func(*args, **kwargs)
            duration_ms = int((time.time() - start_time) * 1000)
            
            logger.info(
                f"関数実行完了: {func.__name__}",
                extra={
                    "function": func.__name__,
                    "duration_ms": duration_ms,
                    "success": True
                }
            )
            
            return result
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            
            logger.error(
                f"関数実行エラー: {func.__name__}",
                extra={
                    "function": func.__name__,
                    "duration_ms": duration_ms,
                    "success": False,
                    "error": str(e)
                }
            )
            raise
    
    return wrapper
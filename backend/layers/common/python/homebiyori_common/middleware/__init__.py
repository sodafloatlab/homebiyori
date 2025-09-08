"""
ミドルウェアモジュール
FastAPI アプリケーション用の共通ミドルウェア機能を統一提供

4つの専門機能:
1. メンテナンスチェック - maintenance.py
2. 認証チェック - authentication.py  
3. エラーハンドリング - error_handling.py
4. アクセス制御 - access_control.py
"""

# メンテナンスチェック
from .maintenance import maintenance_check_middleware

# 認証チェック
from .authentication import get_current_user_id

# エラーハンドリング
from .error_handling import error_handling_middleware

# アクセス制御
from .access_control import (
    require_access,
    require_authentication_only,
    require_basic_access,
    require_premium_access,
    require_paid_access,
    AccessControlClient,
    AccessControlError,
    get_access_control_client
)

__all__ = [
    # メンテナンス
    'maintenance_check_middleware',
    # 認証
    'get_current_user_id',
    # エラーハンドリング
    'error_handling_middleware',
    # アクセス制御
    'require_access',
    'require_authentication_only',
    'require_basic_access', 
    'require_premium_access',
    'require_paid_access',
    'AccessControlClient',
    'AccessControlError',
    'get_access_control_client'
]
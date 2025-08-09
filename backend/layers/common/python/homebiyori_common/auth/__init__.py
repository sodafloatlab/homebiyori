"""
認証・認可関連の共通機能モジュール

Homebiyori（ほめびより）全体で使用される認証・認可機能を提供します。
- Cognito JWT検証
- Lambda間呼び出し認証
- ユーザー情報抽出
"""

from .cognito_utils import (
    get_user_id_from_event,
    get_user_email_from_event,
    extract_user_claims,
    CognitoAuthError
)
# jwt_validator module removed due to non-usage

__all__ = [
    "get_user_id_from_event",
    "get_user_email_from_event", 
    "extract_user_claims",
    "CognitoAuthError"
]
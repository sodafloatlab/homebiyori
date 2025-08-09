"""
入力値検証ユーティリティ

Homebiyori（ほめびより）全体で統一される入力検証機能を提供。
- ユーザーID検証
- メールアドレス検証
- 入力値サニタイゼーション
- セキュリティチェック
"""

import re
import html
from typing import Optional, Any
from ..exceptions import ValidationError


# 正規表現パターン定義
USER_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{1,50}$')
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
# ニックネームで使用可能な文字の正規表現（日本語、英数字、アンダースコア、ハイフン）
NICKNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$')


def validate_user_id(user_id: str, field_name: str = "user_id") -> str:
    """
    ユーザーID検証
    
    Args:
        user_id: 検証対象のユーザーID
        field_name: エラー時のフィールド名
        
    Returns:
        str: 検証済みユーザーID
        
    Raises:
        ValidationError: 検証失敗時
    """
    if not user_id:
        raise ValidationError(f"{field_name}が空です", field=field_name, value=user_id)
    
    if not isinstance(user_id, str):
        raise ValidationError(f"{field_name}は文字列である必要があります", field=field_name, value=user_id)
    
    if not USER_ID_PATTERN.match(user_id):
        raise ValidationError(
            f"{field_name}は英数字、アンダースコア、ハイフンのみ使用可能です（1-50文字）",
            field=field_name,
            value=user_id
        )
    
    return user_id


def validate_email(email: str, field_name: str = "email") -> str:
    """
    メールアドレス検証
    
    Args:
        email: 検証対象のメールアドレス
        field_name: エラー時のフィールド名
        
    Returns:
        str: 検証済みメールアドレス
        
    Raises:
        ValidationError: 検証失敗時
    """
    if not email:
        raise ValidationError(f"{field_name}が空です", field=field_name, value=email)
    
    if not isinstance(email, str):
        raise ValidationError(f"{field_name}は文字列である必要があります", field=field_name, value=email)
    
    if len(email) > 254:  # RFC 5321制限
        raise ValidationError(f"{field_name}が長すぎます（254文字以内）", field=field_name, value=email)
    
    if not EMAIL_PATTERN.match(email):
        raise ValidationError(f"{field_name}の形式が正しくありません", field=field_name, value=email)
    
    return email.lower()


def sanitize_input(input_str: str, max_length: Optional[int] = None) -> str:
    """
    入力値サニタイゼーション
    
    Args:
        input_str: サニタイズ対象の文字列
        max_length: 最大文字数制限
        
    Returns:
        str: サニタイズ済み文字列
    """
    if not isinstance(input_str, str):
        return str(input_str)
    
    # HTMLエスケープ
    sanitized = html.escape(input_str.strip())
    
    # 長さ制限
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized


def validate_text_input(
    text: str, 
    field_name: str,
    min_length: int = 1,
    max_length: int = 2000,
    allow_empty: bool = False
) -> str:
    """
    テキスト入力検証
    
    Args:
        text: 検証対象のテキスト
        field_name: エラー時のフィールド名
        min_length: 最小文字数
        max_length: 最大文字数
        allow_empty: 空文字を許可するか
        
    Returns:
        str: 検証済みテキスト
        
    Raises:
        ValidationError: 検証失敗時
    """
    if text is None:
        if allow_empty:
            return ""
        raise ValidationError(f"{field_name}が空です", field=field_name)
    
    if not isinstance(text, str):
        raise ValidationError(f"{field_name}は文字列である必要があります", field=field_name, value=text)
    
    text = text.strip()
    
    if not text and not allow_empty:
        raise ValidationError(f"{field_name}が空です", field=field_name, value=text)
    
    if len(text) < min_length:
        raise ValidationError(
            f"{field_name}は{min_length}文字以上である必要があります",
            field=field_name,
            value=text
        )
    
    if len(text) > max_length:
        raise ValidationError(
            f"{field_name}は{max_length}文字以内である必要があります",
            field=field_name,
            value=text
        )
    
    return text


def validate_positive_integer(
    value: Any,
    field_name: str,
    min_value: int = 1,
    max_value: Optional[int] = None
) -> int:
    """
    正の整数検証
    
    Args:
        value: 検証対象の値
        field_name: エラー時のフィールド名
        min_value: 最小値
        max_value: 最大値
        
    Returns:
        int: 検証済み整数
        
    Raises:
        ValidationError: 検証失敗時
    """
    try:
        int_value = int(value)
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name}は整数である必要があります", field=field_name, value=value)
    
    if int_value < min_value:
        raise ValidationError(
            f"{field_name}は{min_value}以上である必要があります",
            field=field_name,
            value=int_value
        )
    
    if max_value is not None and int_value > max_value:
        raise ValidationError(
            f"{field_name}は{max_value}以下である必要があります",
            field=field_name,
            value=int_value
        )
    
    return int_value


def validate_nickname(nickname: str, field_name: str = "nickname") -> str:
    """
    ニックネーム検証
    
    Args:
        nickname: 検証対象のニックネーム
        field_name: エラー時のフィールド名
        
    Returns:
        str: 検証済みニックネーム
        
    Raises:
        ValidationError: 検証失敗時
    """
    # 最初に文字数、空文字、Noneのチェックを行う
    validated_nickname = validate_text_input(
        text=nickname,
        field_name=field_name,
        min_length=1,
        max_length=20,  # user_service/models.py の定義と一致させる
        allow_empty=False
    )
    
    # 次に、許可された文字種のみかチェックする
    if not NICKNAME_PATTERN.match(validated_nickname):
        raise ValidationError(
            f"{field_name}には日本語、英数字、アンダースコア(_)、ハイフン(-)のみ使用可能です",
            field=field_name,
            value=nickname
        )
        
    return validated_nickname

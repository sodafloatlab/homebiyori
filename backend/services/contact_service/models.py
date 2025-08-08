"""
Contact Service - Pydanticデータモデル定義

■設計概要■
Homebiyori（ほめびより）の問い合わせ管理サービスにおける
データモデルをPydantic v2で定義。型安全性とバリデーションを提供。

■設計原則■
- プライバシーファースト: 個人情報の適切な管理
- バリデーション厳格化: 不正データの侵入防止
- 運営者通知: AWS SNS経由での即座な通知
- 問い合わせ分類: 適切な対応チーム振り分け

■タイムゾーン統一■
全ての日時情報はUTC（協定世界時）で管理。

■バリデーション戦略■
- 入力検証: 悪意のあるデータ防止
- 文字数制限: DoS攻撃防止
- 文字種制限: XSS・インジェクション防止
- メール形式検証: 返信可能性確保

■モデル一覧■
1. ContactInquiry - 問い合わせ情報（作成用）
2. ContactInquiryResponse - 問い合わせ応答用
3. ContactCategory - 問い合わせカテゴリ分類
4. ContactPriority - 緊急度分類
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum
import re
from email_validator import validate_email, EmailNotValidError

# homebiyori-common-layer からバリデーション機能をインポート
from homebiyori_common.utils.datetime_utils import get_current_jst


# =======================================
# 列挙型定義
# =======================================


class ContactCategory(str, Enum):
    """
    問い合わせカテゴリ分類
    
    各カテゴリは適切な対応チームに振り分けられる:
    - GENERAL: 一般的な質問・要望
    - BUG_REPORT: バグ報告・不具合
    - FEATURE_REQUEST: 新機能要望
    - ACCOUNT_ISSUE: アカウント関連問題
    - PAYMENT: 決済・課金関連
    - PRIVACY: プライバシー・データ削除要求
    - OTHER: その他
    """
    
    GENERAL = "general"
    BUG_REPORT = "bug_report"
    FEATURE_REQUEST = "feature_request" 
    ACCOUNT_ISSUE = "account_issue"
    PAYMENT = "payment"
    PRIVACY = "privacy"
    OTHER = "other"


class ContactPriority(str, Enum):
    """
    問い合わせ緊急度分類
    
    緊急度に応じて通知方法と対応時間が決定される:
    - LOW: 通常対応（1-3営業日）
    - MEDIUM: 優先対応（1営業日以内）
    - HIGH: 緊急対応（即時）
    """
    
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# =======================================
# バリデーション関数
# =======================================


def validate_subject(subject: str) -> str:
    """
    件名バリデーション
    
    Args:
        subject: 検証対象の件名
    
    Returns:
        str: バリデーション済み件名
    
    Raises:
        ValueError: 不正な件名の場合
    """
    if not subject or not subject.strip():
        raise ValueError("件名を入力してください")
    
    subject = subject.strip()
    
    # 長すぎる件名を制限
    if len(subject) > 100:
        raise ValueError("件名は100文字以内で入力してください")
    
    # 不適切な文字の検証
    forbidden_patterns = [
        r'<script',
        r'javascript:',
        r'onload=',
        r'onerror=',
    ]
    
    for pattern in forbidden_patterns:
        if re.search(pattern, subject, re.IGNORECASE):
            raise ValueError("件名に不適切な文字が含まれています")
    
    return subject


def validate_message_content(content: str) -> str:
    """
    メッセージ内容バリデーション
    
    Args:
        content: 検証対象のメッセージ内容
    
    Returns:
        str: バリデーション済みメッセージ内容
    
    Raises:
        ValueError: 不正なメッセージ内容の場合
    """
    if not content or not content.strip():
        raise ValueError("お問い合わせ内容を入力してください")
    
    content = content.strip()
    
    # 長すぎるメッセージを制限
    if len(content) > 5000:
        raise ValueError("お問い合わせ内容は5000文字以内で入力してください")
    
    # 最低限の文字数チェック
    if len(content) < 10:
        raise ValueError("お問い合わせ内容は10文字以上で入力してください")
    
    # 不適切な文字の検証
    forbidden_patterns = [
        r'<script',
        r'javascript:',
        r'onload=',
        r'onerror=',
    ]
    
    for pattern in forbidden_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            raise ValueError("お問い合わせ内容に不適切な文字が含まれています")
    
    return content


# =======================================
# メインデータモデル
# =======================================


class ContactInquiry(BaseModel):
    """
    問い合わせ情報（作成用）
    
    ■データ設計■
    フロントエンドから送信される問い合わせ情報。
    運営者への通知に使用され、必要に応じてDynamoDBに保存。
    
    ■フィールド設計■
    - name: お問い合わせ者名（1-50文字）
    - email: 返信用メールアドレス
    - subject: 件名（1-100文字）
    - message: お問い合わせ内容（10-5000文字）
    - category: 問い合わせカテゴリ
    - priority: 緊急度（自動判定またはユーザー選択）
    - user_id: 認証済みユーザーの場合のCognito sub（任意）
    - user_agent: ブラウザ情報（デバッグ用・任意）
    
    ■プライバシー保護■
    個人情報は問い合わせ対応のみに使用し、適切に管理される。
    """
    
    name: str = Field(
        ...,
        description="お問い合わせ者名",
        min_length=1,
        max_length=50,
    )
    
    email: str = Field(
        ...,
        description="返信用メールアドレス",
        min_length=5,
        max_length=100,
    )
    
    subject: str = Field(
        ...,
        description="件名",
        min_length=1,
        max_length=100,
    )
    
    message: str = Field(
        ...,
        description="お問い合わせ内容",
        min_length=10,
        max_length=5000,
    )
    
    category: ContactCategory = Field(
        ContactCategory.GENERAL,
        description="問い合わせカテゴリ",
    )
    
    priority: ContactPriority = Field(
        ContactPriority.MEDIUM,
        description="緊急度",
    )
    
    user_id: Optional[str] = Field(
        None,
        description="認証済みユーザーのCognito sub（任意）",
        min_length=36,
        max_length=36,
        pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    )
    
    user_agent: Optional[str] = Field(
        None,
        description="ブラウザ情報（デバッグ用）",
        max_length=500,
    )
    
    @field_validator("name")
    @classmethod
    def validate_name_field(cls, v):
        """お問い合わせ者名のバリデーション"""
        if not v or not v.strip():
            raise ValueError("お名前を入力してください")
        
        v = v.strip()
        
        # 不適切な文字の検証
        if re.search(r'[<>"\';\\]', v):
            raise ValueError("お名前に不適切な文字が含まれています")
        
        return v
    
    @field_validator("email")
    @classmethod
    def validate_email_field(cls, v):
        """メールアドレスのバリデーション"""
        try:
            # email-validatorを使用して厳密な検証
            validated_email = validate_email(v)
            return validated_email.email
        except EmailNotValidError as e:
            raise ValueError(f"有効なメールアドレスを入力してください: {str(e)}")
    
    @field_validator("subject")
    @classmethod
    def validate_subject_field(cls, v):
        """件名のバリデーション"""
        return validate_subject(v)
    
    @field_validator("message")
    @classmethod
    def validate_message_field(cls, v):
        """メッセージ内容のバリデーション"""
        return validate_message_content(v)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "山田太郎",
                "email": "user@example.com",
                "subject": "アプリの使い方について",
                "message": "いつもHomebiyoriを利用させていただいております。キャラクターの選択方法について質問があります...",
                "category": "general",
                "priority": "medium",
                "user_id": "12345678-1234-5678-9012-123456789012"
            }
        }
    )


class ContactInquiryResponse(BaseModel):
    """
    問い合わせ応答用モデル
    
    ■機能概要■
    問い合わせ送信後のレスポンスデータ。
    運営者への通知結果とお問い合わせIDを含む。
    """
    
    inquiry_id: str = Field(
        ...,
        description="問い合わせ固有ID（UUID）",
    )
    
    submitted_at: datetime = Field(
        default_factory=get_current_jst,
        description="送信日時（UTC）",
    )
    
    category: ContactCategory = Field(
        ...,
        description="問い合わせカテゴリ",
    )
    
    priority: ContactPriority = Field(
        ...,
        description="緊急度",
    )
    
    notification_sent: bool = Field(
        ...,
        description="運営者通知送信成功フラグ",
    )
    
    estimated_response_time: str = Field(
        ...,
        description="予想返信時間（テキスト）",
    )
    
    model_config = ConfigDict(
        json_encoders={datetime: lambda v: v.isoformat()},
        json_schema_extra={
            "example": {
                "inquiry_id": "12345678-1234-5678-9012-123456789012",
                "submitted_at": "2024-08-07T12:00:00Z",
                "category": "general",
                "priority": "medium",
                "notification_sent": True,
                "estimated_response_time": "1営業日以内にご返信いたします"
            }
        }
    )


class ContactStats(BaseModel):
    """
    問い合わせ統計情報（運営者用）
    
    ■機能概要■
    問い合わせの統計データ。管理者ダッシュボードで使用。
    """
    
    total_inquiries: int = Field(..., description="総問い合わせ数")
    pending_inquiries: int = Field(..., description="対応待ち件数")
    resolved_inquiries: int = Field(..., description="解決済み件数")
    average_response_time_hours: float = Field(..., description="平均返信時間（時間）")
    
    category_breakdown: dict = Field(..., description="カテゴリ別内訳")
    priority_breakdown: dict = Field(..., description="緊急度別内訳")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_inquiries": 125,
                "pending_inquiries": 8,
                "resolved_inquiries": 117,
                "average_response_time_hours": 18.5,
                "category_breakdown": {
                    "general": 45,
                    "bug_report": 23,
                    "feature_request": 18,
                    "account_issue": 12,
                    "payment": 8,
                    "privacy": 3,
                    "other": 16
                },
                "priority_breakdown": {
                    "low": 75,
                    "medium": 42,
                    "high": 8
                }
            }
        }
    )
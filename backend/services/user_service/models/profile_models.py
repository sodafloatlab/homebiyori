"""
User Profile Pydantic Models

ユーザープロフィール関連のPydanticモデル定義。
プロフィール管理、AI設定、プロフィール更新に関するデータモデルを提供。

設計原則:
- プライバシーファースト: 個人情報の最小限化
- バリデーション厳格化: 不正データの侵入防止
- JST時刻統一: 日本ユーザー最適化
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional
from datetime import datetime

# homebiyori-common-layer からインポート
from homebiyori_common.utils import validate_nickname
from homebiyori_common.utils.datetime_utils import get_current_jst
from homebiyori_common.models import (
    AICharacterType,
    PraiseLevel,
    InteractionMode
)

class UserProfile(BaseModel):
    """
    ユーザープロフィール情報

    ■データ設計■
    DynamoDB 7テーブル構成 - prod-homebiyori-users:
    - PK: USER#{user_id}
    - SK: PROFILE
    - TTL: なし（永続保存）

    ■フィールド設計■
    - user_id: Cognito User Pool sub（UUID形式）
    - nickname: 表示名（1-20文字）
    - ai_character: 選択AIキャラクター
    - praise_level: 褒めレベル設定
    - interaction_mode: AI対話モード（今日の気分設定）
    - onboarding_completed: 初期設定完了フラグ
    - created_at: 作成日時（JST）
    - updated_at: 更新日時（JST）

    ■プライバシー保護■
    メールアドレス、氏名等の個人識別情報は保存しない。
    Cognito subのみで十分な識別が可能。
    """

    user_id: str = Field(
        ...,
        description="Cognito User Pool sub (UUID形式)",
        min_length=36,
        max_length=36,
        pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    )

    nickname: Optional[str] = Field(
        None, description="ユーザー表示名", min_length=1, max_length=20
    )

    ai_character: AICharacterType = Field(
        AICharacterType.MITTYAN, description="選択AIキャラクター"
    )

    praise_level: PraiseLevel = Field(
        PraiseLevel.NORMAL, description="AI褒めレベル設定"
    )

    interaction_mode: InteractionMode = Field(
        InteractionMode.PRAISE, description="AI対話モード（今日の気分設定）"
    )

    onboarding_completed: bool = Field(False, description="オンボーディング完了フラグ")

    created_at: datetime = Field(
        default_factory=get_current_jst, description="作成日時（JST）"
    )

    updated_at: datetime = Field(
        default_factory=get_current_jst, description="更新日時（JST）"
    )

    @field_validator("nickname")
    @classmethod
    def validate_nickname_field(cls, v):
        """ニックネームのバリデーション"""
        if v is not None:
            try:
                return validate_nickname(v)
            except ValueError as e:
                raise ValueError(str(e))
        return v

    model_config = ConfigDict(
        json_encoders={datetime: lambda v: v.isoformat()},
        json_schema_extra={
            "example": {
                "user_id": "12345678-1234-5678-9012-123456789012",
                "nickname": "ほめママ",
                "ai_character": "mittyan",
                "praise_level": "standard",
                "interaction_mode": "praise",
                "onboarding_completed": True,
            }
        }
    )


class UserProfileUpdate(BaseModel):
    """
    ユーザープロフィール更新用モデル

    ■設計方針■
    部分更新（PATCH）に対応するため、全フィールドをOptionalに設定。
    user_id は更新対象外（認証から自動取得）。
    created_at は更新対象外（初回作成時のみ設定）。
    """

    nickname: Optional[str] = Field(
        None, description="ユーザー表示名", min_length=1, max_length=20
    )

    onboarding_completed: Optional[bool] = Field(
        None, description="オンボーディング完了フラグ"
    )

    @field_validator("nickname")
    @classmethod
    def validate_nickname_field(cls, v):
        """ニックネームのバリデーション"""
        if v is not None:
            try:
                return validate_nickname(v)
            except ValueError as e:
                raise ValueError(str(e))
        return v


class AIPreferences(BaseModel):
    """
    AI設定情報

    ■機能概要■
    ユーザーのAIキャラクター選択、褒めレベル設定、対話モードを管理。
    chat-service での AI応答生成時に参照される。

    ■バリデーション■
    chat_service の LangChain AI実装と連携し、
    利用可能なキャラクター、褒めレベル、対話モードのみ許可。
    """

    ai_character: AICharacterType = Field(..., description="選択AIキャラクター")

    praise_level: PraiseLevel = Field(..., description="AI褒めレベル設定")
    
    interaction_mode: InteractionMode = Field(
        default=InteractionMode.PRAISE, 
        description="AI対話モード（今日の気分設定）"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "ai_character": "madokasan", 
                "praise_level": "deep",
                "interaction_mode": "praise"
            }
        }
    )


class AIPreferencesUpdate(BaseModel):
    """
    AI設定更新用モデル
    
    ■設計方針■
    部分更新（PATCH）に対応するため、全フィールドをOptionalに設定。
    """
    
    ai_character: Optional[AICharacterType] = Field(None, description="選択AIキャラクター")
    
    praise_level: Optional[PraiseLevel] = Field(None, description="AI褒めレベル設定")
    
    interaction_mode: Optional[InteractionMode] = Field(None, description="AI対話モード（今日の気分設定）")

__all__ = [
    "UserProfile",
    "UserProfileUpdate",
    "AIPreferences", 
    "AIPreferencesUpdate"
]

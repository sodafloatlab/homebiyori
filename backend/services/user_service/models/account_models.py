"""
Account Management Pydantic Models

アカウント管理関連のPydanticモデル定義。
オンボーディング、アカウント削除、アカウント状態管理に関するデータモデルを提供。

設計原則:
- 段階的削除プロセス: 安全な削除操作
- プライバシー保護: 最小限の情報収集
- バリデーション厳格化: 不正操作防止
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum

# homebiyori-common-layer からインポート
from homebiyori_common.utils.datetime_utils import get_current_jst
from homebiyori_common.models import (
    AICharacterType,
    PraiseLevel,
    InteractionMode
)


class OnboardingStatus(BaseModel):
    """
    オンボーディング状態情報

    ■設計目的■
    初回ユーザーのオンボーディング進捗を管理。
    完了状態とタイムスタンプを追跡。
    """

    user_id: str = Field(..., description="ユーザーID")
    is_completed: bool = Field(..., description="オンボーディング完了状態")
    completed_at: Optional[datetime] = Field(None, description="完了日時（JST）")

    model_config = ConfigDict(
        json_encoders={datetime: lambda v: v.isoformat()},
        json_schema_extra={
            "example": {
                "user_id": "12345678-1234-5678-9012-123456789012",
                "is_completed": True,
                "completed_at": "2024-08-23T15:30:00+09:00"
            }
        }
    )


class CompleteOnboardingRequest(BaseModel):
    """
    オンボーディング完了リクエスト

    ■設計方針■
    初期設定として必要な情報を一括設定。
    ユーザープロフィールとAI設定を同時に初期化。
    """

    display_name: str = Field(..., description="表示名", min_length=1, max_length=20)
    selected_character: AICharacterType = Field(..., description="選択AIキャラクター")
    interaction_mode: InteractionMode = Field(
        default=InteractionMode.PRAISE, description="初期対話モード"
    )
    praise_level: Optional[PraiseLevel] = Field(
        default=PraiseLevel.NORMAL, description="初期褒めレベル"
    )
    completed_at: datetime = Field(
        default_factory=get_current_jst, description="完了日時（JST）"
    )

    model_config = ConfigDict(
        json_encoders={datetime: lambda v: v.isoformat()},
        json_schema_extra={
            "example": {
                "display_name": "ほめママ",
                "selected_character": "mittyan",
                "interaction_mode": "praise",
                "praise_level": "normal"
            }
        }
    )



class AccountDeletionRequest(BaseModel):
    """
    アカウント削除リクエスト（サービス層用）

    ■設計目的■
    サービス層での削除処理時に使用する統合データモデル。
    """

    reason: Optional[str] = Field(None, description="削除理由", max_length=500)
    deleted_at: datetime = Field(
        default_factory=get_current_jst, description="削除日時（JST）"
    )

    model_config = ConfigDict(
        json_encoders={datetime: lambda v: v.isoformat()}
    )


__all__ = [
    "OnboardingStatus",
    "CompleteOnboardingRequest", 
    "AccountDeletionRequest"
]

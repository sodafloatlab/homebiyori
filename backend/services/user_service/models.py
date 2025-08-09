"""
user-service Pydanticデータモデル定義

■設計概要■
Homebiyori（ほめびより）のユーザー管理サービスにおける
データモデルをPydantic v2で定義。型安全性とバリデーションを提供。

■設計原則■
- プライバシーファースト: 個人情報の最小限化
- バリデーション厳格化: 不正データの侵入防止
- design.md準拠: 最新の要件定義に基づく設計
- 子供情報の分離管理: セキュリティとプライバシー強化

■タイムゾーン統一■
全ての日時情報はJST（日本標準時）で管理。
- 内部処理: JST
- フロントエンド表示: JST
- データベース保存: JST ISO8601形式

■バリデーション戦略■
- 入力検証: 悪意のあるデータ防止
- 文字数制限: DoS攻撃防止
- 文字種制限: XSS・インジェクション防止
- 形式検証: データ整合性保証

■モデル一覧■
1. UserProfile - ユーザープロフィール（基本情報）
2. UserProfileUpdate - プロフィール更新用（部分更新対応）
3. AIPreferences - AI設定（キャラクター・褒めレベル）
4. ChildInfo - 子供情報（名前・生年月日）
5. ChildInfoCreate - 子供情報作成用
6. ChildInfoUpdate - 子供情報更新用（部分更新対応）

■プライバシー保護■
- 子供情報: 最小限の情報のみ（名前・生年月日）
- 個人識別情報: Cognito subのみ、メールアドレス等は非保存
- データ暗号化: DynamoDB暗号化保存
- アクセス制御: ユーザー自身のデータのみアクセス可能
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional
from datetime import datetime, timezone, date
from enum import Enum
import re

# homebiyori-common-layer からバリデーション機能をインポート
from homebiyori_common.utils import validate_nickname
from homebiyori_common.utils.datetime_utils import get_current_jst


# =======================================
# 列挙型定義
# =======================================


class AICharacter(str, Enum):
    """
    利用可能なAIキャラクター

    chat_service の LangChain AI実装と連携。
    キャラクター設定は DynamoDB 経由でリアルタイム反映。
    """

    TAMA = "tama"  # たまさん（下町のベテランおばちゃん）
    MADOKA = "madoka"  # まどか姉さん（バリキャリ共働きママ）
    HIDE = "hide"  # ヒデじい（元教師の詩人）


class PraiseLevel(str, Enum):
    """
    AI褒めレベル設定（2段階）

    各レベルの応答文字数目安:
    - NORMAL: 2-3文程度（適度なサポートと承認）
    - DEEP: 4-5文程度（思慮深く詳細な肯定と共感）
    """

    NORMAL = "normal"  # ノーマル: 適度なサポートと承認
    DEEP = "deep"  # ディープ: 思慮深く詳細な肯定と共感


# =======================================
# 共通バリデーション関数
# =======================================


# JST時刻関数は共通Layerから使用（homebiyori_common.utils.datetime_utils.get_current_jst）








# =======================================
# メインデータモデル
# =======================================


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

    ai_character: AICharacter = Field(
        AICharacter.TAMA, description="選択AIキャラクター"
    )

    praise_level: PraiseLevel = Field(
        PraiseLevel.NORMAL, description="AI褒めレベル設定"
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
                "ai_character": "tama",
                "praise_level": "standard",
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
    ユーザーのAIキャラクター選択と褒めレベル設定を管理。
    chat-service での AI応答生成時に参照される。

    ■バリデーション■
    chat_service の LangChain AI実装と連携し、
    利用可能なキャラクターと褒めレベルのみ許可。
    """

    ai_character: AICharacter = Field(..., description="選択AIキャラクター")

    praise_level: PraiseLevel = Field(..., description="AI褒めレベル設定")

    model_config = ConfigDict(
        json_schema_extra={"example": {"ai_character": "madoka", "praise_level": "deep"}}
    )




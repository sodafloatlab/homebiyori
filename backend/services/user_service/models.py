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
全ての日時情報はUTC（協定世界時）で管理。
- 内部処理: UTC
- フロントエンド表示: JSTに変換
- データベース保存: UTC ISO8601形式

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

    homebiyori-ai-layer の characters.py と連携。
    キャラクター追加時は両方のファイルを更新必要。
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
    DEEP = "deep"  # ディープ: 思慮深く詳細な肯定と共感  # ディープ: 思慮深く詳細な肯定と共感


# =======================================
# 共通バリデーション関数
# =======================================


# UTC時刻関数は共通Layerから使用（homebiyori_common.utils.datetime_utils.get_current_jst）


def validate_child_name(name: str) -> str:
    """
    子供の名前バリデーション

    Args:
        name: 検証対象の名前

    Returns:
        str: バリデーション済み名前

    Raises:
        ValueError: 不正な名前の場合
    """
    if not isinstance(name, str):
        raise ValueError("名前は文字列である必要があります")

    name = name.strip()

    if len(name) < 1:
        raise ValueError("名前を入力してください")

    if len(name) > 50:
        raise ValueError("名前は50文字以内で入力してください")

    # 基本的な文字のみ許可（ひらがな、カタカナ、漢字、英字、数字、一部記号）
    allowed_pattern = r"^[a-zA-Z0-9あ-んア-ンー一-龯\s\-_.（）()]+$"
    if not re.match(allowed_pattern, name):
        raise ValueError("名前に使用できない文字が含まれています")

    return name


def validate_birth_date(birth_date: date) -> date:
    """
    生年月日バリデーション

    Args:
        birth_date: 検証対象の生年月日

    Returns:
        date: バリデーション済み生年月日

    Raises:
        ValueError: 不正な生年月日の場合
    """
    today = date.today()

    if birth_date > today:
        raise ValueError("生年月日は過去の日付を入力してください")

    # 150歳を超える場合はエラー（現実的でない）
    if (today - birth_date).days > 150 * 365:
        raise ValueError("生年月日が古すぎます")

    return birth_date


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
    - created_at: 作成日時（UTC）
    - updated_at: 更新日時（UTC）

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
        default_factory=get_current_jst, description="作成日時（UTC）"
    )

    updated_at: datetime = Field(
        default_factory=get_current_jst, description="更新日時（UTC）"
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
    homebiyori-ai-layer の characters.py と連携し、
    利用可能なキャラクターと褒めレベルのみ許可。
    """

    ai_character: AICharacter = Field(..., description="選択AIキャラクター")

    praise_level: PraiseLevel = Field(..., description="AI褒めレベル設定")

    model_config = ConfigDict(
        json_schema_extra={"example": {"ai_character": "madoka", "praise_level": "deep"}}
    )


class ChildInfo(BaseModel):
    """
    子供情報

    ■データ設計■
    DynamoDB Single Table Design:
    - PK: USER#{user_id}
    - SK: CHILD#{child_id}
    - TTL: なし（永続保存）

    ■プライバシー保護■
    最小限の情報のみ保存（名前・生年月日）。
    年齢は生年月日から動的計算（保存しない）。

    ■セキュリティ■
    - 他のユーザーの子供情報はアクセス不可
    - child_id は UUID で推測困難
    - 名前は表示名のみ（本名である必要なし）
    """

    child_id: str = Field(
        ...,
        description="子供一意ID（UUID形式）",
        min_length=36,
        max_length=36,
        pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    )

    name: str = Field(..., description="子供の名前", min_length=1, max_length=50)

    birth_date: date = Field(..., description="生年月日")

    created_at: datetime = Field(
        default_factory=get_current_jst, description="作成日時（UTC）"
    )

    updated_at: datetime = Field(
        default_factory=get_current_jst, description="更新日時（UTC）"
    )

    @field_validator("name")
    @classmethod
    def validate_name_field(cls, v):
        """子供の名前バリデーション"""
        return validate_child_name(v)

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date_field(cls, v):
        """生年月日バリデーション"""
        return validate_birth_date(v)

    @property
    def age_years(self) -> int:
        """年齢（年）を動的計算"""
        today = date.today()
        age = today.year - self.birth_date.year
        if today.month < self.birth_date.month or (
            today.month == self.birth_date.month and today.day < self.birth_date.day
        ):
            age -= 1
        return max(0, age)

    @property
    def age_months(self) -> int:
        """年齢（月数）を動的計算"""
        today = date.today()
        months = (
            (today.year - self.birth_date.year) * 12
            + today.month
            - self.birth_date.month
        )
        if today.day < self.birth_date.day:
            months -= 1
        return max(0, months)

    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat(),
        },
        json_schema_extra={
            "example": {
                "child_id": "87654321-4321-8765-2109-876543210987",
                "name": "たろうくん",
                "birth_date": "2020-04-15",
            }
        }
    )


class ChildInfoCreate(BaseModel):
    """
    子供情報作成用モデル

    ■設計方針■
    child_id は自動生成するため含まない。
    created_at, updated_at も自動設定。
    """

    name: str = Field(..., description="子供の名前", min_length=1, max_length=50)

    birth_date: date = Field(..., description="生年月日")

    @field_validator("name")
    @classmethod
    def validate_name_field(cls, v):
        """子供の名前バリデーション"""
        return validate_child_name(v)

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date_field(cls, v):
        """生年月日バリデーション"""
        return validate_birth_date(v)


class ChildInfoUpdate(BaseModel):
    """
    子供情報更新用モデル

    ■設計方針■
    部分更新（PATCH）に対応するため、全フィールドをOptionalに設定。
    child_id は更新対象外。
    created_at は更新対象外。
    """

    name: Optional[str] = Field(
        None, description="子供の名前", min_length=1, max_length=50
    )

    birth_date: Optional[date] = Field(None, description="生年月日")

    @field_validator("name")
    @classmethod
    def validate_name_field(cls, v):
        """子供の名前バリデーション"""
        if v is not None:
            return validate_child_name(v)
        return v

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date_field(cls, v):
        """生年月日バリデーション"""
        if v is not None:
            return validate_birth_date(v)
        return v

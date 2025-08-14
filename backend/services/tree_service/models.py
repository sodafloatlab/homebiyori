"""
tree-service データモデル定義

■システム概要■
Homebiyori（ほめびより）木の成長システムのデータモデル。
ユーザーの育児努力を視覚的に表現する木の成長と、
感情的な瞬間を記録する実（褒めメッセージ）システムを管理。

■成長システム設計■
6段階の成長システム - 具体的な閾値はParameter Storeで動的管理
- Stage 0: 種
- Stage 1: 芽
- Stage 2: 苗
- Stage 3: 若木
- Stage 4: 成木
- Stage 5: 大木

■実システム設計■
- 感情検出時の特別な褒めメッセージ
- 1日1回制限（最後の実生成から24時間経過）
- AIキャラクター別テーマカラー
- 永続保存（実削除なし）

■データ保存戦略■
- DynamoDB 4テーブル構成最適化対応
- 成長統計・実コンテンツの統合管理
- 冗長データ削除によるコスト最適化
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
import uuid
from enum import Enum

# 共通Layerから日時処理をインポート
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string


# =====================================
# 成長システム関連の型定義
# =====================================

TreeStage = Literal[0, 1, 2, 3, 4, 5]

class AICharacterType(str, Enum):
    """AIキャラクタータイプ"""
    MITTYAN = "mittyan"      # みっちゃん
    MADOKASAN = "madokasan"  # まどかさん
    HIDEJI = "hideji"        # ヒデじい

class EmotionType(str, Enum):
    """感情タイプ（design_database.md準拠）"""
    JOY = "joy"                    # 喜び
    SADNESS = "sadness"           # 悲しみ
    FATIGUE = "fatigue"           # 疲労
    ACCOMPLISHMENT = "accomplishment"  # 達成感
    WORRY = "worry"               # 心配

class TreeTheme(str, Enum):
    """木のテーマカラー（design_ai.md準拠）"""
    ROSE = "rose"        # みっちゃん - ピンク系
    SKY = "sky"          # まどかさん - ブルー系  
    AMBER = "amber"      # ヒデじい - オレンジ系


# =====================================
# 木の成長状態モデル
# =====================================

class TreeStatus(BaseModel):
    """
    木の現在状態（DynamoDB TREE エンティティ対応）
    
    ■表示情報■
    - 現在の成長段階と名称
    - 累計文字数と次段階まで必要数
    - 成長進捗率
    - 選択中のテーマカラー
    """
    
    user_id: str = Field(
        ...,
        description="ユーザーID（Cognito sub）"
    )
    
    current_stage: TreeStage = Field(
        ...,
        description="現在の成長段階（0-5）"
    )
    
    total_characters: int = Field(
        ...,
        ge=0,
        description="累積文字数"
    )
    
    total_messages: int = Field(
        ...,
        ge=0,
        description="総メッセージ数"
    )
    
    total_fruits: int = Field(
        ...,
        ge=0,
        description="総実数"
    )
    
    last_message_date: Optional[str] = Field(
        None,
        description="最後のメッセージ日時（JST文字列）"
    )
    
    last_fruit_date: Optional[str] = Field(
        None,
        description="最後の実生成日時（JST文字列）"
    )
    
    created_at: str = Field(
        default_factory=lambda: to_jst_string(get_current_jst()),
        description="木の開始日時（JST文字列）"
    )
    
    updated_at: str = Field(
        default_factory=lambda: to_jst_string(get_current_jst()),
        description="最終更新日時（JST文字列）"
    )


# =====================================
# 実（褒めメッセージ）モデル
# =====================================

class FruitInfo(BaseModel):
    """
    実（褒めメッセージ）情報（DynamoDB FRUIT エンティティ対応）
    
    ■実生成システム■
    - 感情検出時の特別な褒めメッセージ
    - AIキャラクター別個性化
    - 1日1回制限
    - 永続保存（削除なし）
    """
    
    fruit_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="実の一意ID"
    )
    
    user_id: str = Field(
        ...,
        description="所有ユーザーID"
    )
    
    user_message: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="実生成のきっかけとなったユーザーメッセージ"
    )
    
    ai_response: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="AIキャラクターの応答メッセージ"
    )
    
    ai_character: AICharacterType = Field(
        ...,
        description="どのAIキャラクターとの会話か"
    )
    
    interaction_mode: Literal["praise", "listen"] = Field(
        default="praise",
        description="対話モード記録"
    )
    
    detected_emotion: EmotionType = Field(
        ...,
        description="実を生成したトリガー感情"
    )
    
    created_at: str = Field(
        default_factory=lambda: to_jst_string(get_current_jst()),
        description="実の生成日時（JST文字列）"
    )


class FruitsListRequest(BaseModel):
    """
    実一覧取得リクエスト
    """
    
    character_filter: Optional[AICharacterType] = Field(
        None,
        description="特定キャラクターの実のみ取得"
    )
    
    emotion_filter: Optional[EmotionType] = Field(
        None,
        description="特定感情の実のみ取得"
    )
    
    start_date: Optional[str] = Field(
        None,
        description="取得開始日（YYYY-MM-DD）"
    )
    
    end_date: Optional[str] = Field(
        None,
        description="取得終了日（YYYY-MM-DD）"
    )
    
    limit: int = Field(
        default=20,
        ge=1,
        le=100,
        description="取得件数制限"
    )
    
    next_token: Optional[str] = Field(
        None,
        description="ページネーション用トークン"
    )


class FruitsListResponse(BaseModel):
    """
    実一覧取得レスポンス
    """
    
    fruits: List[FruitInfo] = Field(
        ...,
        description="実の一覧"
    )
    
    total_count: int = Field(
        ...,
        description="総実数"
    )
    
    character_counts: Dict[str, int] = Field(
        ...,
        description="キャラクター別実数"
    )
    
    emotion_counts: Dict[str, int] = Field(
        ...,
        description="感情別実数"
    )
    
    next_token: Optional[str] = Field(
        None,
        description="次ページトークン"
    )
    
    has_more: bool = Field(
        ...,
        description="さらにデータが存在するか"
    )
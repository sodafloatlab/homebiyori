"""
Homebiyori Common Data Models

サービス間で共有されるデータモデル定義
tree_serviceとuser_serviceの正しい定義を基準として作成
"""

from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field
import uuid

# 共通Layerから日時処理をインポート
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string

# 共通enumをインポート
from .enums import AICharacterType, EmotionType, TreeStage


# =====================================
# 木の成長システム関連データモデル
# =====================================

class TreeStatus(BaseModel):
    """
    木の現在状態（tree_service準拠）
    DynamoDB TREE エンティティ対応
    
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


class FruitInfo(BaseModel):
    """
    実（褒めメッセージ）情報（tree_service準拠）
    DynamoDB FRUIT エンティティ対応
    
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


class TreeGrowthInfo(BaseModel):
    """
    木の成長情報（chat_serviceで使用）
    tree_serviceからの成長計算結果を格納
    """
    previous_stage: int = Field(description="変更前の成長段階")
    current_stage: int = Field(description="現在の成長段階")
    previous_total: int = Field(description="変更前の累計文字数")
    current_total: int = Field(description="現在の累計文字数")
    added_characters: int = Field(description="今回追加された文字数")
    stage_changed: bool = Field(description="段階が変化したかどうか")
    growth_celebration: Optional[str] = Field(None, description="段階変化時のお祝いメッセージ")


# =====================================
# レスポンス用サブモデル
# =====================================

class AIResponse(BaseModel):
    """AI応答結果（chat_serviceで使用）"""
    message: str = Field(description="AI応答メッセージ")
    character: AICharacterType = Field(description="使用されたAIキャラクター")
    emotion_detected: Optional[EmotionType] = Field(None, description="検出された感情")
    emotion_score: float = Field(default=0.0, description="感情スコア")
    confidence: float = Field(default=1.0, description="応答の信頼度")
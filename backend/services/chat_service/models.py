"""
Chat Service Models for Homebiyori
データモデル定義 - JST時刻対応、DynamoDB直接保存、画像機能削除版
"""

from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, validator
import uuid

# 共通Layerから日時処理をインポート
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string

# 共通Layerから列挙型とデータモデルをインポート
from homebiyori_common.models import (
    AICharacterType,
    EmotionType,
    InteractionMode,
    FruitInfo,
    TreeGrowthInfo,
    AIResponse
)

# MoodType → InteractionMode移行完了（共通Layer使用）

# =====================================
# リクエスト・レスポンスモデル
# =====================================

class ChatRequest(BaseModel):
    """チャット送信リクエスト"""
    message: str = Field(..., min_length=1, max_length=2000, description="ユーザーメッセージ")
    ai_character: AICharacterType = Field(default=AICharacterType.MITTYAN, description="AIキャラクター")
    mood: InteractionMode = Field(default=InteractionMode.PRAISE, description="気分設定")



class GroupChatRequest(BaseModel):
    """
    グループチャットリクエストモデル
    複数AIキャラクターとの同時チャット機能用
    """
    message: str = Field(..., min_length=1, max_length=2000, description="ユーザーメッセージ")
    active_characters: List[AICharacterType] = Field(
        ..., 
        min_items=1, 
        max_items=3, 
        description="アクティブなAIキャラクターリスト"
    )
    mood: Optional[InteractionMode] = Field(None, description="対話モード（省略時はプロフィール設定値使用）")
    context_length: int = Field(10, ge=1, le=50, description="文脈履歴取得件数")
    
    @validator("active_characters")
    def validate_unique_characters(cls, v):
        if len(set(v)) != len(v):
            raise ValueError("重複するキャラクターは指定できません")
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "message": "今日は子供と公園で遊んで楽しかったです",
                "active_characters": ["mittyan", "madokasan", "hideji"],
                "mood": "praise",
                "context_length": 10
            }
        }

# FruitInfo、TreeGrowthInfo、AIResponseは homebiyori_common.models から使用

class ChatResponse(BaseModel):
    """チャット応答レスポンス"""
    message_id: str = Field(description="メッセージID")
    ai_response: AIResponse = Field(description="AI応答情報")
    tree_growth: TreeGrowthInfo = Field(description="木の成長情報")
    fruit_generated: bool = Field(description="実が生成されたかどうか")
    fruit_info: Optional[FruitInfo] = Field(None, description="生成された実の情報")
    timestamp: datetime = Field(description="処理完了時刻")

    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

class GroupChatResponse(BaseModel):
    """グループチャット応答レスポンス"""
    message_id: str = Field(description="メッセージID")
    ai_responses: List[AIResponse] = Field(description="複数AI応答情報リスト")
    tree_growth: TreeGrowthInfo = Field(description="木の成長情報")
    fruit_generated: bool = Field(description="実が生成されたかどうか")
    fruit_info: Optional[FruitInfo] = Field(None, description="生成された実の情報")
    timestamp: datetime = Field(description="処理完了時刻")
    active_characters: List[AICharacterType] = Field(description="応答したAIキャラクターリスト")

    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

# =====================================
# データ永続化モデル（DynamoDB直接保存）
# =====================================

class ChatMessage(BaseModel):
    """チャットメッセージ（DynamoDB直接保存版）"""
    user_id: str = Field(description="ユーザーID")
    message_id: str = Field(description="メッセージID")
    user_message_s3_key: str = Field(description="ユーザーメッセージS3キー")
    ai_response_s3_key: str = Field(description="AI応答S3キー")
    ai_character: AICharacterType = Field(description="使用AIキャラクター")
    mood: InteractionMode = Field(description="気分設定")
    emotion_detected: Optional[EmotionType] = Field(None, description="検出された感情")
    emotion_score: float = Field(default=0.0, description="感情スコア")
    character_count: int = Field(description="メッセージ文字数")
    tree_stage_before: int = Field(description="変更前木段階")
    tree_stage_after: int = Field(description="変更後木段階")
    fruit_generated: bool = Field(default=False, description="実生成フラグ")
    fruit_id: Optional[str] = Field(None, description="生成された実のID")
    image_s3_key: Optional[str] = Field(None, description="画像S3キー")
    created_at: datetime = Field(description="作成時刻")
    ttl: Optional[int] = Field(None, description="TTL")
    character_date: str = Field(description="キャラクター日付インデックス")

    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

# =====================================
# その他のリクエスト・レスポンス
# =====================================

class ChatHistoryRequest(BaseModel):
    """チャット履歴取得リクエスト"""
    start_date: Optional[str] = Field(None, description="開始日")
    end_date: Optional[str] = Field(None, description="終了日")
    character_filter: Optional[AICharacterType] = Field(None, description="キャラクターフィルター")
    limit: int = Field(default=20, description="取得件数")
    next_token: Optional[str] = Field(None, description="ページネーショントークン")

class ChatHistoryResponse(BaseModel):
    """チャット履歴レスポンス"""
    messages: List[Dict[str, Any]] = Field(description="メッセージ一覧")
    next_token: Optional[str] = Field(None, description="次のページトークン")
    has_more: bool = Field(description="さらにデータがあるか")
    total_count: Optional[int] = Field(None, description="総件数")

# =====================================
# 気分・感情アイコン機能モデル（チャット機能として復活）
# =====================================

class MoodUpdateRequest(BaseModel):
    """
    気分変更リクエスト（チャット機能の一部）
    
    ■用途■
    - ユーザーがチャット中に対話モードを変更する機能
    - 「ほめほめ」「聞いて」のトグルボタン対応
    - InteractionMode（praise/listen）の動的変更
    """
    interaction_mode: InteractionMode = Field(
        description="対話モード（praise: 褒めほしい, listen: 話を聞いてほしい）"
    )
    user_note: Optional[str] = Field(
        None, 
        max_length=100,
        description="気分変更時のユーザーメモ（オプション）"
    )


class EmotionStampRequest(BaseModel):
    """
    感情アイコン送信リクエスト（チャット機能の一部）
    
    ■用途■
    - 感情アイコンタップによるメッセージ送信機能
    - 「無言でもいい相談」設計対応
    - 感情検出とAI応答生成のトリガー
    """
    emotion: EmotionType = Field(
        description="送信する感情（😊 嬉しい、😔 悲しい、😤 怒り、😰 不安、😴 疲れた、😅 困った）"
    )
    ai_character: Optional[AICharacterType] = Field(
        None,
        description="応答するAIキャラクター（未指定時はプロフィール設定を使用）"
    )
    context_message: Optional[str] = Field(
        None,
        max_length=50,
        description="感情の背景説明（オプション）"
    )

# =====================================
# ヘルパー関数はmain.pyに移動
# =====================================
# get_character_theme_color のみmodelsに保持（レスポンスモデルで必要）
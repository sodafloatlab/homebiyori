"""
Chat Service Models for Homebiyori
データモデル定義 - JST時刻対応、DynamoDB直接保存、画像機能削除版
"""

from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import uuid

# 共通Layerから日時処理をインポート
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string

# 共通Layerから列挙型とデータモデルをインポート
from homebiyori_common.models import (
    AICharacterType,
    EmotionType,
    InteractionMode,
    PraiseLevel,
    FruitInfo,
    TreeGrowthInfo,
    AIResponse
)

# =====================================
# グループチャット専用データモデル
# =====================================

class GroupAIResponse(BaseModel):
    """グループチャット内の個別AI応答（最適化版）"""
    character: AICharacterType = Field(description="応答したAIキャラクター")
    response: str = Field(description="AI応答テキスト")
    is_representative: bool = Field(default=False, description="代表応答フラグ（成長ポイント計算・ai_response保存対象）")

# MoodType → InteractionMode移行完了（共通Layer使用）

# =====================================
# リクエスト・レスポンスモデル
# =====================================

class ChatRequest(BaseModel):
    """チャット送信リクエスト"""
    message: str = Field(..., min_length=1, max_length=2000, description="ユーザーメッセージ")
    ai_character: AICharacterType = Field(default=AICharacterType.MITTYAN, description="AIキャラクター")
    interaction_mode: InteractionMode = Field(default=InteractionMode.PRAISE, description="対話モード")
    praise_level: PraiseLevel = Field(default=PraiseLevel.NORMAL, description="褒めレベル")
    context_length: int = Field(10, ge=1, le=50, description="文脈履歴取得件数")



class GroupChatRequest(BaseModel):
    """
    グループチャットリクエストモデル
    複数AIキャラクターとの同時チャット機能用
    """
    message: str = Field(..., min_length=1, max_length=2000, description="ユーザーメッセージ")
    active_characters: List[AICharacterType] = Field(
        ..., 
        min_length=1, 
        max_length=3, 
        description="アクティブなAIキャラクターリスト"
    )
    interaction_mode: Optional[InteractionMode] = Field(None, description="対話モード（省略時はプロフィール設定値使用）")
    context_length: int = Field(10, ge=1, le=50, description="文脈履歴取得件数")
    
    @field_validator("active_characters")
    @classmethod
    def validate_unique_characters(cls, v):
        if len(set(v)) != len(v):
            raise ValueError("重複するキャラクターは指定できません")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "今日は子供と公園で遊んで楽しかったです",
                "active_characters": ["mittyan", "madokasan", "hideji"],
                "interaction_mode": "praise",
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
    """チャットメッセージ（1:1・グループチャット統合版・design_database.md準拠）"""
    chat_id: str = Field(description="チャットID")
    user_id: str = Field(description="ユーザーID")
    
    # チャットタイプ（統合管理のためのキー情報）
    chat_type: Literal["single", "group"] = Field(description="チャットタイプ（single: 1:1, group: グループ）")
    
    # メッセージ内容（DynamoDB直接保存）
    user_message: str = Field(description="ユーザーメッセージ")
    ai_response: str = Field(description="AI応答（single時：単一応答、group時：代表応答）")
    
    # AI設定メタデータ（single時：実際のAI、group時：代表AI）
    ai_character: AICharacterType = Field(description="使用AIキャラクター（代表キャラクター）")
    praise_level: PraiseLevel = Field(description="褒めレベル")
    interaction_mode: InteractionMode = Field(description="対話モード")
    
    # グループチャット専用フィールド
    active_characters: Optional[List[AICharacterType]] = Field(None, description="アクティブAIキャラクターリスト（group時のみ）")
    group_ai_responses: Optional[List[GroupAIResponse]] = Field(None, description="全AI応答詳細（group時のみ・最適化版）")
    
    # 木の成長関連
    growth_points_gained: int = Field(description="獲得成長ポイント")
    tree_stage_at_time: int = Field(description="その時点での木の段階")
    
    # タイムスタンプ（JST統一）
    created_at: datetime = Field(description="作成時刻")
    
    # プラン別TTL設定
    expires_at: Optional[int] = Field(None, description="TTL（unixtime、プラン別180日/30日）")

    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

# =====================================
# その他のリクエスト・レスポンス
# =====================================

class ChatHistoryRequest(BaseModel):
    """チャット履歴取得リクエスト（1:1・グループチャット統合版）"""
    start_date: Optional[str] = Field(None, description="開始日")
    end_date: Optional[str] = Field(None, description="終了日")
    limit: int = Field(default=20, description="取得件数")
    next_token: Optional[str] = Field(None, description="ページネーショントークン")

class ChatHistoryResponse(BaseModel):
    """チャット履歴レスポンス（1:1・グループチャット統合版）"""
    messages: List[ChatMessage] = Field(description="メッセージ一覧（統合ChatMessageモデル）")
    next_token: Optional[str] = Field(None, description="次のページトークン")
    has_more: bool = Field(description="さらにデータがあるか")
    total_count: Optional[int] = Field(None, description="総件数")

# =====================================
# 気分・感情アイコン機能モデル（チャット機能として復活）
# =====================================


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
"""
Chat Service Models for Homebiyori
データモデル定義 - JST時刻対応、DynamoDB直接保存、画像機能削除版
"""

from typing import List, Optional, Dict, Any, Literal
from enum import Enum
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Literal, Optional, Union, Any
from pydantic import BaseModel, Field, validator
import uuid

# 共通Layerから日時処理とログ機能をインポート
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string
from homebiyori_common.logger import get_logger
import uuid

# 共通Layerから使用するため削除（homebiyori_common.utils.datetime_utils を使用）

# =====================================
# AI キャラクター定義
# =====================================

class AICharacterType(str, Enum):
    """AIキャラクタータイプ"""
    TAMA = "tama"           # たまさん：優しい
    MADOKA = "madoka"       # まどか姉さん：お姉さん的
    HIDE = "hide"           # ヒデじい：おじいちゃん的

class MoodType(str, Enum):
    """気分タイプ"""
    PRAISE = "praise"       # 褒めてほしい
    LISTEN = "listen"       # 聞いてほしい

# =====================================
# 感情・木成長システム
# =====================================

class EmotionType(str, Enum):
    """感情タイプ"""
    JOY = "joy"             # 喜び
    RELIEF = "relief"       # 安堵
    ACCOMPLISHMENT = "accomplishment"  # 達成感
    GRATITUDE = "gratitude" # 感謝
    EXCITEMENT = "excitement" # 興奮・わくわく
    LOVE = "love"          # 愛情

# =====================================
# リクエスト・レスポンスモデル
# =====================================

class ChatRequest(BaseModel):
    """チャット送信リクエスト"""
    message: str = Field(..., min_length=1, max_length=2000, description="ユーザーメッセージ")
    ai_character: AICharacterType = Field(default=AICharacterType.TAMA, description="AIキャラクター")
    mood: MoodType = Field(default=MoodType.PRAISE, description="気分設定")

class FruitInfo(BaseModel):
    """実の情報"""
    fruit_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="実ID")
    user_id: str = Field(description="ユーザーID")
    message: str = Field(description="実の元となったメッセージ")
    emotion_trigger: EmotionType = Field(description="実生成のトリガーとなった感情")
    emotion_score: float = Field(ge=0.0, le=1.0, description="感情スコア")
    ai_character: AICharacterType = Field(description="対応AIキャラクター")
    character_color: str = Field(description="キャラクターテーマカラー")
    trigger_message_id: Optional[str] = Field(None, description="元メッセージID")
    created_at: datetime = Field(default_factory=get_current_jst, description="作成時刻（JST）")
    viewed_at: Optional[datetime] = Field(None, description="初回閲覧時刻")
    view_count: int = Field(default=0, description="閲覧回数")

    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

class TreeGrowthInfo(BaseModel):
    """木の成長情報"""
    previous_stage: int = Field(description="変更前の成長段階")
    current_stage: int = Field(description="現在の成長段階")
    previous_total: int = Field(description="変更前の累計文字数")
    current_total: int = Field(description="現在の累計文字数")
    added_characters: int = Field(description="今回追加された文字数")
    stage_changed: bool = Field(description="段階が変化したかどうか")
    characters_to_next: int = Field(description="次段階まで必要な文字数")
    progress_percentage: float = Field(description="現段階内での進捗パーセンテージ")
    growth_celebration: Optional[str] = Field(None, description="段階変化時のお祝いメッセージ")

class AIResponse(BaseModel):
    """AI応答結果"""
    message: str = Field(description="AI応答メッセージ")
    character: AICharacterType = Field(description="使用されたAIキャラクター")
    emotion_detected: Optional[EmotionType] = Field(None, description="検出された感情")
    emotion_score: float = Field(default=0.0, description="感情スコア")
    confidence: float = Field(default=1.0, description="応答の信頼度")

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
    mood: MoodType = Field(description="気分設定")
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

class MoodUpdateRequest(BaseModel):
    """気分更新リクエスト"""
    mood: MoodType = Field(description="新しい気分設定")

class EmotionStampRequest(BaseModel):
    """感情スタンプリクエスト"""
    emotion: EmotionType = Field(description="感情タイプ")
    intensity: float = Field(ge=0.0, le=1.0, description="感情強度")

# =====================================
# ヘルパー関数
# =====================================

def calculate_tree_stage(total_characters: int) -> int:
    """文字数から木の成長段階を計算"""
    if total_characters < 100:
        return 0  # 種
    elif total_characters < 300:
        return 1  # 芽
    elif total_characters < 600:
        return 2  # 苗
    elif total_characters < 1000:
        return 3  # 若木
    elif total_characters < 1500:
        return 4  # 成木
    else:
        return 5  # 大木

def get_characters_to_next_stage(total_characters: int) -> int:
    """次の段階まで必要な文字数を計算"""
    current_stage = calculate_tree_stage(total_characters)
    
    stage_thresholds = [100, 300, 600, 1000, 1500]
    
    if current_stage >= 5:
        return 0  # 最高段階
    
    return stage_thresholds[current_stage] - total_characters

def calculate_progress_percentage(total_characters: int) -> float:
    """現在の段階内での進捗パーセンテージを計算"""
    current_stage = calculate_tree_stage(total_characters)
    
    if current_stage == 0:
        return min(100.0, (total_characters / 100) * 100)
    elif current_stage == 1:
        return min(100.0, ((total_characters - 100) / 200) * 100)
    elif current_stage == 2:
        return min(100.0, ((total_characters - 300) / 300) * 100)
    elif current_stage == 3:
        return min(100.0, ((total_characters - 600) / 400) * 100)
    elif current_stage == 4:
        return min(100.0, ((total_characters - 1000) / 500) * 100)
    else:
        return 100.0  # 最高段階

def can_generate_fruit(last_fruit_date: Optional[datetime]) -> bool:
    """1日1回制限チェック"""
    if last_fruit_date is None:
        return True
    
    now = get_current_jst()
    time_diff = now - last_fruit_date
    
    return time_diff.total_seconds() >= 24 * 60 * 60  # 24時間

def get_character_theme_color(character: AICharacterType) -> str:
    """キャラクターのテーマカラーを取得"""
    color_map = {
        AICharacterType.TAMA: "warm_pink",
        AICharacterType.MADOKA: "cool_blue", 
        AICharacterType.HIDE: "warm_orange"
    }
    return color_map.get(character, "warm_pink")

# =====================================
# コンスタント定義
# =====================================

# 段階別の名前とメッセージ
TREE_STAGE_CONFIG = {
    0: {"name": "種", "description": "小さな種から始まりました"},
    1: {"name": "芽", "description": "小さな芽が顔を出しました"},
    2: {"name": "苗", "description": "青々とした若い苗に成長しました"},
    3: {"name": "若木", "description": "立派な若木になりました"},
    4: {"name": "成木", "description": "たくましい成木に育ちました"},
    5: {"name": "大木", "description": "素晴らしい大木になりました"}
}
"""
chat-service データモデル定義（設計変更版）

■設計変更内容■
1. 時刻統一: UTC → JST (Asia/Tokyo)
2. 画像機能: 完全削除
3. チャット保存: S3 → DynamoDB（LangChain最適化）

■システム概要■
Homebiyori（ほめびより） チャット機能のデータモデル。
ユーザーと3つのAIキャラクター（たまさん、まどか姉さん、ヒデじい）との
感情的なやり取りを管理。

■設計原則■
- プライバシーファースト: 個人識別情報は一切保存しない
- LangChain最適化: DynamoDB直接保存による高速文脈取得
- JST統一: 日本ユーザー向け時刻表示最適化
- TTL対応: サブスクリプションプランに基づく自動データ削除

■データ保存戦略■
- チャット内容: DynamoDB直接保存（LangChain最適化）
- メタデータ: DynamoDB保存（高速アクセス）
- 画像機能: 削除（コスト・複雑性削減）

■AIキャラクター設定■
- tama（たまさん）: 下町のベテランおばちゃん - 圧倒的受容力
- madoka（まどか姉さん）: バリキャリ共働きママ - 論理的共感
- hide（ヒデじい）: 元教師の詩人 - 静かな言葉の薬
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field, validator
import uuid
import json
import pytz


def get_current_jst() -> datetime:
    """
    現在のJST時刻を取得
    
    システム全体でJST統一により、日本ユーザーにとって
    直感的な時刻表示と運用を実現。
    """
    jst = pytz.timezone('Asia/Tokyo')
    return datetime.now(jst)


# =====================================
# AIキャラクター設定
# =====================================

AICharacterType = Literal["tama", "madoka", "hide"]
MoodType = Literal["praise", "listen"]
EmotionType = Literal["joy", "gratitude", "accomplishment", "relief", "excitement", "calm", "neutral"]

# AIキャラクター設定辞書（homebiyori-ai-layer と連携）
AI_CHARACTERS: Dict[str, Dict[str, str]] = {
    "tama": {
        "name": "たまさん",
        "personality": "下町のベテランおばちゃん",
        "theme_color": "rose",
        "strength": "圧倒的受容力",
        "description": "何でも受け入れてくれる包容力のあるキャラクター"
    },
    "madoka": {
        "name": "まどか姉さん", 
        "personality": "バリキャリ共働きママ",
        "theme_color": "sky",
        "strength": "論理的共感",
        "description": "効率的で建設的なアドバイスをくれるキャラクター"
    },
    "hide": {
        "name": "ヒデじい",
        "personality": "元教師の詩人",
        "theme_color": "amber", 
        "strength": "静かな言葉の薬",
        "description": "深い洞察と温かい言葉で心を癒してくれるキャラクター"
    }
}


# =====================================
# チャットリクエスト・レスポンスモデル
# =====================================

class ChatRequest(BaseModel):
    """
    チャットメッセージ送信リクエスト（設計変更版）
    
    ■設計変更■
    - 画像添付機能削除（image_s3_key削除）
    - chat_type削除（個人チャットのみ）
    - LangChain最適化対応
    """
    
    message: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="ユーザーメッセージ（1000文字制限）"
    )
    
    ai_character: AICharacterType = Field(
        ...,
        description="選択AIキャラクター"
    )
    
    mood: MoodType = Field(
        default="praise",
        description="期待する応答タイプ"
    )
    
    @validator('message')
    def validate_message_content(cls, v):
        """メッセージ内容バリデーション"""
        if not v.strip():
            raise ValueError("メッセージは空にできません")
        
        # 基本的な不適切語句チェック
        inappropriate_words = ["test_inappropriate"]
        for word in inappropriate_words:
            if word in v.lower():
                raise ValueError("不適切な内容が含まれています")
        
        return v.strip()
    
    @validator('ai_character')
    def validate_ai_character(cls, v):
        """AIキャラクター存在チェック"""
        if v not in AI_CHARACTERS:
            raise ValueError(f"未対応のAIキャラクター: {v}")
        return v


class AIResponse(BaseModel):
    """AI応答データ"""
    
    message: str = Field(
        ...,
        description="AIキャラクターからの応答メッセージ"
    )
    
    character: AICharacterType = Field(
        ...,
        description="応答したAIキャラクター"
    )
    
    emotion_detected: Optional[EmotionType] = Field(
        None,
        description="検出されたユーザー感情"
    )
    
    emotion_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="感情強度スコア（0.0-1.0）"
    )
    
    confidence: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="AI応答の信頼度スコア"
    )


class TreeGrowthInfo(BaseModel):
    """木の成長情報"""
    
    previous_stage: int = Field(..., ge=0, le=5, description="成長前の段階")
    current_stage: int = Field(..., ge=0, le=5, description="現在の段階")
    total_characters: int = Field(..., ge=0, description="累計文字数")
    characters_to_next: int = Field(..., ge=0, description="次段階まで必要文字数")
    stage_changed: bool = Field(..., description="段階変化有無")


class FruitInfo(BaseModel):
    """実（褒めメッセージ）情報"""
    
    fruit_id: str = Field(..., description="実の一意ID")
    message: str = Field(..., description="実に込められた褒めメッセージ")
    emotion_trigger: EmotionType = Field(..., description="実を生成した感情")
    character: AICharacterType = Field(..., description="実を生成したキャラクター")
    created_at: datetime = Field(default_factory=get_current_jst, description="実の生成日時（JST）")
    character_color: str = Field(..., description="キャラクター別テーマカラー")


class ChatResponse(BaseModel):
    """チャット機能統合レスポンス"""
    
    message_id: str = Field(..., description="メッセージ一意ID")
    ai_response: AIResponse = Field(..., description="AI応答情報")
    tree_growth: TreeGrowthInfo = Field(..., description="木の成長状態")
    fruit_generated: bool = Field(..., description="実生成有無")
    fruit_info: Optional[FruitInfo] = Field(None, description="生成された実の情報")
    timestamp: datetime = Field(default_factory=get_current_jst, description="レスポンス生成日時（JST）")


# =====================================
# DynamoDB保存用データモデル（設計変更版）
# =====================================

class ChatMessage(BaseModel):
    """
    DynamoDB保存用チャットメッセージモデル（設計変更版）
    
    ■設計変更■
    - S3キー削除 → 直接DynamoDB保存
    - 画像関連フィールド削除
    - JST時刻統一
    - LangChain最適化
    """
    
    # DynamoDB Keys
    user_id: str = Field(..., description="Cognito User Pool sub（UUID形式）")
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="メッセージ一意ID")
    
    # メッセージ内容（DynamoDB直接保存）
    user_message: str = Field(..., description="ユーザーメッセージ内容")
    ai_response: str = Field(..., description="AI応答内容")
    
    # メタデータ
    ai_character: AICharacterType = Field(..., description="応答したAIキャラクター")
    mood: MoodType = Field(..., description="ユーザーが選択した気分")
    emotion_detected: Optional[EmotionType] = Field(None, description="検出された感情")
    emotion_score: Optional[float] = Field(None, description="感情強度スコア")
    
    # 成長情報
    character_count: int = Field(..., description="ユーザーメッセージの文字数")
    tree_stage_before: int = Field(..., description="メッセージ送信前の木の段階")
    tree_stage_after: int = Field(..., description="メッセージ送信後の木の段階")
    
    # 実生成情報
    fruit_generated: bool = Field(default=False, description="実生成有無")
    fruit_id: Optional[str] = Field(None, description="生成された実のID")
    
    # システム情報（JST統一）
    created_at: datetime = Field(default_factory=get_current_jst, description="メッセージ作成日時（JST）")
    ttl: Optional[int] = Field(None, description="DynamoDB TTL（UNIXタイムスタンプ）")
    
    # GSI用フィールド
    character_date: str = Field(..., description="GSI1用: {character}#{date} 形式")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
    
    def to_langchain_format(self) -> Dict[str, str]:
        """
        LangChain文脈用フォーマットに変換
        
        ■LangChain最適化■
        DynamoDBから直接取得したデータを即座に
        LangChainの文脈形式に変換可能
        
        Returns:
            Dict: LangChain文脈形式
        """
        return {
            "role": "user",
            "content": self.user_message,
            "timestamp": self.created_at.isoformat(),
            "character": self.ai_character,
            "ai_response": self.ai_response,
            "emotion": self.emotion_detected
        }


# =====================================
# チャット履歴取得用モデル
# =====================================

class ChatHistoryRequest(BaseModel):
    """チャット履歴取得リクエスト（設計変更版）"""
    
    start_date: Optional[str] = Field(None, description="取得開始日（YYYY-MM-DD、JST）")
    end_date: Optional[str] = Field(None, description="取得終了日（YYYY-MM-DD、JST）")
    character_filter: Optional[AICharacterType] = Field(None, description="キャラクター別フィルタ")
    limit: int = Field(default=20, ge=1, le=100, description="取得件数上限")
    next_token: Optional[str] = Field(None, description="ページネーション用トークン")


class ChatHistoryItem(BaseModel):
    """チャット履歴アイテム（設計変更版）"""
    
    message_id: str
    user_message: str  # DynamoDB直接取得
    ai_response: str   # DynamoDB直接取得
    ai_character: AICharacterType
    mood: MoodType
    emotion_detected: Optional[EmotionType]
    fruit_generated: bool
    fruit_id: Optional[str]
    created_at: datetime  # JST
    character_info: Dict[str, str]  # AI_CHARACTERSから取得


class ChatHistoryResponse(BaseModel):
    """チャット履歴取得レスポンス"""
    
    messages: List[ChatHistoryItem] = Field(..., description="チャット履歴アイテム配列")
    next_token: Optional[str] = Field(None, description="次ページトークン")
    has_more: bool = Field(..., description="さらにデータが存在するか")
    total_count: Optional[int] = Field(None, description="総件数")


# =====================================
# LangChain統合専用モデル
# =====================================

class LangChainContext(BaseModel):
    """
    LangChain文脈データ（設計変更版の最適化）
    
    ■高速文脈取得■
    DynamoDBから直接取得したチャットデータを
    LangChainで即座に利用可能な形式で提供
    """
    
    messages: List[Dict[str, str]] = Field(..., description="LangChain形式メッセージ配列")
    user_preferences: Dict[str, str] = Field(..., description="ユーザー設定（文脈強化用）")
    recent_emotions: List[str] = Field(..., description="最近の感情履歴")
    character_usage: Dict[str, int] = Field(..., description="キャラクター使用頻度")


# =====================================
# 気分・感情管理モデル
# =====================================

class MoodUpdateRequest(BaseModel):
    """気分変更リクエスト"""
    
    mood: MoodType = Field(..., description="新しい気分設定")


class EmotionStampRequest(BaseModel):
    """感情スタンプ送信リクエスト"""
    
    emotion: EmotionType = Field(..., description="送信する感情スタンプ")
    intensity: float = Field(default=1.0, ge=0.1, le=1.0, description="感情の強度（0.1-1.0）")


# =====================================
# ユーティリティ関数（設計変更版）
# =====================================

def calculate_tree_stage(total_characters: int) -> int:
    """累計文字数から木の成長段階を計算"""
    if total_characters < 100:
        return 0
    elif total_characters < 300:
        return 1
    elif total_characters < 600:
        return 2
    elif total_characters < 1000:
        return 3
    elif total_characters < 1500:
        return 4
    else:
        return 5


def get_characters_to_next_stage(total_characters: int) -> int:
    """次の成長段階まで必要な文字数を計算"""
    current_stage = calculate_tree_stage(total_characters)
    stage_thresholds = [100, 300, 600, 1000, 1500]
    
    if current_stage >= 5:
        return 0
    
    return stage_thresholds[current_stage] - total_characters


def can_generate_fruit(last_fruit_date: Optional[datetime]) -> bool:
    """実生成可能かチェック（1日1回制限、JST基準）"""
    if not last_fruit_date:
        return True
    
    now = get_current_jst()
    time_diff = now - last_fruit_date
    return time_diff.total_seconds() >= 24 * 60 * 60


def get_character_theme_color(character: AICharacterType) -> str:
    """AIキャラクターのテーマカラー取得"""
    return AI_CHARACTERS[character]["theme_color"]


def calculate_jst_ttl(subscription_plan: str, created_at: datetime) -> int:
    """
    JST基準でのTTL計算
    
    Args:
        subscription_plan: サブスクリプションプラン
        created_at: メッセージ作成日時（JST）
        
    Returns:
        int: TTL（UNIXタイムスタンプ）
    """
    if subscription_plan in ["monthly", "yearly"]:
        retention_days = 180  # プレミアム: 6ヶ月
    else:
        retention_days = 30   # 無料: 1ヶ月
    
    ttl_datetime = created_at + timedelta(days=retention_days)
    return int(ttl_datetime.timestamp())


def prepare_langchain_context(recent_messages: List[ChatMessage], limit: int = 5) -> LangChainContext:
    """
    LangChain用文脈データ準備（設計変更版最適化）
    
    ■高速化ポイント■
    - DynamoDBから直接取得したデータを使用
    - S3アクセス不要
    - 即座にLangChain形式に変換
    
    Args:
        recent_messages: 最近のチャットメッセージ
        limit: 文脈に含める最大メッセージ数
        
    Returns:
        LangChainContext: LangChain用文脈データ
    """
    # メッセージをLangChain形式に変換
    langchain_messages = []
    emotions = []
    character_usage = {}
    
    for msg in recent_messages[:limit]:
        # ユーザーメッセージ
        langchain_messages.append({
            "role": "user",
            "content": msg.user_message,
            "timestamp": msg.created_at.isoformat()
        })
        
        # AI応答
        langchain_messages.append({
            "role": "assistant", 
            "content": msg.ai_response,
            "character": msg.ai_character,
            "timestamp": msg.created_at.isoformat()
        })
        
        # 感情・キャラクター統計
        if msg.emotion_detected:
            emotions.append(msg.emotion_detected)
        
        character_usage[msg.ai_character] = character_usage.get(msg.ai_character, 0) + 1
    
    return LangChainContext(
        messages=langchain_messages,
        user_preferences={
            "primary_character": max(character_usage.items(), key=lambda x: x[1])[0] if character_usage else "tama",
            "recent_mood": recent_messages[0].mood if recent_messages else "praise"
        },
        recent_emotions=emotions[-3:],  # 最新3件の感情
        character_usage=character_usage
    )
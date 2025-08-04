"""
Chat Service Models for Homebiyori
データモデル定義 - JST時刻対応、DynamoDB直接保存、画像機能削除版
"""

from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field, validator
import pytz
import uuid

def get_current_jst() -> datetime:
    """現在時刻をJST（日本標準時）で取得"""
    jst = pytz.timezone('Asia/Tokyo')
    return datetime.now(jst)

def to_jst_string(dt: datetime) -> str:
    """datetimeをJST文字列に変換"""
    if dt.tzinfo is None:
        # ナイーブなdatetimeの場合、JSTと仮定
        jst = pytz.timezone('Asia/Tokyo')
        dt = jst.localize(dt)
    else:
        # タイムゾーン付きdatetimeをJSTに変換
        jst = pytz.timezone('Asia/Tokyo')
        dt = dt.astimezone(jst)
    return dt.isoformat()

# =====================================
# AI キャラクター定義
# =====================================

class AICharacterType(str, Enum):
    """AIキャラクタータイプ"""
    TAMA = "tama"           # たまさん：優しい
    MADOKA = "madoka"       # まどか姉さん：お姉さん的
    HIDE = "hide"           # ヒデじい：おじいちゃん的

class PraiseLevel(str, Enum):
    """褒めレベル"""
    LIGHT = "light"         # ライト：簡潔で優しい励まし（1文程度）
    STANDARD = "standard"   # スタンダード：適度なサポートと承認（2-3文程度）
    DEEP = "deep"          # ディープ：思慮深く詳細な肯定と共感（4-5文程度）

# =====================================
# 感情・木成長システム
# =====================================

class EmotionType(str, Enum):
    """感情タイプ"""
    JOY = "joy"             # 喜び
    RELIEF = "relief"       # 安堵
    PRIDE = "pride"         # 誇り
    GRATITUDE = "gratitude" # 感謝
    HOPE = "hope"          # 希望
    LOVE = "love"          # 愛情

class TreeGrowthStage(int, Enum):
    """木の成長段階（0-5の6段階）"""
    SEED = 0         # 種
    SPROUT = 1       # 芽
    SAPLING = 2      # 若木
    YOUNG_TREE = 3   # 青年樹
    MATURE_TREE = 4  # 成熟樹
    GREAT_TREE = 5   # 大樹

class FruitType(str, Enum):
    """実のタイプ"""
    SMALL_BERRY = "small_berry"     # 小さな実（喜び）
    GOLDEN_FRUIT = "golden_fruit"   # 金の実（安堵）  
    CRYSTAL_FRUIT = "crystal_fruit" # 水晶の実（誇り）
    HEART_FRUIT = "heart_fruit"     # ハートの実（感謝）
    STAR_FRUIT = "star_fruit"       # 星の実（希望）
    RAINBOW_FRUIT = "rainbow_fruit" # 虹の実（愛情）

# =====================================
# リクエスト・レスポンスモデル
# =====================================

class ChatRequest(BaseModel):
    """チャット送信リクエスト"""
    user_message: str = Field(..., min_length=1, max_length=2000, description="ユーザーメッセージ")
    ai_character: AICharacterType = Field(default=AICharacterType.TAMA, description="AIキャラクター")
    praise_level: PraiseLevel = Field(default=PraiseLevel.STANDARD, description="褒めレベル")

class TreeGrowthInfo(BaseModel):
    """木の成長情報"""
    current_stage: TreeGrowthStage = Field(description="現在の成長段階")
    growth_points: int = Field(ge=0, description="成長ポイント")
    points_to_next_stage: int = Field(ge=0, description="次段階まで必要ポイント")
    total_fruits: int = Field(ge=0, description="総実数")
    
    # 今回生成された実
    new_fruits: List[FruitType] = Field(default_factory=list, description="新しく生成された実")

class AIResponse(BaseModel):
    """AI応答結果"""
    praise_message: str = Field(description="褒めメッセージ")
    detected_emotions: List[EmotionType] = Field(description="検出された感情")
    tree_growth: TreeGrowthInfo = Field(description="木の成長情報")
    character_used: AICharacterType = Field(description="使用されたAIキャラクター")
    generated_at: datetime = Field(default_factory=get_current_jst, description="生成時刻（JST）")

    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

# =====================================
# データ永続化モデル（DynamoDB直接保存）
# =====================================

class ChatMessage(BaseModel):
    """チャットメッセージ（DynamoDB直接保存版）"""
    chat_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="チャットID")
    user_id: str = Field(description="ユーザーID")
    
    # メッセージ内容（DynamoDB直接保存）
    user_message: str = Field(description="ユーザーメッセージ")
    ai_response: str = Field(description="AI応答メッセージ")
    
    # メタデータ
    ai_character: AICharacterType = Field(description="使用AIキャラクター")
    praise_level: PraiseLevel = Field(description="褒めレベル")
    detected_emotions: List[EmotionType] = Field(default_factory=list, description="検出感情")
    
    # 木の成長関連
    growth_points_gained: int = Field(ge=0, description="獲得成長ポイント")
    new_fruits_generated: List[FruitType] = Field(default_factory=list, description="生成された実")
    tree_stage_at_time: TreeGrowthStage = Field(description="投稿時点の木の段階")
    
    # タイムスタンプ（JST）
    created_at: datetime = Field(default_factory=get_current_jst, description="作成時刻（JST）")
    
    # TTL設定（サブスクリプションプランに基づく）
    ttl_timestamp: Optional[int] = Field(None, description="TTL（エポック秒）")

    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

    def to_langchain_format(self) -> Dict[str, str]:
        """LangChain用フォーマットに変換（パフォーマンス最適化）"""
        return {
            "role": "user",
            "content": self.user_message,
            "ai_response": self.ai_response,
            "timestamp": to_jst_string(self.created_at),
            "emotions": [e.value for e in self.detected_emotions]
        }

# =====================================
# ユーザー・木状態管理
# =====================================

class UserTreeState(BaseModel):
    """ユーザーの木の状態"""
    user_id: str = Field(description="ユーザーID")
    current_stage: TreeGrowthStage = Field(default=TreeGrowthStage.SEED, description="現在段階")
    total_growth_points: int = Field(default=0, ge=0, description="総成長ポイント")
    
    # 実の統計
    fruit_counts: Dict[FruitType, int] = Field(default_factory=dict, description="実の種類別カウント")
    total_fruits: int = Field(default=0, ge=0, description="総実数")
    
    # 統計情報
    total_chats: int = Field(default=0, ge=0, description="総チャット数")
    last_chat_at: Optional[datetime] = Field(None, description="最終チャット時刻（JST）")
    
    # メタデータ
    created_at: datetime = Field(default_factory=get_current_jst, description="作成時刻（JST）")
    updated_at: datetime = Field(default_factory=get_current_jst, description="更新時刻（JST）")

    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

# =====================================
# エラーハンドリング
# =====================================

class ChatServiceError(Exception):
    """チャットサービス基底例外"""
    def __init__(self, message: str, error_code: str = "CHAT_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class AIGenerationError(ChatServiceError):
    """AI生成エラー"""
    def __init__(self, message: str):
        super().__init__(message, "AI_GENERATION_ERROR")

class TreeGrowthError(ChatServiceError):
    """木成長処理エラー"""
    def __init__(self, message: str):
        super().__init__(message, "TREE_GROWTH_ERROR")

class DataPersistenceError(ChatServiceError):
    """データ永続化エラー"""  
    def __init__(self, message: str):
        super().__init__(message, "DATA_PERSISTENCE_ERROR")

# =====================================
# コンスタント定義
# =====================================

# 成長ポイント計算用定数
GROWTH_POINTS_PER_STAGE = {
    TreeGrowthStage.SEED: 0,       # 種→芽: 10ポイント
    TreeGrowthStage.SPROUT: 10,    # 芽→若木: 25ポイント  
    TreeGrowthStage.SAPLING: 35,   # 若木→青年樹: 50ポイント
    TreeGrowthStage.YOUNG_TREE: 85, # 青年樹→成熟樹: 100ポイント
    TreeGrowthStage.MATURE_TREE: 185, # 成熟樹→大樹: 200ポイント
    TreeGrowthStage.GREAT_TREE: 385,  # 大樹: 上限
}

# 感情-実タイプマッピング
EMOTION_TO_FRUIT = {
    EmotionType.JOY: FruitType.SMALL_BERRY,
    EmotionType.RELIEF: FruitType.GOLDEN_FRUIT,
    EmotionType.PRIDE: FruitType.CRYSTAL_FRUIT,
    EmotionType.GRATITUDE: FruitType.HEART_FRUIT,
    EmotionType.HOPE: FruitType.STAR_FRUIT,
    EmotionType.LOVE: FruitType.RAINBOW_FRUIT,
}

# AIキャラクター設定
AI_CHARACTER_CONFIGS = {
    AICharacterType.TAMA: {
        "name": "たまさん",
        "personality": "優しく包容力がある",
        "tone": "丁寧で温かい",
        "specialty": "日常の小さな頑張りを見つけて褒める"
    },
    AICharacterType.MADOKA: {
        "name": "まどか姉さん",
        "personality": "頼りになるお姉さん的存在",
        "tone": "親しみやすく励ます",
        "specialty": "前向きなアドバイスと共感"
    },
    AICharacterType.HIDE: {
        "name": "ヒデじい",
        "personality": "人生経験豊富で温和",
        "tone": "穏やかで包容力がある",
        "specialty": "人生の知恵と深い理解"
    }
}

# 褒めレベル設定
PRAISE_LEVEL_CONFIGS = {
    PraiseLevel.LIGHT: {
        "target_length": "1文程度",
        "style": "簡潔で優しい励まし",
        "token_estimate": 30
    },
    PraiseLevel.STANDARD: {
        "target_length": "2-3文程度", 
        "style": "適度なサポートと承認",
        "token_estimate": 60
    },
    PraiseLevel.DEEP: {
        "target_length": "4-5文程度",
        "style": "思慮深く詳細な肯定と共感", 
        "token_estimate": 120
    }
}"""
Chat Service Models for Homebiyori
データモデル定義 - JST時刻対応、DynamoDB直接保存、画像機能削除版
"""

from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field, validator
import pytz
import uuid

def get_current_jst() -> datetime:
    """現在時刻をJST（日本標準時）で取得"""
    jst = pytz.timezone('Asia/Tokyo')
    return datetime.now(jst)

def to_jst_string(dt: datetime) -> str:
    """datetimeをJST文字列に変換"""
    if dt.tzinfo is None:
        # ナイーブなdatetimeの場合、JSTと仮定
        jst = pytz.timezone('Asia/Tokyo')
        dt = jst.localize(dt)
    else:
        # タイムゾーン付きdatetimeをJSTに変換
        jst = pytz.timezone('Asia/Tokyo')
        dt = dt.astimezone(jst)
    return dt.isoformat()

# =====================================
# AI キャラクター定義
# =====================================

class AICharacterType(str, Enum):
    """AIキャラクタータイプ"""
    TAMA = "tama"           # たまさん：優しい
    MADOKA = "madoka"       # まどか姉さん：お姉さん的
    HIDE = "hide"           # ヒデじい：おじいちゃん的

class PraiseLevel(str, Enum):
    """褒めレベル（2段階）"""
    NORMAL = "normal"       # ノーマル：適度なサポートと承認（2-3文程度）
    DEEP = "deep"          # ディープ：思慮深く詳細な肯定と共感（4-5文程度）          # ディープ：思慮深く詳細な肯定と共感（4-5文程度）

# =====================================
# 感情・木成長システム
# =====================================

class EmotionType(str, Enum):
    """感情タイプ"""
    JOY = "joy"             # 喜び
    RELIEF = "relief"       # 安堵
    PRIDE = "pride"         # 誇り
    GRATITUDE = "gratitude" # 感謝
    HOPE = "hope"          # 希望
    LOVE = "love"          # 愛情

class TreeGrowthStage(int, Enum):
    """木の成長段階（0-5の6段階）"""
    SEED = 0         # 種
    SPROUT = 1       # 芽
    SAPLING = 2      # 若木
    YOUNG_TREE = 3   # 青年樹
    MATURE_TREE = 4  # 成熟樹
    GREAT_TREE = 5   # 大樹

class FruitType(str, Enum):
    """実のタイプ"""
    SMALL_BERRY = "small_berry"     # 小さな実（喜び）
    GOLDEN_FRUIT = "golden_fruit"   # 金の実（安堵）  
    CRYSTAL_FRUIT = "crystal_fruit" # 水晶の実（誇り）
    HEART_FRUIT = "heart_fruit"     # ハートの実（感謝）
    STAR_FRUIT = "star_fruit"       # 星の実（希望）
    RAINBOW_FRUIT = "rainbow_fruit" # 虹の実（愛情）

# =====================================
# リクエスト・レスポンスモデル
# =====================================

class ChatRequest(BaseModel):
    """チャット送信リクエスト"""
    user_message: str = Field(..., min_length=1, max_length=2000, description="ユーザーメッセージ")
    ai_character: AICharacterType = Field(default=AICharacterType.TAMA, description="AIキャラクター")
    praise_level: PraiseLevel = Field(default=PraiseLevel.STANDARD, description="褒めレベル")

class TreeGrowthInfo(BaseModel):
    """木の成長情報"""
    current_stage: TreeGrowthStage = Field(description="現在の成長段階")
    growth_points: int = Field(ge=0, description="成長ポイント")
    points_to_next_stage: int = Field(ge=0, description="次段階まで必要ポイント")
    total_fruits: int = Field(ge=0, description="総実数")
    
    # 今回生成された実
    new_fruits: List[FruitType] = Field(default_factory=list, description="新しく生成された実")

class AIResponse(BaseModel):
    """AI応答結果"""
    praise_message: str = Field(description="褒めメッセージ")
    detected_emotions: List[EmotionType] = Field(description="検出された感情")
    tree_growth: TreeGrowthInfo = Field(description="木の成長情報")
    character_used: AICharacterType = Field(description="使用されたAIキャラクター")
    generated_at: datetime = Field(default_factory=get_current_jst, description="生成時刻（JST）")

    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

# =====================================
# データ永続化モデル（DynamoDB直接保存）
# =====================================

class ChatMessage(BaseModel):
    """チャットメッセージ（DynamoDB直接保存版・prod-homebiyori-chats）"""
    chat_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="チャットID")
    user_id: str = Field(description="ユーザーID")
    
    # メッセージ内容（DynamoDB直接保存）
    user_message: str = Field(description="ユーザーメッセージ")
    ai_response: str = Field(description="AI応答メッセージ")
    
    # メタデータ
    ai_character: AICharacterType = Field(description="使用AIキャラクター")
    praise_level: PraiseLevel = Field(description="褒めレベル")
    detected_emotions: List[EmotionType] = Field(default_factory=list, description="検出感情")
    
    # 木の成長関連
    growth_points_gained: int = Field(ge=0, description="獲得成長ポイント")
    new_fruits_generated: List[FruitType] = Field(default_factory=list, description="生成された実")
    tree_stage_at_time: TreeGrowthStage = Field(description="投稿時点の木の段階")
    
    # タイムスタンプ（JST）
    created_at: datetime = Field(default_factory=get_current_jst, description="作成時刻（JST）")
    
    # TTL設定（プラン別管理）
    ttl_timestamp: Optional[int] = Field(None, description="TTL（エポック秒）")
    subscription_plan: str = Field(description="TTL計算基準となるサブスクリプションプラン")

    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

    def to_langchain_format(self) -> Dict[str, str]:
        """LangChain用フォーマットに変換（パフォーマンス最適化）"""
        return {
            "role": "user",
            "content": self.user_message,
            "ai_response": self.ai_response,
            "timestamp": to_jst_string(self.created_at),
            "emotions": [e.value for e in self.detected_emotions]
        }

# =====================================
# ユーザー・木状態管理
# =====================================

class UserTreeState(BaseModel):
    """ユーザーの木の状態"""
    user_id: str = Field(description="ユーザーID")
    current_stage: TreeGrowthStage = Field(default=TreeGrowthStage.SEED, description="現在段階")
    total_growth_points: int = Field(default=0, ge=0, description="総成長ポイント")
    
    # 実の統計
    fruit_counts: Dict[FruitType, int] = Field(default_factory=dict, description="実の種類別カウント")
    total_fruits: int = Field(default=0, ge=0, description="総実数")
    
    # 統計情報
    total_chats: int = Field(default=0, ge=0, description="総チャット数")
    last_chat_at: Optional[datetime] = Field(None, description="最終チャット時刻（JST）")
    
    # メタデータ
    created_at: datetime = Field(default_factory=get_current_jst, description="作成時刻（JST）")
    updated_at: datetime = Field(default_factory=get_current_jst, description="更新時刻（JST）")

    class Config:
        json_encoders = {
            datetime: to_jst_string
        }

# =====================================
# エラーハンドリング
# =====================================

class ChatServiceError(Exception):
    """チャットサービス基底例外"""
    def __init__(self, message: str, error_code: str = "CHAT_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class AIGenerationError(ChatServiceError):
    """AI生成エラー"""
    def __init__(self, message: str):
        super().__init__(message, "AI_GENERATION_ERROR")

class TreeGrowthError(ChatServiceError):
    """木成長処理エラー"""
    def __init__(self, message: str):
        super().__init__(message, "TREE_GROWTH_ERROR")

class DataPersistenceError(ChatServiceError):
    """データ永続化エラー"""  
    def __init__(self, message: str):
        super().__init__(message, "DATA_PERSISTENCE_ERROR")

# =====================================
# コンスタント定義
# =====================================

# 成長ポイント計算用定数
GROWTH_POINTS_PER_STAGE = {
    TreeGrowthStage.SEED: 0,       # 種→芽: 10ポイント
    TreeGrowthStage.SPROUT: 10,    # 芽→若木: 25ポイント  
    TreeGrowthStage.SAPLING: 35,   # 若木→青年樹: 50ポイント
    TreeGrowthStage.YOUNG_TREE: 85, # 青年樹→成熟樹: 100ポイント
    TreeGrowthStage.MATURE_TREE: 185, # 成熟樹→大樹: 200ポイント
    TreeGrowthStage.GREAT_TREE: 385,  # 大樹: 上限
}

# 感情-実タイプマッピング
EMOTION_TO_FRUIT = {
    EmotionType.JOY: FruitType.SMALL_BERRY,
    EmotionType.RELIEF: FruitType.GOLDEN_FRUIT,
    EmotionType.PRIDE: FruitType.CRYSTAL_FRUIT,
    EmotionType.GRATITUDE: FruitType.HEART_FRUIT,
    EmotionType.HOPE: FruitType.STAR_FRUIT,
    EmotionType.LOVE: FruitType.RAINBOW_FRUIT,
}

# AIキャラクター設定
AI_CHARACTER_CONFIGS = {
    AICharacterType.TAMA: {
        "name": "たまさん",
        "personality": "優しく包容力がある",
        "tone": "丁寧で温かい",
        "specialty": "日常の小さな頑張りを見つけて褒める"
    },
    AICharacterType.MADOKA: {
        "name": "まどか姉さん",
        "personality": "頼りになるお姉さん的存在",
        "tone": "親しみやすく励ます",
        "specialty": "前向きなアドバイスと共感"
    },
    AICharacterType.HIDE: {
        "name": "ヒデじい",
        "personality": "人生経験豊富で温和",
        "tone": "穏やかで包容力がある",
        "specialty": "人生の知恵と深い理解"
    }
}

# 褒めレベル設定
PRAISE_LEVEL_CONFIGS = {
    PraiseLevel.LIGHT: {
        "target_length": "1文程度",
        "style": "簡潔で優しい励まし",
        "token_estimate": 30
    },
    PraiseLevel.STANDARD: {
        "target_length": "2-3文程度", 
        "style": "適度なサポートと承認",
        "token_estimate": 60
    },
    PraiseLevel.DEEP: {
        "target_length": "4-5文程度",
        "style": "思慮深く詳細な肯定と共感", 
        "token_estimate": 120
    }
}
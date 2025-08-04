"""
tree-service データモデル定義

■システム概要■
Homebiyori（ほめびより）木の成長システムのデータモデル。
ユーザーの育児努力を視覚的に表現する木の成長と、
感情的な瞬間を記録する実（褒めメッセージ）システムを管理。

■成長システム設計■
6段階の成長システム:
- Stage 0: 種（0-99文字）
- Stage 1: 芽（100-299文字）
- Stage 2: 苗（300-599文字）
- Stage 3: 若木（600-999文字）
- Stage 4: 成木（1000-1499文字）
- Stage 5: 大木（1500文字以上）

■実システム設計■
- 感情検出時の特別な褒めメッセージ
- 1日1回制限（最後の実生成から24時間経過）
- AIキャラクター別テーマカラー
- 永続保存（実削除なし）

■データ保存戦略■
- 成長統計: DynamoDB（高速アクセス）
- 実コンテンツ: DynamoDB（永続保存）
- 成長履歴: DynamoDB（分析用）
"""

from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field, validator
import uuid
import pytz
from enum import Enum


def get_current_jst() -> datetime:
    """
    現在のJST時刻を取得
    
    システム全体でJST統一により、日本のユーザーに最適化。
    """
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
# 成長システム関連の型定義
# =====================================

TreeStage = Literal[0, 1, 2, 3, 4, 5]
AICharacterType = Literal["tama", "madoka", "hide"]
EmotionType = Literal["joy", "gratitude", "accomplishment", "relief", "excitement", "calm", "neutral"]

class TreeTheme(str, Enum):
    """木のテーマカラー（AIキャラクター連動）"""
    WARM_PINK = "warm_pink"      # たまさん - ピンク系
    COOL_BLUE = "cool_blue"      # まどか姉さん - ブルー系  
    WARM_ORANGE = "warm_orange"  # ヒデじい - オレンジ系    # ヒデじい


# 成長段階設定
TREE_STAGE_CONFIG = {
    0: {"name": "種", "min_chars": 0, "max_chars": 99, "description": "これから芽吹く可能性の種"},
    1: {"name": "芽", "min_chars": 100, "max_chars": 299, "description": "小さな芽が顔を出しました"},
    2: {"name": "苗", "min_chars": 300, "max_chars": 599, "description": "青々とした若い苗に成長"},
    3: {"name": "若木", "min_chars": 600, "max_chars": 999, "description": "しっかりとした若木になりました"},
    4: {"name": "成木", "min_chars": 1000, "max_chars": 1499, "description": "立派な成木として自立"},
    5: {"name": "大木", "min_chars": 1500, "max_chars": float('inf'), "description": "どっしりとした大木に成長"}
}


# =====================================
# 木の成長状態モデル
# =====================================

class TreeStatus(BaseModel):
    """
    木の現在状態
    
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
    
    stage_name: str = Field(
        ...,
        description="成長段階名（種、芽、苗、若木、成木、大木）"
    )
    
    stage_description: str = Field(
        ...,
        description="成長段階の説明文"
    )
    
    total_characters: int = Field(
        ...,
        ge=0,
        description="累計文字数"
    )
    
    characters_to_next: int = Field(
        ...,
        ge=0,
        description="次の段階まで必要な文字数"
    )
    
    progress_percentage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="現在段階内での進捗率（0-100%）"
    )
    
    theme_color: TreeTheme = Field(
        default=TreeTheme.ROSE,
        description="選択中のテーマカラー"
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
    
    last_message_date: Optional[datetime] = Field(
        None,
        description="最後のメッセージ日時"
    )
    
    last_fruit_date: Optional[datetime] = Field(
        None,
        description="最後の実生成日時"
    )
    
    created_at: datetime = Field(
        default_factory=get_current_jst,
        description="木の開始日時（JST）"
    )
    
    updated_at: datetime = Field(
        default_factory=get_current_jst,
        description="最終更新日時（JST）"
    )


class TreeGrowthInfo(BaseModel):
    """
    成長情報（チャット機能との連携用）
    
    ■成長計算■
    - 前回段階から現在段階への変化
    - 文字数増加による成長判定
    - 成長アニメーション用データ
    """
    
    previous_stage: TreeStage = Field(
        ...,
        description="成長前の段階"
    )
    
    current_stage: TreeStage = Field(
        ...,
        description="現在の段階"
    )
    
    previous_total: int = Field(
        ...,
        ge=0,
        description="成長前の累計文字数"
    )
    
    current_total: int = Field(
        ...,
        ge=0,
        description="現在の累計文字数"
    )
    
    added_characters: int = Field(
        ...,
        ge=0,
        description="今回追加された文字数"
    )
    
    stage_changed: bool = Field(
        ...,
        description="段階が変化したか"
    )
    
    characters_to_next: int = Field(
        ...,
        ge=0,
        description="次段階まで必要な文字数"
    )
    
    growth_celebration: Optional[str] = Field(
        None,
        description="成長段階変化時のお祝いメッセージ"
    )


# =====================================
# 実（褒めメッセージ）モデル
# =====================================

class FruitInfo(BaseModel):
    """
    実（褒めメッセージ）情報
    
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
    
    message: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="実に込められた褒めメッセージ"
    )
    
    emotion_trigger: EmotionType = Field(
        ...,
        description="実を生成したトリガー感情"
    )
    
    emotion_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="感情強度スコア（0.0-1.0）"
    )
    
    ai_character: AICharacterType = Field(
        ...,
        description="実を生成したAIキャラクター"
    )
    
    character_color: TreeTheme = Field(
        ...,
        description="キャラクター別テーマカラー"
    )
    
    trigger_message_id: Optional[str] = Field(
        None,
        description="実生成のきっかけとなったメッセージID"
    )
    
    created_at: datetime = Field(
        default_factory=get_current_jst,
        description="実の生成日時（JST）"
    )
    
    viewed_at: Optional[datetime] = Field(
        None,
        description="実を最初に閲覧した日時"
    )
    
    view_count: int = Field(
        default=0,
        ge=0,
        description="閲覧回数"
    )
    
    class Config:
        json_encoders = {
            datetime: to_jst_string
        }


class FruitViewRequest(BaseModel):
    """
    実の詳細表示リクエスト
    """
    
    fruit_id: str = Field(
        ...,
        description="表示する実のID"
    )


class FruitViewResponse(BaseModel):
    """
    実の詳細表示レスポンス
    
    ■表示情報■
    - 実の内容と生成情報
    - 閲覧統計
    - 関連コンテキスト
    """
    
    fruit_info: FruitInfo = Field(
        ...,
        description="実の詳細情報"
    )
    
    character_info: Dict[str, str] = Field(
        ...,
        description="生成したAIキャラクターの情報"
    )
    
    context: Optional[Dict[str, str]] = Field(
        None,
        description="実生成時のコンテキスト情報"
    )
    
    is_new_view: bool = Field(
        ...,
        description="今回が初回閲覧かどうか"
    )


# =====================================
# 木の成長履歴モデル
# =====================================

class GrowthHistoryItem(BaseModel):
    """
    成長履歴アイテム
    
    ■履歴項目■
    - 段階変化の記録
    - 達成日時
    - 記念メッセージ
    """
    
    stage: TreeStage = Field(
        ...,
        description="到達した成長段階"
    )
    
    stage_name: str = Field(
        ...,
        description="段階名"
    )
    
    achieved_at: datetime = Field(
        ...,
        description="達成日時"
    )
    
    total_characters_at_achievement: int = Field(
        ...,
        description="達成時の累計文字数"
    )
    
    celebration_message: Optional[str] = Field(
        None,
        description="達成時のお祝いメッセージ"
    )
    
    milestone_fruit_id: Optional[str] = Field(
        None,
        description="達成記念の特別な実ID"
    )


class GrowthHistoryResponse(BaseModel):
    """
    成長履歴取得レスポンス
    """
    
    user_id: str = Field(
        ...,
        description="ユーザーID"
    )
    
    history: List[GrowthHistoryItem] = Field(
        ...,
        description="成長履歴リスト（古い順）"
    )
    
    total_growth_days: int = Field(
        ...,
        description="開始から現在までの日数"
    )
    
    average_characters_per_day: float = Field(
        ...,
        description="1日平均文字数"
    )


# =====================================
# 実一覧取得モデル
# =====================================

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


# =====================================
# ユーティリティ関数
# =====================================

def calculate_tree_stage(total_characters: int) -> TreeStage:
    """
    累計文字数から成長段階を計算
    
    Args:
        total_characters: 累計文字数
        
    Returns:
        TreeStage: 成長段階（0-5）
    """
    for stage in range(5, -1, -1):  # 5から0まで逆順チェック
        config = TREE_STAGE_CONFIG[stage]
        if total_characters >= config["min_chars"]:
            return stage
    return 0


def get_characters_to_next_stage(total_characters: int) -> int:
    """
    次の成長段階まで必要な文字数を計算
    
    Args:
        total_characters: 現在の累計文字数
        
    Returns:
        int: 次段階まで必要な文字数（最大段階の場合は0）
    """
    current_stage = calculate_tree_stage(total_characters)
    
    if current_stage >= 5:
        return 0  # 最高段階到達
    
    next_stage_config = TREE_STAGE_CONFIG[current_stage + 1]
    return next_stage_config["min_chars"] - total_characters


def calculate_progress_percentage(total_characters: int) -> float:
    """
    現在の成長段階内での進捗率を計算
    
    Args:
        total_characters: 累計文字数
        
    Returns:
        float: 进捗率（0.0-100.0%）
    """
    current_stage = calculate_tree_stage(total_characters)
    config = TREE_STAGE_CONFIG[current_stage]
    
    if current_stage >= 5:
        return 100.0  # 最高段階は100%
    
    stage_min = config["min_chars"]
    stage_max = config["max_chars"]
    stage_range = stage_max - stage_min + 1
    
    characters_in_stage = total_characters - stage_min
    progress = (characters_in_stage / stage_range) * 100.0
    
    return min(100.0, max(0.0, progress))


def get_character_theme_color(character: AICharacterType) -> TreeTheme:
    """
    AIキャラクターからテーマカラーを取得
    
    Args:
        character: AIキャラクター
        
    Returns:
        TreeTheme: テーマカラー
    """
    character_theme_map = {
        "tama": TreeTheme.ROSE,
        "madoka": TreeTheme.SKY,
        "hide": TreeTheme.AMBER
    }
    return character_theme_map.get(character, TreeTheme.ROSE)


def can_generate_fruit(last_fruit_date: Optional[datetime]) -> bool:
    """
    実生成可能かチェック（1日1回制限）
    
    Args:
        last_fruit_date: 最後の実生成日時
        
    Returns:
        bool: 実生成可能かどうか
    """
    if not last_fruit_date:
        return True
    
    now = get_current_jst()
    time_diff = now - last_fruit_date
    return time_diff.total_seconds() >= 24 * 60 * 60  # 24時間 = 86400秒


def generate_growth_celebration_message(
    stage: TreeStage, 
    character: AICharacterType
) -> str:
    """
    成長段階到達時のお祝いメッセージ生成
    
    Args:
        stage: 到達した成長段階
        character: 選択中のAIキャラクター
        
    Returns:
        str: お祝いメッセージ
    """
    stage_name = TREE_STAGE_CONFIG[stage]["name"]
    
    # キャラクター別お祝いメッセージテンプレート
    celebration_templates = {
        "tama": {
            1: f"おめでとう！小さな芽が出たのね。コツコツ続けた成果よ。",
            2: f"素晴らしい！{stage_name}まで成長したわ。あなたの努力が実を結んでいるのね。",
            3: f"立派な{stage_name}になったじゃない！毎日の積み重ねって大事なのよ。",
            4: f"見事な{stage_name}に育ったわね。あなたの愛情がこんなに美しい木を育てたのよ。",
            5: f"なんて立派な{stage_name}！あなたの育児への想いが、こんなに大きく美しい木になったのね。"
        },
        "madoka": {
            1: f"おめでとうございます！{stage_name}が芽吹きましたね。継続の力って素晴らしいです。",
            2: f"素晴らしい成長です！{stage_name}まで育ちました。効率的に続けられている証拠ですね。",
            3: f"立派な{stage_name}への成長、お疲れ様でした。着実なステップアップが成果に現れています。",
            4: f"見事な{stage_name}まで到達されました。バランス良く育児を続けられている証拠です。",
            5: f"圧巻の{stage_name}です！あなたの計画的な育児への取り組みが、最高の結果を生み出しました。"
        },
        "hide": {
            1: f"ほう、小さな{stage_name}が顔を出したな。始まりはいつも静かで美しいものじゃ。",
            2: f"見事な{stage_name}に育ったのう。日々の想いが、こうして形になるのは美しいことじゃ。",
            3: f"立派な{stage_name}じゃな。あなたの心の豊かさが、木にも表れておる。",
            4: f"素晴らしい{stage_name}に成長したな。深い愛情と忍耐が、こんな美しい姿を作り上げた。",
            5: f"なんと見事な{stage_name}じゃ。あなたの育児への真摯な想いが、永遠の美しさを宿した木となったのう。"
        }
    }
    
    templates = celebration_templates.get(character, celebration_templates["tama"])
    return templates.get(stage, f"おめでとうございます！{stage_name}に成長しました！")


def create_tree_status_from_stats(
    user_id: str,
    stats: Dict[str, Any],
    theme_color: TreeTheme = TreeTheme.ROSE
) -> TreeStatus:
    """
    統計データからTreeStatusオブジェクトを作成
    
    Args:
        user_id: ユーザーID
        stats: 木の統計データ
        theme_color: テーマカラー
        
    Returns:
        TreeStatus: 木の状態オブジェクト
    """
    total_characters = stats.get("total_characters", 0)
    current_stage = calculate_tree_stage(total_characters)
    config = TREE_STAGE_CONFIG[current_stage]
    
    return TreeStatus(
        user_id=user_id,
        current_stage=current_stage,
        stage_name=config["name"],
        stage_description=config["description"],
        total_characters=total_characters,
        characters_to_next=get_characters_to_next_stage(total_characters),
        progress_percentage=calculate_progress_percentage(total_characters),
        theme_color=theme_color,
        total_messages=stats.get("total_messages", 0),
        total_fruits=stats.get("total_fruits", 0),
        last_message_date=stats.get("last_message_date"),
        last_fruit_date=stats.get("last_fruit_date"),
        created_at=stats.get("created_at", get_current_jst()),
        updated_at=stats.get("updated_at", get_current_jst())
    )
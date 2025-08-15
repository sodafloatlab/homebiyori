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

from typing import Optional
from pydantic import BaseModel, Field

# 共通Layerからモデル定義をインポート
from homebiyori_common.models import (
    AICharacterType,
    EmotionType,
    TreeTheme,
    TreeStage,
    FruitInfo,
    TreeStatus
)


# TreeStatusとFruitInfoは homebiyori_common.models から使用


class FruitsListRequest(BaseModel):
    """
    実一覧取得リクエスト（クエリパラメーター用）
    """
    
    character_filter: Optional[AICharacterType] = Field(
        None,
        alias="character",
        description="特定キャラクターの実のみ取得"
    )
    
    emotion_filter: Optional[EmotionType] = Field(
        None,
        alias="emotion", 
        description="特定感情の実のみ取得"
    )
    
    start_date: Optional[str] = Field(
        None,
        description="取得開始日（YYYY-MM-DD）",
        pattern=r"^\d{4}-\d{2}-\d{2}$"
    )
    
    end_date: Optional[str] = Field(
        None,
        description="取得終了日（YYYY-MM-DD）",
        pattern=r"^\d{4}-\d{2}-\d{2}$"
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
    
    class Config:
        populate_by_name = True


class FruitsListResponse(BaseModel):
    """
    実一覧取得レスポンス（database.py実装準拠）
    """
    
    items: list[FruitInfo] = Field(
        ...,
        description="実の一覧"
    )
    
    total_count: int = Field(
        ...,
        description="総実数"
    )
    
    next_token: Optional[str] = Field(
        None,
        description="次ページトークン"
    )
    
    has_more: bool = Field(
        ...,
        description="さらにデータが存在するか"
    )
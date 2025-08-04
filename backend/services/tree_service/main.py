"""
tree-service Lambda FastAPIアプリケーション

■システム概要■
Homebiyori（ほめびより）の木の成長管理システム。
ユーザーの育児投稿に基づいて木を成長させ、
感情的な瞬間を「実」として保存する機能を提供。

■主要機能■
1. 木の成長状態取得・更新
2. 実（褒めメッセージ）生成・管理
3. 成長履歴記録・分析
4. テーマカラー管理
5. 成長統計の取得

■アーキテクチャ改訂■
- AWS Lambda (Python 3.11, 512MB, 30秒)
- FastAPI + Mangum
- Lambda Layers: homebiyori-common-layer
- 認証: API Gateway + Cognito Authorizer
- データストア: DynamoDB 7テーブル構成 (prod-homebiyori-trees, prod-homebiyori-fruits)

■セキュリティ■
JWT認証必須、入力値検証、レート制限、適切なCORS設定
"""

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import os
import asyncio
from datetime import datetime, timedelta
import pytz

# Lambda Layers からの共通機能インポート
from homebiyori_common.auth import get_user_id_from_event
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import (
    ValidationError,
    AuthenticationError,
    DatabaseError,
    MaintenanceError,
    ExternalServiceError
)
from homebiyori_common.maintenance import check_maintenance_mode

# ローカルモジュール
from .models import (
    TreeStatus,
    TreeGrowthInfo,
    FruitInfo,
    FruitViewRequest,
    FruitViewResponse,
    FruitsListRequest,
    FruitsListResponse,
    GrowthHistoryResponse,
    TreeStage,
    AICharacterType,
    EmotionType,
    TreeTheme,
    get_current_jst,
    calculate_tree_stage,
    get_characters_to_next_stage,
    calculate_progress_percentage,
    get_character_theme_color,
    can_generate_fruit,
    generate_growth_celebration_message,
    create_tree_status_from_stats,
    TREE_STAGE_CONFIG
)
from .database import get_tree_database

# 構造化ログ設定
logger = get_logger(__name__)

# FastAPIインスタンス作成
app = FastAPI(
    title="Tree Service API",
    description="Homebiyori 木の成長管理システム",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENABLE_DOCS") == "true" else None,
    redoc_url="/redoc" if os.getenv("ENABLE_DOCS") == "true" else None
)

# データベースインスタンス
db = get_tree_database()

# =====================================
# ミドルウェア・依存関数
# =====================================

async def get_user_id(request: Request) -> str:
    """
    リクエストからユーザーIDを取得
    
    API Gateway + Cognito Authorizerにより既に認証済み
    Lambda Event Contextからsub（ユーザーID）を抽出
    """
    try:
        return get_user_id_from_event(request.scope.get("aws.event", {}))
    except Exception as e:
        logger.error(f"ユーザーID取得エラー: {e}")
        raise HTTPException(status_code=401, detail="認証が必要です")

@app.middleware("http")
async def maintenance_check_middleware(request: Request, call_next):
    """
    メンテナンスモードチェック
    """
    try:
        await check_maintenance_mode()
    except MaintenanceError as e:
        return JSONResponse(
            status_code=503,
            content={
                "error": "maintenance",
                "message": str(e),
                "retry_after": 3600  # 1時間後に再試行
            }
        )
    
    response = await call_next(request)
    return response

@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    """
    統一エラーハンドリング
    """
    try:
        response = await call_next(request)
        return response
    except ValidationError as e:
        logger.warning(f"バリデーションエラー: {e}")
        return JSONResponse(
            status_code=400,
            content={
                "error": "validation_error",
                "message": str(e)
            }
        )
    except DatabaseError as e:
        logger.error(f"データベースエラー: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "database_error",
                "message": "データベース処理でエラーが発生しました"
            }
        )
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_server_error",
                "message": "内部サーバーエラーが発生しました"
            }
        )

# =====================================
# 木の成長状態管理エンドポイント
# =====================================

@app.get("/api/tree/status", response_model=TreeStatus)
async def get_tree_status(
    user_id: str = Depends(get_user_id)
):
    """
    木の成長状態取得
    
    ■取得情報■
    - 現在の成長段階と説明
    - 累計文字数と進捗
    - 実の総数
    - 最終更新情報
    """
    try:
        logger.info(f"木の状態取得開始: user_id={user_id}")
        
        # ユーザーの木統計を取得
        tree_stats = await db.get_user_tree_stats(user_id)
        
        if not tree_stats:
            # 初回アクセス時：新規木作成
            tree_stats = await db.create_initial_tree(user_id)
            logger.info(f"新規木作成: user_id={user_id}")
        
        # TreeStatusオブジェクト作成
        tree_status = create_tree_status_from_stats(
            user_id=user_id,
            stats=tree_stats,
            theme_color=TreeTheme(tree_stats.get("theme_color", "rose"))
        )
        
        logger.info(f"木の状態取得完了: stage={tree_status.current_stage}, chars={tree_status.total_characters}")
        return tree_status
        
    except Exception as e:
        logger.error(f"木の状態取得エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="木の状態取得に失敗しました")

@app.post("/api/tree/update-growth", response_model=TreeGrowthInfo)
async def update_tree_growth(
    added_characters: int,
    user_id: str = Depends(get_user_id)
):
    """
    木の成長更新（chat-serviceから呼び出し）
    
    Args:
        added_characters: 追加された文字数
    
    Returns:
        TreeGrowthInfo: 成長情報（段階変化含む）
    """
    try:
        logger.info(f"木の成長更新開始: user_id={user_id}, added_chars={added_characters}")
        
        if added_characters <= 0:
            raise ValidationError("追加文字数は1以上である必要があります")
        
        # 現在の木統計を取得
        current_stats = await db.get_user_tree_stats(user_id)
        if not current_stats:
            current_stats = await db.create_initial_tree(user_id)
        
        # 成長前の状態
        previous_total = current_stats.get("total_characters", 0)
        previous_stage = calculate_tree_stage(previous_total)
        
        # 新しい累計文字数
        new_total = previous_total + added_characters
        new_stage = calculate_tree_stage(new_total)
        
        # 木統計を更新
        await db.update_tree_growth(
            user_id=user_id,
            added_characters=added_characters,
            new_total_characters=new_total
        )
        
        # 段階変化の場合：成長履歴記録
        growth_celebration = None
        if new_stage > previous_stage:
            # 成長履歴に記録
            await db.record_growth_achievement(
                user_id=user_id,
                new_stage=new_stage,
                total_characters=new_total
            )
            
            # お祝いメッセージ生成
            # TODO: ユーザーの選択中AIキャラクターを取得
            preferred_character = "tama"  # デフォルト
            growth_celebration = generate_growth_celebration_message(
                new_stage, preferred_character
            )
            
            logger.info(f"木の成長段階変化: user_id={user_id}, {previous_stage} -> {new_stage}")
        
        # 成長情報レスポンス作成
        growth_info = TreeGrowthInfo(
            previous_stage=previous_stage,
            current_stage=new_stage,
            previous_total=previous_total,
            current_total=new_total,
            added_characters=added_characters,
            stage_changed=(new_stage > previous_stage),
            characters_to_next=get_characters_to_next_stage(new_total),
            growth_celebration=growth_celebration
        )
        
        logger.info(f"木の成長更新完了: user_id={user_id}, stage_changed={growth_info.stage_changed}")
        return growth_info
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"木の成長更新エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="木の成長更新に失敗しました")

@app.put("/api/tree/theme", response_model=TreeStatus)
async def update_tree_theme(
    theme_color: TreeTheme,
    user_id: str = Depends(get_user_id)
):
    """
    木のテーマカラー更新
    
    Args:
        theme_color: 新しいテーマカラー
    
    Returns:
        TreeStatus: 更新後の木の状態
    """
    try:
        logger.info(f"テーマカラー更新開始: user_id={user_id}, theme={theme_color}")
        
        # テーマカラーを更新
        await db.update_tree_theme(user_id, theme_color.value)
        
        # 更新後の木状態を取得
        tree_stats = await db.get_user_tree_stats(user_id)
        tree_status = create_tree_status_from_stats(
            user_id=user_id,
            stats=tree_stats,
            theme_color=theme_color
        )
        
        logger.info(f"テーマカラー更新完了: user_id={user_id}")
        return tree_status
        
    except Exception as e:
        logger.error(f"テーマカラー更新エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="テーマカラー更新に失敗しました")

# =====================================
# 実（褒めメッセージ）管理エンドポイント
# =====================================

@app.post("/api/tree/generate-fruit", response_model=FruitInfo)
async def generate_fruit(
    message: str,
    emotion: EmotionType,
    emotion_score: float,
    ai_character: AICharacterType,
    trigger_message_id: Optional[str] = None,
    user_id: str = Depends(get_user_id)
):
    """
    実（褒めメッセージ）生成（chat-serviceから呼び出し）
    
    Args:
        message: 実に込める褒めメッセージ
        emotion: トリガー感情
        emotion_score: 感情強度（0.0-1.0）
        ai_character: 生成したAIキャラクター
        trigger_message_id: きっかけとなったメッセージID
    
    Returns:
        FruitInfo: 生成された実の情報
    """
    try:
        logger.info(f"実生成開始: user_id={user_id}, emotion={emotion}")
        
        # 入力値検証
        if not message or len(message.strip()) == 0:
            raise ValidationError("メッセージは必須です")
        
        if not (0.0 <= emotion_score <= 1.0):
            raise ValidationError("感情スコアは0.0-1.0の範囲である必要があります")
        
        # 1日1回制限チェック
        tree_stats = await db.get_user_tree_stats(user_id)
        last_fruit_date = tree_stats.get("last_fruit_date") if tree_stats else None
        
        if not can_generate_fruit(last_fruit_date):
            raise HTTPException(
                status_code=429,
                detail="実の生成は1日1回までです。明日また試してください。"
            )
        
        # 実情報作成
        fruit_info = FruitInfo(
            user_id=user_id,
            message=message.strip(),
            emotion_trigger=emotion,
            emotion_score=emotion_score,
            ai_character=ai_character,
            character_color=get_character_theme_color(ai_character),
            trigger_message_id=trigger_message_id
        )
        
        # データベースに保存
        await db.save_fruit(fruit_info)
        
        # 木統計の実カウント更新
        await db.increment_fruit_count(user_id)
        
        logger.info(f"実生成完了: user_id={user_id}, fruit_id={fruit_info.fruit_id}")
        return fruit_info
        
    except ValidationError:
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"実生成エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="実の生成に失敗しました")

@app.get("/api/tree/fruits", response_model=FruitsListResponse)
async def get_fruits_list(
    character_filter: Optional[str] = None,
    emotion_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 20,
    next_token: Optional[str] = None,
    user_id: str = Depends(get_user_id)
):
    """
    実一覧取得
    
    Args:
        character_filter: キャラクターフィルター
        emotion_filter: 感情フィルター
        start_date: 開始日（YYYY-MM-DD）
        end_date: 終了日（YYYY-MM-DD）
        limit: 取得件数制限
        next_token: ページネーショントークン
    
    Returns:
        FruitsListResponse: 実一覧とメタデータ
    """
    try:
        logger.info(f"実一覧取得開始: user_id={user_id}")
        
        # フィルター条件作成
        filters = {}
        if character_filter:
            filters["character"] = character_filter
        if emotion_filter:
            filters["emotion"] = emotion_filter
        if start_date:
            filters["start_date"] = start_date
        if end_date:
            filters["end_date"] = end_date
        
        # 実一覧を取得
        fruits_data = await db.get_user_fruits(
            user_id=user_id,
            filters=filters,
            limit=min(limit, 100),  # 最大100件制限
            next_token=next_token
        )
        
        # レスポンス作成
        response = FruitsListResponse(
            fruits=fruits_data["items"],
            total_count=fruits_data["total_count"],
            character_counts=fruits_data["character_counts"],
            emotion_counts=fruits_data["emotion_counts"],
            next_token=fruits_data.get("next_token"),
            has_more=fruits_data.get("has_more", False)
        )
        
        logger.info(f"実一覧取得完了: user_id={user_id}, count={len(response.fruits)}")
        return response
        
    except Exception as e:
        logger.error(f"実一覧取得エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="実一覧の取得に失敗しました")

@app.get("/api/tree/fruits/{fruit_id}", response_model=FruitViewResponse)
async def get_fruit_detail(
    fruit_id: str,
    user_id: str = Depends(get_user_id)
):
    """
    実の詳細取得
    
    Args:
        fruit_id: 実のID
    
    Returns:
        FruitViewResponse: 実の詳細情報
    """
    try:
        logger.info(f"実詳細取得開始: user_id={user_id}, fruit_id={fruit_id}")
        
        # 実の詳細を取得
        fruit_info = await db.get_fruit_detail(user_id, fruit_id)
        
        if not fruit_info:
            raise HTTPException(status_code=404, detail="実が見つかりません")
        
        # 初回閲覧判定・閲覧統計更新
        is_new_view = fruit_info.viewed_at is None
        await db.update_fruit_view_stats(user_id, fruit_id)
        
        # キャラクター情報取得
        character_info = {
            "name": {
                "tama": "たまさん",
                "madoka": "まどか姉さん",
                "hide": "ヒデじい"
            }.get(fruit_info.ai_character, "たまさん"),
            "theme_color": fruit_info.character_color.value
        }
        
        # レスポンス作成
        response = FruitViewResponse(
            fruit_info=fruit_info,
            character_info=character_info,
            context=None,  # 将来的にコンテキスト情報を追加
            is_new_view=is_new_view
        )
        
        logger.info(f"実詳細取得完了: user_id={user_id}, fruit_id={fruit_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"実詳細取得エラー: user_id={user_id}, fruit_id={fruit_id}, error={e}")
        raise HTTPException(status_code=500, detail="実の詳細取得に失敗しました")

# =====================================
# 成長履歴・統計エンドポイント
# =====================================

@app.get("/api/tree/history", response_model=GrowthHistoryResponse)
async def get_growth_history(
    user_id: str = Depends(get_user_id)
):
    """
    成長履歴取得
    
    Returns:
        GrowthHistoryResponse: 成長履歴と統計情報
    """
    try:
        logger.info(f"成長履歴取得開始: user_id={user_id}")
        
        # 成長履歴を取得
        history_data = await db.get_growth_history(user_id)
        
        # 統計計算
        tree_stats = await db.get_user_tree_stats(user_id)
        start_date = tree_stats.get("created_at", get_current_jst())
        current_date = get_current_jst()
        
        total_days = max(1, (current_date - start_date).days)
        total_characters = tree_stats.get("total_characters", 0)
        avg_chars_per_day = total_characters / total_days
        
        response = GrowthHistoryResponse(
            user_id=user_id,
            history=history_data,
            total_growth_days=total_days,
            average_characters_per_day=round(avg_chars_per_day, 1)
        )
        
        logger.info(f"成長履歴取得完了: user_id={user_id}, items={len(history_data)}")
        return response
        
    except Exception as e:
        logger.error(f"成長履歴取得エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="成長履歴の取得に失敗しました")

# =====================================
# ヘルスチェック
# =====================================

@app.get("/health")
async def health_check():
    """
    ヘルスチェック
    """
    try:
        # データベース接続確認
        await db.health_check()
        
        return {
            "status": "healthy",
            "service": "tree-service",
            "timestamp": get_current_jst().isoformat(),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"ヘルスチェック失敗: {e}")
        raise HTTPException(status_code=503, detail="サービスが利用できません")
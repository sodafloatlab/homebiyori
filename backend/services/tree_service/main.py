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
from homebiyori_common.utils.middleware import maintenance_check_middleware, get_current_user_id, error_handling_middleware
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string, parse_jst_datetime
from homebiyori_common.utils.parameter_store import get_tree_stage

# 共通Layerからモデルをインポート
from homebiyori_common.models import (
    AICharacterType,
    EmotionType,
    TreeStage,
    TreeStatus,
    FruitInfo
)

# ローカルモジュール
from .models import (
    FruitsListRequest,
    FruitsListResponse
)
from .database import get_tree_database

# 構造化ログ設定
logger = get_logger(__name__)

# FastAPIインスタンス作成
app = FastAPI(
    title="Tree Service API",
    description="Homebiyori 木の成長管理システム",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "prod" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "prod" else None
)

# データベースインスタンス
db = get_tree_database()

# =====================================
# ユーティリティ関数
# =====================================

# 以前ここにあったcompute関数は以下の理由で削除されました：
# - calculate_tree_stage_local: database.pyで直接get_tree_stageを使用しているため不要
# - get_character_theme_color: ユーザーのAIキャラクター情報はuser_serviceで管理されるべき


def can_generate_fruit(last_fruit_date: Optional[str]) -> bool:
    """
    実生成可能かチェック（1日1回制限）
    
    Args:
        last_fruit_date: 最後の実生成日時（JST文字列）
        
    Returns:
        bool: 実生成可能かどうか
    """
    if not last_fruit_date:
        return True
    
    try:
        # JST文字列をdatetimeに変換（共通関数使用）
        last_fruit_dt = parse_jst_datetime(last_fruit_date)
        if not last_fruit_dt:
            # パース失敗時は生成を許可
            return True
            
        now = get_current_jst()
        time_diff = now - last_fruit_dt
        return time_diff.total_seconds() >= 24 * 60 * 60  # 24時間
        
    except Exception:
        # パースエラーの場合は生成を許可
        return True


def create_tree_status_from_db_data(
    user_id: str,
    tree_data: Dict[str, Any]
) -> TreeStatus:
    """
    DynamoDBデータからTreeStatusオブジェクトを作成
    
    ⚠️ 重要: この関数はDBデータが確実に存在する場合のみ使用すること
    DBにデータが存在しない場合は事前にcreate_initial_treeで作成が必要
    
    Args:
        user_id: ユーザーID
        tree_data: DynamoDBの木データ（必須フィールドを含む）
        
    Returns:
        TreeStatus: 木の状態オブジェクト
        
    Raises:
        KeyError: 必須フィールドが不足している場合
    """
    # 必須フィールドの存在確認（デフォルト値は使用しない）
    required_fields = ["current_stage", "total_characters", "total_messages", "total_fruits"]
    for field in required_fields:
        if field not in tree_data:
            raise KeyError(f"Required field '{field}' is missing from tree_data")
    
    return TreeStatus(
        user_id=user_id,
        current_stage=tree_data["current_stage"],
        total_characters=tree_data["total_characters"],
        total_messages=tree_data["total_messages"],
        total_fruits=tree_data["total_fruits"],
        last_message_date=tree_data.get("last_message_date"),
        last_fruit_date=tree_data.get("last_fruit_date"),
        created_at=tree_data.get("created_at", to_jst_string(get_current_jst())),
        updated_at=tree_data.get("updated_at", to_jst_string(get_current_jst()))
    )

# =====================================
# ミドルウェア・依存関数
# =====================================

# 共通ミドルウェアをLambda Layerから適用
app.middleware("http")(maintenance_check_middleware)
app.middleware("http")(error_handling_middleware)

# =====================================
# 木の成長状態管理エンドポイント
# =====================================

@app.get("/api/tree/status")
async def get_tree_status(
    user_id: str = Depends(get_current_user_id)
):
    """
    木の成長状態取得（読み取り専用）
    
    ■取得情報■
    - 現在の成長段階と説明
    - 累計文字数と進捗
    - 実の総数
    - 最終更新情報
    
    ■注意■
    木が初期化されていない場合は404エラーを返します。
    初期化は PUT /api/tree/status で行ってください。
    """
    try:
        logger.info(f"木の状態取得開始: user_id={user_id}")
        
        # ユーザーの木の状態を取得（読み取り専用）
        tree_status_data = await db.get_user_tree_status(user_id)
        
        if not tree_status_data:
            logger.warning(f"木の状態が存在しません: user_id={user_id}")
            raise HTTPException(
                status_code=404, 
                detail="木がまだ初期化されていません。PUT /api/tree/status で初期化してください。"
            )
        
        # TreeStatusオブジェクト作成
        tree_status = create_tree_status_from_db_data(
            user_id=user_id,
            tree_data=tree_status_data
        )
        
        logger.info(f"木の状態取得完了: stage={tree_status.current_stage}, chars={tree_status.total_characters}")
        return tree_status
        
    except HTTPException:
        # HTTPExceptionは再発生
        raise
    except Exception as e:
        logger.error(f"木の状態取得エラー: error={e}")
        raise HTTPException(status_code=500, detail="木の状態取得に失敗しました")


@app.put("/api/tree/status", response_model=TreeStatus)
async def initialize_tree_status(
    user_id: str = Depends(get_current_user_id)
):
    """
    木の状態初期化（初回アクセス時）
    
    ■実行内容■
    - 新しい木の初期状態をDBに作成
    - 初期ステージ（Stage 0: 種）で開始
    - 累計文字数・メッセージ数・実数を0で初期化
    
    ■注意■
    既に木が存在する場合は409エラーを返します。
    """
    try:
        logger.info(f"木の初期化開始: user_id={user_id}")
        
        # 既存チェック
        existing_tree = await db.get_user_tree_status(user_id)
        if existing_tree:
            logger.warning(f"木が既に存在します: user_id={user_id}")
            raise HTTPException(
                status_code=409,
                detail="木が既に初期化されています。GET /api/tree/status で状態を取得してください。"
            )
        
        # 新規木作成
        tree_status_data = await db.create_initial_tree(user_id)
        logger.info(f"新規木作成完了: user_id={user_id}")
        
        # TreeStatusオブジェクト作成
        tree_status = create_tree_status_from_db_data(
            user_id=user_id,
            tree_data=tree_status_data
        )
        
        logger.info(f"木の初期化完了: stage={tree_status.current_stage}, chars={tree_status.total_characters}")
        return tree_status
        
    except HTTPException:
        # HTTPExceptionは再発生
        raise
    except Exception as e:
        logger.error(f"木の初期化エラー: error={e}")
        raise HTTPException(status_code=500, detail="木の初期化に失敗しました")

@app.post("/api/tree/update-growth")
async def update_tree_growth(
    added_characters: int,
    user_id: str = Depends(get_current_user_id)
):
    """
    木の成長更新（chat-serviceから呼び出し）
    
    Args:
        added_characters: 追加された文字数
    
    Returns:
        Dict: 成長情報
    """
    try:
        logger.info(f"木の成長更新開始: user_id={user_id}, added_characters={added_characters}")
        
        # 成長更新処理をデータベースに委譲
        growth_info = await db.update_tree_growth(user_id, added_characters)
        
        logger.info(f"木の成長更新完了: user_id={user_id}")
        return {
            "success": True,
            "message": "木の成長を更新しました",
            "growth_info": growth_info
        }
        
    except Exception as e:
        logger.error(f"木の成長更新エラー: error={e}")
        raise HTTPException(status_code=500, detail="木の成長更新に失敗しました")

# =====================================
# 実（褒めメッセージ）管理API
# =====================================

@app.post("/api/tree/fruits", response_model=FruitInfo)
async def generate_fruit(
    request: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """
    実（褒めメッセージ）を生成・保存
    
    Args:
        request: 実生成リクエスト
        - user_message: ユーザーメッセージ
        - ai_response: AI褒めレスポンス
        - ai_character: AIキャラクター
        - detected_emotion: 検出された感情
        - interaction_mode: 対話モード（デフォルト: "praise"）
    
    Returns:
        FruitInfo: 生成された実の情報
    """
    try:
        logger.info(f"実生成開始: user_id={user_id}")
        
        # 1日1回制限チェック
        tree_data = await db.get_user_tree_status(user_id)
        if not tree_data:
            raise HTTPException(status_code=404, detail="木が初期化されていません")
        
        if not can_generate_fruit(tree_data.get("last_fruit_date")):
            raise HTTPException(status_code=429, detail="実の生成は1日1回までです")
        
        # FruitInfoオブジェクト作成
        fruit_info = FruitInfo(
            user_id=user_id,
            user_message=request["user_message"],
            ai_response=request["ai_response"],
            ai_character=AICharacterType(request["ai_character"]),
            detected_emotion=EmotionType(request["detected_emotion"]),
            interaction_mode=request.get("interaction_mode", "praise")
        )
        
        # 実を保存
        await db.save_fruit(fruit_info)
        
        # 実カウント増加
        await db.increment_fruit_count(user_id)
        
        logger.info(f"実生成完了: user_id={user_id}, fruit_id={fruit_info.fruit_id}")
        return fruit_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"実生成エラー: error={e}")
        raise HTTPException(status_code=500, detail="実の生成に失敗しました")


@app.get("/api/tree/fruits", response_model=FruitsListResponse)
async def get_fruits_list(
    request: FruitsListRequest = Depends(),
    user_id: str = Depends(get_current_user_id)
):
    """
    実一覧を取得
    
    Args:
        request: 実一覧取得リクエストパラメーター
        user_id: ユーザーID（認証から自動取得）
    
    Returns:
        FruitsListResponse: 実一覧とメタデータ
    """
    try:
        logger.info(f"実一覧取得開始: user_id={user_id}")
        
        filters = {}
        if request.character_filter:
            filters["character"] = request.character_filter.value
        if request.emotion_filter:
            filters["emotion"] = request.emotion_filter.value
        if request.start_date:
            filters["start_date"] = request.start_date
        if request.end_date:
            filters["end_date"] = request.end_date
        
        result = await db.get_fruits_list(
            user_id=user_id,
            filters=filters if filters else None,
            limit=request.limit,
            next_token=request.next_token
        )
        
        logger.info(f"実一覧取得完了: user_id={user_id}, count={len(result.items)}")
        return result
        
    except Exception as e:
        logger.error(f"実一覧取得エラー: error={e}")
        raise HTTPException(status_code=500, detail="実一覧の取得に失敗しました")


@app.get("/api/tree/fruits/{fruit_id}", response_model=FruitInfo)
async def get_fruit_detail(
    fruit_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    実の詳細情報を取得
    
    Args:
        fruit_id: 実のID
    
    Returns:
        FruitInfo: 実の詳細情報
    """
    try:
        logger.info(f"実詳細取得開始: user_id={user_id}, fruit_id={fruit_id}")
        
        fruit_info = await db.get_fruit_detail(user_id, fruit_id)
        if not fruit_info:
            raise HTTPException(status_code=404, detail="実が見つかりません")
        
        logger.info(f"実詳細取得完了: user_id={user_id}, fruit_id={fruit_id}")
        return fruit_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"実詳細取得エラー: error={e}")
        raise HTTPException(status_code=500, detail="実の詳細取得に失敗しました")

# =====================================
# ヘルスチェック
# =====================================

@app.get("/api/tree/health")
async def health_check():
    """
    ヘルスチェック
    """
    try:
        # データベース接続確認
        await db.health_check()
        
        return {
            "status": "healthy",
            "service": "tree_service",
            "timestamp": get_current_jst().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Health check failed")
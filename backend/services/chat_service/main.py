"""
chat-service Lambda FastAPIアプリケーション

■システム概要■
Homebiyori（ほめびより）のチャット機能マイクロサービス。
3つのAIキャラクター（たまさん、まどか姉さん、ヒデじい）との
感情的なやり取りを通じて、育児中の親を優しく褒める機能を提供。

■主要機能■
1. AIチャット: Amazon Bedrock Claude 3 Haiku
2. 感情検出: キーワード＋文脈分析
3. 木の成長管理: 文字数ベース成長システム
4. 実生成: 感情検出時の特別な褒めメッセージ
5. 時刻管理: JST（日本標準時）統一
6. コンテンツ保存: DynamoDB直接保存（LangChain最適化）

■アーキテクチャ■
- AWS Lambda (Python 3.11, 1024MB, 60秒)
- FastAPI + Mangum
- Lambda Layers: homebiyori-common-layer (AI機能はLangChain統合)
- 認証: API Gateway + Cognito Authorizer
- データストア: DynamoDB直接保存（S3機能削除）
- AI: Amazon Bedrock Claude 3 Haiku

■エンドポイント構造■
- POST /api/chat/messages - メッセージ送信・AI応答
- GET /api/chat/history - チャット履歴取得
- PUT /api/chat/mood - 気分変更
- POST /api/chat/emotions - 感情スタンプ送信

■設計変更■
- S3機能削除: メッセージをDynamoDBに直接保存
- 画像機能削除: テキストのみのチャット
- 時刻統一: JST（日本標準時）
- tree-service統合: 成長計算機能の統合
"""

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import os
import asyncio
from datetime import datetime, timedelta
import uuid
import json
import boto3

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
from homebiyori_common.utils.maintenance import is_maintenance_mode
from homebiyori_common.utils.middleware import maintenance_check_middleware, get_current_user_id

# ローカルモジュール
from .models import (
    ChatRequest,
    ChatResponse,
    AIResponse,
    TreeGrowthInfo,
    ChatMessage,
    FruitInfo,
    ChatHistoryRequest,
    ChatHistoryResponse,
    MoodUpdateRequest,
    EmotionStampRequest,
    AICharacterType,
    EmotionType,
    MoodType,
    get_current_jst,
    calculate_tree_stage,
    get_characters_to_next_stage,
    calculate_progress_percentage,
    can_generate_fruit,
    get_character_theme_color,
    TREE_STAGE_CONFIG
)
from .database import get_chat_database
from .langchain_ai import (
    generate_ai_response_langchain,
    detect_emotion_simple
)
from .langchain_memory import (
    create_conversation_memory,
    get_user_tier_from_db
)

# 構造化ログ設定
logger = get_logger(__name__)

# データベースクライアント初期化
chat_db = get_chat_database()

# FastAPIアプリケーション初期化
app = FastAPI(
    title="Homebiyori Chat Service",
    description="チャット機能マイクロサービス - AIキャラクターとの感情的やり取り",
    version="1.0.0",
    docs_url=None if os.getenv("ENVIRONMENT") == "prod" else "/docs",
    redoc_url=None if os.getenv("ENVIRONMENT") == "prod" else "/redoc",
)


# =====================================
# ミドルウェア・共通処理
# =====================================

# 共通ミドルウェアをLambda Layerから適用
app.middleware("http")(maintenance_check_middleware)


# =====================================
# チャット機能エンドポイント
# =====================================

@app.post("/api/chat/messages", response_model=ChatResponse)
async def send_message(
    chat_request: ChatRequest, 
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id)
):
    """
    チャットメッセージ送信・AI応答生成
    
    ■処理フロー■
    1. ユーザー認証・リクエスト検証
    2. AI応答生成（Bedrock Claude 3 Haiku）
    3. 感情検出・木の成長計算
    4. 実生成判定・実行
    5. レスポンスデータをDynamoDB保存
    6. 統合レスポンス返却
    
    ■パフォーマンス最適化■
    - DynamoDB直接保存による高速化
    - BackgroundTasks活用による非同期後処理
    - TTL計算の事前実行
    """
    
    try:
        logger.info(
            "Processing chat message",
            extra={
                "user_id": user_id[:8] + "****",
                "ai_character": chat_request.ai_character,
                "mood": chat_request.mood,
                "message_length": len(chat_request.message)
            }
        )
        
        # メッセージID生成
        message_id = str(uuid.uuid4())
        timestamp = get_current_jst()
        
        # ===============================
        # 1. 現在の木の状態取得
        # ===============================
        current_tree_stats = await chat_db.get_user_tree_stats(user_id)
        previous_total = current_tree_stats.get("total_characters", 0)
        previous_stage = calculate_tree_stage(previous_total)
        
        # ===============================
        # 2. AI応答生成（LangChainベース）
        # ===============================
        # LangChainベースでAI応答生成（Memory統合済み）
        ai_response_text = await generate_ai_response_langchain(
            user_message=chat_request.message,
            user_id=user_id,
            character=chat_request.ai_character,
            mood=chat_request.mood
        )
        
        # 感情検出（簡易版）
        detected_emotion, emotion_score = detect_emotion_simple(chat_request.message)
        
        # ===============================
        # 3. 木の成長計算
        # ===============================
        message_character_count = len(chat_request.message)
        new_total_characters = previous_total + message_character_count
        current_stage = calculate_tree_stage(new_total_characters)
        characters_to_next = get_characters_to_next_stage(new_total_characters)
        stage_changed = current_stage > previous_stage
        progress_percentage = calculate_progress_percentage(new_total_characters)
        
        # 段階変化時のお祝いメッセージ
        growth_celebration = None
        if stage_changed:
            stage_config = TREE_STAGE_CONFIG.get(current_stage, {})
            growth_celebration = f"おめでとうございます！木が{stage_config.get('name', '新しい段階')}に成長しました！{stage_config.get('description', '')}"
        
        tree_growth = TreeGrowthInfo(
            previous_stage=previous_stage,
            current_stage=current_stage,
            previous_total=previous_total,
            current_total=new_total_characters,
            added_characters=message_character_count,
            stage_changed=stage_changed,
            characters_to_next=characters_to_next,
            progress_percentage=progress_percentage,
            growth_celebration=growth_celebration
        )
        
        # ===============================
        # 4. 実生成判定・実行
        # ===============================
        fruit_generated = False
        fruit_info = None
        
        # 実生成条件チェック
        if (detected_emotion and 
            emotion_score >= 0.7 and 
            detected_emotion in [EmotionType.JOY, EmotionType.GRATITUDE, EmotionType.ACCOMPLISHMENT, 
                               EmotionType.RELIEF, EmotionType.EXCITEMENT]):
            
            # 最後の実生成日取得
            last_fruit_date = await chat_db.get_last_fruit_date(user_id)
            
            if can_generate_fruit(last_fruit_date):
                try:
                    # 実生成
                    fruit_info = FruitInfo(
                        user_id=user_id,
                        message=f"「{chat_request.message}」から素敵な気持ちが伝わってきました。",
                        emotion_trigger=detected_emotion,
                        emotion_score=emotion_score,
                        ai_character=chat_request.ai_character,
                        character_color=get_character_theme_color(chat_request.ai_character),
                        trigger_message_id=message_id
                    )
                    
                    fruit_generated = True
                    
                    logger.info(
                        "Fruit generated successfully",
                        extra={
                            "user_id": user_id[:8] + "****",
                            "fruit_id": fruit_info.fruit_id,
                            "emotion": detected_emotion,
                            "score": emotion_score
                        }
                    )
                    
                except Exception as e:
                    logger.error(
                        "Fruit generation failed",
                        extra={
                            "error": str(e),
                            "user_id": user_id[:8] + "****"
                        }
                    )
                    # 実生成失敗は致命的エラーではないため、処理継続
        
        # ===============================
        # 5. DynamoDB保存用データ作成
        # ===============================
        # TTL計算
        user_subscription = await chat_db.get_user_subscription_info(user_id)
        ttl_timestamp = await chat_db.calculate_message_ttl(
            subscription_plan=user_subscription.get("plan", "free"),
            created_at=timestamp
        )
        
        # DynamoDB保存用モデル作成（S3キーの代わりにダミー値）
        chat_message = ChatMessage(
            user_id=user_id,
            message_id=message_id,
            user_message_s3_key=f"dummy_user_{message_id}",  # DynamoDB直接保存のためダミー
            ai_response_s3_key=f"dummy_ai_{message_id}",    # DynamoDB直接保存のためダミー
            ai_character=chat_request.ai_character,
            mood=chat_request.mood,
            emotion_detected=detected_emotion,
            emotion_score=emotion_score,
            character_count=message_character_count,
            tree_stage_before=previous_stage,
            tree_stage_after=current_stage,
            fruit_generated=fruit_generated,
            fruit_id=fruit_info.fruit_id if fruit_info else None,
            image_s3_key=None,  # 画像機能削除
            created_at=timestamp,
            ttl=ttl_timestamp,
            character_date=f"{chat_request.ai_character}#{timestamp.strftime('%Y-%m-%d')}"
        )
        
        # ===============================
        # 6. DynamoDB保存実行
        # ===============================
        await chat_db.save_chat_message(chat_message)
        
        # 木の統計情報更新
        await chat_db.update_tree_stats(user_id, new_total_characters, current_stage)
        
        # 実が生成された場合は実テーブルにも保存
        if fruit_generated and fruit_info:
            await chat_db.save_fruit_info(user_id, fruit_info)
        
        # ===============================
        # 7. バックグラウンド処理追加
        # ===============================
        background_tasks.add_task(
            update_chat_analytics,
            user_id=user_id,
            character=chat_request.ai_character,
            emotion=detected_emotion,
            stage_changed=stage_changed
        )
        
        # ===============================
        # 8. レスポンス構築・返却
        # ===============================
        ai_response = AIResponse(
            message=ai_response_text,
            character=chat_request.ai_character,
            emotion_detected=detected_emotion,
            emotion_score=emotion_score,
            confidence=1.0  # 簡素化のため固定値
        )
        
        response = ChatResponse(
            message_id=message_id,
            ai_response=ai_response,
            tree_growth=tree_growth,
            fruit_generated=fruit_generated,
            fruit_info=fruit_info,
            timestamp=timestamp
        )
        
        logger.info(
            "Chat message processed successfully",
            extra={
                "user_id": user_id[:8] + "****",
                "message_id": message_id,
                "tree_stage_change": f"{previous_stage} -> {current_stage}",
                "fruit_generated": fruit_generated,
                "processing_time_ms": int((get_current_jst() - timestamp).total_seconds() * 1000)
            }
        )
        
        return response
        
    except ValidationError as e:
        logger.warning(
            "Chat request validation failed",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=400, detail=str(e))
        
    except ExternalServiceError as e:
        logger.error(
            "External service error in chat processing",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=502, detail="External service temporarily unavailable")
        
    except DatabaseError as e:
        logger.error(
            "Database error in chat processing",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=500, detail="Internal server error")
        
    except Exception as e:
        logger.error(
            "Unexpected error in chat processing",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/chat/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    user_id: str = Depends(get_current_user_id),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    character_filter: Optional[AICharacterType] = None,
    limit: int = 20,
    next_token: Optional[str] = None
):
    """
    チャット履歴取得
    
    ■取得機能■
    - 期間指定フィルタ（開始日・終了日）
    - キャラクター別フィルタ
    - ページネーション対応
    - DynamoDB直接取得（S3参照なし）
    """
    
    try:
        logger.info(
            "Fetching chat history",
            extra={
                "user_id": user_id[:8] + "****",
                "start_date": start_date,
                "end_date": end_date,
                "character_filter": character_filter,
                "limit": limit
            }
        )
        
        # リクエストパラメータバリデーション
        history_request = ChatHistoryRequest(
            start_date=start_date,
            end_date=end_date,
            character_filter=character_filter,
            limit=limit,
            next_token=next_token
        )
        
        # DynamoDBからメタデータ取得
        history_result = await chat_db.get_chat_history(user_id, history_request)
        
        response = ChatHistoryResponse(
            messages=history_result["messages"],
            next_token=history_result.get("next_token"),
            has_more=history_result.get("has_more", False),
            total_count=history_result.get("total_count")
        )
        
        logger.info(
            "Chat history retrieved successfully",
            extra={
                "user_id": user_id[:8] + "****",
                "returned_count": len(history_result["messages"]),
                "has_more": response.has_more
            }
        )
        
        return response
        
    except ValidationError as e:
        logger.warning(
            "Chat history request validation failed",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=400, detail=str(e))
        
    except DatabaseError as e:
        logger.error(
            "Database error in chat history retrieval",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/api/chat/mood")
async def update_mood(mood_request: MoodUpdateRequest, user_id: str = Depends(get_current_user_id)):
    """
    ユーザーの気分設定変更
    
    ■気分システム■
    - praise: 褒めてほしい気分（デフォルト）
    - listen: 聞いてほしい気分
    - AI応答の調整に反映
    """
    
    try:
        logger.info(
            "Updating user mood",
            extra={
                "user_id": user_id[:8] + "****",
                "new_mood": mood_request.mood
            }
        )
        
        # ユーザーの気分設定を更新
        await chat_db.update_user_mood(user_id, mood_request.mood)
        
        return {
            "status": "success",
            "mood": mood_request.mood,
            "updated_at": get_current_jst().isoformat()
        }
        
    except DatabaseError as e:
        logger.error(
            "Database error in mood update",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/chat/emotions")
async def send_emotion_stamp(emotion_request: EmotionStampRequest, user_id: str = Depends(get_current_user_id)):
    """
    感情スタンプ送信
    
    ■感情表現拡張■
    - テキスト以外での感情共有
    - AI学習データ改善用
    - ユーザーエンゲージメント向上
    """
    
    try:
        logger.info(
            "Processing emotion stamp",
            extra={
                "user_id": user_id[:8] + "****",
                "emotion": emotion_request.emotion,
                "intensity": emotion_request.intensity
            }
        )
        
        # 感情スタンプをDynamoDBに記録
        stamp_id = str(uuid.uuid4())
        await chat_db.save_emotion_stamp(
            user_id=user_id,
            stamp_id=stamp_id,
            emotion=emotion_request.emotion,
            intensity=emotion_request.intensity,
            timestamp=get_current_jst()
        )
        
        # 感情スタンプに対するAI応答生成（簡素版）
        ai_response = f"素敵な感情を教えてくれてありがとうございます。{emotion_request.emotion.value}の気持ち、とてもよく伝わってきます。"
        
        return {
            "status": "success",
            "stamp_id": stamp_id,
            "ai_response": ai_response,
            "timestamp": get_current_jst().isoformat()
        }
        
    except DatabaseError as e:
        logger.error(
            "Database error in emotion stamp processing",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=500, detail="Internal server error")


# =====================================
# バックグラウンド処理関数
# =====================================

async def update_chat_analytics(
    user_id: str, 
    character: AICharacterType, 
    emotion: Optional[EmotionType],
    stage_changed: bool
):
    """
    チャット分析データ更新（バックグラウンド処理）
    
    ■分析項目■
    - キャラクター別使用統計
    - 感情検出統計
    - 成長段階変化追跡
    - ユーザー行動パターン分析
    """
    try:
        logger.debug(
            "Updating chat analytics",
            extra={
                "user_id": user_id[:8] + "****",
                "character": character,
                "emotion": emotion,
                "stage_changed": stage_changed
            }
        )
        
        # キャラクター使用回数更新
        await chat_db.increment_character_usage(user_id, character)
        
        # 感情検出統計更新
        if emotion:
            await chat_db.increment_emotion_detection(user_id, emotion)
        
        # 成長段階変化記録
        if stage_changed:
            await chat_db.record_stage_change(user_id, get_current_jst())
        
    except Exception as e:
        logger.error(
            "Failed to update chat analytics",
            extra={
                "error": str(e),
                "user_id": user_id[:8] + "****"
            }
        )
        # バックグラウンド処理のエラーはメイン処理に影響しない
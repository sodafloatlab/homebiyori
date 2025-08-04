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
- Lambda Layers: homebiyori-common-layer, homebiyori-ai-layer
- 認証: API Gateway + Cognito Authorizer
- データストア: DynamoDB 7テーブル構成 (prod-homebiyori-chats)
- AI: Amazon Bedrock Claude 3 Haiku

■エンドポイント構造■
- POST /api/chat/messages - メッセージ送信・AI応答
- GET /api/chat/history - チャット履歴取得
- PUT /api/chat/mood - 気分変更
- POST /api/chat/emotions - 感情スタンプ送信

■プライバシー設計■
- 個人識別情報: DynamoDB非保存（Cognito subのみ）
- 投稿内容: DynamoDB直接保存（prod-homebiyori-chats）
- TTL管理: サブスクリプションプラン連動自動削除

■AI連携設計■
- プロンプト効率化: 700トークン入力、150トークン出力
- フォールバック応答: Bedrock障害時の安定稼働
- キャラクター別最適化: 個性に応じたプロンプト調整

■コスト最適化■
- S3 Intelligent Tiering: アクセス頻度最適化
- DynamoDB TTL: 自動データ削除
- Lambda最適化: メモリ・実行時間チューニング
"""

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
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

# homebiyori-ai-layer からのAI機能インポート
from homebiyori_ai.bedrock_client import BedrockClient
from homebiyori_ai.characters import get_character_prompt, AVAILABLE_CHARACTERS
from homebiyori_ai.emotion_detector import EmotionDetector
from homebiyori_ai.response_generator import ResponseGenerator

# ローカルモジュール
from .models import (
    ChatRequest,
    AIResponse,
    TreeGrowthInfo,
    ChatMessage,
    UserTreeState,
    AICharacterType,
    get_current_jst,
    GROWTH_POINTS_PER_STAGE,
    EMOTION_TO_FRUIT,
    TreeGrowthStage
)
from .database import get_chat_database

# 構造化ログ設定
logger = get_logger(__name__)

# データベース・外部サービスクライアント初期化
chat_db = get_chat_database()
s3_client = get_s3_client()
bedrock_client = BedrockClient()
emotion_detector = EmotionDetector()
response_generator = ResponseGenerator()

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

@app.middleware("http")
async def maintenance_check_middleware(request: Request, call_next):
    """
    メンテナンス状態チェックミドルウェア
    
    全APIリクエストに対してメンテナンス状態を確認し、
    メンテナンス中の場合は503エラーを返却する。
    """
    try:
        check_maintenance_mode()
        response = await call_next(request)
        return response
    except MaintenanceError as e:
        logger.warning(
            "Chat API blocked due to maintenance mode",
            extra={"maintenance_message": str(e), "request_path": request.url.path}
        )
        return JSONResponse(
            status_code=503,
            content={
                "error": "MAINTENANCE_MODE",
                "message": str(e),
                "status": "maintenance"
            }
        )
    except Exception as e:
        logger.error(
            "Maintenance check failed, allowing request",
            extra={"error": str(e), "request_path": request.url.path}
        )
        response = await call_next(request)
        return response


def get_authenticated_user_id(request: Request) -> str:
    """
    API Gateway + Cognito AuthorizerからユーザーID取得
    
    ■認証フロー■
    1. API Gateway が Cognito JWT を検証
    2. 検証成功時、JWT Claims を Lambda event に付与
    3. homebiyori_common.auth.get_user_id_from_event() でユーザーID抽出
    
    Returns:
        str: Cognito User Pool の sub (UUID形式)
    
    Raises:
        AuthenticationError: JWT無効・期限切れ
    """
    try:
        event = request.scope.get("aws.event")
        if not event:
            logger.error("Lambda event not found in request scope")
            raise AuthenticationError("Authentication context missing")

        user_id = get_user_id_from_event(event)
        logger.debug(
            "User authenticated for chat service",
            extra={
                "user_id": user_id[:8] + "****",
                "request_path": request.url.path
            }
        )
        return user_id

    except Exception as e:
        logger.error(
            "Chat authentication failed",
            extra={"error": str(e), "request_path": request.url.path}
        )
        raise AuthenticationError("User authentication failed")


# =====================================
# チャット機能エンドポイント
# =====================================

@app.post("/api/chat/messages", response_model=ChatResponse)
async def send_message(
    chat_request: ChatRequest, 
    request: Request, 
    background_tasks: BackgroundTasks
):
    """
    チャットメッセージ送信・AI応答生成
    
    ■処理フロー■
    1. ユーザー認証・リクエスト検証
    2. メッセージ内容をS3に保存
    3. AI応答生成（Bedrock Claude 3 Haiku）
    4. 感情検出・木の成長計算
    5. 実生成判定・実行
    6. レスポンスデータをDynamoDB保存
    7. 統合レスポンス返却
    
    ■エラーハンドリング■
    - Bedrock API障害: フォールバック応答
    - S3保存失敗: DynamoDBのみでの縮退運転
    - DynamoDB障害: S3保存完了後なら部分成功扱い
    
    ■パフォーマンス最適化■
    - S3保存・AI応答生成の並列実行
    - BackgroundTasks活用による非同期後処理
    - TTL計算の事前実行
    """
    user_id = get_authenticated_user_id(request)
    
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
        import uuid
        message_id = str(uuid.uuid4())
        timestamp = get_current_utc()
        
        # ===============================
        # 1. 現在の木の状態取得
        # ===============================
        current_tree_stats = await chat_db.get_user_tree_stats(user_id)
        previous_stage = calculate_tree_stage(current_tree_stats.get("total_characters", 0))
        previous_total = current_tree_stats.get("total_characters", 0)
        
        # ===============================
        # 2. S3への投稿内容保存（並列実行）
        # ===============================
        user_message_s3_key = create_s3_key(user_id, message_id, "user_message.txt")
        
        # 画像がある場合の処理
        image_s3_key = None
        if chat_request.image_s3_key:
            # 既にアップロード済みの画像のキー検証・移動
            image_s3_key = await s3_client.validate_and_move_temp_image(
                chat_request.image_s3_key, user_id, message_id
            )
        
        # メッセージ内容をS3に保存
        await s3_client.save_text_content(user_message_s3_key, chat_request.message)
        
        # ===============================
        # 3. AI応答生成（並列実行）
        # ===============================
        try:
            # ユーザーの過去の文脈取得（最近5件）
            recent_context = await chat_db.get_recent_chat_context(user_id, limit=5)
            
            # AIプロンプト生成
            ai_prompt = await response_generator.create_prompt(
                user_message=chat_request.message,
                ai_character=chat_request.ai_character,
                mood=chat_request.mood,
                recent_context=recent_context,
                has_image=bool(image_s3_key)
            )
            
            # Bedrock API呼び出し
            ai_response_text = await bedrock_client.generate_response(ai_prompt)
            
            # AI応答の信頼度評価
            confidence_score = await response_generator.calculate_confidence(
                user_message=chat_request.message,
                ai_response=ai_response_text,
                character=chat_request.ai_character
            )
            
        except Exception as e:
            # Bedrock API障害時のフォールバック応答
            logger.warning(
                "Bedrock API failed, using fallback response",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****",
                    "character": chat_request.ai_character
                }
            )
            
            ai_response_text = await response_generator.get_fallback_response(
                character=chat_request.ai_character,
                mood=chat_request.mood
            )
            confidence_score = 0.5  # フォールバック応答の信頼度
        
        # ===============================
        # 4. 感情検出実行
        # ===============================
        emotion_result = await emotion_detector.detect_emotion(
            message=chat_request.message,
            context={
                "ai_character": chat_request.ai_character,
                "mood": chat_request.mood,
                "has_image": bool(image_s3_key)
            }
        )
        
        detected_emotion = emotion_result.get("emotion")
        emotion_score = emotion_result.get("score", 0.0)
        
        # ===============================
        # 5. 木の成長計算
        # ===============================
        message_character_count = len(chat_request.message)
        new_total_characters = previous_total + message_character_count
        current_stage = calculate_tree_stage(new_total_characters)
        characters_to_next = get_characters_to_next_stage(new_total_characters)
        stage_changed = current_stage > previous_stage
        
        tree_growth = TreeGrowthInfo(
            previous_stage=previous_stage,
            current_stage=current_stage,
            total_characters=new_total_characters,
            characters_to_next=characters_to_next,
            stage_changed=stage_changed
        )
        
        # ===============================
        # 6. 実生成判定・実行
        # ===============================
        fruit_generated = False
        fruit_info = None
        
        # 実生成条件チェック
        if (detected_emotion and 
            emotion_score >= 0.7 and 
            detected_emotion in ["joy", "gratitude", "accomplishment", "relief", "excitement"]):
            
            # 最後の実生成日取得
            last_fruit_date = await chat_db.get_last_fruit_date(user_id)
            
            if can_generate_fruit(last_fruit_date):
                try:
                    # 実生成
                    fruit_message = await response_generator.generate_fruit_message(
                        emotion=detected_emotion,
                        character=chat_request.ai_character,
                        user_message=chat_request.message
                    )
                    
                    fruit_info = FruitInfo(
                        fruit_id=str(uuid.uuid4()),
                        message=fruit_message,
                        emotion_trigger=detected_emotion,
                        character=chat_request.ai_character,
                        character_color=get_character_theme_color(chat_request.ai_character)
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
        # 7. AI応答をS3に保存
        # ===============================
        ai_response_s3_key = create_s3_key(user_id, message_id, "ai_response.txt")
        await s3_client.save_text_content(ai_response_s3_key, ai_response_text)
        
        # ===============================
        # 8. DynamoDBへメタデータ保存
        # ===============================
        # TTL計算（ユーザーのサブスクリプションプラン取得）
        user_subscription = await chat_db.get_user_subscription_info(user_id)
        ttl_timestamp = await chat_db.calculate_message_ttl(
            subscription_plan=user_subscription.get("plan", "free"),
            created_at=timestamp
        )
        
        # DynamoDB保存用モデル作成
        chat_message = ChatMessage(
            user_id=user_id,
            message_id=message_id,
            user_message_s3_key=user_message_s3_key,
            ai_response_s3_key=ai_response_s3_key,
            ai_character=chat_request.ai_character,
            mood=chat_request.mood,
            emotion_detected=detected_emotion,
            emotion_score=emotion_score,
            character_count=message_character_count,
            tree_stage_before=previous_stage,
            tree_stage_after=current_stage,
            fruit_generated=fruit_generated,
            fruit_id=fruit_info.fruit_id if fruit_info else None,
            image_s3_key=image_s3_key,
            created_at=timestamp,
            ttl=ttl_timestamp,
            character_date=f"{chat_request.ai_character}#{timestamp.strftime('%Y-%m-%d')}"
        )
        
        # DynamoDB保存実行
        await chat_db.save_chat_message(chat_message)
        
        # 木の統計情報更新
        await chat_db.update_tree_stats(user_id, new_total_characters, current_stage)
        
        # 実が生成された場合は実テーブルにも保存
        if fruit_generated and fruit_info:
            await chat_db.save_fruit_info(user_id, fruit_info)
        
        # ===============================
        # 9. バックグラウンド処理追加
        # ===============================
        # 非同期でS3オブジェクトのメタデータ更新、統計データ集計等
        background_tasks.add_task(
            update_chat_analytics,
            user_id=user_id,
            character=chat_request.ai_character,
            emotion=detected_emotion,
            stage_changed=stage_changed
        )
        
        # ===============================
        # 10. レスポンス構築・返却
        # ===============================
        ai_response = AIResponse(
            message=ai_response_text,
            character=chat_request.ai_character,
            emotion_detected=detected_emotion,
            emotion_score=emotion_score,
            confidence=confidence_score
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
                "processing_time_ms": int((get_current_utc() - timestamp).total_seconds() * 1000)
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
    request: Request,
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
    - S3コンテンツ動的取得
    
    ■パフォーマンス最適化■
    - DynamoDB Query最適化
    - S3プリサインドURL生成
    - CloudFront CDN活用
    """
    user_id = get_authenticated_user_id(request)
    
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
        
        # S3からコンテンツ内容を並列取得
        enriched_messages = []
        for message_meta in history_result["messages"]:
            try:
                # S3からユーザーメッセージとAI応答を取得
                user_content, ai_content = await asyncio.gather(
                    s3_client.get_text_content(message_meta["user_message_s3_key"]),
                    s3_client.get_text_content(message_meta["ai_response_s3_key"])
                )
                
                # キャラクター情報追加
                character_info = AVAILABLE_CHARACTERS.get(
                    message_meta["ai_character"], 
                    {}
                )
                
                # 応答オブジェクト構築
                enriched_message = {
                    **message_meta,
                    "user_message_content": user_content,
                    "ai_response_content": ai_content,
                    "character_info": character_info
                }
                
                # 画像がある場合はプリサインドURL生成
                if message_meta.get("image_s3_key"):
                    enriched_message["image_presigned_url"] = await s3_client.generate_presigned_url(
                        message_meta["image_s3_key"], 
                        expires_in=3600  # 1時間有効
                    )
                
                enriched_messages.append(enriched_message)
                
            except Exception as e:
                logger.warning(
                    "Failed to enrich message content",
                    extra={
                        "error": str(e),
                        "message_id": message_meta.get("message_id"),
                        "user_id": user_id[:8] + "****"
                    }
                )
                # コンテンツ取得失敗時はメタデータのみ返却
                enriched_messages.append({
                    **message_meta,
                    "user_message_content": "[Content unavailable]",
                    "ai_response_content": "[Content unavailable]",
                    "character_info": AVAILABLE_CHARACTERS.get(message_meta["ai_character"], {})
                })
        
        response = ChatHistoryResponse(
            messages=enriched_messages,
            next_token=history_result.get("next_token"),
            has_more=history_result.get("has_more", False),
            total_count=history_result.get("total_count")
        )
        
        logger.info(
            "Chat history retrieved successfully",
            extra={
                "user_id": user_id[:8] + "****",
                "returned_count": len(enriched_messages),
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
async def update_mood(mood_request: MoodUpdateRequest, request: Request):
    """
    ユーザーの気分設定変更
    
    ■気分システム■
    - praise: 褒めてほしい気分（デフォルト）
    - listen: 聞いてほしい気分
    - AI応答の調整に反映
    """
    user_id = get_authenticated_user_id(request)
    
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
            "updated_at": get_current_utc().isoformat()
        }
        
    except DatabaseError as e:
        logger.error(
            "Database error in mood update",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/chat/emotions")
async def send_emotion_stamp(emotion_request: EmotionStampRequest, request: Request):
    """
    感情スタンプ送信
    
    ■感情表現拡張■
    - テキスト以外での感情共有
    - AI学習データ改善用
    - ユーザーエンゲージメント向上
    """
    user_id = get_authenticated_user_id(request)
    
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
            timestamp=get_current_utc()
        )
        
        # 感情スタンプに対するAI応答生成（オプション）
        ai_response = await response_generator.generate_emotion_response(
            emotion=emotion_request.emotion,
            intensity=emotion_request.intensity
        )
        
        return {
            "status": "success",
            "stamp_id": stamp_id,
            "ai_response": ai_response,
            "timestamp": get_current_utc().isoformat()
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
            await chat_db.record_stage_change(user_id, get_current_utc())
        
        # S3オブジェクトメタデータ更新
        # 将来のコンテンツ分析・最適化のためのタグ付け
        await s3_client.update_object_metadata(
            user_id=user_id,
            tags={
                "character": character,
                "emotion": emotion or "none",
                "stage_changed": str(stage_changed)
            }
        )
        
    except Exception as e:
        logger.error(
            "Failed to update chat analytics",
            extra={
                "error": str(e),
                "user_id": user_id[:8] + "****"
            }
        )
        # バックグラウンド処理のエラーはメイン処理に影響しない
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
from datetime import datetime
import uuid

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
from homebiyori_common.utils.middleware import maintenance_check_middleware, get_current_user_id, error_handling_middleware

# 共通Layerからモデル・ユーティリティをインポート
from homebiyori_common.models import (
    AICharacterType,
    EmotionType,
    InteractionMode,
    FruitInfo,
    TreeGrowthInfo,
    AIResponse
)
from homebiyori_common.utils.datetime_utils import get_current_jst

# ローカルモジュール
from .models import (
    ChatRequest,
    GroupChatRequest,
    ChatResponse,
    GroupChatResponse,
    ChatMessage,
    ChatHistoryRequest,
    ChatHistoryResponse,
    EmotionStampRequest,
    # MoodType → InteractionMode移行完了
)
from .database import get_chat_database
from .http_client import get_service_http_client
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

# サービス間HTTP通信クライアント初期化
service_client = get_service_http_client()


# =====================================
# ヘルパー関数（最小限）
# =====================================

# get_character_theme_color関数は共通Layer FruitInfoモデル移行により不要となったため削除

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
app.middleware("http")(error_handling_middleware)


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
                "interaction_mode": chat_request.interaction_mode,
                "message_length": len(chat_request.message)
            }
        )
        
        # メッセージID生成
        message_id = str(uuid.uuid4())
        timestamp = get_current_jst()
        
        # ===============================
        # 1. 現在の木の状態取得（tree_serviceから）
        # ===============================
        current_tree_stats = await service_client.get_user_tree_stats(user_id)
        previous_total = current_tree_stats.get("total_characters", 0)
        previous_stage = calculate_tree_stage(previous_total)
        
        # ===============================
        # 2. ユーザーAI設定情報取得（user_serviceから）
        # ===============================
        user_ai_preferences = await service_client.get_user_ai_preferences(user_id)
        user_subscription = await service_client.get_user_subscription_info(user_id)
        
        # AI設定の決定（リクエスト優先、なければプロフィール設定）
        ai_character = chat_request.ai_character or user_ai_preferences["ai_character"]
        interaction_mode = chat_request.interaction_mode or user_ai_preferences["interaction_mode"]
        praise_level = user_ai_preferences["praise_level"]
        
        # 無料ユーザーのpraise_level制限適用
        user_tier = "premium" if user_subscription["plan"] in ["monthly", "yearly"] else "free"
        if user_tier == "free":
            praise_level = "normal"  # 無料版は常にnormal固定
        
        # ===============================
        # 3. AI応答生成（LangChainベース）
        # ===============================
        # LangChainベースでAI応答生成（Memory統合済み）
        ai_response_text = await generate_ai_response_langchain(
            user_message=chat_request.message,
            user_id=user_id,
            character=ai_character,
            interaction_mode=interaction_mode,
            praise_level=praise_level
        )
        
        # 感情検出（簡易版）
        detected_emotion, emotion_score = detect_emotion_simple(chat_request.message)
        
        # ===============================
        # 4. 木の成長計算（tree_serviceで実行）
        # ===============================
        message_character_count = len(chat_request.message)
        
        # tree_serviceで成長計算を実行し、結果を取得
        growth_info = await service_client.update_tree_stats(user_id, message_character_count)
        
        tree_growth = TreeGrowthInfo(
            previous_stage=growth_info.get("previous_stage", 0),
            current_stage=growth_info.get("current_stage", 0),
            previous_total=growth_info.get("previous_total", 0),
            current_total=growth_info.get("current_total", 0),
            added_characters=message_character_count,
            stage_changed=growth_info.get("stage_changed", False),
            characters_to_next=growth_info.get("characters_to_next", 0),
            progress_percentage=growth_info.get("progress_percentage", 0.0),
            growth_celebration=growth_info.get("growth_celebration")
        )
        
        # ===============================
        # 5. 実生成判定・実行
        # ===============================
        fruit_generated = False
        fruit_info = None
        
        # 実生成条件チェック
        if (detected_emotion and 
            emotion_score >= 0.7 and 
            detected_emotion in [EmotionType.JOY, EmotionType.GRATITUDE, EmotionType.ACCOMPLISHMENT, 
                               EmotionType.RELIEF, EmotionType.EXCITEMENT]):
            
            # tree_serviceで実生成可能判定
            can_generate = await service_client.can_generate_fruit(user_id)
            
            if can_generate:
                try:
                    # 実生成（共通Layer FruitInfoモデル準拠）
                    fruit_info = FruitInfo(
                        user_id=user_id,
                        user_message=chat_request.message,
                        ai_response=ai_response_text,
                        ai_character=ai_character,
                        interaction_mode=chat_request.interaction_mode,
                        detected_emotion=detected_emotion
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
        # 6. DynamoDB保存用データ作成
        # ===============================
        # TTL計算（user_serviceから再取得は不要、既に取得済み）
        ttl_timestamp = await chat_db.calculate_message_ttl(
            subscription_plan=user_subscription.get("plan", "free"),
            created_at=timestamp
        )
        
        # DynamoDB保存用モデル作成（design_database.md準拠・統合版）
        chat_message = ChatMessage(
            chat_id=message_id,
            user_id=user_id,
            chat_type="single",  # シングルチャットを明示
            user_message=chat_request.message,
            ai_response=ai_response_text,
            ai_character=ai_character,
            praise_level=chat_request.praise_level,
            interaction_mode=interaction_mode,
            growth_points_gained=message_character_count,
            tree_stage_at_time=tree_growth.current_stage,
            created_at=timestamp,
            expires_at=ttl_timestamp
        )
        
        # ===============================
        # 7. DynamoDB保存実行
        # ===============================
        await chat_db.save_chat_message(chat_message)
        
        # 木の統計情報更新（tree_serviceで実行）
        await service_client.update_tree_stats(user_id, new_total_characters, current_stage)
        
        # 実が生成された場合は実テーブルにも保存（tree_serviceで実行）
        if fruit_generated and fruit_info:
            await service_client.save_fruit_info(user_id, fruit_info)
        
        # ===============================
        # 8. バックグラウンド処理追加
        # ===============================
        # 統計関連機能削除：update_chat_analytics 呼び出し削除
        # background_tasks.add_task(
        #     update_chat_analytics,
        #     user_id=user_id,
        #     character=ai_character,
        #     emotion=detected_emotion,
        #     stage_changed=stage_changed
        # )
        
        # ===============================
        # 9. レスポンス構築・返却
        # ===============================
        ai_response = AIResponse(
            message=ai_response_text,
            character=ai_character,  # 実際に使用されたキャラクター
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
                "ai_character": ai_character,
                "interaction_mode": interaction_mode,
                "praise_level": praise_level,
                "user_tier": user_tier,
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

@app.post("/api/chat/group-messages", response_model=GroupChatResponse)
async def send_group_message(
    group_chat_request: GroupChatRequest, 
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id)
):
    """
    グループチャットメッセージ送信・複数AI応答生成
    
    ■処理フロー■
    1. ユーザー認証・リクエスト検証（プレミアムプラン確認含む）
    2. 複数AI応答生成（Bedrock Claude 3 Haiku）
    3. 感情検出・木の成長計算
    4. 実生成判定・実行
    5. レスポンスデータをDynamoDB保存
    6. 複数AI統合レスポンス返却
    
    ■パフォーマンス最適化■
    - 並行AI応答生成による処理時間短縮
    - DynamoDB直接保存による高速化
    - BackgroundTasks活用による非同期後処理
    """
    
    try:
        logger.info(
            "Processing group chat message",
            extra={
                "user_id": user_id[:8] + "****",
                "active_characters": group_chat_request.active_characters,
                "message_length": len(group_chat_request.message)
            }
        )
        
        # ===============================
        # 1. プレミアムプラン確認（user_serviceから）
        # ===============================
        user_subscription = await service_client.get_user_subscription_info(user_id)
        user_tier = "premium" if user_subscription["plan"] in ["monthly", "yearly"] else "free"
        
        if user_tier == "free":
            logger.info(
                "Free user accessing group chat, redirecting to premium",
                extra={"user_id": user_id[:8] + "****"}
            )
            raise HTTPException(
                status_code=200,
                detail={
                    "redirect_to": "premium",
                    "message": "グループチャット機能はプレミアムプラン限定です。",
                    "upgrade_required": True
                }
            )
        
        # メッセージID生成
        message_id = str(uuid.uuid4())
        timestamp = get_current_jst()
        
        # ===============================
        # 2. 現在の木の状態取得（tree_serviceから）
        # ===============================
        current_tree_stats = await service_client.get_user_tree_stats(user_id)
        previous_total = current_tree_stats.get("total_characters", 0)
        previous_stage = calculate_tree_stage(previous_total)
        
        # ===============================
        # 3. ユーザーAI設定情報取得（user_serviceから）
        # ===============================
        user_ai_preferences = await service_client.get_user_ai_preferences(user_id)
        interaction_mode = group_chat_request.interaction_mode or user_ai_preferences["interaction_mode"]
        praise_level = user_ai_preferences["praise_level"]  # プレミアムユーザーは設定値使用
        
        # ===============================
        # 4. 複数AI応答生成（並行実行）
        # ===============================
        ai_responses = []
        
        # 並行処理用のタスクを作成
        async def generate_single_ai_response(character):
            try:
                response_text = await generate_ai_response_langchain(
                    user_message=group_chat_request.message,
                    user_id=user_id,
                    character=character,
                    mood=interaction_mode,
                    praise_level=praise_level,
                    group_context=group_chat_request.active_characters  # グループコンテキスト追加
                )
                
                return AIResponse(
                    message=response_text,
                    character=character,
                    emotion_detected=None,  # 各キャラクター個別の感情検出は簡略化
                    emotion_score=0.0,
                    confidence=1.0
                )
                
            except Exception as e:
                logger.error(
                    f"AI response generation failed for {character}",
                    extra={"error": str(e), "user_id": user_id[:8] + "****"}
                )
                # フォールバック応答
                fallback_responses = {
                    "mittyan": "申し訳ありません。今少し考えがまとまらないようです。",
                    "madokasan": "ごめんなさい！今ちょっと言葉が見つからないです。",
                    "hideji": "うむ、今はうまく言えんが、あなたの気持ちはよくわかるぞ。"
                }
                
                return AIResponse(
                    message=fallback_responses.get(character, "申し訳ありません。"),
                    character=character,
                    emotion_detected=None,
                    emotion_score=0.0,
                    confidence=0.5
                )
        
        # 全てのアクティブキャラクターに対して並行処理実行
        tasks = [generate_single_ai_response(char) for char in group_chat_request.active_characters]
        ai_responses = await asyncio.gather(*tasks)
        
        # GroupAIResponseモデルに変換し、代表応答を決定（最適化版）
        from .models import GroupAIResponse
        group_ai_responses = []
        representative_response = None
        representative_character = None
        
        for i, ai_resp in enumerate(ai_responses):
            is_representative = (i == 0)  # 最初のキャラクターを代表とする
            
            group_resp = GroupAIResponse(
                character=ai_resp.character,
                response=ai_resp.message,
                is_representative=is_representative
            )
            group_ai_responses.append(group_resp)
            
            # 代表応答を記録（LangChain文脈用）
            if is_representative:
                representative_response = ai_resp.message
                representative_character = ai_resp.character
        
        # ===============================
        # 5. 感情検出（ユーザーメッセージから）
        # ===============================
        detected_emotion, emotion_score = detect_emotion_simple(group_chat_request.message)
        
        # ===============================
        # 6. 木の成長計算
        # ===============================
        message_character_count = len(group_chat_request.message)
        new_total_characters = previous_total + message_character_count
        current_stage = calculate_tree_stage(new_total_characters)
        characters_to_next = get_characters_to_next_stage(new_total_characters)
        stage_changed = current_stage > previous_stage
        progress_percentage = calculate_progress_percentage(new_total_characters)
        
        # 段階変化時のお祝いメッセージ（グループチャット用）
        growth_celebration = None
        if stage_changed:
            stage_config = TREE_STAGE_CONFIG.get(current_stage, {})
            growth_celebration = f"みんなでお祝いです！木が{stage_config.get('name', '新しい段階')}に成長しました！{stage_config.get('description', '')}"
        
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
        # 7. 実生成判定・実行（グループチャット特別処理）
        # ===============================
        fruit_generated = False
        fruit_info = None
        
        # グループチャットの場合、複数キャラクターの中からランダムで実の担当を決定
        if (detected_emotion and 
            emotion_score >= 0.7 and 
            detected_emotion in [EmotionType.JOY, EmotionType.GRATITUDE, EmotionType.ACCOMPLISHMENT, 
                               EmotionType.RELIEF, EmotionType.EXCITEMENT]):
            
            last_fruit_date = await service_client.get_last_fruit_date(user_id)
            
            can_generate = await service_client.can_generate_fruit(user_id)
            
            if can_generate:
                try:
                    # 代表キャラクターを使用（実の生成担当：is_representative基準）
                    fruit_info = FruitInfo(
                        user_id=user_id,
                        user_message=group_chat_request.message,
                        ai_response=representative_response,  # 代表応答
                        ai_character=representative_character,  # 代表キャラクター
                        interaction_mode=group_chat_request.interaction_mode or InteractionMode.PRAISE,
                        detected_emotion=detected_emotion
                    )
                    
                    fruit_generated = True
                    
                    logger.info(
                        "Group chat fruit generated with representative character",
                        extra={
                            "user_id": user_id[:8] + "****",
                            "representative_character": representative_character,
                            "active_characters": group_chat_request.active_characters,
                            "growth_optimization": "is_representative_based"
                        }
                    )
                    
                except Exception as e:
                    logger.error(
                        "Group chat fruit generation failed",
                        extra={"error": str(e), "user_id": user_id[:8] + "****"}
                    )
        
        # ===============================
        # 8. DynamoDB保存用データ作成
        # ===============================
        ttl_timestamp = await chat_db.calculate_message_ttl(
            subscription_plan=user_subscription.get("plan", "premium"),
            created_at=timestamp
        )
        
        # グループチャット用のメッセージ保存（代表応答最適化版）
        chat_message = ChatMessage(
            chat_id=message_id,
            user_id=user_id,
            chat_type="group",  # グループチャットを明示
            user_message=group_chat_request.message,
            ai_response=representative_response,  # 代表応答（LangChain文脈用）
            ai_character=representative_character,
            praise_level=PraiseLevel.NORMAL,  # グループチャットはnormal固定
            interaction_mode=interaction_mode,
            active_characters=group_chat_request.active_characters,
            group_ai_responses=group_ai_responses,  # 最適化されたGroupAIResponseリスト
            growth_points_gained=message_character_count,
            tree_stage_at_time=current_stage,
            created_at=timestamp,
            expires_at=ttl_timestamp
        )
        
        # ===============================
        # 9. DynamoDB保存実行
        # ===============================
        await chat_db.save_chat_message(chat_message)
        await service_client.update_tree_stats(user_id, new_total_characters, current_stage)
        
        if fruit_generated and fruit_info:
            await service_client.save_fruit_info(user_id, fruit_info)
        
        # ===============================
        # 10. バックグラウンド処理追加
        # ===============================
        # 統計関連機能削除：update_chat_analytics 呼び出し削除
        # background_tasks.add_task(
        #     update_chat_analytics,
        #     user_id=user_id,
        #     character="GROUP",
        #     emotion=detected_emotion,
        #     stage_changed=stage_changed
        # )
        
        # ===============================
        # 11. レスポンス構築・返却
        # ===============================
        response = GroupChatResponse(
            message_id=message_id,
            ai_responses=ai_responses,
            tree_growth=tree_growth,
            fruit_generated=fruit_generated,
            fruit_info=fruit_info,
            timestamp=timestamp,
            active_characters=group_chat_request.active_characters
        )
        
        logger.info(
            "Group chat message processed successfully",
            extra={
                "user_id": user_id[:8] + "****",
                "message_id": message_id,
                "active_characters": group_chat_request.active_characters,
                "responses_count": len(ai_responses),
                "fruit_generated": fruit_generated,
                "processing_time_ms": int((get_current_jst() - timestamp).total_seconds() * 1000)
            }
        )
        
        return response
        
    except HTTPException:
        # HTTPExceptionはそのまま再発生
        raise
        
    except ValidationError as e:
        logger.warning(
            "Group chat request validation failed",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=400, detail=str(e))
        
    except ExternalServiceError as e:
        logger.error(
            "External service error in group chat processing",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=502, detail="External service temporarily unavailable")
        
    except DatabaseError as e:
        logger.error(
            "Database error in group chat processing",
            extra={"error": str(e), "user_id": user_id[:8] + "****"}
        )
        raise HTTPException(status_code=500, detail="Internal server error")
        
    except Exception as e:
        logger.error(
            "Unexpected error in group chat processing",
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


# =====================================
# 気分・感情アイコン機能エンドポイント（チャット機能として復活）
# =====================================

@app.put("/api/chat/mood")
async def update_mood(
    interaction_mode: InteractionMode,
    user_id: str = Depends(get_current_user_id)
):
    """
    気分変更エンドポイント（チャット機能の一部）
    
    ■機能概要■
    - ユーザーの対話モード（praise/listen）をリアルタイム変更
    - 「ほめほめ」「聞いて」のトグルボタン対応
    - DynamoDBユーザープロフィールに永続化
    """
    try:
        logger.info(
            "Processing mood update",
            extra={
                "user_id": user_id[:8] + "****",
                "interaction_mode": interaction_mode
            }
        )
        
        # user_serviceに気分更新を委譲
        await service_client.update_user_interaction_mode(
            user_id=user_id,
            interaction_mode=interaction_mode.value
        )
        
        return {
            "success": True,
            "updated_mode": interaction_mode.value,
            "message": f"対話モードを「{interaction_mode.value}」に変更しました",
            "timestamp": get_current_jst().isoformat()
        }
        
    except Exception as e:
        logger.error(
            "Failed to update mood",
            extra={
                "error": str(e),
                "user_id": user_id[:8] + "****"
            }
        )
        raise HTTPException(status_code=500, detail="気分変更に失敗しました")


@app.post("/api/chat/emotions")
async def send_emotion_stamp(
    emotion_request: EmotionStampRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id)
):
    """
    感情アイコン送信エンドポイント（チャット機能の一部）
    
    ■機能概要■
    - 感情アイコンタップによるメッセージ送信機能
    - 「無言でもいい相談」設計対応
    - AI応答生成とチャット履歴保存
    """
    try:
        logger.info(
            "Processing emotion stamp",
            extra={
                "user_id": user_id[:8] + "****",
                "emotion": emotion_request.emotion,
                "ai_character": emotion_request.ai_character
            }
        )
        
        # メッセージID生成
        message_id = str(uuid.uuid4())
        timestamp = get_current_jst()
        
        # ユーザーAI設定情報取得（user_serviceから）
        user_ai_preferences = await service_client.get_user_ai_preferences(user_id)
        user_subscription = await service_client.get_user_subscription_info(user_id)
        
        # AI設定の決定（リクエスト優先、なければプロフィール設定）
        ai_character = emotion_request.ai_character or user_ai_preferences["ai_character"]
        interaction_mode = "listen"  # 感情スタンプは基本的に共感モード
        praise_level = user_ai_preferences["praise_level"]
        
        # 無料ユーザーのpraise_level制限適用
        user_tier = "premium" if user_subscription["plan"] in ["monthly", "yearly"] else "free"
        if user_tier == "free":
            praise_level = "normal"
        
        # 感情に応じたメッセージテキスト生成
        emotion_messages = {
            EmotionType.JOY: "😊 今、嬉しい気持ちです",
            EmotionType.SADNESS: "😔 今、悲しい気持ちです", 
            EmotionType.ANGER: "😤 今、怒りを感じています",
            EmotionType.ANXIETY: "😰 今、不安な気持ちです",
            EmotionType.FATIGUE: "😴 今、とても疲れています",
            EmotionType.CONFUSION: "😅 今、困っています"
        }
        
        user_message = emotion_messages.get(emotion_request.emotion, "今の気持ちを伝えたいです")
        if emotion_request.context_message:
            user_message += f" - {emotion_request.context_message}"
        
        # AI応答生成（LangChainベース）
        ai_response_text = await generate_ai_response_langchain(
            user_message=user_message,
            user_id=user_id,
            character=ai_character,
            mood=interaction_mode,
            praise_level=praise_level
        )
        
        # 木の成長計算
        current_tree_stats = await service_client.get_user_tree_stats(user_id)
        previous_total = current_tree_stats.get("total_characters", 0)
        previous_stage = calculate_tree_stage(previous_total)
        
        message_character_count = len(user_message)
        new_total_characters = previous_total + message_character_count
        current_stage = calculate_tree_stage(new_total_characters)
        characters_to_next = get_characters_to_next_stage(new_total_characters)
        stage_changed = current_stage > previous_stage
        progress_percentage = calculate_progress_percentage(new_total_characters)
        
        tree_growth = TreeGrowthInfo(
            previous_stage=previous_stage,
            current_stage=current_stage,
            previous_total=previous_total,
            current_total=new_total_characters,
            added_characters=message_character_count,
            stage_changed=stage_changed,
            characters_to_next=characters_to_next,
            progress_percentage=progress_percentage
        )
        
        # TTL計算
        ttl_timestamp = await chat_db.calculate_message_ttl(
            subscription_plan=user_subscription.get("plan", "free"),
            created_at=timestamp
        )
        
        # DynamoDB保存用モデル作成（感情スタンプ機能・統合版）
        chat_message = ChatMessage(
            chat_id=message_id,
            user_id=user_id,
            chat_type="single",  # 感情スタンプはシングルチャット扱い
            user_message=f"[感情スタンプ: {emotion_request.emotion.value}]",
            ai_response=ai_response_text,
            ai_character=ai_character,
            praise_level=PraiseLevel.NORMAL,  # 感情スタンプはnormal固定
            interaction_mode=interaction_mode,
            growth_points_gained=message_character_count,
            tree_stage_at_time=current_stage,
            created_at=timestamp,
            expires_at=ttl_timestamp
        )
        
        # DynamoDB保存実行
        await chat_db.save_chat_message(chat_message)
        
        # 木の統計情報は既に update_tree_stats で更新済み
        
        # レスポンス構築
        ai_response = AIResponse(
            message=ai_response_text,
            character=ai_character,
            emotion_detected=emotion_request.emotion,
            emotion_score=1.0,
            confidence=1.0
        )
        
        response = ChatResponse(
            message_id=message_id,
            ai_response=ai_response,
            tree_growth=tree_growth,
            fruit_generated=False,
            fruit_info=None,
            timestamp=timestamp
        )
        
        logger.info(
            "Emotion stamp processed successfully",
            extra={
                "user_id": user_id[:8] + "****",
                "message_id": message_id,
                "emotion": emotion_request.emotion,
                "ai_character": ai_character
            }
        )
        
        return response
        
    except Exception as e:
        logger.error(
            "Failed to process emotion stamp",
            extra={
                "error": str(e),
                "user_id": user_id[:8] + "****",
                "emotion": emotion_request.emotion
            }
        )
        raise HTTPException(status_code=500, detail="感情スタンプの処理に失敗しました")


# =====================================
# バックグラウンド処理関数
# =====================================

# 統計関連機能削除：update_chat_analytics 関数削除

# =====================================
# ヘルスチェック
# =====================================

@app.get("/api/chat/health")
async def health_check():
    """
    ヘルスチェック
    """
    try:
        # データベース接続確認
        await chat_db.health_check()
        
        return {
            "status": "healthy",
            "service": "chat_service",
            "timestamp": get_current_jst().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Health check failed")
        # バックグラウンド処理のエラーはメイン処理に影響しない
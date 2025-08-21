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

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import os
import asyncio
from datetime import datetime, timedelta
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
from homebiyori_common.middleware import maintenance_check_middleware, get_current_user_id, error_handling_middleware
from homebiyori_common.middleware import require_basic_access

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
    create_conversation_memory
)

# 構造化ログ設定
logger = get_logger(__name__)

# データベースクライアント初期化
chat_db = get_chat_database()

# サービス間HTTP通信クライアント初期化
service_client = get_service_http_client()

# FastAPIアプリケーション初期化
# =====================================
# ユーティリティ関数
# =====================================

def calculate_message_ttl(created_at: datetime) -> int:
    """
    メッセージTTL計算（新戦略：全ユーザー統一保持期間）
    
    Args:
        created_at: メッセージ作成日時
        
    Returns:
        int: TTL（UNIXタイムスタンプ）
    """
    try:
        # 全ユーザー統一保持期間（Parameter Store管理）
        from homebiyori_common.utils.parameter_store import get_parameter
        retention_days = int(get_parameter(
            "/prod/homebiyori/chat/retention_days", 
            default_value="180"
        ))
        
        # TTL計算
        ttl_datetime = created_at + timedelta(days=retention_days)
        ttl_timestamp = int(ttl_datetime.timestamp())
        
        logger.debug(
            "Calculated message TTL (unified strategy)",
            extra={
                "retention_days": retention_days,
                "ttl_timestamp": ttl_timestamp
            }
        )
        
        return ttl_timestamp
        
    except Exception as e:
        logger.error(
            "Failed to calculate message TTL",
            extra={"error": str(e)}
        )
        # エラー時はデフォルト（180日）
        default_ttl = created_at + timedelta(days=180)
        return int(default_ttl.timestamp())

# =====================================
# ミドルウェア・依存関数
# =====================================
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

def _extract_jwt_from_request(request: Request) -> str:
    """
    API Gatewayイベントから元のJWTトークンを抽出
    
    Args:
        request: FastAPI Request オブジェクト
        
    Returns:
        str: JWTトークン（Bearer prefix除去済み）
        
    Notes:
        - API Gateway + Lambda Proxy統合での認証トークン取得
        - テスト環境では空文字列を返す
    """
    try:
        # FastAPI Request から Lambda event を取得
        event = request.scope.get("aws.event", {})
        
        if not event:
            # テスト環境では Lambda event が存在しない
            if os.getenv("ENVIRONMENT") in ["test", "development"]:
                logger.debug("Lambda event not found in test environment")
                return ""
            else:
                logger.warning("Lambda event not found in production environment")
                return ""
        
        # API Gateway headers から Authorization ヘッダーを取得
        headers = event.get("headers", {})
        auth_header = headers.get("authorization") or headers.get("Authorization", "")
        
        if not auth_header:
            logger.warning("Authorization header not found in request")
            return ""
            
        # Bearer prefix を除去
        if auth_header.startswith("Bearer "):
            jwt_token = auth_header.replace("Bearer ", "")
            logger.debug("JWT token extracted successfully from request")
            return jwt_token
        else:
            logger.warning("Authorization header does not contain Bearer token")
            return ""
            
    except Exception as e:
        logger.error(f"Failed to extract JWT token from request: {e}")
        return ""



@require_basic_access()
async def send_message(
    request: Request,
    chat_request: ChatRequest, 
    user_id: str = Depends(get_current_user_id)
):
    """
    チャットメッセージ送信・AI応答生成
    
    ■処理フロー■
    1. ユーザー認証・リクエスト検証（アクセス制御ミドルウェア）
    2. AI応答生成（Bedrock Amazon Nova Lite）
    3. 感情検出・木の成長計算
    4. 実生成判定・実行
    5. レスポンスデータをDynamoDB保存
    6. 統合レスポンス返却
    
    ■パフォーマンス最適化■
    - DynamoDB直接保存による高速化
    - リクエスト必須化による外部API呼び出し削減
    """
    
    try:
        logger.info(
            "Processing chat message",
            extra={
                "user_id": user_id[:8] + "****",
                "ai_character": chat_request.ai_character,
                "interaction_mode": chat_request.interaction_mode,
                "praise_level": chat_request.praise_level,
                "message_length": len(chat_request.message)
            }
        )
        
        # メッセージID生成
        message_id = str(uuid.uuid4())
        timestamp = get_current_jst()
        
        # JWTトークン取得（tree_service通信用）
        jwt_token = _extract_jwt_from_request(request)
        
        # ===============================
        # 1. AI応答生成（LangChainベース）
        # ===============================
        # リクエスト必須化により外部API呼び出し不要
        ai_character = chat_request.ai_character
        interaction_mode = chat_request.interaction_mode
        praise_level = chat_request.praise_level
        
        # 新戦略：全ユーザー共通機能（制限なし）
        # praise_level制限削除 - 全ユーザーがdeep機能利用可能
        
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
        # 2. 木の成長計算（tree_serviceで実行）+ JWT転送
        # ===============================
        message_character_count = len(chat_request.message)
        
        # tree_serviceで成長計算を実行し、結果を取得（JWT転送）
        growth_info = await service_client.update_tree_stats(user_id, message_character_count, jwt_token)
        
        # TreeGrowthInfo構築（tree_serviceレスポンス構造に合わせて修正）
        tree_growth = TreeGrowthInfo(
            previous_stage=growth_info.get("previous_stage", 0),
            current_stage=growth_info.get("current_stage", 0),
            previous_total=growth_info.get("previous_total", 0),
            current_total=growth_info.get("new_total_characters", 0),
            added_characters=message_character_count,
            stage_changed=growth_info.get("stage_changed", False),
            growth_celebration=growth_info.get("growth_celebration")
        )
        
        # ===============================
        # 3. 実生成判定・実行
        # ===============================
        fruit_generated = False
        fruit_info = None
        
        # 実生成条件チェック
        if (detected_emotion and 
            emotion_score >= 0.7 and 
            detected_emotion in [EmotionType.JOY, EmotionType.GRATITUDE, EmotionType.ACCOMPLISHMENT, 
                               EmotionType.RELIEF, EmotionType.EXCITEMENT]):
            
            # 実生成チェックはsave_fruit_info内で実行（重複チェック削除）
            try:
                # 実生成（共通Layer FruitInfoモデル準拠）
                fruit_info = FruitInfo(
                    user_id=user_id,
                    user_message=chat_request.message,
                    ai_response=ai_response_text,
                    ai_character=ai_character,
                    interaction_mode=interaction_mode,
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
        # 4. DynamoDB保存用データ作成
        # ===============================
        ttl_timestamp = calculate_message_ttl(created_at=timestamp)
        
        # DynamoDB保存用モデル作成（design_database.md準拠・統合版）
        chat_message = ChatMessage(
            chat_id=message_id,
            user_id=user_id,
            chat_type="single",  # シングルチャットを明示
            user_message=chat_request.message,
            ai_response=ai_response_text,
            ai_character=ai_character,
            praise_level=praise_level,
            interaction_mode=interaction_mode,
            growth_points_gained=message_character_count,
            tree_stage_at_time=tree_growth.current_stage,
            created_at=timestamp,
            expires_at=ttl_timestamp
        )
        
        # ===============================
        # 5. DynamoDB保存実行
        # ===============================
        await chat_db.save_chat_message(chat_message)
        
        # 実が生成された場合は実テーブルにも保存（tree_serviceで実行）+ JWT転送
        if fruit_generated and fruit_info:
            await service_client.save_fruit_info(user_id, fruit_info, jwt_token)
        
        # ===============================
        # 6. レスポンス構築・返却
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
                "unified_tier": "unified",  # 新戦略：全ユーザー統一
                "tree_stage": f"{tree_growth.previous_stage} -> {tree_growth.current_stage}",
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
@require_basic_access()
async def send_group_message(
    group_chat_request: GroupChatRequest, 
    request: Request,
    user_id: str = Depends(get_current_user_id)
):
    """
    グループチャットメッセージ送信・複数AI応答生成
    
    ■処理フロー■
    1. ユーザー認証・リクエスト検証（アクセス制御ミドルウェア）
    2. 複数AI応答生成（Bedrock Amazon Nova Lite）
    3. 感情検出・木の成長計算
    4. 実生成判定・実行
    5. レスポンスデータをDynamoDB保存
    6. 複数AI統合レスポンス返却
    
    ■パフォーマンス最適化■
    - 並列AI応答生成による処理時間短縮
    - DynamoDB直接保存による高速化
    - リクエスト必須化による外部API呼び出し削減
    """
    
    try:
        logger.info(
            "Processing group chat message",
            extra={
                "user_id": user_id[:8] + "****",
                "active_characters": group_chat_request.active_characters,
                "interaction_mode": group_chat_request.interaction_mode,
                "praise_level": group_chat_request.praise_level,
                "message_length": len(group_chat_request.message)
            }
        )
        
        # JWT トークン抽出（tree_service通信用）
        jwt_token = _extract_jwt_from_request(request)
        
        # メッセージID生成
        message_id = str(uuid.uuid4())
        timestamp = get_current_jst()
        
        # ===============================
        # 1. リクエスト必須化により設定値を直接使用
        # ===============================
        # リクエスト必須化により外部API呼び出し不要
        interaction_mode = group_chat_request.interaction_mode
        praise_level = group_chat_request.praise_level
        
        # 新戦略：全ユーザー統一体験（制限なし）
        
        # ===============================
        # 2. 複数AI応答生成（並列実行）
        # ===============================
        ai_responses = []
        
        # 並列処理用のタスクを作成
        async def generate_single_ai_response(character):
            try:
                response_text = await generate_ai_response_langchain(
                    user_message=group_chat_request.message,
                    user_id=user_id,
                    character=character,
                    interaction_mode=interaction_mode,
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
        
        # 全てのアクティブキャラクターに対して並列処理実行
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
        # 3. 感情検出（ユーザーメッセージから）
        # ===============================
        detected_emotion, emotion_score = detect_emotion_simple(group_chat_request.message)
        
        # ===============================
        # 4. 木の成長計算（tree_service統合）
        # ===============================
        message_character_count = len(group_chat_request.message)
        
        # tree_serviceで成長処理を実行し、成長判定も含めて取得（JWT転送対応）
        growth_info = await service_client.update_tree_stats(user_id, message_character_count, jwt_token)
        
        # TreeGrowthInfo構築（tree_serviceレスポンス構造に合わせて修正）
        tree_growth = TreeGrowthInfo(
            previous_stage=growth_info.get("previous_stage", 0),
            current_stage=growth_info.get("current_stage", 0),
            previous_total=growth_info.get("previous_total", 0),
            current_total=growth_info.get("new_total_characters", 0),  # 修正：tree_serviceの実際のキー名
            added_characters=message_character_count,
            stage_changed=growth_info.get("stage_changed", False),
            growth_celebration=growth_info.get("growth_celebration")
        )
        
        # ===============================
        # 5. 実生成判定・実行（グループチャット特別処理）
        # ===============================
        fruit_generated = False
        fruit_info = None
        
        # グループチャットの場合、複数キャラクターの中からランダムで実の担当を決定
        if (detected_emotion and 
            emotion_score >= 0.7 and 
            detected_emotion in [EmotionType.JOY, EmotionType.GRATITUDE, EmotionType.ACCOMPLISHMENT, 
                               EmotionType.RELIEF, EmotionType.EXCITEMENT]):
            
            # 実生成チェックはsave_fruit_info内で実行（重複チェック削除）
            try:
                # 代表キャラクターを使用（実の生成担当：is_representative基準）
                fruit_info = FruitInfo(
                    user_id=user_id,
                    user_message=group_chat_request.message,
                    ai_response=representative_response,  # 代表応答
                    ai_character=representative_character,  # 代表キャラクター
                    interaction_mode=interaction_mode,
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
        # 6. DynamoDB保存用データ作成
        # ===============================
        ttl_timestamp = calculate_message_ttl(created_at=timestamp)
        
        # グループチャット用のメッセージ保存（代表応答最適化版）
        chat_message = ChatMessage(
            chat_id=message_id,
            user_id=user_id,
            chat_type="group",  # グループチャットを明示
            user_message=group_chat_request.message,
            ai_response=representative_response,  # 代表応答（LangChain文脈用）
            ai_character=representative_character,
            praise_level=praise_level,
            interaction_mode=interaction_mode,
            active_characters=group_chat_request.active_characters,
            group_ai_responses=group_ai_responses,  # 最適化されたGroupAIResponseリスト
            growth_points_gained=message_character_count,
            tree_stage_at_time=tree_growth.current_stage,
            created_at=timestamp,
            expires_at=ttl_timestamp
        )
        
        # ===============================
        # 7. DynamoDB保存実行
        # ===============================
        await chat_db.save_chat_message(chat_message)
        
        if fruit_generated and fruit_info:
            await service_client.save_fruit_info(user_id, fruit_info, jwt_token)
        
        # ===============================
        # 8. レスポンス構築・返却
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
                "praise_level": praise_level,
                "interaction_mode": interaction_mode,
                "unified_tier": "unified",  # 新戦略：全ユーザー統一
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
@require_basic_access()
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

@app.post("/api/chat/emotions")
@require_basic_access()
async def send_emotion_stamp(
    emotion_request: EmotionStampRequest,
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
        
        # AI設定の決定（リクエスト優先、なければプロフィール設定）
        ai_character = emotion_request.ai_character or user_ai_preferences["ai_character"]
        interaction_mode = "listen"  # 感情スタンプは基本的に共感モード
        praise_level = user_ai_preferences["praise_level"]
        
        # 新戦略：全ユーザー統一体験（制限なし）
        
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
            interaction_mode=interaction_mode,
            praise_level=praise_level
        )
        
        # 木の成長計算（tree_service統合）
        message_character_count = len(user_message)
        
        # tree_serviceで成長処理を実行し、成長判定も含めて取得
        growth_info = await service_client.update_tree_stats(user_id, message_character_count)
        
        # TreeGrowthInfo構築（tree_serviceレスポンス構造に合わせて修正）
        tree_growth = TreeGrowthInfo(
            previous_stage=growth_info.get("previous_stage", 0),
            current_stage=growth_info.get("current_stage", 0),
            previous_total=growth_info.get("previous_total", 0),
            current_total=growth_info.get("new_total_characters", 0),  # 修正：tree_serviceの実際のキー名
            added_characters=message_character_count,
            stage_changed=growth_info.get("stage_changed", False),
            growth_celebration=growth_info.get("growth_celebration")
        )
        
        # TTL計算
        ttl_timestamp = calculate_message_ttl(created_at=timestamp)
        
        # DynamoDB保存用モデル作成（感情スタンプ機能・統合版）
        chat_message = ChatMessage(
            chat_id=message_id,
            user_id=user_id,
            chat_type="single",  # 感情スタンプはシングルチャット扱い
            user_message=f"[感情スタンプ: {emotion_request.emotion.value}]",
            ai_response=ai_response_text,
            ai_character=ai_character,
            praise_level=praise_level,  # 修正：決定されたpraise_levelを使用
            interaction_mode=interaction_mode,
            growth_points_gained=message_character_count,
            tree_stage_at_time=tree_growth.current_stage,
            created_at=timestamp,
            expires_at=ttl_timestamp
        )
        
        # DynamoDB保存実行
        await chat_db.save_chat_message(chat_message)
        
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
                "ai_character": ai_character,
                "praise_level": praise_level,
                "unified_tier": "unified"  # 新戦略：全ユーザー統一
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
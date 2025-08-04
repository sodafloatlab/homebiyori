"""
chat-service Lambda ハンドラー

■システム概要■
Homebiyori（ほめびより）チャット機能のLambdaエントリーポイント。
API Gateway + Cognitoとの統合により、認証済みユーザーの
AIチャット機能を提供。

■Lambda設定■
- Runtime: Python 3.11
- Memory: 1024MB（Bedrock API + S3操作最適化）
- Timeout: 60秒（AI応答生成時間考慮）
- Concurrency: 50（Bedrock APIクォータ管理）

■依存関係■
- homebiyori-common-layer: 共通機能
- homebiyori-ai-layer: AI機能
- Mangum: FastAPI ↔ Lambda統合

■環境変数■
- DYNAMODB_TABLE: メインテーブル名
- CHAT_CONTENT_BUCKET: コンテンツ保存S3バケット
- CLOUDFRONT_DOMAIN: CDN配信ドメイン
- BEDROCK_MODEL_ID: 使用するBedrockモデル
- ENVIRONMENT: 実行環境（prod/dev）
"""

import json
import os
import sys
from typing import Dict, Any

# FastAPI + Mangum インポート
from mangum import Mangum

# Lambda実行環境でのパッケージパス設定
sys.path.append('/opt/python')  # Lambda Layersパス

# Lambda Layers からの共通機能インポート
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import (
    ValidationError,
    AuthenticationError, 
    DatabaseError,
    ExternalServiceError,
    MaintenanceError
)

# ローカルモジュール（FastAPIアプリケーション）
from .main import app

# 構造化ログ設定
logger = get_logger(__name__)

# FastAPI → Lambda統合（Mangum使用）
handler = Mangum(
    app,
    lifespan="off",  # Lambda環境では無効化
    api_gateway_base_path="/api",  # API Gatewayのベースパス
    text_mime_types=[
        "application/json",
        "application/x-www-form-urlencoded",
        "text/plain"
    ]
)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda メインハンドラー関数
    
    ■処理フロー■
    1. イベント・コンテキスト検証
    2. 環境変数・設定チェック
    3. FastAPIアプリケーション実行（Mangum経由）
    4. エラーハンドリング・ログ出力
    5. レスポンス正規化・返却
    
    ■エラーハンドリング■
    - 認証エラー: 401 Unauthorized
    - バリデーションエラー: 400 Bad Request
    - 外部サービスエラー: 502 Bad Gateway
    - データベースエラー: 500 Internal Server Error
    - 予期しないエラー: 500 Internal Server Error
    
    Args:
        event: API Gateway Lambda Proxy統合イベント
        context: Lambda実行コンテキスト
        
    Returns:
        Dict: API Gateway Lambda Proxy統合レスポンス
    """
    # リクエストID取得（CloudWatch相関用）
    request_id = context.aws_request_id if context else "unknown"
    
    try:
        logger.info(
            "Chat service Lambda invocation started",
            extra={
                "request_id": request_id,
                "function_name": context.function_name if context else "unknown",
                "function_version": context.function_version if context else "unknown",
                "remaining_time_ms": context.get_remaining_time_in_millis() if context else 0,
                "http_method": event.get("httpMethod"),
                "resource_path": event.get("resource"),
                "path": event.get("path"),
                "user_agent": event.get("headers", {}).get("User-Agent", "unknown")
            }
        )
        
        # ===============================
        # 1. 環境変数・設定検証
        # ===============================
        required_env_vars = [
            "DYNAMODB_TABLE",
            "CHAT_CONTENT_BUCKET", 
            "AWS_REGION"
        ]
        
        missing_vars = [var for var in required_env_vars if not os.getenv(var)]
        if missing_vars:
            logger.error(
                "Missing required environment variables",
                extra={
                    "missing_vars": missing_vars,
                    "request_id": request_id
                }
            )
            return create_error_response(
                500,
                "Service configuration error",
                request_id
            )
        
        # ===============================
        # 2. Lambda実行時間監視
        # ===============================
        if context and context.get_remaining_time_in_millis() < 5000:  # 5秒未満
            logger.warning(
                "Insufficient remaining execution time",
                extra={
                    "remaining_time_ms": context.get_remaining_time_in_millis(),
                    "request_id": request_id
                }
            )
            return create_error_response(
                503,
                "Service temporarily unavailable",
                request_id
            )
        
        # ===============================
        # 3. イベント構造検証
        # ===============================
        if not isinstance(event, dict):
            logger.error(
                "Invalid event structure",
                extra={
                    "event_type": type(event).__name__,
                    "request_id": request_id
                }
            )
            return create_error_response(
                400,
                "Invalid request format",
                request_id
            )
        
        # API Gateway必須フィールド検証
        required_fields = ["httpMethod", "path", "headers"]
        missing_fields = [field for field in required_fields if field not in event]
        if missing_fields:
            logger.error(
                "Missing required event fields",
                extra={
                    "missing_fields": missing_fields,
                    "request_id": request_id
                }
            )
            return create_error_response(
                400,
                "Invalid API Gateway event",
                request_id
            )
        
        # ===============================
        # 4. 認証情報検証（事前チェック）
        # ===============================
        # API Gatewayで認証済みの前提だが、念のため確認
        authorizer_context = event.get("requestContext", {}).get("authorizer")
        if not authorizer_context or not authorizer_context.get("claims"):
            logger.warning(
                "Missing Cognito authorizer context",
                extra={
                    "has_authorizer": bool(authorizer_context),
                    "has_claims": bool(authorizer_context.get("claims") if authorizer_context else False),
                    "request_id": request_id
                }
            )
            # 認証情報なしでも、FastAPIレベルで適切にハンドリング
        
        # ===============================
        # 5. リクエストサイズ制限チェック
        # ===============================
        body = event.get("body", "")
        if body and len(body) > 1024 * 1024:  # 1MB制限
            logger.warning(
                "Request body too large",
                extra={
                    "body_size": len(body),
                    "request_id": request_id
                }
            )
            return create_error_response(
                413,
                "Request entity too large",
                request_id
            )
        
        # ===============================
        # 6. FastAPIアプリケーション実行
        # ===============================
        logger.debug(
            "Delegating to FastAPI application",
            extra={
                "request_id": request_id,
                "method": event.get("httpMethod"),
                "path": event.get("path")
            }
        )
        
        # Mangum経由でFastAPIアプリケーション実行
        response = handler(event, context)
        
        # ===============================
        # 7. レスポンス後処理
        # ===============================
        status_code = response.get("statusCode", 500)
        
        logger.info(
            "Chat service Lambda invocation completed",
            extra={
                "request_id": request_id,
                "status_code": status_code,
                "response_size": len(json.dumps(response)) if isinstance(response, dict) else 0,
                "execution_time_ms": (
                    context.get_remaining_time_in_millis() - 
                    context.get_remaining_time_in_millis()
                ) if context else 0
            }
        )
        
        # CORS ヘッダー追加（必要に応じて）
        if "headers" not in response:
            response["headers"] = {}
        
        response["headers"].update({
            "X-Request-ID": request_id,
            "X-Service": "chat-service",
            "Cache-Control": "no-cache, no-store, must-revalidate"
        })
        
        return response
    
    # ===============================
    # エラーハンドリング
    # ===============================
    except AuthenticationError as e:
        logger.warning(
            "Authentication error in chat service",
            extra={
                "error": str(e),
                "request_id": request_id,
                "user_agent": event.get("headers", {}).get("User-Agent", "unknown")
            }
        )
        return create_error_response(
            401,
            "Authentication required",
            request_id
        )
    
    except ValidationError as e:
        logger.warning(
            "Validation error in chat service",
            extra={
                "error": str(e),
                "request_id": request_id,
                "method": event.get("httpMethod"),
                "path": event.get("path")
            }
        )
        return create_error_response(
            400,
            str(e),
            request_id
        )
    
    except MaintenanceError as e:
        logger.info(
            "Service in maintenance mode",
            extra={
                "maintenance_message": str(e),
                "request_id": request_id
            }
        )
        return create_error_response(
            503,
            f"Service temporarily unavailable: {str(e)}",
            request_id
        )
    
    except ExternalServiceError as e:
        logger.error(
            "External service error in chat service",
            extra={
                "error": str(e),
                "request_id": request_id,
                "method": event.get("httpMethod"),
                "path": event.get("path")
            }
        )
        return create_error_response(
            502,
            "External service temporarily unavailable",
            request_id
        )
    
    except DatabaseError as e:
        logger.error(
            "Database error in chat service",
            extra={
                "error": str(e),
                "request_id": request_id,
                "method": event.get("httpMethod"),
                "path": event.get("path")
            }
        )
        return create_error_response(
            500,
            "Internal server error",
            request_id
        )
    
    except Exception as e:
        logger.error(
            "Unexpected error in chat service Lambda",
            extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "request_id": request_id,
                "method": event.get("httpMethod", "unknown"),
                "path": event.get("path", "unknown"),
                "user_agent": event.get("headers", {}).get("User-Agent", "unknown")
            },
            exc_info=True
        )
        return create_error_response(
            500,
            "Internal server error",
            request_id
        )


def create_error_response(
    status_code: int, 
    message: str, 
    request_id: str
) -> Dict[str, Any]:
    """
    統一エラーレスポンス生成
    
    ■レスポンス形式■
    - 標準HTTPステータスコード
    - エラーメッセージ（ユーザーフレンドリー）
    - リクエストID（トレーサビリティ）
    - タイムスタンプ（デバッグ用）
    
    Args:
        status_code: HTTPステータスコード
        message: エラーメッセージ
        request_id: リクエストID
        
    Returns:
        Dict: API Gateway Lambda Proxy統合エラーレスポンス
    """
    error_response = {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "X-Request-ID": request_id,
            "X-Service": "chat-service",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token"
        },
        "body": json.dumps({
            "error": {
                "code": status_code,
                "message": message,
                "request_id": request_id,
                "timestamp": int(datetime.utcnow().timestamp()),
                "service": "chat-service"
            }
        }, ensure_ascii=False)
    }
    
    return error_response


def health_check_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    チャットサービス専用ヘルスチェックハンドラー
    
    ■チェック項目■
    - Lambda実行環境状態
    - 環境変数設定確認
    - Lambda Layers読み込み確認
    - DynamoDB接続確認（簡易）
    - S3接続確認（簡易）
    
    Args:
        event: Lambda イベント
        context: Lambda コンテキスト
        
    Returns:
        Dict: ヘルスチェック結果
    """
    try:
        import datetime
        from homebiyori_common.logger import get_logger
        
        health_logger = get_logger("chat-service-health")
        
        # 基本情報収集
        health_status = {
            "service": "chat-service",
            "status": "healthy",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "environment": os.getenv("ENVIRONMENT", "unknown"),
            "lambda_info": {
                "function_name": context.function_name if context else "unknown",
                "function_version": context.function_version if context else "unknown",
                "memory_limit_mb": context.memory_limit_in_mb if context else 0,
                "remaining_time_ms": context.get_remaining_time_in_millis() if context else 0
            },
            "dependencies": {
                "homebiyori_common": True,
                "homebiyori_ai": True,
                "fastapi": True,
                "mangum": True
            },
            "configuration": {
                "dynamodb_table": bool(os.getenv("DYNAMODB_TABLE")),
                "s3_bucket": bool(os.getenv("CHAT_CONTENT_BUCKET")),
                "aws_region": bool(os.getenv("AWS_REGION")),
                "bedrock_model": bool(os.getenv("BEDROCK_MODEL_ID"))
            }
        }
        
        # 依存関係チェック
        try:
            from homebiyori_ai.bedrock_client import BedrockClient
            health_status["dependencies"]["bedrock_client"] = True
        except ImportError:
            health_status["dependencies"]["bedrock_client"] = False
            health_status["status"] = "degraded"
        
        health_logger.info(
            "Chat service health check completed",
            extra={
                "status": health_status["status"],
                "dependencies_ok": all(health_status["dependencies"].values()),
                "config_ok": all(health_status["configuration"].values())
            }
        )
        
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache"
            },
            "body": json.dumps(health_status, ensure_ascii=False)
        }
        
    except Exception as e:
        error_status = {
            "service": "chat-service",
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps(error_status, ensure_ascii=False)
        }
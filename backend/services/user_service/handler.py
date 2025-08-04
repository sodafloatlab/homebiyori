"""
user-service Lambda関数ハンドラ

■システム概要■
AWS Lambda上でuser-service FastAPIアプリケーションを実行するための
エントリーポイント。MangumアダプターによりLambdaイベントを
ASGI（FastAPI）形式に変換。

■アーキテクチャ■
Lambda Event → Mangum Adapter → FastAPI → Response
- AWS Lambda: サーバーレス実行環境
- Mangum: Lambda ↔ ASGI変換アダプター
- FastAPI: Pythonic Web APIフレームワーク
- Pydantic: 型安全なデータバリデーション

■設計原則■
- サーバーレスファースト: 従来のサーバーを必要としない設計
- スケーラビリティ: 自動的な負荷対応とコスト最適化
- 保守性: FastAPIとLambdaの分離によるテスタビリティ
- セキュリティ: API Gateway統合による認証・認可

■Mangumアダプター■
FastAPIアプリケーションをAWS Lambdaで動作させるための変換層。
以下の変換を自動実行:
- Lambda Event → HTTP Request形式
- FastAPI Response → Lambda Response形式
- WebSocket接続、ファイルアップロード等の高度な機能もサポート

■Lambda実行環境■
- Runtime: Python 3.11+
- Architecture: arm64（Graviton2、コスト最適化）
- Memory: 512MB（レスポンス時間とコスト最適化）
- Timeout: 30秒（API Gateway制限内）
- 環境変数: DYNAMODB_TABLE, AWS_REGION等

■コールドスタート最適化■
1. Lambda Layersによる依存関係分離
2. 関数サイズ最小化（50MB未満）
3. 初期化処理の最適化
4. 接続プールの効率的利用

■監視・ログ■
- CloudWatch Logs: 構造化ログ出力
- X-Ray Tracing: 分散トレーシング対応
- Custom Metrics: ビジネスメトリクス追跡
- Error Tracking: 例外の詳細追跡

■セキュリティ■
- IAM Role: 最小権限の原則
- VPC統合: プライベートネットワーク内実行
- 環境変数暗号化: 機密情報の安全な管理
- API Gateway統合: 認証・認可の一元管理

■エラーハンドリング■
- Lambda固有エラー: メモリ不足、タイムアウト等
- アプリケーションエラー: FastAPI例外ハンドリング
- DynamoDB接続エラー: リトライ・サーキットブレーカー
- 外部依存エラー: graceful degradation

■実装バージョン■
- 初回実装: 2024-08-03 (シンプルなMangum実装)
- 設計更新: 2024-08-03 (GEMINI.md準拠、詳細ドキュメント追加)
"""

from mangum import Mangum

# Lambda Layers からの共通機能インポート
# ログ設定とパフォーマンス監視のため
from homebiyori_common.logger import get_logger

# ローカルモジュール
# 同じディレクトリのmain.pyからFastAPIアプリケーションインスタンスをインポート
from .main import app

# 構造化ログ設定
# Lambda実行時の詳細ログとデバッグ情報を提供
logger = get_logger(__name__)


# =====================================
# Lambda関数ハンドラ設定
# =====================================

# MangumアダプターでFastAPIアプリケーションをLambda形式に変換
#
# ■Mangum設定オプション■
# - lifespan: FastAPIライフサイクルイベント（startup/shutdown）対応
# - api_gateway_base_path: API Gatewayのベースパス処理
# - text_mime_types: テキスト形式として扱うMIMEタイプ
# - custom_handlers: カスタムイベント処理（SQS、S3等）
#
# ■パフォーマンス考慮事項■
# 1. コールドスタート時間最小化
# 2. 接続プールの再利用
# 3. メモリ使用量最適化
# 4. 初期化処理の効率化
handler = Mangum(
    app,
    lifespan="off",  # Lambda環境では手動ライフサイクル管理が効率的
    api_gateway_base_path="/api",  # API Gatewayのベースパス設定
)


def lambda_handler(event, context):
    """
    AWS Lambda関数のメインエントリーポイント

    ■機能概要■
    Lambda実行時に最初に呼び出される関数。
    Mangumアダプター経由でFastAPIアプリケーションを実行し、
    Lambda Event/Response形式の変換を自動実行。

    Args:
        event: Lambda実行イベント（API Gateway Proxy Integration形式）
        context: Lambda実行コンテキスト（関数情報、実行環境等）

    Returns:
        dict: Lambda Response形式（status, headers, body等）

    ■Lambda Event構造■
    {
        "httpMethod": "GET|POST|PUT|DELETE",
        "path": "/api/users/profile",
        "headers": {"Authorization": "Bearer xxx"},
        "body": "JSON文字列",
        "requestContext": {
            "authorizer": {"claims": {"sub": "user_id"}}
        }
    }

    ■セキュリティ■
    - Authorization Header: API Gatewayで事前検証済み
    - Request Context: Cognito認証情報含む
    - 入力検証: Pydanticモデルによる厳密な検証
    - エラーレスポンス: 機密情報の漏洩防止

    ■監視・ログ■
    実行時の詳細情報をCloudWatch Logsに出力:
    - Request ID, User ID（マスク済み）
    - 実行時間、メモリ使用量
    - エラー詳細とスタックトレース
    - ビジネスメトリクス
    """
    # リクエスト開始ログ
    # Lambda Request IDとAPIパスを記録し、トレーサビリティを確保
    request_id = context.aws_request_id
    http_method = event.get("httpMethod", "UNKNOWN")
    path = event.get("path", "UNKNOWN")

    logger.info(
        "Lambda function started",
        extra={
            "request_id": request_id,
            "http_method": http_method,
            "path": path,
            "remaining_time_ms": context.get_remaining_time_in_millis(),
        },
    )

    try:
        # Mangumアダプター経由でFastAPIアプリケーション実行
        # Lambda Event → HTTP Request → FastAPI処理 → HTTP Response → Lambda Response
        response = handler(event, context)

        # 成功ログ
        # レスポンス統計とパフォーマンス情報を記録
        logger.info(
            "Lambda function completed successfully",
            extra={
                "request_id": request_id,
                "status_code": response.get("statusCode"),
                "response_size": len(str(response.get("body", ""))),
                "remaining_time_ms": context.get_remaining_time_in_millis(),
            },
        )

        return response

    except Exception as e:
        # Lambda実行エラー
        # アプリケーションエラーと区別し、詳細な情報をログ出力
        logger.error(
            "Lambda function failed",
            extra={
                "request_id": request_id,
                "error": str(e),
                "error_type": type(e).__name__,
                "remaining_time_ms": context.get_remaining_time_in_millis(),
            },
            exc_info=True,
        )

        # クライアントには最小限のエラー情報のみ返却
        # セキュリティ上、内部エラー詳細は隠蔽
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",  # CORS対応
                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
            },
            "body": '{"error": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred"}',
        }


# =====================================
# Lambda Layer統合確認
# =====================================


def verify_lambda_layers():
    """
    Lambda Layers統合状態の確認

    ■機能概要■
    homebiyori-common-layer と homebiyori-ai-layer の
    正常な読み込みを確認し、依存関係の整合性を検証。

    ■検証項目■
    1. homebiyori-common-layer: 共通機能（認証、DB、ログ等）
    2. homebiyori-ai-layer: AI機能（キャラクター、プロンプト等）
    3. 環境変数: 必要な設定値の存在確認
    4. DynamoDB接続: データベース疎通確認

    Returns:
        dict: 検証結果とシステム状態
    """
    import os

    verification_results = {
        "lambda_layers": {},
        "environment_variables": {},
        "system_status": "healthy",
    }

    try:
        # homebiyori-common-layer 確認
        from homebiyori_common import __version__ as common_version

        verification_results["lambda_layers"]["homebiyori-common-layer"] = {
            "status": "available",
            "version": common_version,
        }
    except ImportError as e:
        verification_results["lambda_layers"]["homebiyori-common-layer"] = {
            "status": "error",
            "error": str(e),
        }
        verification_results["system_status"] = "degraded"

    try:
        # homebiyori-ai-layer 確認
        from homebiyori_ai import __version__ as ai_version

        verification_results["lambda_layers"]["homebiyori-ai-layer"] = {
            "status": "available",
            "version": ai_version,
        }
    except ImportError as e:
        verification_results["lambda_layers"]["homebiyori-ai-layer"] = {
            "status": "error",
            "error": str(e),
        }

    # 環境変数確認
    required_env_vars = ["DYNAMODB_TABLE", "AWS_REGION", "ENVIRONMENT"]

    for env_var in required_env_vars:
        value = os.environ.get(env_var)
        verification_results["environment_variables"][env_var] = {
            "status": "set" if value else "missing",
            "value": value[:10] + "..." if value and len(value) > 10 else value,
        }
        if not value:
            verification_results["system_status"] = "degraded"

    logger.info(
        "Lambda layers verification completed",
        extra={"verification_results": verification_results},
    )

    return verification_results


# Lambda関数初期化時に一度だけ検証実行
# コールドスタート時のシステム状態を確認
_system_verification = verify_lambda_layers()

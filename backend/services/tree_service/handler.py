"""
tree-service Lambda エントリーポイント

■Lambda設定■
Runtime: Python 3.11
Memory: 512MB
Timeout: 30秒
Environment Variables:
- DYNAMODB_TABLE_NAME: homebiyori-data
- LOG_LEVEL: INFO
- ENVIRONMENT: prod

■API Gateway統合■
- 認証: Cognito User Pool Authorizer
- CORS: 適切な設定
- レスポンス変換: Lambda Proxy統合
"""

import os
import json
from mangum import Mangum
from homebiyori_common.logger import get_logger
from homebiyori_common import maintenance_required

# FastAPIアプリケーションをインポート
from .main import app

# 構造化ログ設定
logger = get_logger(__name__)

# Mangumアダプターでラップ（API Gateway用）
handler = Mangum(
    app,
    lifespan="off",  # Lambda環境では不要
    api_gateway_base_path="/api/tree"  # API Gatewayのベースパス
)

@maintenance_required(skip_paths=["/health"])  
def lambda_handler(event, context):
    """
    Lambda エントリーポイント
    
    Args:
        event: API Gateway イベント
        context: Lambda コンテキスト
        
    Returns:
        API Gateway レスポンス
    """
    try:
        # リクエスト情報をログに記録
        logger.info(
            f"tree-service リクエスト開始",
            extra={
                "method": event.get("httpMethod"),
                "path": event.get("path"),
                "user_id": event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("sub"),
                "request_id": context.aws_request_id
            }
        )
        
        # Mangumでリクエスト処理
        response = handler(event, context)
        
        # レスポンス情報をログに記録
        logger.info(
            f"tree-service リクエスト完了",
            extra={
                "status_code": response.get("statusCode"),
                "request_id": context.aws_request_id
            }
        )
        
        return response
        
    except Exception as e:
        # 予期しないエラーをログに記録
        logger.error(
            f"tree-service 予期しないエラー: {e}",
            extra={
                "request_id": context.aws_request_id,
                "error_type": type(e).__name__
            }
        )
        
        # エラーレスポンス返却
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            "body": json.dumps({
                "error": "internal_server_error",
                "message": "内部サーバーエラーが発生しました",
                "request_id": context.aws_request_id
            })
        }
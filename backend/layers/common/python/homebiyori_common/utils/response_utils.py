"""
統一レスポンス形式ユーティリティ

全Lambda関数で統一されたHTTPレスポンス形式を提供。
- 成功・エラーレスポンスの標準化
- CORS ヘッダー自動付与
- ログ出力統合
- JSON シリアライゼーション統一
"""

import json
from typing import Any, Dict, Optional, Union
from datetime import datetime
from ..logger import get_logger
from ..utils.datetime_utils import get_current_jst, to_jst_string


logger = get_logger(__name__)


# 標準CORSヘッダー
DEFAULT_CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",  # 本番環境では適切なオリジンに制限
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Max-Age": "86400"  # 24時間
}

# 標準レスポンスヘッダー
DEFAULT_RESPONSE_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    **DEFAULT_CORS_HEADERS
}


def success_response(
    data: Any,
    status_code: int = 200,
    message: str = "success",
    headers: Optional[Dict[str, str]] = None,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    成功レスポンスの生成
    
    Args:
        data: レスポンスデータ
        status_code: HTTPステータスコード（デフォルト: 200）
        message: レスポンスメッセージ
        headers: 追加HTTPヘッダー
        request_id: リクエストID（ログトレーシング用）
        
    Returns:
        Dict[str, Any]: Lambda レスポンス形式
    """
    try:
        # ヘッダー統合
        response_headers = DEFAULT_RESPONSE_HEADERS.copy()
        if headers:
            response_headers.update(headers)
            
        # レスポンスボディ構築
        response_body = {
            "success": True,
            "message": message,
            "data": data,
            "timestamp": to_jst_string(get_current_jst())
        }
        
        if request_id:
            response_body["request_id"] = request_id
            
        # JSONシリアライゼーション
        body_json = json.dumps(response_body, ensure_ascii=False, default=_json_serializer)
        
        response = {
            "statusCode": status_code,
            "headers": response_headers,
            "body": body_json
        }
        
        logger.info("Success response generated", extra={
            "status_code": status_code,
            "data_type": type(data).__name__,
            "data_size": len(str(data)) if data else 0,
            "request_id": request_id
        })
        
        return response
        
    except Exception as e:
        logger.error("Failed to generate success response", extra={
            "error": str(e),
            "data_type": type(data).__name__ if data else None,
            "status_code": status_code
        })
        # フォールバック: 最小限のレスポンス
        return {
            "statusCode": 500,
            "headers": DEFAULT_RESPONSE_HEADERS,
            "body": json.dumps({
                "success": False,
                "message": "レスポンス生成エラー",
                "error": "internal_error"
            }, ensure_ascii=False)
        }


def error_response(
    message: str,
    status_code: int = 400,
    error_code: Optional[str] = None,
    details: Any = None,
    headers: Optional[Dict[str, str]] = None,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    エラーレスポンスの生成
    
    Args:
        message: エラーメッセージ
        status_code: HTTPステータスコード
        error_code: アプリケーション独自のエラーコード
        details: エラー詳細情報
        headers: 追加HTTPヘッダー
        request_id: リクエストID（ログトレーシング用）
        
    Returns:
        Dict[str, Any]: Lambda レスポンス形式
    """
    try:
        # ヘッダー統合
        response_headers = DEFAULT_RESPONSE_HEADERS.copy()
        if headers:
            response_headers.update(headers)
            
        # レスポンスボディ構築
        response_body = {
            "success": False,
            "message": message,
            "timestamp": to_jst_string(get_current_jst())
        }
        
        if error_code:
            response_body["error"] = error_code
            
        if details is not None:
            response_body["details"] = details
            
        if request_id:
            response_body["request_id"] = request_id
            
        # JSONシリアライゼーション
        body_json = json.dumps(response_body, ensure_ascii=False, default=_json_serializer)
        
        response = {
            "statusCode": status_code,
            "headers": response_headers,
            "body": body_json
        }
        
        logger.warning("Error response generated", extra={
            "status_code": status_code,
            "error_code": error_code,
            "message": message,
            "has_details": details is not None,
            "request_id": request_id
        })
        
        return response
        
    except Exception as e:
        logger.error("Failed to generate error response", extra={
            "error": str(e),
            "original_message": message,
            "status_code": status_code
        })
        # フォールバック: 最小限のエラーレスポンス
        return {
            "statusCode": 500,
            "headers": DEFAULT_RESPONSE_HEADERS,
            "body": json.dumps({
                "success": False,
                "message": "内部サーバーエラー",
                "error": "internal_error"
            }, ensure_ascii=False)
        }


def validation_error_response(
    field_errors: Dict[str, str],
    message: str = "入力値に問題があります",
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    バリデーションエラー専用レスポンス
    
    Args:
        field_errors: フィールド別エラーメッセージ
        message: 全体エラーメッセージ
        request_id: リクエストID
        
    Returns:
        Dict[str, Any]: Lambda レスポンス形式
    """
    return error_response(
        message=message,
        status_code=400,
        error_code="validation_error",
        details={"field_errors": field_errors},
        request_id=request_id
    )


def authentication_error_response(
    message: str = "認証が必要です",
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    認証エラー専用レスポンス
    
    Args:
        message: エラーメッセージ
        request_id: リクエストID
        
    Returns:
        Dict[str, Any]: Lambda レスポンス形式
    """
    return error_response(
        message=message,
        status_code=401,
        error_code="authentication_required",
        headers={"WWW-Authenticate": "Bearer"},
        request_id=request_id
    )


def authorization_error_response(
    message: str = "アクセス権限がありません",
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    認可エラー専用レスポンス
    
    Args:
        message: エラーメッセージ
        request_id: リクエストID
        
    Returns:
        Dict[str, Any]: Lambda レスポンス形式
    """
    return error_response(
        message=message,
        status_code=403,
        error_code="access_denied",
        request_id=request_id
    )


def not_found_error_response(
    resource_type: str = "リソース",
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    リソース未発見エラー専用レスポンス
    
    Args:
        resource_type: リソースの種類
        request_id: リクエストID
        
    Returns:
        Dict[str, Any]: Lambda レスポンス形式
    """
    return error_response(
        message=f"{resource_type}が見つかりません",
        status_code=404,
        error_code="not_found",
        request_id=request_id
    )


def rate_limit_error_response(
    retry_after: int = 60,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    レート制限エラー専用レスポンス
    
    Args:
        retry_after: リトライまでの推奨秒数
        request_id: リクエストID
        
    Returns:
        Dict[str, Any]: Lambda レスポンス形式
    """
    return error_response(
        message="リクエスト制限に達しました。しばらく待ってから再試行してください。",
        status_code=429,
        error_code="rate_limit_exceeded",
        details={"retry_after": retry_after},
        headers={"Retry-After": str(retry_after)},
        request_id=request_id
    )


def _json_serializer(obj: Any) -> str:
    """
    JSON シリアライゼーション用のカスタムエンコーダー
    
    Args:
        obj: シリアライズ対象オブジェクト
        
    Returns:
        str: シリアライズ可能な文字列
    """
    if isinstance(obj, datetime):
        return to_jst_string(obj)
    elif hasattr(obj, 'isoformat'):
        return obj.isoformat()
    elif hasattr(obj, '__dict__'):
        return obj.__dict__
    else:
        return str(obj)
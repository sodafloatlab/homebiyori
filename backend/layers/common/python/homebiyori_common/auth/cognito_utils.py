"""
Amazon Cognito統合ユーティリティ

Lambda関数内でCognito認証情報を簡単に取得するためのヘルパー関数を提供。
- API Gateway + Cognito Authorizerから渡されるイベント情報の解析
- ユーザーID・メールアドレス・JWT Claims抽出
- エラーハンドリング統一
"""

import json
import base64
from typing import Dict, Any, Optional
from ..exceptions import AuthenticationError
from ..logger import get_logger


logger = get_logger(__name__)


class CognitoAuthError(AuthenticationError):
    """Cognito認証関連のエラー"""
    pass


def get_user_id_from_event(event: Dict[str, Any]) -> str:
    """
    API GatewayイベントからCognito User IDを取得
    
    Args:
        event: API Gatewayイベント
        
    Returns:
        str: Cognito User ID (sub claim)
        
    Raises:
        CognitoAuthError: 認証情報が取得できない場合
    """
    try:
        # API Gateway + Cognito Authorizer経由の場合
        request_context = event.get("requestContext", {})
        authorizer = request_context.get("authorizer", {})
        
        # Cognito User Pool Authorizerからのclaims
        claims = authorizer.get("claims", {})
        user_id = claims.get("sub")
        
        if not user_id:
            # JWT Authorizerの場合、異なる構造を試す
            jwt_claims = authorizer.get("jwt", {}).get("claims", {})
            user_id = jwt_claims.get("sub")
            
        if not user_id:
            logger.error("User ID not found in event", extra={
                "event_keys": list(event.keys()),
                "authorizer_keys": list(authorizer.keys())
            })
            raise CognitoAuthError("ユーザーIDが見つかりません")
            
        logger.debug("User ID extracted successfully", extra={
            "user_id_prefix": user_id[:8] + "****"
        })
        
        return user_id
        
    except Exception as e:
        if isinstance(e, CognitoAuthError):
            raise
        logger.error("Failed to extract user ID", extra={
            "error": str(e),
            "event_structure": _safe_event_structure(event)
        })
        raise CognitoAuthError(f"ユーザーID取得エラー: {str(e)}")


def get_user_email_from_event(event: Dict[str, Any]) -> Optional[str]:
    """
    API GatewayイベントからCognito User Emailを取得
    
    Args:
        event: API Gatewayイベント
        
    Returns:
        Optional[str]: ユーザーメールアドレス（存在しない場合はNone）
    """
    try:
        request_context = event.get("requestContext", {})
        authorizer = request_context.get("authorizer", {})
        
        # Cognito User Pool Authorizerからのclaims
        claims = authorizer.get("claims", {})
        email = claims.get("email")
        
        if not email:
            # JWT Authorizerの場合
            jwt_claims = authorizer.get("jwt", {}).get("claims", {})
            email = jwt_claims.get("email")
            
        if email:
            logger.debug("User email extracted successfully", extra={
                "email_domain": email.split("@")[-1] if "@" in email else "unknown"
            })
            
        return email
        
    except Exception as e:
        logger.warning("Failed to extract user email", extra={
            "error": str(e)
        })
        return None


def extract_user_claims(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    API GatewayイベントからCognito User Claimsを全て取得
    
    Args:
        event: API Gatewayイベント
        
    Returns:
        Dict[str, Any]: ユーザークレーム情報
        
    Raises:
        CognitoAuthError: クレーム情報が取得できない場合
    """
    try:
        request_context = event.get("requestContext", {})
        authorizer = request_context.get("authorizer", {})
        
        # Cognito User Pool Authorizerからのclaims
        claims = authorizer.get("claims", {})
        
        if not claims:
            # JWT Authorizerの場合
            jwt_claims = authorizer.get("jwt", {}).get("claims", {})
            claims = jwt_claims
            
        if not claims:
            raise CognitoAuthError("ユーザークレーム情報が見つかりません")
            
        # セキュリティ上重要でない情報のみログ出力
        logger.debug("User claims extracted successfully", extra={
            "claims_keys": list(claims.keys()),
            "token_use": claims.get("token_use"),
            "aud": claims.get("aud")
        })
        
        return claims
        
    except Exception as e:
        if isinstance(e, CognitoAuthError):
            raise
        logger.error("Failed to extract user claims", extra={
            "error": str(e)
        })
        raise CognitoAuthError(f"ユーザークレーム取得エラー: {str(e)}")


def verify_jwt_token(token: str) -> Dict[str, Any]:
    """
    JWT トークンの基本検証（署名検証は除く）
    
    Note: 実際の署名検証はCognito Authorizerで実施済みのため、
    ここではペイロード抽出のみ行う
    
    Args:
        token: JWT トークン
        
    Returns:
        Dict[str, Any]: JWT ペイロード
        
    Raises:
        CognitoAuthError: トークン形式が不正な場合
    """
    try:
        # JWT構造確認 (header.payload.signature)
        parts = token.split('.')
        if len(parts) != 3:
            raise CognitoAuthError("JWT形式が不正です")
            
        # ペイロード部分をデコード
        payload_part = parts[1]
        
        # Base64URL paddingを修正
        padding = 4 - (len(payload_part) % 4)
        if padding != 4:
            payload_part += '=' * padding
            
        # Base64デコード
        payload_bytes = base64.urlsafe_b64decode(payload_part)
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        logger.debug("JWT payload extracted", extra={
            "token_type": payload.get("token_use"),
            "issuer": payload.get("iss", "").split("/")[-1] if payload.get("iss") else None
        })
        
        return payload
        
    except json.JSONDecodeError as e:
        logger.error("JWT payload JSON decode error", extra={"error": str(e)})
        raise CognitoAuthError("JWTペイロードの形式が不正です")
    except Exception as e:
        logger.error("JWT token verification failed", extra={"error": str(e)})
        raise CognitoAuthError(f"JWTトークン解析エラー: {str(e)}")

def extract_jwt_from_request(request) -> str:
    """
    FastAPI RequestからCognito JWTトークンを抽出
    
    API Gateway + Lambda Proxy統合においてCognitoで認証されたJWTトークンを
    サービス間通信で再利用するために抽出します。
    
    Args:
        request: FastAPI Request オブジェクト（starlette.requests.Request）
        
    Returns:
        str: JWTトークン（Bearer prefix除去済み）、取得できない場合は空文字列
        
    Notes:
        - API Gateway + Lambda Proxy統合での認証トークン取得
        - テスト・開発環境では空文字列を返す（Lambdaイベントなし）
        - 本番環境でAPI Gateway経由でのみ有効
        
    Example:
        >>> from homebiyori_common.auth import extract_jwt_from_request
        >>> jwt_token = extract_jwt_from_request(request)
        >>> if jwt_token:
        >>>     headers = {"Authorization": f"Bearer {jwt_token}"}
    """
    try:
        import os
        
        # FastAPI Request から Lambda event を取得
        event = request.scope.get("aws.event", {})
        
        if not event:
            # テスト・開発環境では Lambda event が存在しない
            if os.getenv("ENVIRONMENT") in ["test", "development"]:
                logger.debug("Lambda event not found in test/development environment")
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
        logger.error("Failed to extract JWT token from request", extra={
            "error": str(e)
        })
        return ""


def _safe_event_structure(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    ログ出力用の安全なイベント構造情報を生成
    機密情報を除外してデバッグに必要な構造のみ抽出
    """
    return {
        "has_requestContext": "requestContext" in event,
        "has_headers": "headers" in event,
        "httpMethod": event.get("httpMethod"),
        "path": event.get("path"),
        "requestContext_keys": list(event.get("requestContext", {}).keys()),
        "authorizer_keys": list(event.get("requestContext", {}).get("authorizer", {}).keys())
    }
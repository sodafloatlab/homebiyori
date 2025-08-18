"""
Homebiyori カスタム例外クラス定義

システム全体で統一された例外処理とエラーコード管理を提供。
- 構造化エラー情報
- HTTPステータスコード連携
- ログ出力最適化
- 国際化対応（将来対応）
"""

from typing import Optional, Dict, Any
import json


class HomebiyoriError(Exception):
    """
    Homebiyori システム基底例外クラス
    
    全てのカスタム例外の基底クラス。
    構造化されたエラー情報とHTTPステータスコード対応を提供。
    """
    
    def __init__(
        self,
        message: str,
        error_code: str = "GENERAL_ERROR",
        http_status: int = 500,
        details: Optional[Dict[str, Any]] = None,
        user_message: Optional[str] = None
    ):
        """
        Args:
            message: 内部用詳細エラーメッセージ
            error_code: システム内エラーコード
            http_status: HTTPステータスコード
            details: 追加エラー詳細情報
            user_message: ユーザー表示用メッセージ
        """
        self.message = message
        self.error_code = error_code
        self.http_status = http_status
        self.details = details or {}
        self.user_message = user_message or "システムエラーが発生しました"
        
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """例外情報を辞書形式で取得"""
        return {
            "error_code": self.error_code,
            "message": self.message,
            "user_message": self.user_message,
            "http_status": self.http_status,
            "details": self.details
        }
    
    def to_json(self) -> str:
        """例外情報をJSON形式で取得"""
        return json.dumps(self.to_dict(), ensure_ascii=False)


class ValidationError(HomebiyoriError):
    """入力バリデーションエラー"""
    
    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        value: Optional[Any] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if field:
            error_details["field"] = field
        if value is not None:
            error_details["invalid_value"] = str(value)
        
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            http_status=400,
            details=error_details,
            user_message="入力内容に誤りがあります"
        )


class AuthenticationError(HomebiyoriError):
    """認証エラー"""
    
    def __init__(self, message: str = "認証に失敗しました", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            http_status=401,
            details=details,
            user_message="認証が必要です"
        )


class AuthorizationError(HomebiyoriError):
    """認可エラー"""
    
    def __init__(self, message: str = "権限が不足しています", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR", 
            http_status=403,
            details=details,
            user_message="この操作を実行する権限がありません"
        )


class DatabaseError(HomebiyoriError):
    """データベース操作エラー"""
    
    def __init__(
        self,
        message: str,
        operation: Optional[str] = None,
        table: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if operation:
            error_details["operation"] = operation
        if table:
            error_details["table"] = table
        
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            http_status=500,
            details=error_details,
            user_message="データベース処理でエラーが発生しました"
        )


class ExternalServiceError(HomebiyoriError):
    """外部サービス連携エラー"""
    
    def __init__(
        self,
        message: str,
        service: Optional[str] = None,
        status_code: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if service:
            error_details["service"] = service
        if status_code:
            error_details["external_status_code"] = status_code
        
        super().__init__(
            message=message,
            error_code="EXTERNAL_SERVICE_ERROR",
            http_status=502,
            details=error_details,
            user_message="外部サービスとの連携でエラーが発生しました"
        )


class MaintenanceError(HomebiyoriError):
    """メンテナンスモードエラー"""
    
    def __init__(
        self,
        message: str = "システムメンテナンス中です",
        estimated_end: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if estimated_end:
            error_details["estimated_end"] = estimated_end
        
        super().__init__(
            message=message,
            error_code="MAINTENANCE_ERROR",
            http_status=503,
            details=error_details,
            user_message="現在システムメンテナンス中です。しばらくお待ちください"
        )


class NotFoundError(HomebiyoriError):
    """リソース未発見エラー"""
    
    def __init__(
        self,
        message: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if resource_type:
            error_details["resource_type"] = resource_type
        if resource_id:
            error_details["resource_id"] = resource_id
        
        super().__init__(
            message=message,
            error_code="NOT_FOUND_ERROR",
            http_status=404,
            details=error_details,
            user_message="指定されたリソースが見つかりません"
        )


class ConflictError(HomebiyoriError):
    """競合状態エラー"""
    
    def __init__(
        self,
        message: str,
        resource_type: Optional[str] = None,
        conflict_reason: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if resource_type:
            error_details["resource_type"] = resource_type
        if conflict_reason:
            error_details["conflict_reason"] = conflict_reason
        
        super().__init__(
            message=message,
            error_code="CONFLICT_ERROR",
            http_status=409,
            details=error_details,
            user_message="データの競合が発生しました"
        )


class RateLimitError(HomebiyoriError):
    """レート制限エラー"""
    
    def __init__(
        self,
        message: str = "レート制限に達しました",
        retry_after: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if retry_after:
            error_details["retry_after"] = retry_after
        
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_ERROR",
            http_status=429,
            details=error_details,
            user_message="アクセス頻度が高すぎます。しばらくお待ちください"
        )


# =====================================
# サービス固有エラークラス（統一定義）
# =====================================

class BillingServiceError(HomebiyoriError):
    """課金サービス基底例外（統一定義）"""
    
    def __init__(
        self,
        message: str,
        error_code: str = "BILLING_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            http_status=500,
            details=details,
            user_message="課金処理でエラーが発生しました"
        )


class StripeAPIError(BillingServiceError):
    """Stripe API エラー（統一定義）"""
    
    def __init__(
        self,
        message: str,
        stripe_error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if stripe_error_code:
            error_details["stripe_error_code"] = stripe_error_code
        
        super().__init__(
            message=message,
            error_code="STRIPE_API_ERROR",
            details=error_details
        )


class PaymentFailedError(BillingServiceError):
    """支払い失敗エラー（統一定義）"""
    
    def __init__(
        self,
        message: str,
        payment_intent_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if payment_intent_id:
            error_details["payment_intent_id"] = payment_intent_id
        
        super().__init__(
            message=message,
            error_code="PAYMENT_FAILED",
            details=error_details
        )


class SubscriptionNotFoundError(NotFoundError):
    """サブスクリプション未発見エラー（統一定義）"""
    
    def __init__(
        self,
        message: str,
        user_id: Optional[str] = None,
        subscription_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if user_id:
            error_details["user_id"] = user_id[:8] + "****"  # プライバシー保護
        if subscription_id:
            error_details["subscription_id"] = subscription_id
        
        super().__init__(
            message=message,
            resource_type="subscription",
            details=error_details
        )

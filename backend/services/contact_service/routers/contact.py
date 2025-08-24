"""
Contact Service - 問い合わせ処理ハンドラー

ユーザーからの問い合わせを受け付け、運営者に通知するAPIエンドポイント。
AWS SNS経由でメール通知を行う。
"""

import uuid
from typing import Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from homebiyori_common import get_logger, success_response, error_response
# get_current_user_optional and RateLimiter not implemented in common layer - using local implementation

from ..models import ContactInquiry, ContactInquiryResponse, ContactCategory, ContactPriority
from ..services.notification_service import ContactNotificationService
from ..core.config import get_settings

logger = get_logger(__name__)
router = APIRouter()

# セキュリティスキーム
security = HTTPBearer(auto_error=False)


# 簡易実装: 認証ユーザー取得（オプショナル）
async def get_current_user_optional(token: str = None) -> str:
    """
    認証ユーザーIDを取得（オプショナル）
    
    実装注意: 本番では適切なJWT検証が必要
    """
    if not token:
        return None
    
    # テスト用の簡易実装
    logger.info("Optional user authentication attempted")
    return "anonymous-user"


# 簡易実装: レート制限
class RateLimiter:
    """簡易レート制限実装"""
    
    def __init__(self):
        self.requests = {}
    
    async def check_rate_limit(self, identifier: str, limit: int = 10) -> bool:
        """レート制限チェック（簡易実装）"""
        logger.info(f"Rate limit check for {identifier}")
        return True  # 簡易実装では常に許可


# レート制限設定
rate_limiter = RateLimiter()


@router.post("/submit", response_model=ContactInquiryResponse)
async def submit_inquiry(
    inquiry: ContactInquiry,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    問い合わせ送信API
    
    ■機能概要■
    - ユーザーからの問い合わせを受け付け
    - AWS SNS経由で運営者にメール通知
    - レート制限・スパム検出機能
    - 認証済みユーザーの場合はuser_idを自動設定
    
    Args:
        inquiry: 問い合わせ情報
        request: HTTPリクエスト情報
        credentials: 認証トークン（任意）
        
    Returns:
        ContactInquiryResponse: 問い合わせ送信結果
    """
    settings = get_settings()
    inquiry_id = str(uuid.uuid4())
    
    try:
        # レート制限チェック
        if settings.enable_rate_limiting:
            client_ip = request.client.host
            if not await rate_limiter.check_rate_limit(
                key=f"contact:{client_ip}",
                limit=settings.max_inquiries_per_hour,
                window=3600  # 1時間
            ):
                logger.warning("Rate limit exceeded for contact submission", extra={
                    "client_ip": client_ip,
                    "inquiry_id": inquiry_id
                })
                raise HTTPException(
                    status_code=429,
                    detail="問い合わせの送信回数が制限を超えています。しばらく時間をおいてから再度お試しください。"
                )
        
        # 認証済みユーザーの場合はuser_idを設定
        current_user = await get_current_user_optional(credentials.credentials if credentials else None)
        if current_user:
            inquiry.user_id = current_user.get("sub")
            logger.info("Inquiry from authenticated user", extra={
                "inquiry_id": inquiry_id,
                "user_id": inquiry.user_id
            })
        
        # User-Agent情報を設定
        inquiry.user_agent = request.headers.get("User-Agent", "Unknown")[:500]
        
        # スパム検出（簡易版）
        if settings.enable_spam_detection:
            spam_score = await _detect_spam(inquiry)
            if spam_score > 0.8:
                logger.warning("Potential spam inquiry detected", extra={
                    "inquiry_id": inquiry_id,
                    "spam_score": spam_score,
                    "email": inquiry.email
                })
                # スパムの可能性が高い場合でも受け付けるが、低優先度に設定
                inquiry.priority = ContactPriority.LOW
        
        # 自動カテゴリ分類・優先度検出
        if settings.enable_auto_categorization:
            inquiry.category = await _auto_categorize(inquiry)
        
        if settings.enable_auto_priority_detection:
            detected_priority = await _detect_priority(inquiry)
            if detected_priority != inquiry.priority:
                logger.info("Priority adjusted by auto-detection", extra={
                    "inquiry_id": inquiry_id,
                    "original_priority": inquiry.priority.value,
                    "detected_priority": detected_priority.value
                })
                inquiry.priority = detected_priority
        
        # 運営者通知を送信
        notification_service = ContactNotificationService()
        notification_result = await notification_service.send_inquiry_notification(
            inquiry, inquiry_id
        )
        
        logger.info("Contact inquiry processed", extra={
            "inquiry_id": inquiry_id,
            "category": inquiry.category.value,
            "priority": inquiry.priority.value,
            "notification_success": notification_result["success"],
            "user_authenticated": bool(current_user)
        })
        
        # レスポンスを構築
        response = ContactInquiryResponse(
            inquiry_id=inquiry_id,
            category=inquiry.category,
            priority=inquiry.priority,
            notification_sent=notification_result["success"],
            estimated_response_time=settings.get_response_time_text(inquiry.priority.value)
        )
        
        return success_response(
            data=response.model_dump(),
            message="お問い合わせを受け付けました。ご返信をお待ちください。"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Contact inquiry processing failed", extra={
            "inquiry_id": inquiry_id,
            "error": str(e),
            "error_type": type(e).__name__
        })
        
        raise HTTPException(
            status_code=500,
            detail="お問い合わせの処理中にエラーが発生しました。しばらく時間をおいてから再度お試しください。"
        )


@router.get("/categories")
async def get_contact_categories():
    """
    問い合わせカテゴリ一覧取得API
    
    Returns:
        Dict[str, Any]: カテゴリ一覧
    """
    categories = []
    
    category_info = {
        ContactCategory.GENERAL: {
            "value": ContactCategory.GENERAL.value,
            "label": "一般的なお問い合わせ",
            "description": "使い方や機能についてのご質問",
            "icon": "❓"
        },
        ContactCategory.BUG_REPORT: {
            "value": ContactCategory.BUG_REPORT.value,
            "label": "バグ報告・不具合",
            "description": "アプリの動作不良や表示異常",
            "icon": "🐛"
        },
        ContactCategory.FEATURE_REQUEST: {
            "value": ContactCategory.FEATURE_REQUEST.value,
            "label": "新機能要望",
            "description": "新しい機能や改善のご提案",
            "icon": "💡"
        },
        ContactCategory.ACCOUNT_ISSUE: {
            "value": ContactCategory.ACCOUNT_ISSUE.value,
            "label": "アカウント関連",
            "description": "ログインやアカウント設定の問題",
            "icon": "👤"
        },
        ContactCategory.PAYMENT: {
            "value": ContactCategory.PAYMENT.value,
            "label": "決済・課金関連",
            "description": "お支払いやプランに関するお問い合わせ",
            "icon": "💳"
        },
        ContactCategory.PRIVACY: {
            "value": ContactCategory.PRIVACY.value,
            "label": "プライバシー・データ削除",
            "description": "個人情報の取り扱いやデータ削除依頼",
            "icon": "🔒"
        },
        ContactCategory.OTHER: {
            "value": ContactCategory.OTHER.value,
            "label": "その他",
            "description": "上記に当てはまらないお問い合わせ",
            "icon": "📝"
        }
    }
    
    for category in ContactCategory:
        categories.append(category_info[category])
    
    return success_response(
        data={"categories": categories},
        message="問い合わせカテゴリを取得しました"
    )


@router.post("/test-notification")
async def test_notification(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    通知テストAPI（開発・管理者用）
    
    AWS SNS設定が正しく動作するかテストする。
    本番環境では無効化される。
    """
    settings = get_settings()
    
    if settings.environment == "production":
        raise HTTPException(
            status_code=404,
            detail="Not found"
        )
    
    try:
        notification_service = ContactNotificationService()
        result = await notification_service.send_test_notification()
        
        logger.info("Test notification completed", extra={
            "success": result["success"],
            "environment": settings.environment
        })
        
        return success_response(
            data=result,
            message="テスト通知を送信しました"
        )
        
    except Exception as e:
        logger.error("Test notification failed", extra={
            "error": str(e),
            "error_type": type(e).__name__
        })
        
        raise HTTPException(
            status_code=500,
            detail=f"テスト通知の送信に失敗しました: {str(e)}"
        )


# =======================================
# ヘルパー関数
# =======================================


async def _detect_spam(inquiry: ContactInquiry) -> float:
    """
    スパム検出（簡易版）
    
    Args:
        inquiry: 問い合わせ情報
        
    Returns:
        float: スパムスコア（0.0-1.0）
    """
    spam_score = 0.0
    
    # 疑わしいキーワードをチェック
    spam_keywords = [
        "クリック", "今すぐ", "無料", "限定", "特典", "稼げる", "副業",
        "投資", "FX", "仮想通貨", "ビットコイン", "http://", "https://bit.ly"
    ]
    
    message_lower = inquiry.message.lower()
    subject_lower = inquiry.subject.lower()
    
    for keyword in spam_keywords:
        if keyword.lower() in message_lower or keyword.lower() in subject_lower:
            spam_score += 0.1
    
    # 同じ文字の繰り返しをチェック
    if len(set(inquiry.message)) < len(inquiry.message) * 0.3:
        spam_score += 0.2
    
    # 短すぎるか長すぎる場合
    if len(inquiry.message) < 20 or len(inquiry.message) > 3000:
        spam_score += 0.1
    
    # URLが多数含まれている場合
    url_count = inquiry.message.count("http://") + inquiry.message.count("https://")
    if url_count > 3:
        spam_score += 0.3
    
    return min(spam_score, 1.0)


async def _auto_categorize(inquiry: ContactInquiry) -> ContactCategory:
    """
    自動カテゴリ分類
    
    Args:
        inquiry: 問い合わせ情報
        
    Returns:
        ContactCategory: 推定カテゴリ
    """
    text = f"{inquiry.subject} {inquiry.message}".lower()
    
    # キーワードベースの分類
    category_keywords = {
        ContactCategory.BUG_REPORT: ["バグ", "エラー", "動かない", "表示されない", "おかしい", "不具合"],
        ContactCategory.FEATURE_REQUEST: ["機能", "追加", "改善", "要望", "できるように", "欲しい"],
        ContactCategory.ACCOUNT_ISSUE: ["ログイン", "アカウント", "パスワード", "認証", "サインイン"],
        ContactCategory.PAYMENT: ["決済", "支払い", "課金", "料金", "プラン", "請求"],
        ContactCategory.PRIVACY: ["削除", "プライバシー", "個人情報", "データ", "gdpr"]
    }
    
    for category, keywords in category_keywords.items():
        for keyword in keywords:
            if keyword in text:
                return category
    
    return ContactCategory.GENERAL


async def _detect_priority(inquiry: ContactInquiry) -> ContactPriority:
    """
    自動優先度検出
    
    Args:
        inquiry: 問い合わせ情報
        
    Returns:
        ContactPriority: 推定優先度
    """
    text = f"{inquiry.subject} {inquiry.message}".lower()
    
    # 高優先度キーワード
    high_priority_keywords = ["緊急", "至急", "使えない", "困っている", "重要", "すぐに"]
    
    # 低優先度キーワード
    low_priority_keywords = ["質問", "教えて", "どうやって", "方法", "できますか"]
    
    for keyword in high_priority_keywords:
        if keyword in text:
            return ContactPriority.HIGH
    
    for keyword in low_priority_keywords:
        if keyword in text:
            return ContactPriority.LOW
    
    # カテゴリによる優先度調整
    if inquiry.category in [ContactCategory.BUG_REPORT, ContactCategory.ACCOUNT_ISSUE]:
        return ContactPriority.MEDIUM
    
    if inquiry.category in [ContactCategory.PAYMENT, ContactCategory.PRIVACY]:
        return ContactPriority.HIGH
    
    return ContactPriority.MEDIUM
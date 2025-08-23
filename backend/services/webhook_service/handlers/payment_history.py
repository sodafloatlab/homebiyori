"""
PaymentHistory API Handler

■責任分離後の役割■
webhook_service: PaymentHistory完全管理
- PaymentHistory CRUD操作
- 支払い履歴API提供
- Stripe Webhookイベント処理
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime

# 共通Layer機能インポート
from homebiyori_common.logger import get_logger
from homebiyori_common.middleware import require_basic_access, get_current_user_id

# ローカルモジュール
from ..models import PaymentHistoryRequest, PaymentHistoryResponse
from ..database import get_webhook_database

logger = get_logger(__name__)

# ルーター作成
payment_history_router = APIRouter(
    prefix="/api/webhook/payment-history",
    tags=["Payment History"]
)

@payment_history_router.get("", response_model=PaymentHistoryResponse)
@require_basic_access()
async def get_payment_history(
    limit: int = Query(default=20, ge=1, le=100, description="取得件数制限"),
    next_token: Optional[str] = Query(None, description="ページネーショントークン"),
    start_date: Optional[str] = Query(None, description="取得開始日（ISO文字列）"),
    end_date: Optional[str] = Query(None, description="取得終了日（ISO文字列）"),
    user_id: str = Depends(get_current_user_id)
):
    """
    ユーザーの支払い履歴を取得（webhook_service完全管理）
    
    ■責任分離後の新エンドポイント■
    - 旧エンドポイント: GET /api/billing/history （billing_service - 削除済み）
    - 新エンドポイント: GET /api/webhook/payment-history （webhook_service - こちら）
    
    Args:
        limit: 取得件数制限（1-100）
        next_token: ページネーショントークン
        start_date: 取得開始日（例: 2024-01-01T00:00:00+09:00）
        end_date: 取得終了日（例: 2024-01-31T23:59:59+09:00）
        user_id: ユーザーID（認証から自動取得）
    
    Returns:
        PaymentHistoryResponse: 支払い履歴とメタデータ
    """
    try:
        logger.info(f"PaymentHistory取得開始: user_id={user_id}")
        
        # データベースから支払い履歴を取得
        db = get_webhook_database()
        result = await db.get_payment_history(
            user_id=user_id,
            limit=limit,
            next_token=next_token,
            start_date=start_date,
            end_date=end_date
        )
        
        # レスポンス構築
        response = PaymentHistoryResponse(
            items=[item for item in result["items"]],  # PaymentHistoryモデルに変換
            next_token=result.get("next_token"),
            has_more=result.get("has_more", False),
            total_count=result.get("total_count")
        )
        
        logger.info(f"PaymentHistory取得完了: user_id={user_id}, count={len(response.items)}")
        return response
        
    except Exception as e:
        logger.error(f"PaymentHistory取得エラー: user_id={user_id}, error={e}")
        raise HTTPException(
            status_code=500, 
            detail="支払い履歴の取得に失敗しました"
        )

@payment_history_router.get("/health")
async def payment_history_health():
    """PaymentHistory機能ヘルスチェック"""
    try:
        db = get_webhook_database()
        health_result = await db.health_check()
        
        return {
            "service": "webhook_service",
            "feature": "payment_history",
            "status": "healthy",
            "database": health_result.get("database_status", "unknown"),
            "responsibility": "PaymentHistory完全管理（責任分離対応）"
        }
        
    except Exception as e:
        logger.error(f"PaymentHistory機能ヘルスチェックエラー: {e}")
        raise HTTPException(
            status_code=500,
            detail="PaymentHistory機能のヘルスチェックに失敗しました"
        )
# Models for webhook service
# Phase 1実装: PaymentHistory DB保存機能復旧

# PaymentHistory DB保存用モデル（Phase 1対応）
from .payment_models import (
    PaymentHistory,
    # PaymentEventData - 削除済み（未使用のため）
)

# Stripe関連モデル（Phase 1で必要なもののみ）
__all__ = [
    "PaymentHistory",      # DB保存専用（Phase 1）
    # "PaymentEventData" - 削除済み（未使用のため、2024-08-24）
    # PaymentHistoryRequest, PaymentHistoryResponse は削除済み（GET API削除のため）
    # Phase 2: Stripe Customer Portal経由でのユーザーアクセス
    # Phase 3: admin_service経由での内部管理
]
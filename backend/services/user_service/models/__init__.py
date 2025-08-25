"""
user_service Pydanticモデル統合エクスポート

webhook_serviceアーキテクチャに基づく機能別モデル分離後の
統合エクスポートレイヤー。既存のimport文との互換性を維持。

■分離構成■
- profile_models.py: ユーザープロフィール関連モデル
- account_models.py: アカウント管理関連モデル

■互換性維持■
既存のコードベースからの import 文は変更不要：
from backend.services.user_service.models import UserProfile
"""

# プロフィール関連モデル
from .profile_models import (
    UserProfile,
    UserProfileUpdate,
    AIPreferences,
    AIPreferencesUpdate
)

# アカウント管理関連モデル
from .account_models import (
    OnboardingStatus,
    CompleteOnboardingRequest,
    AccountDeletionRequest
)

__all__ = [
    # プロフィール関連
    "UserProfile",
    "UserProfileUpdate", 
    "AIPreferences",
    "AIPreferencesUpdate",
    
    # アカウント管理関連
    "OnboardingStatus",
    "CompleteOnboardingRequest",
    "AccountDeletionRequest"
]
"""
Profile Service

ユーザープロフィール関連のビジネスロジック
"""

from typing import Dict
from homebiyori_common import get_logger

from ..models import UserProfile, UserProfileUpdate, AIPreferencesUpdate

logger = get_logger(__name__)

class ProfileService:
    """ユーザープロフィール管理サービス"""
    
    def __init__(self, database):
        """
        ProfileService初期化
        
        Args:
            database: データベースクライアント
        """
        self.db = database
    
    async def get_user_profile(self, user_id: str) -> UserProfile:
        """
        ユーザープロフィール取得

        ■機能概要■
        - ユーザープロフィール（ニックネーム、AI設定等）を返却
        - 存在しない場合はデフォルトプロフィールを返却
        - オンボーディング状態も含めて返却

        Args:
            user_id: ユーザーID
            
        Returns:
            UserProfile: ユーザープロフィール情報
        """
        logger.info(f"Getting user profile for user_id: {user_id}")
        
        # ユーザープロフィール取得
        profile_item = await self.db.get_user_profile(user_id)
        if not profile_item:
            # プロフィール未作成の場合、デフォルトプロフィールを返却
            logger.info(
                "Profile not found, returning default",
                extra={"user_id": user_id[:8] + "****"},
            )
            return UserProfile(user_id=user_id)

        # AI設定取得（別テーブル）
        ai_preferences_item = await self.db.get_ai_preferences(user_id)
        
        # UserProfileモデル作成（profile_item既にUserProfileインスタンス）
        # AI設定が存在する場合は上書き、なければprofile_itemの値を使用
        profile_data = {
            "user_id": profile_item.user_id,
            "nickname": profile_item.nickname,
            "ai_character": ai_preferences_item.get("ai_character") if ai_preferences_item else profile_item.ai_character,
            "praise_level": ai_preferences_item.get("praise_level") if ai_preferences_item else profile_item.praise_level,
            "interaction_mode": ai_preferences_item.get("interaction_mode") if ai_preferences_item else profile_item.interaction_mode,
            "onboarding_completed": profile_item.onboarding_completed,
            "created_at": profile_item.created_at,
            "updated_at": profile_item.updated_at
        }
        
        profile = UserProfile(**profile_data)
        
        logger.info(f"Successfully retrieved user profile for user_id: {user_id}")
        return profile
    
    async def update_user_profile(
        self, 
        user_id: str, 
        profile_update: UserProfileUpdate
    ) -> Dict[str, str]:
        """
        ユーザープロフィール更新

        ■機能概要■
        - ニックネーム、オンボーディング状態等を更新
        - AI設定（キャラクター、褒めレベル）は別エンドポイントで管理
        - なりすまし防止: 認証ユーザーのデータのみ更新可能

        ■バリデーション■
        - ニックネーム: 1-20文字、基本文字のみ
        - 不適切語句チェック
        - XSS防止のためHTMLエスケープ

        Args:
            user_id: ユーザーID
            profile_update: 更新するプロフィール情報
            
        Returns:
            Dict[str, str]: 更新結果メッセージ
            
        Raises:
            ValueError: 更新に失敗した場合
        """
        logger.info(
            "Updating user profile",
            extra={
                "user_id": user_id[:8] + "****",
                "fields_updated": list(
                    profile_update.model_dump(exclude_unset=True).keys()
                ),
            },
        )

        # 既存プロフィール取得または新規作成
        existing_profile = await self.db.get_user_profile(user_id)
        if existing_profile:
            # 既存プロフィール更新
            updated_profile = existing_profile.model_copy(
                update=profile_update.model_dump(exclude_unset=True)
            )
        else:
            # 新規プロフィール作成
            updated_profile = UserProfile(
                user_id=user_id, **profile_update.model_dump(exclude_unset=True)
            )

        # データベース保存
        saved_profile = await self.db.save_user_profile(updated_profile)

        logger.info(
            "User profile updated successfully", extra={"user_id": user_id[:8] + "****"}
        )
        return {"message": "User profile updated successfully"}
    
    async def update_ai_preferences(
        self, 
        user_id: str, 
        ai_preferences_update: AIPreferencesUpdate
    ) -> Dict[str, str]:
        """
        AI設定更新
        
        Args:
            user_id: ユーザーID
            ai_preferences_update: 更新するAI設定
            
        Returns:
            Dict[str, str]: 更新結果メッセージ
            
        Raises:
            ValueError: 更新に失敗した場合
        """
        logger.info(
            "Updating AI preferences",
            extra={
                "user_id": user_id[:8] + "****",
                "update_fields": list(ai_preferences_update.model_dump(exclude_unset=True).keys())
            },
        )

        # AI設定をプロフィールに反映
        existing_profile = await self.db.get_user_profile(user_id)
        if existing_profile:
            # 既存プロフィールを部分更新
            update_data = ai_preferences_update.model_dump(exclude_unset=True)
            if "ai_character" in update_data:
                existing_profile.ai_character = update_data["ai_character"]
            if "praise_level" in update_data:
                existing_profile.praise_level = update_data["praise_level"]
            if "interaction_mode" in update_data:
                existing_profile.interaction_mode = update_data["interaction_mode"]
            updated_profile = existing_profile
        else:
            # プロフィール未作成の場合は新規作成
            update_data = ai_preferences_update.model_dump(exclude_unset=True)
            updated_profile = UserProfile(user_id=user_id, **update_data)

        await self.db.save_user_profile(updated_profile)

        logger.info(
            "AI preferences updated successfully",
            extra={"user_id": user_id[:8] + "****"},
        )
        return {"message": "AI preferences updated successfully"}

"""
Account Service

アカウント管理関連のビジネスロジック
"""

from typing import Dict, Any, Optional
from homebiyori_common import get_logger

from ..models import OnboardingStatus, CompleteOnboardingRequest, AccountDeletionRequest
from homebiyori_common.models import PraiseLevel

logger = get_logger(__name__)


class AccountService:
    """アカウント管理サービス"""
    
    def __init__(self, database):
        """
        AccountService初期化
        
        Args:
            database: データベースクライアント
        """
        self.db = database
    
    async def get_onboarding_status(self, user_id: str) -> OnboardingStatus:
        """
        オンボーディング状態取得
        
        Args:
            user_id: ユーザーID
            
        Returns:
            OnboardingStatus: オンボーディング状態情報
            
        Raises:
            ValueError: データベースエラーの場合
        """
        logger.info(f"Getting onboarding status for user_id: {user_id}")
        
        try:
            # ユーザープロフィール取得でオンボーディング状態確認
            profile = await self.db.get_user_profile(user_id)
            
            # オンボーディング状態判定
            is_completed = bool(profile and profile.onboarding_completed)
            
            onboarding_status = OnboardingStatus(
                user_id=user_id,
                is_completed=is_completed,
                completed_at=getattr(profile, 'onboarding_completed_at', None) if is_completed else None
            )
            
            logger.info(f"Onboarding status retrieved for user_id: {user_id}, completed: {is_completed}")
            return onboarding_status
            
        except Exception as e:
            logger.error(f"Failed to get onboarding status: {str(e)}", extra={"user_id": user_id})
            raise ValueError("Failed to get onboarding status")
    
    async def complete_onboarding(
        self, 
        user_id: str, 
        onboarding_request: CompleteOnboardingRequest
    ) -> Dict[str, str]:
        """
        オンボーディング完了処理
        
        Args:
            user_id: ユーザーID
            onboarding_request: オンボーディング完了リクエスト
            
        Returns:
            Dict[str, str]: 処理結果メッセージ
            
        Raises:
            ValueError: 処理に失敗した場合
        """
        logger.info(f"Completing onboarding for user_id: {user_id}")
        
        try:
            # 既存プロフィール取得または新規作成
            existing_profile = await self.db.get_user_profile(user_id)
            if existing_profile:
                # 既存プロフィール更新
                existing_profile.onboarding_completed = True
                existing_profile.nickname = onboarding_request.display_name
                existing_profile.ai_character = onboarding_request.selected_character
                existing_profile.interaction_mode = onboarding_request.interaction_mode
                existing_profile.praise_level = onboarding_request.praise_level or existing_profile.praise_level
                
                updated_profile = existing_profile
            else:
                # 新規プロフィール作成
                from ..models import UserProfile
                
                updated_profile = UserProfile(
                    user_id=user_id,
                    nickname=onboarding_request.display_name,
                    onboarding_completed=True,
                    ai_character=onboarding_request.selected_character,
                    interaction_mode=onboarding_request.interaction_mode,
                    praise_level=onboarding_request.praise_level or PraiseLevel.NORMAL
                )
            
            saved_profile = await self.db.save_user_profile(updated_profile)
            if not saved_profile:
                logger.warning(f"Failed to complete onboarding for user_id: {user_id}")
                raise ValueError("Failed to complete onboarding")
            
            logger.info(f"Successfully completed onboarding for user_id: {user_id}")
            return {"message": "Onboarding completed successfully"}
            
        except Exception as e:
            logger.error(f"Failed to complete onboarding: {str(e)}", extra={"user_id": user_id})
            raise ValueError("Failed to complete onboarding")
    
    async def delete_account(
        self, 
        user_id: str, 
        deletion_request: AccountDeletionRequest
    ) -> Dict[str, str]:
        """
        アカウント削除処理（超シンプル版 - 論理削除）
        
        ■削除プロセス■
        1. UserProfileに論理削除フラグ設定（account_deleted=true）
        2. 個人情報（nickname）を削除
        3. SQSキューを送信し、他サービスでの関連データ削除を非同期実行
           - チャット履歴削除（chats）
           - 木・実データ削除（fruits, notifications）
           - ※Cognitoユーザー削除は実行しない（sub維持のため）
        
        Args:
            user_id: ユーザーID
            deletion_request: アカウント削除リクエスト
            
        Returns:
            Dict[str, str]: 削除結果メッセージ
            
        Raises:
            ValueError: 削除に失敗した場合
        """
        logger.info(f"Starting account deletion process for user_id: {user_id}")
        
        try:
            # 1. UserProfileを論理削除に変更（account_deleted=true設定）
            from ..models import UserProfileUpdate
            from ..services.profile_service import ProfileService
            
            profile_service = ProfileService(self.db)
            
            # 論理削除フラグ設定 + 個人情報削除
            await profile_service.update_user_profile(
                user_id=user_id,
                profile_update=UserProfileUpdate(
                    account_deleted=True,
                    nickname=None  # 個人情報削除
                )
            )
            
            logger.info(f"UserProfile logically deleted for user_id: {user_id}")
            
            # 2. SQSキューを送信して他サービスでの非同期削除を実行
            from ..utils.send_sqs import send_deletion_task_to_sqs
            
            sqs_success = await send_deletion_task_to_sqs(user_id, "account_deletion")
            if not sqs_success:
                logger.warning(
                    f"Failed to queue deletion task to SQS for user_id: {user_id}. "
                    "Profile was logically deleted, but related data cleanup may be incomplete."
                )
                # SQS送信失敗でも、論理削除は成功したので処理は継続
            
            logger.info(
                f"Account deletion process completed for user_id: {user_id}",
                extra={
                    "profile_logically_deleted": True,
                    "sqs_queued": sqs_success
                }
            )
            
            return {
                "message": "Account deletion initiated successfully",
                "status": "deletion_initiated",
                "cleanup_queued": sqs_success
            }
            
        except Exception as e:
            logger.error(f"Failed to delete account: {str(e)}", extra={"user_id": user_id})
            raise ValueError("Failed to delete account")

# =====================================
# ファクトリー関数
# =====================================

def get_account_service() -> AccountService:
    """
    AccountServiceインスタンスを取得（依存性注入）
    
    Returns:
        AccountService: アカウント管理サービス
    """
    from ..database import get_user_database
    return AccountService(database=get_user_database())

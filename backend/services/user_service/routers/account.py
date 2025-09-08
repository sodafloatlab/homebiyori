"""
User Account Management Router

ユーザーアカウント関連のAPIエンドポイント：
- GET /api/user/onboarding-status - オンボーディング状態取得
- POST /api/user/complete-onboarding - オンボーディング完了
- DELETE /api/user/account - アカウント削除
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from homebiyori_common import get_logger
from homebiyori_common.middleware.authentication import get_current_user_id
from homebiyori_common.middleware import require_basic_access, require_authentication_only

from ..models import OnboardingStatus, CompleteOnboardingRequest, AccountDeletionRequest
from ..core.dependencies import get_db
from ..database import UserServiceDatabase

logger = get_logger(__name__)

router = APIRouter(tags=["account"])


@router.get("/onboarding-status")
@require_authentication_only()
async def get_onboarding_status(
    user_id: str = Depends(get_current_user_id),
    db: UserServiceDatabase = Depends(get_db)
) -> OnboardingStatus:
    """
    オンボーディング状態取得
    
    Args:
        user_id: 認証されたユーザーID
        db: データベース依存性注入
        
    Returns:
        OnboardingStatus: オンボーディング状態情報
    """
    logger.info(f"Getting onboarding status for user_id: {user_id}")
    
    try:
        from ..services import AccountService
        
        account_service = AccountService(db)
        
        onboarding_status = await account_service.get_onboarding_status(user_id)
        logger.info(f"Onboarding status retrieved for user_id: {user_id}, completed: {onboarding_status.is_completed}")
        return onboarding_status
        
    except ValueError as e:
        logger.warning(f"Failed to get onboarding status for user_id: {user_id}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get onboarding status: {str(e)}", extra={"user_id": user_id})
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/complete-onboarding")
@require_authentication_only()
async def complete_onboarding(
    onboarding_request: CompleteOnboardingRequest,
    user_id: str = Depends(get_current_user_id),
    db: UserServiceDatabase = Depends(get_db)
) -> Dict[str, str]:
    """
    オンボーディング完了処理
    
    Args:
        onboarding_request: オンボーディング完了リクエスト
        user_id: 認証されたユーザーID
        db: データベース依存性注入
        
    Returns:
        Dict[str, str]: 処理結果メッセージ
    """
    logger.info(f"Completing onboarding for user_id: {user_id}")
    
    try:
        from ..services import AccountService
        
        account_service = AccountService(db)
        
        result = await account_service.complete_onboarding(user_id, onboarding_request)
        logger.info(f"Successfully completed onboarding for user_id: {user_id}")
        return result
        
    except ValueError as e:
        logger.warning(f"Failed to complete onboarding for user_id: {user_id}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to complete onboarding: {str(e)}", extra={"user_id": user_id})
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/account")
@require_basic_access()
async def delete_account(
    deletion_request: AccountDeletionRequest,
    user_id: str = Depends(get_current_user_id),
    db: UserServiceDatabase = Depends(get_db)
) -> Dict[str, str]:
    """
    アカウント削除処理
    
    Args:
        deletion_request: アカウント削除リクエスト
        user_id: 認証されたユーザーID
        db: データベース依存性注入
        
    Returns:
        Dict[str, str]: 削除結果メッセージ
    """
    logger.info(f"Deleting account for user_id: {user_id}")
    
    try:
        from ..services import AccountService
        
        account_service = AccountService(db)
        
        result = await account_service.delete_account(user_id, deletion_request)
        logger.info(f"Successfully deleted account for user_id: {user_id}")
        return result
        
    except ValueError as e:
        logger.warning(f"Failed to delete account for user_id: {user_id}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete account: {str(e)}", extra={"user_id": user_id})
        raise HTTPException(status_code=500, detail="Internal server error")
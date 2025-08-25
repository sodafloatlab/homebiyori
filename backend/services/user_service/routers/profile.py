"""
User Profile Management Router

ユーザープロフィール関連のAPIエンドポイント：
- GET /api/user/profile - ユーザープロフィール取得(AI設定含む)
- PUT /api/user/profile - ユーザープロフィール更新
- PUT /api/user/profile/ai-preferences - AI設定更新
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from homebiyori_common import get_logger
from homebiyori_common.middleware.authentication import get_current_user_id
from homebiyori_common.middleware import require_basic_access

from ..models import UserProfile, UserProfileUpdate, AIPreferencesUpdate
from ..core.dependencies import get_db
from ..database import UserServiceDatabase

logger = get_logger(__name__)

# Account management router creation
router = APIRouter(tags=["profile"])

@router.get("/")
@require_basic_access()
async def get_user_profile(
    user_id: str = Depends(get_current_user_id),
    db: UserServiceDatabase = Depends(get_db)
) -> UserProfile:
    """
    ユーザープロフィール取得
    
    Args:
        user_id: 認証されたユーザーID
        db: データベース依存性注入
        
    Returns:
        UserProfile: ユーザープロフィール情報
    """
    logger.info(f"Getting user profile for user_id: {user_id}")
    
    try:
        from ..services import ProfileService
        
        profile_service = ProfileService(db)
        
        profile = await profile_service.get_user_profile(user_id)
        logger.info(f"Successfully retrieved user profile for user_id: {user_id}")
        return profile
        
    except ValueError as e:
        logger.warning(f"User profile not found for user_id: {user_id}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get user profile: {str(e)}", extra={"user_id": user_id})
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/") 
@require_basic_access()
async def update_user_profile(
    profile_update: UserProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    db: UserServiceDatabase = Depends(get_db)
) -> Dict[str, str]:
    """
    ユーザープロフィール更新
    
    Args:
        profile_update: 更新するプロフィール情報
        user_id: 認証されたユーザーID
        db: データベース依存性注入
        
    Returns:
        Dict[str, str]: 更新結果メッセージ
    """
    logger.info(f"Updating user profile for user_id: {user_id}")
    
    try:
        from ..services import ProfileService
        
        profile_service = ProfileService(db)
        
        result = await profile_service.update_user_profile(user_id, profile_update)
        logger.info(f"Successfully updated user profile for user_id: {user_id}")
        return result
        
    except ValueError as e:
        logger.warning(f"Failed to update user profile for user_id: {user_id}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update user profile: {str(e)}", extra={"user_id": user_id})
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/ai-preferences")
@require_basic_access()
async def update_ai_preferences(
    preferences_update: AIPreferencesUpdate,
    user_id: str = Depends(get_current_user_id),
    db: UserServiceDatabase = Depends(get_db)
) -> Dict[str, str]:
    """
    AI設定更新
    
    Args:
        preferences_update: 更新するAI設定
        user_id: 認証されたユーザーID
        db: データベース依存性注入
        
    Returns:
        Dict[str, str]: 更新結果メッセージ
    """
    logger.info(f"Updating AI preferences for user_id: {user_id}")
    
    try:
        from ..services import ProfileService
        
        profile_service = ProfileService(db)
        
        result = await profile_service.update_ai_preferences(user_id, preferences_update)
        logger.info(f"Successfully updated AI preferences for user_id: {user_id}")
        return result
        
    except ValueError as e:
        logger.warning(f"Failed to update AI preferences for user_id: {user_id}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update AI preferences: {str(e)}", extra={"user_id": user_id})
        raise HTTPException(status_code=500, detail="Internal server error")
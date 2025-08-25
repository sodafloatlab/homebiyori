"""
Health Check Handler

User Service のヘルスチェック機能。
- Lambda関数の死活監視
- 依存サービス接続確認
- 設定検証
"""

from fastapi import APIRouter

from homebiyori_common import get_logger
from homebiyori_common.utils.datetime_utils import get_current_jst

# ログ設定
logger = get_logger(__name__)

# ルーター初期化
router = APIRouter(tags=["health"])


@router.get("/")
async def health_check():
    """
    基本的なヘルスチェック（DB接続確認）
    
    Returns:
        FastAPI Response: サービス状態とDB接続状態
    """
    from ..database import get_user_database
    
    try:
        # データベース接続確認
        db = get_user_database()

        await db.health_check()
        
        return {
            "status": "healthy",
            "service": "user_service",
            "timestamp": get_current_jst().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Health check failed")

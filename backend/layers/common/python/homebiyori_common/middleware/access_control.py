"""
アクセス制御ミドルウェア
全サービス共通でユーザーのアクセス権限をチェックする
"""

import asyncio
import logging
from typing import Callable, Dict, Any, Optional
from functools import wraps
from fastapi import HTTPException
from fastapi.responses import JSONResponse


logger = logging.getLogger(__name__)


class AccessControlError(Exception):
    """アクセス制御エラー"""
    pass


class AccessControlClient:
    """
    アクセス制御クライアント（DynamoDB直接参照）
    
    高速・高可用性のアクセス制御を実現:
    - HTTP通信なしでDynamoDB直接アクセス
    - 20-50msの高速レスポンス
    - 単一障害点なし
    """
    
    def __init__(self, billing_service_url: str = None):
        # 後方互換性のため引数は残すが使用しない（DynamoDB直接参照のため）
        self.dynamodb = None
        self.core_table_name = None
        
    def _get_dynamodb(self):
        """DynamoDBクライアントを遅延初期化"""
        if self.dynamodb is None:
            import boto3
            self.dynamodb = boto3.resource('dynamodb')
        return self.dynamodb
    
    def _get_core_table_name(self) -> str:
        """CORE_TABLE_NAME環境変数を取得"""
        if self.core_table_name is None:
            import os
            self.core_table_name = os.getenv('CORE_TABLE_NAME')
            if not self.core_table_name:
                logger.error("CORE_TABLE_NAME environment variable not set")
                raise Exception("DynamoDB table configuration missing")
        return self.core_table_name
        
    async def check_user_access(self, user_id: str) -> Dict[str, Any]:
        """
        ユーザーのアクセス制御状態をDynamoDB直接参照でチェック
        
        Args:
            user_id: ユーザーID
            
        Returns:
            Dict[str, Any]: アクセス制御情報
        """
        try:
            dynamodb = self._get_dynamodb()
            core_table_name = self._get_core_table_name()
            core_table = dynamodb.Table(core_table_name)
            
            # ユーザープロフィール取得
            profile_response = await self._get_user_profile(core_table, user_id)
            if not profile_response:
                return self._get_access_denied("user_not_found", "ユーザーが見つかりません")
            
            # サブスクリプション状態取得
            subscription_response = await self._get_user_subscription(core_table, user_id)
            
            # アクセス制御判定
            return self._determine_access_level(subscription_response)
            
        except Exception as e:
            logger.error(f"Failed to check user subscription status: {e}", extra={
                "user_id": user_id[:8] + "****"
            })
            return self._get_error_fallback()
    
    async def _get_user_profile(self, table, user_id: str) -> Optional[Dict[str, Any]]:
        """ユーザープロフィール取得"""
        try:
            # 非同期でDynamoDB操作を実行
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: table.get_item(
                    Key={
                        'PK': f'USER#{user_id}',
                        'SK': 'PROFILE'
                    }
                )
            )
            return response.get('Item')
        except Exception as e:
            logger.error(f"Failed to get user profile: {e}")
            return None
    
    async def _get_user_subscription(self, table, user_id: str) -> Optional[Dict[str, Any]]:
        """ユーザーサブスクリプション状態取得"""
        try:
            # 非同期でDynamoDB操作を実行
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: table.get_item(
                    Key={
                        'PK': f'USER#{user_id}',
                        'SK': 'SUBSCRIPTION'
                    }
                )
            )
            return response.get('Item')
        except Exception as e:
            logger.debug(f"No subscription found for user (normal for new users): {e}")
            return None
    
    def _determine_access_level(self, subscription_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """サブスクリプション状態からアクセスレベルを判定"""
        
        # サブスクリプション情報がない場合（新規ユーザー）
        if not subscription_data:
            return {
                "access_allowed": True,  # Issue #15: 新規ユーザーはトライアル開始
                "access_level": "trial",
                "restriction_reason": None,
                "current_plan": "trial",
                "expires_at": None,
                "redirect_url": None
            }
        
        # 現在時刻
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        # サブスクリプション状態（4種類：active|expired|canceled|past_due）
        status = subscription_data.get('status', 'none')
        current_plan = subscription_data.get('current_plan', 'trial')
        
        # 期限チェック
        expires_at_str = subscription_data.get('current_period_end')
        expires_at = None
        if expires_at_str:
            try:
                expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
            except:
                logger.warning(f"Invalid date format in subscription: {expires_at_str}")
        
        # Issue #15 新戦略に基づくアクセス制御判定
        if status == 'active':
            # アクティブなサブスクリプション（トライアル中または課金中）
            return {
                "access_allowed": True,
                "access_level": "active",
                "restriction_reason": None,
                "current_plan": current_plan,
                "expires_at": expires_at,
                "redirect_url": None
            }
        elif status in ['expired', 'canceled', 'past_due']:
            # 期限切れ・キャンセル・支払い遅延の場合
            
            # トライアル期間終了の場合の判定
            is_trial_expired = (
                current_plan == 'trial' and 
                expires_at and 
                now > expires_at
            )
            
            if is_trial_expired:
                # トライアル期間終了 → 課金誘導、機能利用不可
                return {
                    "access_allowed": False,
                    "access_level": "none",
                    "restriction_reason": "trial_expired",
                    "current_plan": current_plan,
                    "expires_at": expires_at,
                    "redirect_url": "/billing/subscribe"
                }
            else:
                # 有料プラン期限切れ → 課金誘導、機能利用不可
                return {
                    "access_allowed": False,
                    "access_level": "none",
                    "restriction_reason": "subscription_expired",
                    "current_plan": current_plan,
                    "expires_at": expires_at,
                    "redirect_url": "/billing/subscribe"
                }
        else:
            # 不明な状態
            return self._get_access_denied("unknown_subscription_status", 
                                         "サブスクリプション状態を確認できません")
    
    def _get_access_denied(self, reason: str, message: str) -> Dict[str, Any]:
        """アクセス拒否レスポンス"""
        return {
            "access_allowed": False,
            "access_level": "none",
            "restriction_reason": reason,
            "current_plan": "none",
            "expires_at": None,
            "redirect_url": "/auth/login"
        }
    
    def _get_error_fallback(self) -> Dict[str, Any]:
        """エラー時のフォールバック（安全側に倒してアクセス拒否）"""
        return {
            "access_allowed": False,
            "access_level": "none",
            "restriction_reason": "system_error",
            "redirect_url": "/error"
        }
    
    async def close(self):
        """後方互換性のため保持（DynamoDB接続は自動クローズ）"""
        pass


# グローバルインスタンス
_access_control_client: Optional[AccessControlClient] = None


def get_access_control_client() -> AccessControlClient:
    """アクセス制御クライアントを取得"""
    global _access_control_client
    if _access_control_client is None:
        import os
        billing_service_url = os.getenv(
            'BILLING_SERVICE_URL', 
            'http://localhost:8000'  # ローカル開発用デフォルト
        )
        _access_control_client = AccessControlClient(billing_service_url)
    return _access_control_client


def require_access(allow_during_trial: bool = True, require_premium: bool = False):
    """
    アクセス制御デコレーター（user_idパラメーターベース）
    
    Args:
        allow_during_trial: トライアル期間中のアクセスを許可するか
        require_premium: プレミアムプラン必須か
        
    Notes:
        - 全ての対象関数は user_id: str = Depends(get_current_user_id) を持つ前提
        - RequestオブジェクトやJWTトークンは不要
        - DynamoDB直接参照による高速アクセス制御
        - Issue #15: 期限切れ時は課金誘導、機能利用不可
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 関数の引数からuser_idを取得
            user_id = kwargs.get('user_id')
            
            if not user_id:
                # kwargs内にuser_idがない場合、argsから探索
                import inspect
                sig = inspect.signature(func)
                param_names = list(sig.parameters.keys())
                
                for i, arg_value in enumerate(args):
                    if i < len(param_names) and param_names[i] == 'user_id':
                        user_id = arg_value
                        break
            
            if not user_id:
                logger.error("user_id parameter not found in function arguments")
                raise HTTPException(status_code=500, detail="Internal server error: user_id missing")
            
            # アクセス制御チェック
            try:
                logger.info(f"Starting access control check for user_id: {user_id[:8]}****")
                access_client = get_access_control_client()
                access_info = await access_client.check_user_access(user_id)
                logger.info(f"Access control result: access_allowed={access_info.get('access_allowed')}, reason={access_info.get('restriction_reason')}")
                
                access_allowed = access_info.get("access_allowed", False)
                restriction_reason = access_info.get("restriction_reason")
                access_level = access_info.get("access_level", "none")
                redirect_url = access_info.get("redirect_url", "/billing/subscribe")
                
                # Issue #15 対応: 期限切れユーザーは機能利用不可、課金誘導
                if not access_allowed:
                    if restriction_reason == "trial_expired":
                        return JSONResponse(
                            status_code=402,
                            content={
                                "success": False,
                                "error": "trial_expired",
                                "message": "7日間の無料トライアルが終了しました。引き続きサービスをご利用いただくには、有料プランにお申し込みください。",
                                "redirect_url": redirect_url
                            }
                        )
                    elif restriction_reason == "subscription_expired":
                        return JSONResponse(
                            status_code=402,
                            content={
                                "success": False,
                                "error": "subscription_expired", 
                                "message": "サブスクリプションの有効期限が切れています。サービスを継続利用するには、プランを更新してください。",
                                "redirect_url": redirect_url
                            }
                        )
                    else:
                        # その他のアクセス拒否理由
                        return JSONResponse(
                            status_code=403,
                            content={
                                "success": False,
                                "error": restriction_reason or "access_denied",
                                "message": "このサービスをご利用いただくには認証が必要です。",
                                "redirect_url": redirect_url or "/auth/login"
                            }
                        )
                
                # プレミアム必須機能の制限チェック
                if require_premium:
                    if access_level not in ["premium", "active"]:
                        return JSONResponse(
                            status_code=402,
                            content={
                                "success": False,
                                "error": "premium_required",
                                "message": "この機能にはプレミアムプランが必要です。",
                                "redirect_url": "/billing/subscribe"
                            }
                        )
                
                # トライアル期間中の制限チェック
                if not allow_during_trial:
                    if access_level == "trial":
                        return JSONResponse(
                            status_code=402,
                            content={
                                "success": False,
                                "error": "trial_limitation",
                                "message": "この機能はトライアル期間中はご利用いただけません。",
                                "redirect_url": "/billing/subscribe"
                            }
                        )
                
                # アクセス許可 - 元の関数を実行
                # Issue #15: アクティブなトライアル・有料プランのみ機能利用可能
                return await func(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Access control check failed: {e}")
                raise HTTPException(status_code=500, detail="Access control system error")
        
        return wrapper
    return decorator


# 便利関数
def require_basic_access():
    """基本アクセス制御（トライアル期間中も許可）"""
    return require_access(allow_during_trial=True, require_premium=False)


def require_premium_access():
    """プレミアムアクセス制御（プレミアムプラン必須）"""
    return require_access(allow_during_trial=False, require_premium=True)


def require_paid_access():
    """有料プランアクセス制御（トライアル不可、プレミアム必須）"""
    return require_access(allow_during_trial=False, require_premium=True)
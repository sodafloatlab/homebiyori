"""
Subscription Utilities - Issue #15 統一ロジック

サブスクリプション・課金関連の統一ロジック関数
各サービスで重複していたロジックを集約し、一貫性を保つ
"""

from typing import Optional
from ..models.enums import SubscriptionPlan, SubscriptionStatus
from .datetime_utils import get_current_jst


def is_premium_plan(plan: SubscriptionPlan) -> bool:
    """
    プレミアムプラン（有料プラン）かどうか判定
    
    Issue #15 新戦略対応：
    月額・年額をデータレベルで区別、制御ロジックは統一
    
    Args:
        plan: 判定対象のサブスクリプションプラン
        
    Returns:
        bool: プレミアムプランの場合True
    """
    return plan in [SubscriptionPlan.MONTHLY, SubscriptionPlan.YEARLY]


def is_paid_plan(subscription) -> bool:
    """
    有料サブスクリプションかどうか判定（統一ロジック）
    
    Args:
        subscription: UserSubscriptionオブジェクト（None可）
        
    Returns:
        bool: 有料プランの場合True
    """
    if not subscription:
        return False
    return is_premium_plan(subscription.current_plan)


def is_active_subscription(subscription) -> bool:
    """
    サブスクリプションがアクティブかどうか判定（新戦略）
    
    Issue #15 新戦略対応：
    統一戦略のため、シンプルな状態チェックのみ
    
    Args:
        subscription: UserSubscriptionオブジェクト
        
    Returns:
        bool: アクティブな場合True
    """
    if not subscription:
        return False
        
    return (
        subscription.status == SubscriptionStatus.ACTIVE and
        (subscription.current_period_end is None or 
         subscription.current_period_end > get_current_jst())
    )


def get_unified_ttl_days() -> int:
    """
    全ユーザー統一TTL日数を取得（新戦略）
    
    Issue #15 新戦略：
    全プラン統一で180日保持期間
    
    Returns:
        int: TTL日数（180日）
    """
    return 180  # 全プラン統一保持期間


def get_plan_price(plan: SubscriptionPlan) -> int:
    """
    プランの価格を取得（円）
    
    Args:
        plan: 価格を取得するプラン
        
    Returns:
        int: 価格（円）
    """
    # プラン設定（統一定義）
    PLAN_CONFIGS = {
        SubscriptionPlan.TRIAL: {
            "name": "1週間無料トライアル",
            "price": 0,
            "description": "7日間無料体験、全機能利用可能"
        },
        SubscriptionPlan.MONTHLY: {
            "name": "月額プラン",
            "price": 580,  # 円（新価格）
            "description": "月額580円、全機能利用可能"
        },
        SubscriptionPlan.YEARLY: {
            "name": "年額プラン",
            "price": 5800,  # 円（年額）
            "description": "年額5800円、全機能利用可能"
        }
    }
    
    config = PLAN_CONFIGS.get(plan, PLAN_CONFIGS[SubscriptionPlan.TRIAL])
    return config["price"]


def get_stripe_price_id(plan: SubscriptionPlan) -> Optional[str]:
    """
    StripeのPrice IDを取得（Parameter Store対応）
    
    Args:
        plan: Price IDを取得するプラン
        
    Returns:
        Optional[str]: Stripe Price ID
    """
    from .parameter_store import get_parameter
    
    if plan == SubscriptionPlan.MONTHLY:
        return get_parameter(
            "/prod/homebiyori/stripe/monthly_price_id",
            default_value="price_1MonthlyPlan"
        )
    elif plan == SubscriptionPlan.YEARLY:
        return get_parameter(
            "/prod/homebiyori/stripe/yearly_price_id", 
            default_value="price_1YearlyPlan"
        )
    
    return None


# レガシー変換関数削除: あるべき姿での完全統一を実施
# PlanTypeは完全にSubscriptionPlanに置き換え
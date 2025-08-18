"""
billing-service Lambda FastAPIアプリケーション

■システム概要■
Homebiyori（ほめびより）の課金システム。
Stripe連携による安全で信頼性の高いサブスクリプション管理と、
JST時刻統一、DynamoDB効率的保存を提供。

■主要機能■
1. サブスクリプション作成・管理
2. 支払い方法管理
3. 課金履歴取得
4. Stripe課金ポータル連携
5. プラン変更処理
6. キャンセル処理

■アーキテクチャ■
- AWS Lambda (Python 3.11, 512MB, 30秒)
- FastAPI + Mangum
- Lambda Layers: homebiyori-common-layer
- 認証: API Gateway + Cognito Authorizer
- 外部API: Stripe API
- データストア: DynamoDB 7テーブル構成 (prod-homebiyori-subscriptions)

■セキュリティ■
JWT認証必須、Stripe署名検証、入力値検証、レート制限
"""

from fastapi import FastAPI, HTTPException, Request, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import os
import asyncio
from datetime import datetime, timedelta
import pytz
import stripe

# Lambda Layers からの共通機能インポート
from homebiyori_common.auth import get_user_id_from_event
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import (
    ValidationError,
    AuthenticationError,
    DatabaseError,
    MaintenanceError,
    ExternalServiceError
)
from homebiyori_common.utils.maintenance import is_maintenance_mode
from homebiyori_common.middleware import maintenance_check_middleware, get_current_user_id, error_handling_middleware

# アクセス制御ミドルウェア
from homebiyori_common.middleware import require_basic_access

# ローカルモジュール
from .models import (
    UserSubscription,
    PaymentHistory,
    CreateSubscriptionRequest,
    CreateSubscriptionResponse,
    CancelSubscriptionRequest,
    UpdatePaymentMethodRequest,
    BillingPortalRequest,
    BillingPortalResponse,
    SubscriptionAnalytics,
    SubscriptionPlan,
    SubscriptionStatus,
    PaymentStatus,
    get_current_jst,
    to_jst_string,
    get_unified_ttl_days,
    get_plan_price,
    get_stripe_price_id,
    is_active_subscription,
    PLAN_CONFIGS,
    STRIPE_CONFIG,
    BillingServiceError,
    StripeAPIError,
    PaymentFailedError,
    SubscriptionNotFoundError
)
from .database import get_billing_database
from .stripe_client import get_stripe_client

# 構造化ログ設定
logger = get_logger(__name__)

# FastAPIインスタンス作成
app = FastAPI(
    title="Billing Service API",
    description="Homebiyori 課金システム",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "prod" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "prod" else None
)

# データベース・Stripeクライアント
db = get_billing_database()
stripe_client = get_stripe_client()

# =====================================
# ミドルウェア・依存関数
# =====================================

# 共通ミドルウェアをLambda Layerから適用
app.middleware("http")(error_handling_middleware)
app.middleware("http")(maintenance_check_middleware)

# =====================================
# サブスクリプション管理エンドポイント
# =====================================

@app.get("/api/billing/subscription", response_model=UserSubscription)
@require_basic_access()
async def get_user_subscription(
    user_id: str = Depends(get_current_user_id)
):
    """
    ユーザーのサブスクリプション状態取得
    
    Returns:
        UserSubscription: サブスクリプション情報
    """
    try:
        logger.info(f"サブスクリプション状態取得開始: user_id={user_id}")
        
        # ユーザーのサブスクリプション情報を取得
        subscription = await db.get_user_subscription(user_id)
        
        if not subscription:
            # 初回アクセス時：トライアルプランのサブスクリプション作成
            current_time = get_current_jst()
            
            # Parameter Storeからトライアル期間を取得
            from homebiyori_common.utils.parameter_store import get_parameter
            trial_duration_days = int(get_parameter(
                "/prod/homebiyori/trial/duration_days", 
                default_value="7"
            ))
            
            trial_end_date = current_time + timedelta(days=trial_duration_days)
            
            subscription = UserSubscription(
                user_id=user_id,
                current_plan=SubscriptionPlan.TRIAL,
                status=SubscriptionStatus.ACTIVE,
                current_period_start=current_time,
                current_period_end=trial_end_date,
                trial_start_date=current_time,
                trial_end_date=trial_end_date,
                ttl_days=get_unified_ttl_days()
            )
            await db.save_user_subscription(subscription)
            logger.info(f"新規トライアルプラン作成: user_id={user_id}, trial_end={trial_end_date}")
        
        # Stripeと状態同期（プレミアムプランの場合）
        if subscription.subscription_id:
            updated_subscription = await stripe_client.sync_subscription_status(subscription)
            if updated_subscription:
                await db.save_user_subscription(updated_subscription)
                subscription = updated_subscription
        
        logger.info(f"サブスクリプション状態取得完了: user_id={user_id}, plan={subscription.current_plan}")
        return subscription
        
    except Exception as e:
        logger.error(f"サブスクリプション状態取得エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="サブスクリプション状態の取得に失敗しました")

@app.get("/api/billing/trial-status")
@require_basic_access()
async def get_trial_status(user_id: str = Depends(get_current_user_id)):
    """
    トライアル状態確認API（新戦略）
    
    ■機能概要■
    - ユーザーのトライアル期間残り日数を確認
    - 期限切れ処理が必要な場合は自動実行
    - フロントエンド側での期限表示・課金誘導に使用
    
    ■レスポンス■
    - 200: トライアル状態情報
    - 401: 認証エラー
    - 500: 内部エラー
    """
    try:
        logger.info(f"トライアル状態確認開始: user_id={user_id}")
        
        # トライアル状態チェック
        trial_status = await db.check_trial_status(user_id)
        
        # 期限切れ処理が必要な場合は実行
        if trial_status["needs_expiration"]:
            await db.expire_trial_subscription(user_id)
            # 状態を再取得
            trial_status = await db.check_trial_status(user_id)
            logger.info(f"トライアル期間終了処理完了: user_id={user_id}")
        
        return {
            "trial_status": trial_status,
            "current_time": get_current_jst().isoformat()
        }
        
    except Exception as e:
        logger.error(f"トライアル状態確認エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="トライアル状態の確認に失敗しました")

@app.get("/api/billing/access-control")
@require_basic_access()
async def check_user_access(user_id: str = Depends(get_current_user_id)):
    """
    ユーザーアクセス制御チェックAPI（新戦略）
    
    ■機能概要■
    - ユーザーのアクセス許可レベルを判定
    - トライアル期間終了ユーザーの制限実施
    - フロントエンド側でのルーティング制御に使用
    
    ■アクセスレベル■
    - full: 全機能アクセス可能
    - billing_only: 課金関連のみアクセス可能
    - none: アクセス拒否
    
    ■レスポンス■
    - 200: アクセス制御情報
    - 401: 認証エラー
    - 500: 内部エラー
    """
    try:
        logger.info(f"アクセス制御チェック開始: user_id={user_id}")
        
        # アクセス許可状態チェック
        access_info = await db.check_user_access_allowed(user_id)
        
        # 期限切れ処理が必要な場合（trial_status内で実行済み）
        if access_info["restriction_reason"] == "trial_expired":
            # 既にexpire_trial_subscriptionが実行されているのでログのみ
            logger.info(f"トライアル期間終了ユーザーのアクセス制限: user_id={user_id}")
        
        return {
            "access_control": access_info,
            "current_time": get_current_jst().isoformat()
        }
        
    except Exception as e:
        logger.error(f"アクセス制御チェックエラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="アクセス制御の確認に失敗しました")

@app.get("/api/billing/subscription-guidance")
@require_basic_access()
async def get_subscription_guidance(user_id: str = Depends(get_current_user_id)):
    """
    サブスクリプション課金誘導API（新戦略）
    
    ■機能概要■
    - トライアル期間終了ユーザー向けの課金誘導情報提供
    - Stripeチェックアウトセッション作成
    - プラン選択肢・価格情報・特典説明
    
    ■表示戦略■
    - 初回300円（プロモーションコード適用）
    - 2ヶ月目以降580円/月
    - 年額プラン5,800円（1ヶ月分お得）
    
    ■レスポンス■
    - 200: 課金誘導情報
    - 401: 認証エラー  
    - 500: 内部エラー
    """
    try:
        logger.info(f"課金誘導情報取得開始: user_id={user_id}")
        
        # ユーザーの現在の状態確認
        subscription = await db.get_user_subscription(user_id)
        trial_status = await db.check_trial_status(user_id)
        access_info = await db.check_user_access_allowed(user_id)
        
        # プラン情報構築
        plan_options = []
        
        # 月額プラン（初回300円キャンペーン）
        monthly_plan = {
            "plan_id": SubscriptionPlan.MONTHLY.value,
            "name": PLAN_CONFIGS[SubscriptionPlan.MONTHLY]["name"],
            "price": PLAN_CONFIGS[SubscriptionPlan.MONTHLY]["price"],
            "special_price": 300,  # 初回特別価格
            "is_promotion": True,
            "promotion_description": "初回のみ300円でお試し！2ヶ月目以降は月額580円",
            "billing_cycle": "monthly",
            "features": [
                "全ての褒め機能が使い放題",
                "180日間のチャット履歴保存",
                "3つのAIキャラクター",
                "木の成長ビジュアライゼーション",
                "いつでもキャンセル可能"
            ]
        }
        plan_options.append(monthly_plan)
        
        # 年額プラン（1ヶ月分お得）
        yearly_plan = {
            "plan_id": SubscriptionPlan.YEARLY.value,
            "name": PLAN_CONFIGS[SubscriptionPlan.YEARLY]["name"],
            "price": PLAN_CONFIGS[SubscriptionPlan.YEARLY]["price"],
            "monthly_equivalent": 5800 // 12,  # 月割り計算
            "is_promotion": False,
            "savings_description": "月額プランより年間1,160円お得！",
            "billing_cycle": "yearly",
            "features": [
                "月額プランの全機能",
                "年額払いで1ヶ月分お得",
                "長期利用でより安心"
            ]
        }
        plan_options.append(yearly_plan)
        
        # トライアル情報
        trial_info = {
            "is_trial_active": trial_status.get("is_trial_active", False),
            "days_remaining": trial_status.get("days_remaining", 0),
            "trial_end_date": trial_status.get("trial_end_date"),
            "has_expired": trial_status.get("days_remaining", 0) <= 0
        }
        
        # 課金誘導メッセージ
        guidance_message = {
            "title": "継続してほめびよりをご利用ください",
            "description": "トライアル期間が終了しました。引き続きAIからの優しい褒めの言葉を受け取るために、プレミアムプランにアップグレードしませんか？",
            "benefits": [
                "毎日の育児を優しく褒めてくれるAI",
                "3つの個性豊かなキャラクター",
                "あなたの成長を可視化する木の育成",
                "180日分の思い出を保存"
            ]
        }
        
        response_data = {
            "guidance_message": guidance_message,
            "trial_info": trial_info,
            "plan_options": plan_options,
            "access_info": access_info,
            "next_steps": {
                "primary_action": "プランを選択",
                "secondary_action": "しばらく検討する",
                "billing_portal_available": subscription and subscription.customer_id is not None
            }
        }
        
        logger.info(f"課金誘導情報取得完了: user_id={user_id}, has_expired={trial_info['has_expired']}")
        return response_data
        
    except Exception as e:
        logger.error(f"課金誘導情報取得エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="課金誘導情報の取得に失敗しました")

@app.post("/api/billing/checkout-session")
@require_basic_access()
async def create_checkout_session(
    request: CreateSubscriptionRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Stripeチェックアウトセッション作成API（新戦略）
    
    ■機能概要■
    - プラン選択後のStripe決済画面への誘導
    - 初回300円プロモーションコード自動適用
    - 成功・キャンセル時のリダイレクト設定
    
    ■対応プラン■
    - monthly: 初回300円、2ヶ月目以降580円
    - yearly: 5,800円（一括払い）
    
    ■レスポンス■
    - 200: チェックアウトセッションURL
    - 400: 無効なプラン・パラメータ
    - 500: 内部エラー
    """
    try:
        logger.info(f"チェックアウトセッション作成開始: user_id={user_id}, plan={request.plan}")
        
        # トライアルプランは無効
        if request.plan == SubscriptionPlan.TRIAL:
            raise HTTPException(status_code=400, detail="トライアルプランはチェックアウト対象外です")
        
        # プラン有効性確認
        stripe_price_id = get_stripe_price_id(request.plan)
        if not stripe_price_id:
            raise ValidationError(f"サポートされていないプラン: {request.plan}")
        
        # 既存サブスクリプション確認
        subscription = await db.get_user_subscription(user_id)
        
        # Stripe顧客作成または取得
        customer_id = await stripe_client.get_or_create_customer(user_id)
        
        # プロモーションコード設定（Parameter Store対応）
        promotion_codes = []
        if request.plan == SubscriptionPlan.MONTHLY:
            # Parameter Storeから初回プロモーションコード取得
            from homebiyori_common.utils.parameter_store import get_parameter
            promo_code = get_parameter(
                "/prod/homebiyori/stripe/first_month_promo_code",
                default_value="promo_first_month_300yen"
            )
            if promo_code and promo_code != "promo_first_month_300yen_placeholder":
                promotion_codes = [promo_code]
        
        # チェックアウトセッション作成
        checkout_session = await stripe_client.create_checkout_session(
            customer_id=customer_id,
            price_id=stripe_price_id,
            success_url=f"{os.getenv('FRONTEND_URL', 'https://homebiyori.com')}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.getenv('FRONTEND_URL', 'https://homebiyori.com')}/billing/subscribe",
            promotion_codes=promotion_codes
        )
        
        logger.info(f"チェックアウトセッション作成完了: user_id={user_id}, session_id={checkout_session['id']}")
        
        return {
            "checkout_url": checkout_session["url"],
            "session_id": checkout_session["id"],
            "plan": request.plan.value,
            "applied_promotions": promotion_codes
        }
        
    except ValidationError:
        raise
    except stripe.error.StripeError as e:
        logger.error(f"Stripeチェックアウトエラー: user_id={user_id}, error={e}")
        raise StripeAPIError(f"決済画面の作成でエラーが発生しました: {e.user_message}")
    except Exception as e:
        logger.error(f"チェックアウトセッション作成エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="決済画面の作成に失敗しました")

@app.get("/api/billing/subscription-benefits")
async def get_subscription_benefits():
    """
    サブスクリプション特典情報API
    
    ■機能概要■
    - 有料プランの特典・機能説明
    - フリートライアルとの比較表示
    - 新戦略での統一体験説明
    
    ■レスポンス■
    - 200: 特典情報
    """
    try:
        logger.info("サブスクリプション特典情報取得")
        
        benefits_info = {
            "premium_features": {
                "ai_interactions": {
                    "title": "AIキャラクターとの無制限会話",
                    "description": "3つの個性豊かなAIキャラクター（たまさん、まどか姉さん、ヒデじい）との会話が無制限",
                    "icon": "💬"
                },
                "long_term_storage": {
                    "title": "180日間の思い出保存",
                    "description": "あなたの育児の記録を180日間保存。過去の成長を振り返ることができます",
                    "icon": "💾"
                },
                "tree_visualization": {
                    "title": "成長の木ビジュアライゼーション",
                    "description": "あなたの育児努力を美しい木の成長として可視化",
                    "icon": "🌳"
                },
                "personalized_praise": {
                    "title": "パーソナライズされた褒め",
                    "description": "AIがあなたの育児スタイルを学習し、より適切な褒めの言葉をお送りします",
                    "icon": "✨"
                }
            },
            "plan_comparison": {
                "trial": {
                    "name": "無料トライアル",
                    "duration": "7日間",
                    "price": "無料",
                    "features": ["全機能体験可能", "期間限定"]
                },
                "premium": {
                    "name": "プレミアムプラン",
                    "duration": "継続利用",
                    "price": "月額580円〜",
                    "features": ["全機能利用可能", "180日保存", "継続サポート"]
                }
            },
            "success_stories": [
                {
                    "comment": "毎日の育児が大変でしたが、AIからの優しい言葉で自信を取り戻せました",
                    "user_type": "0歳児のママ"
                },
                {
                    "comment": "木が成長していく様子を見るのが楽しみになり、育児に前向きになれました",
                    "user_type": "2歳児のパパ"
                }
            ]
        }
        
        return benefits_info
        
    except Exception as e:
        logger.error(f"サブスクリプション特典情報取得エラー: {e}")
        raise HTTPException(status_code=500, detail="特典情報の取得に失敗しました")

@app.post("/api/billing/checkout-success")
@require_basic_access()
async def handle_checkout_success(
    session_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    チェックアウト成功処理API（新戦略）
    
    ■機能概要■
    - Stripeチェックアウト成功後の処理
    - サブスクリプション情報のDynamoDB同期
    - トライアルからプレミアムへの移行処理
    
    ■処理フロー■
    1. セッション詳細取得
    2. サブスクリプション情報更新
    3. トライアル終了処理
    4. 成功応答返却
    
    ■レスポンス■
    - 200: 処理成功
    - 400: 無効なセッション
    - 500: 内部エラー
    """
    try:
        logger.info(f"チェックアウト成功処理開始: user_id={user_id}, session_id={session_id}")
        
        # セッション詳細取得
        checkout_session = await stripe_client.retrieve_checkout_session(session_id)
        
        if checkout_session["payment_status"] != "paid":
            raise HTTPException(status_code=400, detail="決済が完了していません")
        
        # サブスクリプション情報を取得
        stripe_subscription_id = checkout_session["subscription"]
        stripe_subscription = await stripe_client.get_subscription(stripe_subscription_id)
        
        # 現在のサブスクリプション取得
        current_subscription = await db.get_user_subscription(user_id)
        
        # 新しいサブスクリプション情報を構築
        # プラン判定
        price_id = stripe_subscription["items"]["data"][0]["price"]["id"]
        new_plan = SubscriptionPlan.MONTHLY  # デフォルト
        for plan, config in PLAN_CONFIGS.items():
            if config.get("stripe_price_id") == price_id:
                new_plan = plan
                break
        
        # サブスクリプション情報更新
        updated_subscription = UserSubscription(
            user_id=user_id,
            subscription_id=stripe_subscription["id"],
            customer_id=stripe_subscription["customer"],
            current_plan=new_plan,
            status=SubscriptionStatus(stripe_subscription["status"]),
            current_period_start=datetime.fromtimestamp(
                stripe_subscription["current_period_start"],
                tz=pytz.timezone('Asia/Tokyo')
            ),
            current_period_end=datetime.fromtimestamp(
                stripe_subscription["current_period_end"],
                tz=pytz.timezone('Asia/Tokyo')
            ),
            ttl_days=get_unified_ttl_days(),
            created_at=current_subscription.created_at if current_subscription else get_current_jst(),
            updated_at=get_current_jst()
        )
        
        # トライアル期間情報も保持
        if current_subscription and current_subscription.trial_start_date:
            updated_subscription.trial_start_date = current_subscription.trial_start_date
            updated_subscription.trial_end_date = current_subscription.trial_end_date
        
        await db.save_user_subscription(updated_subscription)
        
        response_data = {
            "success": True,
            "message": "プレミアムプランへのアップグレードが完了しました",
            "subscription": {
                "plan": new_plan.value,
                "status": updated_subscription.status.value,
                "current_period_end": updated_subscription.current_period_end.isoformat(),
                "features_unlocked": [
                    "無制限のAI会話",
                    "180日間のデータ保存",
                    "全機能へのアクセス"
                ]
            },
            "next_steps": {
                "dashboard_url": "/dashboard",
                "billing_portal_url": "/billing/manage"
            }
        }
        
        logger.info(f"チェックアウト成功処理完了: user_id={user_id}, new_plan={new_plan}")
        return response_data
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripeチェックアウト成功処理エラー: user_id={user_id}, error={e}")
        raise StripeAPIError(f"決済確認でエラーが発生しました: {e.user_message}")
    except Exception as e:
        logger.error(f"チェックアウト成功処理エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="アップグレード処理に失敗しました")

@app.get("/api/billing/subscription-status")
@require_basic_access()
async def get_detailed_subscription_status(user_id: str = Depends(get_current_user_id)):
    """
    詳細サブスクリプション状態API（新戦略）
    
    ■機能概要■
    - サブスクリプション詳細状態取得
    - トライアル情報・アクセス制御・課金情報の統合提供
    - フロントエンド表示用の包括的な状態データ
    
    ■レスポンス■
    - 200: 詳細状態情報
    - 401: 認証エラー
    - 500: 内部エラー
    """
    try:
        logger.info(f"詳細サブスクリプション状態取得開始: user_id={user_id}")
        
        # 関連情報を並行取得
        subscription = await db.get_user_subscription(user_id)
        trial_status = await db.check_trial_status(user_id)
        access_info = await db.check_user_access_allowed(user_id)
        
        # 基本状態情報
        status_info = {
            "subscription": subscription.dict() if subscription else None,
            "trial_status": trial_status,
            "access_control": access_info,
            "plan_details": {
                "current_plan": subscription.current_plan.value if subscription else "trial",
                "plan_name": PLAN_CONFIGS.get(subscription.current_plan, {}).get("name", "Unknown") if subscription else "トライアル",
                "is_trial": subscription.current_plan == SubscriptionPlan.TRIAL if subscription else True,
                "is_premium": subscription.current_plan in [SubscriptionPlan.MONTHLY, SubscriptionPlan.YEARLY] if subscription else False
            }
        }
        
        # 課金情報（プレミアムユーザーのみ）
        if subscription and subscription.current_plan in [SubscriptionPlan.MONTHLY, SubscriptionPlan.YEARLY]:
            try:
                # 支払い履歴の最新分を取得
                payment_history = await db.get_payment_history(user_id, limit=3)
                status_info["billing_info"] = {
                    "next_billing_date": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
                    "recent_payments": [payment.dict() for payment in payment_history.get("items", [])],
                    "billing_portal_available": True
                }
            except Exception:
                # 支払い履歴取得エラーは無視
                status_info["billing_info"] = {
                    "billing_portal_available": True
                }
        
        # アクション推奨
        recommendations = []
        if not access_info.get("access_allowed", True):
            recommendations.append({
                "type": "upgrade_required",
                "title": "プレミアムプランにアップグレード",
                "description": "トライアル期間が終了しました。継続してご利用いただくにはアップグレードが必要です。",
                "action_url": "/billing/subscribe"
            })
        elif trial_status.get("days_remaining", 0) <= 3 and trial_status.get("is_trial_active", False):
            recommendations.append({
                "type": "trial_ending",
                "title": "トライアル期間終了間近",
                "description": f"あと{trial_status.get('days_remaining')}日でトライアルが終了します。",
                "action_url": "/billing/subscribe"
            })
        
        status_info["recommendations"] = recommendations
        status_info["timestamp"] = get_current_jst().isoformat()
        
        logger.info(f"詳細サブスクリプション状態取得完了: user_id={user_id}")
        return status_info
        
    except Exception as e:
        logger.error(f"詳細サブスクリプション状態取得エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="サブスクリプション状態の取得に失敗しました")

@app.post("/api/billing/subscription", response_model=CreateSubscriptionResponse)
@require_basic_access()
async def create_subscription(
    request: CreateSubscriptionRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id)
):
    """
    サブスクリプション作成
    
    Args:
        request: サブスクリプション作成リクエスト
    
    Returns:
        CreateSubscriptionResponse: 作成結果
    """
    try:
        logger.info(f"サブスクリプション作成開始: user_id={user_id}, plan={request.plan}")
        
        # トライアルプランの場合は簡単処理
        if request.plan == SubscriptionPlan.TRIAL:
            current_time = get_current_jst()
            
            # Parameter Storeからトライアル期間を取得
            from homebiyori_common.utils.parameter_store import get_parameter
            trial_duration_days = int(get_parameter(
                "/prod/homebiyori/trial/duration_days", 
                default_value="7"
            ))
            
            trial_end_date = current_time + timedelta(days=trial_duration_days)
            
            subscription = UserSubscription(
                user_id=user_id,
                current_plan=SubscriptionPlan.TRIAL,
                status=SubscriptionStatus.ACTIVE,
                current_period_start=current_time,
                current_period_end=trial_end_date,
                trial_start_date=current_time,
                trial_end_date=trial_end_date,
                ttl_days=get_unified_ttl_days()
            )
            await db.save_user_subscription(subscription)
            
            return CreateSubscriptionResponse(
                subscription_id="trial_plan",
                status=SubscriptionStatus.ACTIVE,
                current_period_end=trial_end_date
            )
        
        # プレミアムプランの場合：Stripe処理
        stripe_price_id = get_stripe_price_id(request.plan)
        if not stripe_price_id:
            raise ValidationError(f"サポートされていないプラン: {request.plan}")
        
        # Stripe顧客作成または取得
        customer_id = await stripe_client.get_or_create_customer(user_id)
        
        # Stripeサブスクリプション作成
        stripe_subscription = await stripe_client.create_subscription(
            customer_id=customer_id,
            price_id=stripe_price_id,
            payment_method_id=request.payment_method_id
        )
        
        # DynamoDBにサブスクリプション情報保存
        subscription = UserSubscription(
            user_id=user_id,
            subscription_id=stripe_subscription["id"],
            customer_id=customer_id,
            current_plan=request.plan,
            status=SubscriptionStatus(stripe_subscription["status"]),
            current_period_start=datetime.fromtimestamp(
                stripe_subscription["current_period_start"], 
                tz=pytz.timezone('Asia/Tokyo')
            ),
            current_period_end=datetime.fromtimestamp(
                stripe_subscription["current_period_end"], 
                tz=pytz.timezone('Asia/Tokyo')
            ),
            ttl_days=get_unified_ttl_days()
        )
        
        await db.save_user_subscription(subscription)
        
        # バックグラウンドでTTL更新処理をスケジュール
        background_tasks.add_task(
            schedule_ttl_update,
            user_id=user_id,
            old_plan=SubscriptionPlan.TRIAL,
            new_plan=request.plan
        )
        
        # レスポンス作成
        response = CreateSubscriptionResponse(
            subscription_id=stripe_subscription["id"],
            client_secret=stripe_subscription.get("latest_invoice", {}).get("payment_intent", {}).get("client_secret"),
            status=SubscriptionStatus(stripe_subscription["status"]),
            current_period_end=subscription.current_period_end
        )
        
        logger.info(f"サブスクリプション作成完了: user_id={user_id}, subscription_id={stripe_subscription['id']}")
        return response
        
    except ValidationError:
        raise
    except stripe.error.StripeError as e:
        logger.error(f"Stripeエラー: user_id={user_id}, error={e}")
        raise StripeAPIError(f"決済処理でエラーが発生しました: {e.user_message}")
    except Exception as e:
        logger.error(f"サブスクリプション作成エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="サブスクリプションの作成に失敗しました")

@app.post("/api/billing/subscription/cancel")
@require_basic_access()
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id)
):
    """
    サブスクリプションキャンセル
    
    Args:
        request: キャンセルリクエスト
    
    Returns:
        dict: キャンセル結果
    """
    try:
        logger.info(f"サブスクリプションキャンセル開始: user_id={user_id}")
        
        # 現在のサブスクリプション取得
        subscription = await db.get_user_subscription(user_id)
        if not subscription or not subscription.subscription_id:
            raise SubscriptionNotFoundError("アクティブなサブスクリプションが見つかりません")
        
        # Stripeでキャンセル処理
        if subscription.subscription_id != "trial_plan":
            updated_stripe_subscription = await stripe_client.cancel_subscription(
                subscription.subscription_id,
                cancel_at_period_end=request.cancel_at_period_end
            )
            
            # DynamoDB更新
            subscription.status = SubscriptionStatus(updated_stripe_subscription["status"])
            subscription.cancel_at_period_end = updated_stripe_subscription.get("cancel_at_period_end", False)
            if updated_stripe_subscription.get("canceled_at"):
                subscription.canceled_at = datetime.fromtimestamp(
                    updated_stripe_subscription["canceled_at"],
                    tz=pytz.timezone('Asia/Tokyo')
                )
            subscription.updated_at = get_current_jst()
            
            await db.save_user_subscription(subscription)
        
        # キャンセル理由記録
        if request.cancellation_reason:
            await db.record_cancellation_reason(user_id, request.cancellation_reason)
        
        # 期間終了時キャンセルの場合、TTL更新をスケジュール
        if request.cancel_at_period_end and subscription.current_period_end:
            background_tasks.add_task(
                schedule_ttl_update_on_cancellation,
                user_id=user_id,
                cancellation_date=subscription.current_period_end
            )
        
        logger.info(f"サブスクリプションキャンセル完了: user_id={user_id}")
        return {
            "success": True,
            "message": "サブスクリプションをキャンセルしました",
            "cancel_at_period_end": request.cancel_at_period_end,
            "effective_until": subscription.current_period_end.isoformat() if subscription.current_period_end else None
        }
        
    except SubscriptionNotFoundError:
        raise HTTPException(status_code=404, detail="アクティブなサブスクリプションが見つかりません")
    except stripe.error.StripeError as e:
        logger.error(f"Stripeキャンセルエラー: user_id={user_id}, error={e}")
        raise StripeAPIError(f"キャンセル処理でエラーが発生しました: {e.user_message}")
    except Exception as e:
        logger.error(f"サブスクリプションキャンセルエラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="サブスクリプションのキャンセルに失敗しました")

# =====================================
# 支払い方法管理エンドポイント
# =====================================

@app.put("/api/billing/payment-method")
@require_basic_access()
async def update_payment_method(
    request: UpdatePaymentMethodRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    支払い方法更新
    
    Args:
        request: 支払い方法更新リクエスト
    
    Returns:
        dict: 更新結果
    """
    try:
        logger.info(f"支払い方法更新開始: user_id={user_id}")
        
        # サブスクリプション取得
        subscription = await db.get_user_subscription(user_id)
        if not subscription or not subscription.customer_id:
            raise SubscriptionNotFoundError("アクティブなサブスクリプションが見つかりません")
        
        # Stripeで支払い方法更新
        await stripe_client.update_payment_method(
            customer_id=subscription.customer_id,
            payment_method_id=request.payment_method_id
        )
        
        logger.info(f"支払い方法更新完了: user_id={user_id}")
        return {
            "success": True,
            "message": "支払い方法を更新しました"
        }
        
    except SubscriptionNotFoundError:
        raise HTTPException(status_code=404, detail="アクティブなサブスクリプションが見つかりません")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe支払い方法更新エラー: user_id={user_id}, error={e}")
        raise StripeAPIError(f"支払い方法の更新でエラーが発生しました: {e.user_message}")
    except Exception as e:
        logger.error(f"支払い方法更新エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="支払い方法の更新に失敗しました")

# =====================================
# 課金履歴・統計エンドポイント
# =====================================

@app.get("/api/billing/history", response_model=List[PaymentHistory])
@require_basic_access()
async def get_payment_history(
    limit: int = 20,
    next_token: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """
    支払い履歴取得
    
    Args:
        limit: 取得件数制限
        next_token: ページネーショントークン
    
    Returns:
        List[PaymentHistory]: 支払い履歴リスト
    """
    try:
        logger.info(f"支払い履歴取得開始: user_id={user_id}")
        
        # 支払い履歴を取得
        history_data = await db.get_payment_history(
            user_id=user_id,
            limit=min(limit, 100),
            next_token=next_token
        )
        
        logger.info(f"支払い履歴取得完了: user_id={user_id}, count={len(history_data['items'])}")
        return history_data["items"]
        
    except Exception as e:
        logger.error(f"支払い履歴取得エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="支払い履歴の取得に失敗しました")

@app.post("/api/billing/portal", response_model=BillingPortalResponse)
@require_basic_access()
async def create_billing_portal_session(
    request: BillingPortalRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Stripe課金ポータルセッション作成
    
    Args:
        request: ポータルセッション作成リクエスト
    
    Returns:
        BillingPortalResponse: ポータルURL
    """
    try:
        logger.info(f"課金ポータルセッション作成開始: user_id={user_id}")
        
        # サブスクリプション取得
        subscription = await db.get_user_subscription(user_id)
        if not subscription or not subscription.customer_id:
            raise SubscriptionNotFoundError("アクティブなサブスクリプションが見つかりません")
        
        # Stripe課金ポータルセッション作成
        portal_session = await stripe_client.create_billing_portal_session(
            customer_id=subscription.customer_id,
            return_url=request.return_url
        )
        
        logger.info(f"課金ポータルセッション作成完了: user_id={user_id}")
        return BillingPortalResponse(portal_url=portal_session["url"])
        
    except SubscriptionNotFoundError:
        raise HTTPException(status_code=404, detail="アクティブなサブスクリプションが見つかりません")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe課金ポータルエラー: user_id={user_id}, error={e}")
        raise StripeAPIError(f"課金ポータルの作成でエラーが発生しました: {e.user_message}")
    except Exception as e:
        logger.error(f"課金ポータルセッション作成エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="課金ポータルセッションの作成に失敗しました")

# =====================================
# バックグラウンドタスク
# =====================================

async def schedule_ttl_update(user_id: str, old_plan: SubscriptionPlan, new_plan: SubscriptionPlan):
    """TTL更新をSQSにスケジュール"""
    try:
        # SQSメッセージ送信（ttl-updater Lambdaが処理）
        message = {
            "user_id": user_id,
            "old_plan": old_plan.value,
            "new_plan": new_plan.value,
            "timestamp": get_current_jst().isoformat()
        }
        
        # TODO: SQS送信実装
        logger.info(f"TTL更新スケジュール: user_id={user_id}, {old_plan} -> {new_plan}")
        
    except Exception as e:
        logger.error(f"TTL更新スケジュールエラー: user_id={user_id}, error={e}")

async def schedule_ttl_update_on_cancellation(user_id: str, cancellation_date: datetime):
    """キャンセル時のTTL更新をスケジュール"""
    try:
        message = {
            "user_id": user_id,
            "action": "cancel",
            "cancellation_date": cancellation_date.isoformat(),
            "timestamp": get_current_jst().isoformat()
        }
        
        # TODO: SQS送信実装
        logger.info(f"キャンセル時TTL更新スケジュール: user_id={user_id}")
        
    except Exception as e:
        logger.error(f"キャンセル時TTL更新スケジュールエラー: user_id={user_id}, error={e}")

# =====================================
# ヘルスチェック
# =====================================

@app.get("/api/billing/health")
async def health_check():
    """ヘルスチェック"""
    try:
        # データベース接続確認
        await db.health_check()
        
        # Stripe接続確認
        await stripe_client.health_check()
        
        return {
            "status": "healthy",
            "service": "billing_service",
            "timestamp": get_current_jst().isoformat(),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"ヘルスチェック失敗: {e}")
        raise HTTPException(status_code=503, detail="サービスが利用できません")

# =====================================
# 注意: Webhook処理について
# =====================================
# 
# Stripe Webhook処理は webhook_service で一元管理されています。
# billing_serviceではWebhook処理を行わず、以下の責任分離を行っています：
#
# - billing_service: サブスクリプション作成・管理・課金ロジック
# - webhook_service: Stripe Webhookイベントの受信・処理・状態同期
#
# この設計により：
# 1. マイクロサービス設計原則の遵守
# 2. 重複コードの削除
# 3. 保守性・拡張性の向上
# を実現しています。

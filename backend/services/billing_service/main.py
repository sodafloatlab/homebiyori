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

from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import os
from datetime import datetime, timedelta
import pytz
import stripe

# Lambda Layers からの共通機能インポート
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import DatabaseError, ExternalServiceError

# アクセス制御ミドルウェア
from homebiyori_common.middleware import require_basic_access, get_current_user_id

# ローカルモジュール
from .models import (
    UserSubscription,
    CreateSubscriptionRequest,
    CancelSubscriptionRequest,
    CancelSubscriptionResponse,
    BillingPortalRequest,
    BillingPortalResponse,
    STRIPE_CONFIG
)

# 共通Layer統一インポート
from homebiyori_common.models import SubscriptionPlan, SubscriptionStatus
from homebiyori_common.utils.datetime_utils import get_current_jst, to_jst_string, get_jst_timezone
from homebiyori_common.utils.subscription_utils import (
    get_unified_ttl_days,
    get_plan_price,
    get_plan_name,
    get_stripe_price_id,
    is_active_subscription
)
from homebiyori_common.exceptions import (
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
                trial_end_date=trial_end_date
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

# subscription-guidanceエンドポイント削除
# 理由: 静的な課金誘導情報はフロントエンドで管理すべき
# フロントエンドでプラン情報・価格・特典を定義し、不要なAPI呼び出しを削減
# 削除日: 2024-08-22

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
        
        # 有料プランのみチェックアウト対象
        # トライアルユーザーが有料プラン（MONTHLY/YEARLY）を選択する場合はOK
        if request.plan == SubscriptionPlan.TRIAL:
            raise HTTPException(status_code=400, detail="チェックアウトは有料プラン（月額・年額）のみ対象です")
        
        # プラン有効性確認
        stripe_price_id = get_stripe_price_id(request.plan)
        if not stripe_price_id:
            raise HTTPException(status_code=400, detail=f"サポートされていないプラン: {request.plan}")
        
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
            homebiyori_user_id=user_id,
            plan_type=request.plan.value,  # プランタイプを確実に渡す
            promotion_codes=promotion_codes
        )
        
        logger.info(f"チェックアウトセッション作成完了: user_id={user_id}, session_id={checkout_session['id']}")
        
        return {
            "checkout_url": checkout_session["url"],
            "session_id": checkout_session["id"],
            "plan": request.plan.value,
            "applied_promotions": promotion_codes
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripeチェックアウトエラー: user_id={user_id}, error={e}")
        raise StripeAPIError(f"決済画面の作成でエラーが発生しました: {e.user_message}")
    except Exception as e:
        logger.error(f"チェックアウトセッション作成エラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="決済画面の作成に失敗しました")

# subscription-benefitsエンドポイント削除
# 理由: 静的な特典情報はフロントエンドで管理すべき
# AIキャラクター説明・プラン比較・成功事例等はフロントエンドで定義し、
# 不要なAPI呼び出しを削減してパフォーマンス向上を図る
# 削除日: 2024-08-22

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
    3. 成功応答返却
    
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
        # プラン判定（Stripe Price IDから）
        price_id = stripe_subscription["items"]["data"][0]["price"]["id"]
        new_plan = SubscriptionPlan.MONTHLY  # デフォルト
        
        # get_stripe_price_idで逆引き
        if price_id == get_stripe_price_id(SubscriptionPlan.MONTHLY):
            new_plan = SubscriptionPlan.MONTHLY
        elif price_id == get_stripe_price_id(SubscriptionPlan.YEARLY):
            new_plan = SubscriptionPlan.YEARLY
        
        # サブスクリプション情報更新
        # 注意: トライアル→有料移行時はトライアル情報をクリア（状態変更の明確化）
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
            # トライアル情報はNullで明示的にクリア（有料プラン移行完了）
            trial_start_date=None,
            trial_end_date=None,
            created_at=current_subscription.created_at if current_subscription else get_current_jst(),
            updated_at=get_current_jst()
        )
        
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
    - トライアル情報・課金情報の統合提供
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
        
        # 基本状態情報
        status_info = {
            "subscription": subscription.model_dump() if subscription else None,
            "trial_status": trial_status,
            "plan_details": {
                "current_plan": subscription.current_plan.value if subscription else "trial",
                "plan_name": get_plan_name(subscription.current_plan) if subscription else "トライアル",
                "is_trial": subscription.current_plan == SubscriptionPlan.TRIAL if subscription else True,
                "is_premium": subscription.current_plan in [SubscriptionPlan.MONTHLY, SubscriptionPlan.YEARLY] if subscription else False
            }
        }
        
        # 課金情報（プレミアムユーザーのみ） - Stripe Customer Portal方式
        if subscription and subscription.current_plan in [SubscriptionPlan.MONTHLY, SubscriptionPlan.YEARLY]:
            status_info["billing_info"] = {
                "next_billing_date": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
                "billing_portal_available": True
            }
        
        # アクション推奨（トライアル期間終了間近の場合のみ）
        recommendations = []
        if trial_status.get("days_remaining", 0) <= 3 and trial_status.get("is_trial_active", False):
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

# create_subscription エンドポイント削除（2024-08-22）
# 理由: StripeCheckout方式に統一。Elements用のサブスクリプション作成APIは不要
# Checkoutでは create_checkout_session → handle_checkout_success の流れで処理

@app.post("/api/billing/cancel-subscription")
@require_basic_access()
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    サブスクリプションキャンセル（解約理由収集機能付き）
    
    ■方針説明■
    - Portal経由ではなくAPI実行でキャンセルを行う
    - 理由：解約理由の収集がサービス改善に重要なため
    - フロントエンドから分離されたフィールドを直接受信（design_database.md準拠）
    
    Args:
        request: キャンセルリクエスト（解約理由の個別フィールド含む）
    
    Returns:
        CancelSubscriptionResponse: キャンセル結果
    """
    try:
        logger.info(f"サブスクリプションキャンセル開始: user_id={user_id}")
        
        # 現在のサブスクリプション取得
        subscription = await db.get_user_subscription(user_id)
        if not subscription or not subscription.subscription_id:
            raise SubscriptionNotFoundError("アクティブなサブスクリプションが見つかりません")
        
        # 解約理由をfeedbackテーブルに保存（design_database.md準拠の個別フィールド）
        if request.reason_category or request.reason_text:
            # 利用期間計算（作成日からの日数）
            usage_duration_days = None
            if subscription.created_at:
                usage_duration_days = (get_current_jst() - subscription.created_at).days
            
            await db.record_cancellation_reason(
                user_id=user_id,
                subscription_id=subscription.subscription_id,
                reason_category=request.reason_category or "other",
                reason_text=request.reason_text,
                satisfaction_score=request.satisfaction_score,
                improvement_suggestions=request.improvement_suggestions,
                canceled_plan=subscription.current_plan.value,
                usage_duration_days=usage_duration_days
            )
            logger.info(f"解約理由保存完了: user_id={user_id}, category={request.reason_category}")
        
        # Stripe APIでサブスクリプションキャンセル
        canceled_subscription = await stripe_client.cancel_subscription(
            subscription.subscription_id,
            cancel_at_period_end=request.cancel_at_period_end
        )
        
        # DynamoDBの状態を更新
        subscription.status = SubscriptionStatus(canceled_subscription["status"])
        subscription.cancel_at_period_end = canceled_subscription.get("cancel_at_period_end", False)
        
        if canceled_subscription.get("canceled_at"):
            subscription.canceled_at = datetime.fromtimestamp(
                canceled_subscription["canceled_at"],
                tz=get_jst_timezone()
            )
        
        subscription.updated_at = get_current_jst()
        await db.save_user_subscription(subscription)
        
        logger.info(f"サブスクリプションキャンセル完了: user_id={user_id}, subscription_id={subscription.subscription_id}")
        
        return CancelSubscriptionResponse(
            success=True,
            message="サブスクリプションのキャンセルが完了しました",
            canceled_at=subscription.canceled_at,
            will_cancel_at_period_end=subscription.cancel_at_period_end
        )
        
    except SubscriptionNotFoundError:
        raise HTTPException(status_code=404, detail="アクティブなサブスクリプションが見つかりません")
    except stripe.error.StripeError as e:
        logger.error(f"Stripeキャンセルエラー: user_id={user_id}, error={e}")
        raise StripeAPIError(f"サブスクリプションキャンセルでエラーが発生しました: {e.user_message}")
    except Exception as e:
        logger.error(f"サブスクリプションキャンセルエラー: user_id={user_id}, error={e}")
        raise HTTPException(status_code=500, detail="サブスクリプションキャンセルに失敗しました")


# =====================================
# 支払い方法管理エンドポイント
# =====================================

# update_payment_method エンドポイント削除（2024-08-22）
# 理由: StripeCheckout方式に統一。支払い方法更新はPortal経由で管理
# ユーザーは create_billing_portal_session から Stripe Portal で支払い方法を管理

# =====================================
# 課金履歴エンドポイント
# =====================================

# PaymentHistory機能はwebhook_serviceに完全移管されました
# 移管日: 2024-08-22
# 
# ■責任分離後の役割■
# billing_service: サブスクリプション管理のみ（Stripe API呼び出し）
# webhook_service: PaymentHistory完全管理（Stripe Webhook受信）
#
# 詳細は design_database.md の責任分離セクションを参照してください

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

# get_payment_history削除（2024-08-22）
# 理由: design_database.mdに基づく責任分離実装
# PaymentHistory機能は完全にwebhook_serviceに移行
# 
# API移行:
# ❌ 削除: GET /api/billing/payment-history (billing_service)
# ✅ 移行先: GET /api/webhook/payment-history (webhook_service)
# 
# フロントエンドは新しいwebhook_serviceエンドポイントを使用すること

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
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
from homebiyori_common.utils.middleware import maintenance_check_middleware, get_current_user_id, error_handling_middleware

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
    calculate_ttl_for_plan,
    get_plan_price,
    get_stripe_price_id,
    is_active_subscription,
    should_apply_premium_benefits,
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
            # 初回アクセス時：フリープランのサブスクリプション作成
            subscription = UserSubscription(
                user_id=user_id,
                current_plan=SubscriptionPlan.FREE,
                status=SubscriptionStatus.ACTIVE,
                ttl_days=calculate_ttl_for_plan(SubscriptionPlan.FREE)
            )
            await db.save_user_subscription(subscription)
            logger.info(f"新規フリープラン作成: user_id={user_id}")
        
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

@app.post("/api/billing/subscription", response_model=CreateSubscriptionResponse)
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
        
        # フリープランの場合は簡単処理
        if request.plan == SubscriptionPlan.FREE:
            subscription = UserSubscription(
                user_id=user_id,
                current_plan=SubscriptionPlan.FREE,
                status=SubscriptionStatus.ACTIVE,
                ttl_days=calculate_ttl_for_plan(SubscriptionPlan.FREE)
            )
            await db.save_user_subscription(subscription)
            
            return CreateSubscriptionResponse(
                subscription_id="free_plan",
                status=SubscriptionStatus.ACTIVE,
                current_period_end=get_current_jst() + timedelta(days=365)  # フリープランは期限なし
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
            ttl_days=calculate_ttl_for_plan(request.plan)
        )
        
        await db.save_user_subscription(subscription)
        
        # バックグラウンドでTTL更新処理をスケジュール
        background_tasks.add_task(
            schedule_ttl_update,
            user_id=user_id,
            old_plan=SubscriptionPlan.FREE,
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
        if subscription.subscription_id != "free_plan":
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
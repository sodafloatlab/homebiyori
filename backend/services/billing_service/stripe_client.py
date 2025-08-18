"""
billing-service Stripe API クライアント

■システム概要■
Homebiyori（ほめびより）課金システムのStripe連携クライアント。
安全で信頼性の高いサブスクリプション管理と、
JST時刻統一、エラーハンドリング、リトライ機能を提供。

■Stripe連携機能■
1. 顧客管理（Customer CRUD）
2. サブスクリプション管理
3. 支払い方法管理
4. 課金ポータルセッション
5. Webhook署名検証
6. エラーハンドリング・リトライ

■セキュリティ■
- API キーの安全な管理
- Webhook署名検証
- 3Dセキュア対応
- PCI DSS準拠

■依存関係■
- stripe: Python Stripe SDK
- homebiyori-common-layer
"""

import os
import stripe
import asyncio
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
import pytz
import json
import boto3

# Lambda Layers からの共通機能インポート  
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import ExternalServiceError

# ローカルモジュール
from .models import (
    UserSubscription,
    SubscriptionPlan,
    SubscriptionStatus,
    PaymentStatus,
    get_current_jst,
    to_jst_string,
    StripeAPIError,
    PaymentFailedError
)

# 構造化ログ設定
logger = get_logger(__name__)

def get_parameter_store_value(parameter_name: str) -> str:
    """
    Parameter Store から値を取得（統一utils使用）
    
    Args:
        parameter_name: パラメータ名
        
    Returns:
        パラメータ値
        
    Raises:
        ValueError: パラメータが見つからない場合
    """
    try:
        from homebiyori_common.utils.parameter_store import get_parameter_store_client
        
        client = get_parameter_store_client()
        return client.get_parameter(parameter_name)
    except Exception as e:
        logger.error(f"Parameter Store値取得失敗: parameter={parameter_name}, error={str(e)}")
        raise ValueError(f"Failed to retrieve parameter {parameter_name}: {str(e)}")

class StripeClient:
    """
    Stripe API クライアント
    
    ■主要機能■
    1. 顧客（Customer）管理
    2. サブスクリプション作成・更新・キャンセル
    3. 支払い方法管理
    4. 課金ポータルセッション作成
    5. Webhook署名検証
    """
    
    def __init__(self, api_key: Optional[str] = None, webhook_secret: Optional[str] = None):
        """
        Stripeクライアント初期化（新戦略対応）
        
        Args:
            api_key: Stripe APIキー（Parameter Storeから取得）
            webhook_secret: Webhook署名検証用シークレット
        """
        # Parameter Store からStripe APIキー取得（新戦略）
        if not api_key:
            try:
                from homebiyori_common.utils.parameter_store import get_parameter
                stripe.api_key = get_parameter(
                    "/prod/homebiyori/stripe/api_key",
                    default_value=os.getenv("STRIPE_SECRET_KEY")
                )
            except Exception as e:
                logger.error(f"Stripe APIキーのParameter Store取得失敗: {str(e)}")
                # フォールバック: 環境変数から取得
                stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        else:
            stripe.api_key = api_key
        
        # Webhook secretの設定（新戦略）
        if not webhook_secret:
            try:
                from homebiyori_common.utils.parameter_store import get_parameter
                self.webhook_secret = get_parameter(
                    "/prod/homebiyori/stripe/webhook_secret",
                    default_value=os.getenv("STRIPE_WEBHOOK_SECRET")
                )
            except Exception as e:
                logger.warning(f"Stripe Webhook SecretのParameter Store取得失敗: {str(e)}")
                self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        else:
            self.webhook_secret = webhook_secret
        
        if not stripe.api_key:
            raise ValueError("Stripe API key is required (from Parameter Store or environment variable)")
        
        # API バージョン設定
        stripe.api_version = "2023-10-16"
        
        self.logger = get_logger(__name__)
        
        # リトライ設定
        self.max_retries = 3
        self.retry_delay = 1.0
    
    # =====================================
    # 顧客管理
    # =====================================
    
    async def get_or_create_customer(self, user_id: str, email: Optional[str] = None) -> str:
        """
        顧客を取得または作成
        
        Args:
            user_id: ユーザーID（Cognito sub）
            email: ユーザーメールアドレス（オプション）
            
        Returns:
            str: Stripe Customer ID
        """
        try:
            # 既存顧客を検索（metadata.user_idで検索）
            customers = await self._stripe_request(
                stripe.Customer.list,
                limit=1,
                metadata={"user_id": user_id}
            )
            
            if customers.data:
                customer_id = customers.data[0].id
                self.logger.info(f"既存顧客取得: user_id={user_id}, customer_id={customer_id}")
                return customer_id
            
            # 新規顧客作成
            customer_data = {
                "metadata": {"user_id": user_id},
                "description": f"Homebiyori User {user_id[:8]}"
            }
            
            if email:
                customer_data["email"] = email
            
            customer = await self._stripe_request(
                stripe.Customer.create,
                **customer_data
            )
            
            self.logger.info(f"新規顧客作成: user_id={user_id}, customer_id={customer.id}")
            return customer.id
            
        except stripe.error.StripeError as e:
            self.logger.error(f"顧客取得・作成エラー: user_id={user_id}, error={e}")
            raise StripeAPIError(f"顧客の取得・作成に失敗しました: {e.user_message}")
    
    # =====================================
    # サブスクリプション管理
    # =====================================
    
    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        payment_method_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        サブスクリプション作成
        
        Args:
            customer_id: Stripe Customer ID
            price_id: Stripe Price ID
            payment_method_id: 支払い方法ID（オプション）
            
        Returns:
            Dict: Stripeサブスクリプションオブジェクト
        """
        try:
            subscription_data = {
                "customer": customer_id,
                "items": [{"price": price_id}],
                "payment_behavior": "default_incomplete",
                "payment_settings": {
                    "save_default_payment_method": "on_subscription"
                },
                "expand": ["latest_invoice.payment_intent"]
            }
            
            # 支払い方法が指定されている場合
            if payment_method_id:
                subscription_data["default_payment_method"] = payment_method_id
            
            subscription = await self._stripe_request(
                stripe.Subscription.create,
                **subscription_data
            )
            
            self.logger.info(f"サブスクリプション作成完了: customer_id={customer_id}, subscription_id={subscription.id}")
            return subscription
            
        except stripe.error.StripeError as e:
            self.logger.error(f"サブスクリプション作成エラー: customer_id={customer_id}, error={e}")
            raise StripeAPIError(f"サブスクリプションの作成に失敗しました: {e.user_message}")
    
    async def get_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """
        サブスクリプション詳細取得
        
        Args:
            subscription_id: StripeサブスクリプションID
            
        Returns:
            Dict: Stripeサブスクリプションオブジェクト
        """
        try:
            subscription = await self._stripe_request(
                stripe.Subscription.retrieve,
                subscription_id
            )
            
            self.logger.info(f"サブスクリプション取得完了: subscription_id={subscription_id}")
            return subscription
            
        except stripe.error.StripeError as e:
            self.logger.error(f"サブスクリプション取得エラー: subscription_id={subscription_id}, error={e}")
            raise StripeAPIError(f"サブスクリプションの取得に失敗しました: {e.user_message}")
    
    async def cancel_subscription(
        self,
        subscription_id: str,
        cancel_at_period_end: bool = True
    ) -> Dict[str, Any]:
        """
        サブスクリプションキャンセル
        
        Args:
            subscription_id: StripeサブスクリプションID
            cancel_at_period_end: 期間終了時にキャンセルするか
            
        Returns:
            Dict: 更新されたStripeサブスクリプションオブジェクト
        """
        try:
            if cancel_at_period_end:
                # 期間終了時にキャンセル
                subscription = await self._stripe_request(
                    stripe.Subscription.modify,
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                # 即座にキャンセル
                subscription = await self._stripe_request(
                    stripe.Subscription.cancel,
                    subscription_id
                )
            
            self.logger.info(f"サブスクリプションキャンセル完了: subscription_id={subscription_id}")
            return subscription
            
        except stripe.error.StripeError as e:
            self.logger.error(f"サブスクリプションキャンセルエラー: subscription_id={subscription_id}, error={e}")
            raise StripeAPIError(f"サブスクリプションのキャンセルに失敗しました: {e.user_message}")
    
    async def sync_subscription_status(self, subscription: UserSubscription) -> Optional[UserSubscription]:
        """
        サブスクリプション状態をStripeと同期
        
        Args:
            subscription: 現在のサブスクリプション情報
            
        Returns:
            UserSubscription: 更新されたサブスクリプション情報（変更がない場合はNone）
        """
        try:
            if not subscription.subscription_id or subscription.subscription_id == "trial_plan":
                return None
            
            # Stripeから最新状態を取得
            stripe_subscription = await self.get_subscription(subscription.subscription_id)
            
            # 状態比較
            stripe_status = stripe_subscription["status"]
            current_status = subscription.status.value
            
            if stripe_status != current_status:
                # 状態が変化している場合は更新
                subscription.status = SubscriptionStatus(stripe_status)
                subscription.current_period_start = datetime.fromtimestamp(
                    stripe_subscription["current_period_start"],
                    tz=pytz.timezone('Asia/Tokyo')
                )
                subscription.current_period_end = datetime.fromtimestamp(
                    stripe_subscription["current_period_end"],
                    tz=pytz.timezone('Asia/Tokyo')
                )
                subscription.cancel_at_period_end = stripe_subscription.get("cancel_at_period_end", False)
                
                if stripe_subscription.get("canceled_at"):
                    subscription.canceled_at = datetime.fromtimestamp(
                        stripe_subscription["canceled_at"],
                        tz=pytz.timezone('Asia/Tokyo')
                    )
                
                subscription.updated_at = get_current_jst()
                
                self.logger.info(f"サブスクリプション状態同期: subscription_id={subscription.subscription_id}, {current_status} -> {stripe_status}")
                return subscription
            
            return None
            
        except stripe.error.StripeError as e:
            self.logger.error(f"サブスクリプション同期エラー: subscription_id={subscription.subscription_id}, error={e}")
            # エラーの場合は元の状態を返す（サービス継続のため）
            return None
    
    # =====================================
    # 支払い方法管理
    # =====================================
    
    async def update_payment_method(self, customer_id: str, payment_method_id: str) -> None:
        """
        デフォルト支払い方法を更新
        
        Args:
            customer_id: Stripe Customer ID
            payment_method_id: 新しい支払い方法ID
        """
        try:
            # 支払い方法を顧客にアタッチ
            await self._stripe_request(
                stripe.PaymentMethod.attach,
                payment_method_id,
                customer=customer_id
            )
            
            # デフォルト支払い方法として設定
            await self._stripe_request(
                stripe.Customer.modify,
                customer_id,
                invoice_settings={
                    "default_payment_method": payment_method_id
                }
            )
            
            self.logger.info(f"支払い方法更新完了: customer_id={customer_id}, payment_method_id={payment_method_id}")
            
        except stripe.error.StripeError as e:
            self.logger.error(f"支払い方法更新エラー: customer_id={customer_id}, error={e}")
            raise StripeAPIError(f"支払い方法の更新に失敗しました: {e.user_message}")
    
    # =====================================
    # 課金ポータル
    # =====================================
    
    async def create_billing_portal_session(self, customer_id: str, return_url: str) -> Dict[str, Any]:
        """
        Stripe課金ポータルセッション作成
        
        Args:
            customer_id: Stripe Customer ID
            return_url: 戻り先URL
            
        Returns:
            Dict: 課金ポータルセッション情報
        """
        try:
            session = await self._stripe_request(
                stripe.billing_portal.Session.create,
                customer=customer_id,
                return_url=return_url
            )
            
            self.logger.info(f"課金ポータルセッション作成完了: customer_id={customer_id}")
            return session
            
        except stripe.error.StripeError as e:
            self.logger.error(f"課金ポータルセッション作成エラー: customer_id={customer_id}, error={e}")
            raise StripeAPIError(f"課金ポータルセッションの作成に失敗しました: {e.user_message}")

    
    async def create_checkout_session(
        self,
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        promotion_codes: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Stripeチェックアウトセッション作成（新戦略）
        
        ■機能概要■
        - プラン選択後の決済画面作成
        - プロモーションコード自動適用（初回300円等）
        - 成功・キャンセル時のリダイレクト設定
        
        Args:
            customer_id: Stripe Customer ID
            price_id: Stripe Price ID
            success_url: 成功時リダイレクトURL
            cancel_url: キャンセル時リダイレクトURL
            promotion_codes: 適用するプロモーションコード一覧
            
        Returns:
            Dict: チェックアウトセッション情報
        """
        try:
            session_data = {
                "customer": customer_id,
                "payment_method_types": ["card"],
                "line_items": [{
                    "price": price_id,
                    "quantity": 1
                }],
                "mode": "subscription",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "payment_method_collection": "if_required",
                "subscription_data": {
                    "metadata": {
                        "user_id": customer_id,
                        "created_via": "checkout_session"
                    }
                },
                "allow_promotion_codes": True,
                "billing_address_collection": "auto",
                "locale": "ja"
            }
            
            # プロモーションコード自動適用
            if promotion_codes:
                session_data["discounts"] = [
                    {"promotion_code": code} for code in promotion_codes
                ]
            
            session = await self._stripe_request(
                stripe.checkout.Session.create,
                **session_data
            )
            
            self.logger.info(f"チェックアウトセッション作成完了: customer_id={customer_id}, session_id={session.id}")
            return session
            
        except stripe.error.StripeError as e:
            self.logger.error(f"チェックアウトセッション作成エラー: customer_id={customer_id}, error={e}")
            raise StripeAPIError(f"チェックアウトセッションの作成に失敗しました: {e.user_message}")
    
    async def retrieve_checkout_session(self, session_id: str) -> Dict[str, Any]:
        """
        チェックアウトセッション詳細取得
        
        Args:
            session_id: チェックアウトセッションID
            
        Returns:
            Dict: セッション詳細情報
        """
        try:
            session = await self._stripe_request(
                stripe.checkout.Session.retrieve,
                session_id,
                expand=["subscription", "customer"]
            )
            
            self.logger.info(f"チェックアウトセッション取得完了: session_id={session_id}")
            return session
            
        except stripe.error.StripeError as e:
            self.logger.error(f"チェックアウトセッション取得エラー: session_id={session_id}, error={e}")
            raise StripeAPIError(f"チェックアウトセッションの取得に失敗しました: {e.user_message}")
    
    # =====================================
    # Webhook処理
    # =====================================
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> Dict[str, Any]:
        """
        Webhook署名を検証してイベントを構築
        
        Args:
            payload: リクエストボディ（bytes）
            signature: Stripe-Signature ヘッダー
            
        Returns:
            Dict: Stripeイベントオブジェクト
        """
        try:
            if not self.webhook_secret:
                raise ValueError("STRIPE_WEBHOOK_SECRET environment variable is required")
            
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                self.webhook_secret
            )
            
            self.logger.info(f"Webhook署名検証成功: event_type={event['type']}, event_id={event['id']}")
            return event
            
        except ValueError as e:
            self.logger.error(f"Webhook署名検証失敗: {e}")
            raise StripeAPIError(f"Webhook署名の検証に失敗しました: {e}")
        except stripe.error.SignatureVerificationError as e:
            self.logger.error(f"Webhook署名不正: {e}")
            raise StripeAPIError(f"Webhook署名が不正です: {e}")
    
    # =====================================
    # ヘルスチェック・ユーティリティ
    # =====================================
    
    async def health_check(self) -> bool:
        """
        Stripe API接続ヘルスチェック
        
        Returns:
            bool: 接続が正常かどうか
        """
        try:
            # アカウント情報取得でAPI接続確認
            await self._stripe_request(stripe.Account.retrieve)
            return True
            
        except Exception as e:
            self.logger.error(f"Stripe APIヘルスチェック失敗: {e}")
            return False
    
    async def _stripe_request(self, stripe_method, *args, **kwargs) -> Any:
        """
        Stripe APIリクエストの実行（リトライ機能付き）
        
        Args:
            stripe_method: Stripe APIメソッド
            *args: 位置引数
            **kwargs: キーワード引数
            
        Returns:
            Any: Stripe APIレスポンス
        """
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                # 非同期実行
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None,
                    lambda: stripe_method(*args, **kwargs)
                )
                return result
                
            except stripe.error.RateLimitError as e:
                # レート制限エラー：リトライ
                last_exception = e
                wait_time = self.retry_delay * (2 ** attempt)
                self.logger.warning(f"Stripe APIレート制限: attempt={attempt + 1}, wait={wait_time}s")
                await asyncio.sleep(wait_time)
                continue
                
            except stripe.error.APIConnectionError as e:
                # 接続エラー：リトライ
                last_exception = e
                wait_time = self.retry_delay * (2 ** attempt)
                self.logger.warning(f"Stripe API接続エラー: attempt={attempt + 1}, wait={wait_time}s")
                await asyncio.sleep(wait_time)
                continue
                
            except stripe.error.StripeError as e:
                # その他のStripeエラー：リトライしない
                self.logger.error(f"Stripe APIエラー: {e}")
                raise e
        
        # 最大リトライ回数に達した場合
        self.logger.error(f"Stripe APIリトライ上限到達: {last_exception}")
        raise last_exception


# =====================================
# ファクトリー関数
# =====================================

def get_stripe_client() -> StripeClient:
    """
    StripeClientインスタンスを取得
    
    Returns:
        StripeClient: Stripeクライアント
    """
    return StripeClient()
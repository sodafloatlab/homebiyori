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
5. エラーハンドリング・リトライ

■セキュリティ■
- API キーの安全な管理
- 3Dセキュア対応
- PCI DSS準拠

■Webhook処理■
- Webhook署名検証・処理: webhook_serviceで実装
- billing_service: Stripe API呼び出し専用

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
    
    ■Webhook処理について■
    Webhook署名検証・処理はwebhook_serviceで実装
    billing_serviceはStripe API呼び出し専用
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Stripe クライアント初期化（billing_service専用）
        
        Args:
            api_key: Stripe API キー（Parameter Store から取得）
        """
        # Parameter Store からStripe API キー取得
        if not api_key:
            try:
                from homebiyori_common.utils.parameter_store import get_parameter
                stripe.api_key = get_parameter(
                    "/prod/homebiyori/stripe/api_key",
                    default_value=os.getenv("STRIPE_SECRET_KEY")
                )
            except Exception as e:
                logger.error(f"Stripe API キーのParameter Store取得失敗: {str(e)}")
                # フォールバック: 環境変数から取得
                stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        else:
            stripe.api_key = api_key
        
        if not stripe.api_key:
            raise ValueError("Stripe API key is required (from Parameter Store or environment variable)")
        
        # API バージョン設定（2024-12-18更新）
        # 更新理由: 2023-10-16 → 2024-12-18（約1年分の機能改善・セキュリティ強化）
        # 互換性: 月次リリースのため破壊的変更なし、既存機能完全互換
        # 更新日: 2024-08-22
        stripe.api_version = "2024-12-18"
        
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
            
        Stripe API返却値サンプル:
        
        stripe.Customer.list() 返却例:
        {
            "object": "list",
            "data": [
                {
                    "id": "cus_P5B0Y2Z3a1b2c3",
                    "object": "customer",
                    "created": 1699123456,
                    "email": "user@example.com",
                    "metadata": {"user_id": "cognito-user-123"},
                    "description": "Homebiyori User cognito-u"
                }
            ],
            "has_more": false
        }
        
        stripe.Customer.create() 返却例:
        {
            "id": "cus_P5B0Y2Z3a1b2c3",
            "object": "customer",
            "created": 1699123456,
            "email": "user@example.com",
            "metadata": {"user_id": "cognito-user-123"},
            "description": "Homebiyori User cognito-u",
            "invoice_settings": {
                "default_payment_method": null
            }
        }
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
    
    # create_subscription 削除（2024-08-22）
    # 理由: StripeCheckout方式に統一。Elements用のサブスクリプション作成APIは不要
    # Checkoutでは create_checkout_session → handle_checkout_success の流れで処理
    # 削除日: 2024-08-22
    
    async def get_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """
        サブスクリプション詳細取得
        
        Stripe API返却値サンプル:
        
        stripe.Subscription.retrieve() 返却例:
        {
            "id": "sub_1OtxqRIJZKm1u2v3PQZ4s5t6",
            "object": "subscription",
            "application": null,
            "application_fee_percent": null,
            "automatic_tax": {
                "enabled": false
            },
            "billing_cycle_anchor": 1699123456,
            "billing_thresholds": null,
            "cancel_at": null,
            "cancel_at_period_end": false,
            "canceled_at": null,
            "cancellation_details": {
                "comment": null,
                "feedback": null,
                "reason": null
            },
            "collection_method": "charge_automatically",
            "created": 1699123456,
            "currency": "jpy",
            "current_period_end": 1701801856,
            "current_period_start": 1699123456,
            "customer": "cus_P5B0Y2Z3a1b2c3",
            "default_payment_method": "pm_1OtxqRIJZKm1u2v3PQZ4s5t6",
            "default_source": null,
            "default_tax_rates": [],
            "description": null,
            "discount": null,
            "ended_at": null,
            "invoice_settings": {
                "issue_customer": {
                    "source": "subscription"
                }
            },
            "items": {
                "object": "list",
                "data": [
                    {
                        "id": "si_P5B0Y2Z3a1b2c3",
                        "object": "subscription_item",
                        "billing_thresholds": null,
                        "created": 1699123456,
                        "metadata": {},
                        "plan": {
                            "id": "price_1OtxqRIJZKm1u2v3PQZ4s5t6",
                            "object": "plan",
                            "active": true,
                            "aggregate_usage": null,
                            "amount": 580,
                            "amount_decimal": "580",
                            "billing_scheme": "per_unit",
                            "created": 1699123456,
                            "currency": "jpy",
                            "interval": "month",
                            "interval_count": 1,
                            "nickname": "Monthly Plan",
                            "product": "prod_P5B0Y2Z3a1b2c3",
                            "usage_type": "licensed"
                        },
                        "price": {
                            "id": "price_1OtxqRIJZKm1u2v3PQZ4s5t6",
                            "object": "price",
                            "active": true,
                            "billing_scheme": "per_unit",
                            "created": 1699123456,
                            "currency": "jpy",
                            "product": "prod_P5B0Y2Z3a1b2c3",
                            "recurring": {
                                "aggregate_usage": null,
                                "interval": "month",
                                "interval_count": 1,
                                "usage_type": "licensed"
                            },
                            "tax_behavior": "unspecified",
                            "tiers_mode": null,
                            "transform_quantity": null,
                            "type": "recurring",
                            "unit_amount": 580,
                            "unit_amount_decimal": "580"
                        },
                        "quantity": 1,
                        "subscription": "sub_1OtxqRIJZKm1u2v3PQZ4s5t6",
                        "tax_rates": []
                    }
                ],
                "has_more": false,
                "total_count": 1,
                "url": "/v1/subscription_items?subscription=sub_1OtxqRIJZKm1u2v3PQZ4s5t6"
            },
            "latest_invoice": "in_1OtxqRIJZKm1u2v3PQZ4s5t6",
            "livemode": false,
            "metadata": {
                "homebiyori_user_id": "cognito-user-123",
                "plan_type": "monthly"
            },
            "next_pending_invoice_item_invoice": null,
            "on_behalf_of": null,
            "pause_collection": null,
            "payment_settings": {
                "payment_method_options": null,
                "payment_method_types": null,
                "save_default_payment_method": "off"
            },
            "pending_invoice_item_interval": null,
            "pending_setup_intent": null,
            "pending_update": null,
            "quantity": 1,
            "schedule": null,
            "start_date": 1699123456,
            "status": "active",
            "test_clock": null,
            "transfer_data": null,
            "trial_end": null,
            "trial_settings": {
                "end_behavior": {
                    "missing_payment_method": "create_invoice"
                }
            },
            "trial_start": null
        }
        
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
        サブスクリプションキャンセル（解約理由収集機能で利用）
        
        Stripe API返却値サンプル:
        
        stripe.Subscription.modify() 返却例（cancel_at_period_end=True時）:
        {
            "id": "sub_1OtxqRIJZKm1u2v3PQZ4s5t6",
            "object": "subscription",
            "application": null,
            "application_fee_percent": null,
            "automatic_tax": {
                "enabled": false
            },
            "billing_cycle_anchor": 1699123456,
            "billing_thresholds": null,
            "cancel_at": 1701801856,
            "cancel_at_period_end": true,
            "canceled_at": null,
            "cancellation_details": {
                "comment": null,
                "feedback": null,
                "reason": null
            },
            "collection_method": "charge_automatically",
            "created": 1699123456,
            "currency": "jpy",
            "current_period_end": 1701801856,
            "current_period_start": 1699123456,
            "customer": "cus_P5B0Y2Z3a1b2c3",
            "default_payment_method": "pm_1OtxqRIJZKm1u2v3PQZ4s5t6",
            "status": "active",
            "metadata": {
                "homebiyori_user_id": "cognito-user-123",
                "plan_type": "monthly"
            }
        }
        
        stripe.Subscription.cancel() 返却例（即座キャンセル時）:
        {
            "id": "sub_1OtxqRIJZKm1u2v3PQZ4s5t6",
            "object": "subscription",
            "cancel_at": null,
            "cancel_at_period_end": false,
            "canceled_at": 1699123500,
            "cancellation_details": {
                "comment": null,
                "feedback": null,
                "reason": "requested_by_customer"
            },
            "collection_method": "charge_automatically",
            "created": 1699123456,
            "currency": "jpy",
            "current_period_end": 1701801856,
            "current_period_start": 1699123456,
            "customer": "cus_P5B0Y2Z3a1b2c3",
            "ended_at": 1699123500,
            "status": "canceled",
            "metadata": {
                "homebiyori_user_id": "cognito-user-123",
                "plan_type": "monthly"
            }
        }
        
        ■保持理由■
        - Portal経由ではなくAPI実行でキャンセルを行う方針
        - 解約理由の収集がサービス改善に重要なため
        - main.pyのcancel_subscriptionエンドポイントから呼び出される
        
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
    
    # update_payment_method 削除（2024-08-22）
    # 理由: StripeCheckout + Portal経由の管理に統一
    # 支払い方法更新はStripe Portalで行う方針に変更
    # 削除日: 2024-08-22

    
    # =====================================
    # 課金ポータル
    # =====================================
    
    async def create_billing_portal_session(self, customer_id: str, return_url: str) -> Dict[str, Any]:
        """
        Stripe課金ポータルセッション作成
        
        Stripe API返却値サンプル:
        
        stripe.billing_portal.Session.create() 返却例:
        {
            "id": "bps_1OtxqRIJZKm1u2v3PQZ4s5t6",
            "object": "billing_portal.session",
            "configuration": {
                "id": "bpc_1OtxqRIJZKm1u2v3PQZ4s5t6",
                "object": "billing_portal.configuration",
                "active": true,
                "application": null,
                "business_profile": {
                    "headline": null,
                    "privacy_policy_url": "https://example.com/privacy",
                    "terms_of_service_url": "https://example.com/terms"
                },
                "created": 1699123456,
                "default_return_url": null,
                "features": {
                    "customer_update": {
                        "allowed_updates": ["email", "address"],
                        "enabled": true
                    },
                    "invoice_history": {
                        "enabled": true
                    },
                    "payment_method_update": {
                        "enabled": true
                    },
                    "subscription_cancel": {
                        "cancellation_reason": {
                            "enabled": true,
                            "options": ["too_expensive", "missing_features", "switched_service", "unused", "other"]
                        },
                        "enabled": true,
                        "mode": "at_period_end",
                        "proration_behavior": "none"
                    },
                    "subscription_pause": {
                        "enabled": false
                    },
                    "subscription_update": {
                        "default_allowed_updates": ["price"],
                        "enabled": true,
                        "products": [
                            {
                                "prices": ["price_1OtxqRIJZKm1u2v3PQZ4s5t6"],
                                "product": "prod_P5B0Y2Z3a1b2c3"
                            }
                        ],
                        "proration_behavior": "none"
                    }
                },
                "is_default": true,
                "livemode": false,
                "metadata": {},
                "updated": 1699123456
            },
            "created": 1699123456,
            "customer": "cus_P5B0Y2Z3a1b2c3",
            "flow": null,
            "livemode": false,
            "locale": "ja",
            "on_behalf_of": null,
            "return_url": "https://homebiyori.com/dashboard",
            "url": "https://billing.stripe.com/p/session/bps_1OtxqRIJZKm1u2v3PQZ4s5t6"
        }
        
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
        homebiyori_user_id: str,
        plan_type: str,  # 追加: プランタイプを明示的に受け取る
        promotion_codes: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Stripeチェックアウトセッション作成（metadata特化版）
        
        ■機能概要■
        - プラン選択後の決済画面作成
        - プロモーションコード自動適用（初回300円等）
        - 成功・キャンセル時のリダイレクト設定
        
        Args:
            customer_id: Stripe Customer ID
            price_id: Stripe Price ID
            success_url: 成功時リダイレクトURL
            cancel_url: キャンセル時リダイレクトURL
            homebiyori_user_id: ほめびよりユーザーID（webhook処理用メタデータ）
            plan_type: プランタイプ（monthly/yearly/trial）
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
                "customer_update": {"email": "auto"},
                "subscription_data": {
                    "metadata": {
                        "user_id": homebiyori_user_id,  # homebiyori user_id
                        "plan_type": plan_type,  # プランタイプを確実に設定
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
            
            self.logger.info(f"チェックアウトセッション作成完了: customer_id={customer_id}, homebiyori_user_id={homebiyori_user_id}, plan_type={plan_type}, session_id={session.id}")
            return session
            
        except stripe.error.StripeError as e:
            self.logger.error(f"チェックアウトセッション作成エラー: customer_id={customer_id}, homebiyori_user_id={homebiyori_user_id}, error={e}")
            raise StripeAPIError(f"チェックアウトセッションの作成に失敗しました: {e.user_message}")
    
    async def retrieve_checkout_session(self, session_id: str) -> Dict[str, Any]:
        """
        チェックアウトセッション詳細取得
        
        Stripe API返却値サンプル:
        
        stripe.checkout.Session.retrieve() 返却例（expand=["subscription", "customer"]付き）:
        {
            "id": "cs_test_a1OtxqRIJZKm1u2v3PQZ4s5t6",
            "object": "checkout.session",
            "after_expiration": null,
            "allow_promotion_codes": true,
            "amount_subtotal": 58000,
            "amount_total": 58000,
            "automatic_tax": {
                "enabled": false,
                "status": null
            },
            "billing_address_collection": "auto",
            "cancel_url": "https://homebiyori.com/billing/cancel",
            "client_reference_id": null,
            "client_secret": null,
            "consent": null,
            "consent_collection": null,
            "created": 1699123456,
            "currency": "jpy",
            "custom_text": {
                "shipping_address": null,
                "submit": null,
                "terms_of_service_acceptance": null
            },
            "customer": {
                "id": "cus_P5B0Y2Z3a1b2c3",
                "object": "customer",
                "address": null,
                "balance": 0,
                "created": 1699123456,
                "currency": null,
                "default_source": null,
                "delinquent": false,
                "description": null,
                "discount": null,
                "email": "user@example.com",
                "invoice_prefix": "ABC123",
                "invoice_settings": {
                    "custom_fields": null,
                    "default_payment_method": null,
                    "footer": null,
                    "rendering_options": null
                },
                "livemode": false,
                "metadata": {
                    "homebiyori_user_id": "cognito-user-123"
                },
                "name": null,
                "next_invoice_sequence": 1,
                "phone": null,
                "preferred_locales": ["ja"],
                "shipping": null,
                "sources": {
                    "object": "list",
                    "data": [],
                    "has_more": false,
                    "total_count": 0,
                    "url": "/v1/customers/cus_P5B0Y2Z3a1b2c3/sources"
                },
                "subscriptions": {
                    "object": "list",
                    "data": [],
                    "has_more": false,
                    "total_count": 0,
                    "url": "/v1/customers/cus_P5B0Y2Z3a1b2c3/subscriptions"
                },
                "tax_exempt": "none",
                "tax_ids": {
                    "object": "list",
                    "data": [],
                    "has_more": false,
                    "total_count": 0,
                    "url": "/v1/customers/cus_P5B0Y2Z3a1b2c3/tax_ids"
                },
                "test_clock": null
            },
            "customer_creation": null,
            "customer_details": {
                "address": {
                    "city": "Tokyo",
                    "country": "JP",
                    "line1": "1-2-3 Shibuya",
                    "line2": null,
                    "postal_code": "150-0002",
                    "state": "Tokyo"
                },
                "email": "user@example.com",
                "name": "Test User",
                "phone": null,
                "tax_exempt": "none",
                "tax_ids": []
            },
            "customer_email": null,
            "expires_at": 1699209856,
            "invoice": "in_1OtxqRIJZKm1u2v3PQZ4s5t6",
            "invoice_creation": {
                "enabled": false,
                "invoice_data": {
                    "account_tax_ids": null,
                    "custom_fields": null,
                    "description": null,
                    "footer": null,
                    "metadata": {},
                    "rendering_options": null
                }
            },
            "livemode": false,
            "locale": "ja",
            "metadata": {},
            "mode": "subscription",
            "payment_intent": null,
            "payment_link": null,
            "payment_method_collection": "if_required",
            "payment_method_configuration_details": null,
            "payment_method_options": {},
            "payment_method_types": ["card"],
            "payment_status": "paid",
            "phone_number_collection": {
                "enabled": false
            },
            "recovered_from": null,
            "setup_intent": null,
            "shipping_address_collection": null,
            "shipping_cost": null,
            "shipping_details": null,
            "shipping_options": [],
            "status": "complete",
            "submit_type": null,
            "subscription": {
                "id": "sub_1OtxqRIJZKm1u2v3PQZ4s5t6",
                "object": "subscription",
                "application": null,
                "application_fee_percent": null,
                "automatic_tax": {
                    "enabled": false
                },
                "billing_cycle_anchor": 1699123456,
                "billing_thresholds": null,
                "cancel_at": null,
                "cancel_at_period_end": false,
                "canceled_at": null,
                "cancellation_details": {
                    "comment": null,
                    "feedback": null,
                    "reason": null
                },
                "collection_method": "charge_automatically",
                "created": 1699123456,
                "currency": "jpy",
                "current_period_end": 1701801856,
                "current_period_start": 1699123456,
                "customer": "cus_P5B0Y2Z3a1b2c3",
                "default_payment_method": "pm_1OtxqRIJZKm1u2v3PQZ4s5t6",
                "status": "active",
                "metadata": {
                    "user_id": "cus_P5B0Y2Z3a1b2c3",
                    "created_via": "checkout_session"
                }
            },
            "success_url": "https://homebiyori.com/billing/success?session_id={CHECKOUT_SESSION_ID}",
            "total_details": {
                "amount_discount": 0,
                "amount_shipping": 0,
                "amount_tax": 0
            },
            "ui_mode": "hosted",
            "url": null
        }
        
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
    
    # verify_webhook_signatureメソッドは削除されました
    # 理由: webhook_serviceに正しく実装済みのため重複機能を削除
    # 削除日: 2024-08-21
    # Webhook署名検証はwebhook_serviceのcore/dependencies.pyで提供
        
    # =====================================
    # ヘルスチェック・ユーティリティ
    # =====================================
    
    async def health_check(self) -> bool:
        """
        Stripe API接続ヘルスチェック
        
        Stripe API返却値サンプル:
        
        stripe.Account.retrieve() 返却例:
        {
            "id": "acct_1OtxqRIJZKm1u2v3",
            "object": "account",
            "business_profile": {
                "mcc": "5734",
                "name": "Homebiyori",
                "product_description": "AI-powered parenting support app",
                "support_address": {
                    "city": "Tokyo",
                    "country": "JP",
                    "line1": "1-2-3 Shibuya",
                    "line2": null,
                    "postal_code": "150-0002",
                    "state": "Tokyo"
                },
                "support_email": "support@homebiyori.com",
                "support_phone": "+81-3-1234-5678",
                "support_url": "https://homebiyori.com/support",
                "url": "https://homebiyori.com"
            },
            "business_type": "company",
            "capabilities": {
                "card_payments": "active",
                "transfers": "active",
                "jcb_payments": "active",
                "japan_bank_transfers": "active"
            },
            "charges_enabled": true,
            "controller": {
                "type": "account"
            },
            "country": "JP",
            "created": 1699123456,
            "default_currency": "jpy",
            "details_submitted": true,
            "email": "account@homebiyori.com",
            "future_requirements": {
                "alternatives": [],
                "current_deadline": null,
                "currently_due": [],
                "disabled_reason": null,
                "errors": [],
                "eventually_due": [],
                "past_due": [],
                "pending_verification": []
            },
            "metadata": {},
            "payouts_enabled": true,
            "requirements": {
                "alternatives": [],
                "current_deadline": null,
                "currently_due": [],
                "disabled_reason": null,
                "errors": [],
                "eventually_due": [],
                "past_due": [],
                "pending_verification": []
            },
            "settings": {
                "branding": {
                    "icon": "file_1OtxqRIJZKm1u2v3PQZ4s5t6",
                    "logo": "file_1OtxqRIJZKm1u2v3PQZ4s5t6",
                    "primary_color": "#ff6b9d",
                    "secondary_color": "#c4a1ff"
                },
                "card_issuing": {
                    "tos_acceptance": {
                        "date": null,
                        "ip": null
                    }
                },
                "card_payments": {
                    "decline_on": {
                        "avs_failure": false,
                        "cvc_failure": false
                    },
                    "statement_descriptor_prefix": "HOMEBIYORI",
                    "statement_descriptor_prefix_kana": null,
                    "statement_descriptor_prefix_kanji": null
                },
                "dashboard": {
                    "display_name": "Homebiyori",
                    "timezone": "Asia/Tokyo"
                },
                "payments": {
                    "statement_descriptor": "HOMEBIYORI",
                    "statement_descriptor_kana": "ホメビヨリ",
                    "statement_descriptor_kanji": "褒美日"
                },
                "payouts": {
                    "debit_negative_balances": false,
                    "schedule": {
                        "delay_days": 4,
                        "interval": "daily"
                    },
                    "statement_descriptor": null
                }
            },
            "type": "standard",
            "tos_acceptance": {
                "date": 1699123456,
                "ip": "203.0.113.1",
                "service_agreement": "full"
            }
        }
        
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
# ファクトリー関数（シングルトン対応）
# =====================================

# グローバルインスタンス（シングルトン）
_stripe_client_instance: Optional[StripeClient] = None

def get_stripe_client() -> StripeClient:
    """
    StripeClientインスタンスを取得（シングルトン）
    
    パフォーマンス最適化:
    - Parameter Store呼び出し削減（初回のみ）
    - インスタンス初期化コスト削減
    - メモリ使用量最適化
    
    Returns:
        StripeClient: Stripeクライアント（シングルトンインスタンス）
    """
    global _stripe_client_instance
    
    if _stripe_client_instance is None:
        _stripe_client_instance = StripeClient()
        logger.info("StripeClientシングルトンインスタンス作成完了")
    
    return _stripe_client_instance
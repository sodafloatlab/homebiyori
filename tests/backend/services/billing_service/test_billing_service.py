"""
Billing Service Test Suite

請求・サブスクリプション管理サービスのテスト
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

# テスト対象のインポート
from backend.services.billing_service.main import app, get_user_subscription, create_subscription
from backend.services.billing_service.models import (
    SubscriptionPlan, SubscriptionStatus, UserSubscription,
    PaymentMethod, BillingPortalRequest, SubscriptionRequest
)

# テスト用クライアント
client = TestClient(app)


class TestBillingService:
    """Billing Serviceのテストクラス"""

    def test_health_check_success(self):
        """ヘルスチェック成功テスト"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "billing_service"
        assert data["status"] == "healthy"

    @patch('backend.services.billing_service.main.get_user_id')
    @patch('backend.services.billing_service.database.BillingDatabase.get_user_subscription')
    def test_get_user_subscription_success(self, mock_get_subscription, mock_get_user_id):
        """ユーザーサブスクリプション取得成功テスト"""
        # モック設定
        mock_get_user_id.return_value = "test_user_123"
        mock_get_subscription.return_value = {
            "user_id": "test_user_123",
            "subscription_id": "sub_test123",
            "plan": SubscriptionPlan.PREMIUM,
            "status": SubscriptionStatus.ACTIVE,
            "current_period_start": "2025-01-01T00:00:00Z",
            "current_period_end": "2025-02-01T00:00:00Z",
            "stripe_customer_id": "cus_test123",
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z"
        }

        # テスト実行
        response = client.get(
            "/api/subscriptions/current",
            headers={"Authorization": "Bearer valid_token"}
        )

        # 検証
        assert response.status_code == 200
        data = response.json()
        assert data["plan"] == "premium"
        assert data["status"] == "active"

    @patch('backend.services.billing_service.main.get_user_id')
    @patch('backend.services.billing_service.main.stripe_client')
    @patch('backend.services.billing_service.database.BillingDatabase.create_subscription')
    def test_create_subscription_success(self, mock_create_sub, mock_stripe, mock_get_user_id):
        """サブスクリプション作成成功テスト"""
        # モック設定
        mock_get_user_id.return_value = "test_user_123"
        mock_stripe.create_customer.return_value = {"id": "cus_test123"}
        mock_stripe.create_subscription.return_value = {
            "id": "sub_test123",
            "status": "active",
            "current_period_start": 1704067200,
            "current_period_end": 1706745600
        }
        mock_create_sub.return_value = True

        # テストデータ
        subscription_data = {
            "plan": "premium",
            "payment_method_id": "pm_test123"
        }

        # テスト実行
        response = client.post(
            "/api/subscriptions/create",
            json=subscription_data,
            headers={"Authorization": "Bearer valid_token"}
        )

        # 検証
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Subscription created successfully"

    @patch('backend.services.billing_service.main.get_user_id')
    @patch('backend.services.billing_service.main.stripe_client')
    @patch('backend.services.billing_service.database.BillingDatabase.update_subscription_status')
    def test_cancel_subscription_success(self, mock_update_status, mock_stripe, mock_get_user_id):
        """サブスクリプションキャンセル成功テスト"""
        # モック設定
        mock_get_user_id.return_value = "test_user_123"
        mock_stripe.cancel_subscription.return_value = {"status": "canceled"}
        mock_update_status.return_value = True

        # テスト実行
        response = client.post(
            "/api/subscriptions/cancel",
            headers={"Authorization": "Bearer valid_token"}
        )

        # 検証
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Subscription canceled successfully"

    @patch('backend.services.billing_service.main.get_user_id')
    @patch('backend.services.billing_service.main.stripe_client')
    def test_create_billing_portal_session_success(self, mock_stripe, mock_get_user_id):
        """請求ポータルセッション作成成功テスト"""
        # モック設定
        mock_get_user_id.return_value = "test_user_123"
        mock_stripe.create_billing_portal_session.return_value = {
            "url": "https://billing.stripe.com/session/test123"
        }

        # テストデータ
        portal_request = {
            "return_url": "https://homebiyori.com/settings"
        }

        # テスト実行
        response = client.post(
            "/api/billing/portal",
            json=portal_request,
            headers={"Authorization": "Bearer valid_token"}
        )

        # 検証
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "billing.stripe.com" in data["url"]


class TestBillingModels:
    """Billing Modelsのテストクラス"""

    def test_user_subscription_model_validation(self):
        """UserSubscriptionモデルのバリデーションテスト"""
        # 有効なデータ
        valid_data = {
            "user_id": "user_123",
            "subscription_id": "sub_123",
            "plan": SubscriptionPlan.PREMIUM,
            "status": SubscriptionStatus.ACTIVE,
            "current_period_start": datetime.now(),
            "current_period_end": datetime.now() + timedelta(days=30),
            "stripe_customer_id": "cus_123",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

        subscription = UserSubscription(**valid_data)
        assert subscription.plan == SubscriptionPlan.PREMIUM
        assert subscription.status == SubscriptionStatus.ACTIVE

    def test_subscription_request_validation(self):
        """SubscriptionRequestモデルのバリデーションテスト"""
        # 有効なデータ
        valid_data = {
            "plan": "premium",
            "payment_method_id": "pm_test123"
        }

        request = SubscriptionRequest(**valid_data)
        assert request.plan == "premium"
        assert request.payment_method_id == "pm_test123"

        # 無効なプラン
        with pytest.raises(ValueError):
            SubscriptionRequest(plan="invalid_plan", payment_method_id="pm_test123")

    def test_billing_portal_request_validation(self):
        """BillingPortalRequestモデルのバリデーションテスト"""
        # 有効なデータ
        valid_data = {
            "return_url": "https://homebiyori.com/settings"
        }

        request = BillingPortalRequest(**valid_data)
        assert request.return_url == "https://homebiyori.com/settings"

        # 無効なURL
        with pytest.raises(ValueError):
            BillingPortalRequest(return_url="not_a_url")


class TestBillingDatabase:
    """Billing Databaseのテストクラス"""

    @pytest.fixture
    def mock_db_client(self):
        """DynamoDBクライアントのモック"""
        with patch('backend.services.billing_service.database.DynamoDBClient') as mock:
            yield mock.return_value

    @pytest.mark.asyncio
    async def test_get_user_subscription(self, mock_db_client):
        """ユーザーサブスクリプション取得テスト"""
        from backend.services.billing_service.database import BillingDatabase

        # モック設定
        mock_db_client.get_item.return_value = {
            "user_id": "test_user_123",
            "subscription_id": "sub_test123",
            "plan": "premium",
            "status": "active"
        }

        # テスト実行
        db = BillingDatabase()
        result = await db.get_user_subscription("test_user_123")

        # 検証
        assert result is not None
        assert result["user_id"] == "test_user_123"
        assert result["plan"] == "premium"

    @pytest.mark.asyncio
    async def test_create_subscription(self, mock_db_client):
        """サブスクリプション作成テスト"""
        from backend.services.billing_service.database import BillingDatabase

        # モック設定
        mock_db_client.put_item.return_value = True

        # テストデータ
        subscription_data = {
            "user_id": "test_user_123",
            "subscription_id": "sub_test123",
            "plan": SubscriptionPlan.PREMIUM,
            "status": SubscriptionStatus.ACTIVE,
            "stripe_customer_id": "cus_test123"
        }

        # テスト実行
        db = BillingDatabase()
        result = await db.create_subscription(subscription_data)

        # 検証
        assert result is True
        mock_db_client.put_item.assert_called_once()


class TestStripeIntegration:
    """Stripe統合のテストクラス"""

    @pytest.fixture
    def mock_stripe_client(self):
        """StripeClientのモック"""
        with patch('backend.services.billing_service.stripe_client.StripeClient') as mock:
            yield mock.return_value

    def test_create_customer(self, mock_stripe_client):
        """Stripe顧客作成テスト"""
        # モック設定
        mock_stripe_client.create_customer.return_value = {
            "id": "cus_test123",
            "email": "test@example.com"
        }

        # テスト実行
        from backend.services.billing_service.stripe_client import StripeClient
        client = StripeClient()
        customer = client.create_customer("test@example.com")

        # 検証
        assert customer["id"] == "cus_test123"
        assert customer["email"] == "test@example.com"

    def test_create_subscription(self, mock_stripe_client):
        """Stripeサブスクリプション作成テスト"""
        # モック設定
        mock_stripe_client.create_subscription.return_value = {
            "id": "sub_test123",
            "status": "active",
            "current_period_start": 1704067200,
            "current_period_end": 1706745600
        }

        # テスト実行
        from backend.services.billing_service.stripe_client import StripeClient
        client = StripeClient()
        subscription = client.create_subscription(
            customer_id="cus_test123",
            price_id="price_premium",
            payment_method="pm_test123"
        )

        # 検証
        assert subscription["id"] == "sub_test123"
        assert subscription["status"] == "active"

    def test_cancel_subscription(self, mock_stripe_client):
        """Stripeサブスクリプションキャンセルテスト"""
        # モック設定
        mock_stripe_client.cancel_subscription.return_value = {
            "id": "sub_test123",
            "status": "canceled"
        }

        # テスト実行
        from backend.services.billing_service.stripe_client import StripeClient
        client = StripeClient()
        result = client.cancel_subscription("sub_test123")

        # 検証
        assert result["status"] == "canceled"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
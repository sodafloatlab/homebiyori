"""
Webhook Service テスト

Stripe Webhook処理とSQS連携のテスト。
"""

import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime

# テスト対象のインポート
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../../backend/services/webhook_service'))

from backend.services.webhook_service.main import app
from backend.services.webhook_service.models.stripe_models import WebhookEvent, StripeSubscription
from backend.services.webhook_service.handlers.stripe_webhook import StripeWebhookHandler
from backend.services.webhook_service.services.subscription_sync import SubscriptionSyncService


class TestWebhookService:
    """Webhook Service テストクラス"""
    
    @pytest.fixture
    def webhook_handler(self):
        """WebhookHandlerフィクスチャ"""
        return StripeWebhookHandler()
    
    @pytest.fixture  
    def subscription_sync(self):
        """SubscriptionSyncServiceフィクスチャ"""
        return SubscriptionSyncService()
    
    @pytest.fixture
    def sample_webhook_event(self):
        """サンプルWebhookイベント"""
        return WebhookEvent(
            id="evt_test_webhook",
            type="customer.subscription.created",
            data={
                "object": {
                    "id": "sub_test123",
                    "customer": "cus_test123",
                    "status": "active",
                    "current_period_start": 1640995200,  # 2022-01-01
                    "current_period_end": 1643673600,    # 2022-02-01
                    "cancel_at_period_end": False,
                    "items": {
                        "data": [{
                            "price": {
                                "id": "price_basic",
                                "nickname": "basic"
                            }
                        }]
                    },
                    "metadata": {
                        "user_id": "user_test123"
                    }
                }
            },
            created=1640995200
        )
    
    @pytest.fixture
    def sample_subscription(self):
        """サンプルStripeサブスクリプション"""
        return StripeSubscription(
            id="sub_test123",
            customer_id="cus_test123", 
            status="active",
            current_period_start=datetime.fromtimestamp(1640995200),
            current_period_end=datetime.fromtimestamp(1643673600),
            cancel_at_period_end=False,
            plan_id="price_basic",
            plan_name="basic",
            metadata={"user_id": "user_test123"}
        )

    @pytest.mark.asyncio
    async def test_subscription_created_webhook(self, webhook_handler, sample_webhook_event):
        """サブスクリプション作成Webhookテスト"""
        with patch.object(webhook_handler, '_handle_subscription_created', new_callable=AsyncMock) as mock_handler:
            mock_handler.return_value = {
                "success": True,
                "subscription_id": "sub_test123",
                "user_id": "user_test123"
            }
            
            # Webhook処理実行
            result = await webhook_handler.process_webhook(sample_webhook_event, {})
            
            # 検証
            assert result["success"] is True
            assert "subscription_id" in result
            mock_handler.assert_called_once()

    @pytest.mark.asyncio
    async def test_subscription_sync_create(self, subscription_sync, sample_subscription):
        """サブスクリプション同期作成テスト"""
        with patch.object(subscription_sync.db_client, 'put_item', new_callable=AsyncMock) as mock_put:
            mock_put.return_value = True
            
            # サブスクリプション作成
            result = await subscription_sync.create_subscription(
                sample_subscription, 
                "user_test123"
            )
            
            # 検証
            assert result["success"] is True
            assert result["subscription_id"] == "sub_test123"
            mock_put.assert_called_once()
            
            # DynamoDB書き込みデータ検証
            call_args = mock_put.call_args[1]
            item_data = call_args["item_data"]
            assert item_data["PK"] == "USER#user_test123"
            assert item_data["SK"] == "SUBSCRIPTION#sub_test123"
            assert item_data["status"] == "active"

    @pytest.mark.asyncio
    async def test_subscription_sync_update(self, subscription_sync, sample_subscription):
        """サブスクリプション同期更新テスト"""
        with patch.object(subscription_sync.db_client, 'update_item', new_callable=AsyncMock) as mock_update:
            mock_update.return_value = True
            
            # サブスクリプション更新
            result = await subscription_sync.update_subscription(
                sample_subscription,
                "user_test123"
            )
            
            # 検証
            assert result["success"] is True
            mock_update.assert_called_once()

    @pytest.mark.asyncio
    async def test_sqs_message_sending(self, webhook_handler):
        """SQSメッセージ送信テスト"""
        with patch('boto3.client') as mock_boto_client:
            mock_sqs = MagicMock()
            mock_boto_client.return_value = mock_sqs
            mock_sqs.send_message.return_value = {"MessageId": "msg_test123"}
            
            # SQSメッセージ送信
            message_data = {
                "type": "subscription_created",
                "user_id": "user_test123",
                "subscription_id": "sub_test123",
                "plan": "basic"
            }
            
            result = await webhook_handler._send_ttl_update_message(message_data)
            
            # 検証
            assert result["success"] is True
            assert result["message_id"] == "msg_test123"
            mock_sqs.send_message.assert_called_once()

    @pytest.mark.asyncio
    async def test_webhook_signature_verification(self, webhook_handler):
        """Webhook署名検証テスト"""
        # 実際のStripe署名検証は外部ライブラリに依存するため、
        # モックを使用してテスト
        with patch('stripe.Webhook.construct_event') as mock_verify:
            mock_verify.return_value = {
                "id": "evt_test",
                "type": "customer.subscription.created",
                "data": {"object": {"id": "sub_test"}}
            }
            
            # 署名検証実行
            payload = json.dumps({"test": "data"})
            signature = "t=123,v1=test_signature"
            secret = "whsec_test_secret"
            
            result = webhook_handler.verify_webhook_signature(payload, signature, secret)
            
            # 検証
            assert result is not None
            mock_verify.assert_called_once_with(payload, signature, secret)

    @pytest.mark.asyncio
    async def test_error_handling_invalid_webhook(self, webhook_handler):
        """無効なWebhook処理エラーハンドリングテスト"""
        # 無効なWebhookイベント
        invalid_event = WebhookEvent(
            id="evt_invalid",
            type="unknown.event.type",
            data={"object": {}},
            created=1640995200
        )
        
        # エラーハンドリング確認
        result = await webhook_handler.process_webhook(invalid_event, {})
        
        # 検証
        assert result["success"] is False
        assert "error" in result

    @pytest.mark.asyncio
    async def test_subscription_cancellation_webhook(self, webhook_handler):
        """サブスクリプション解約Webhookテスト"""
        cancellation_event = WebhookEvent(
            id="evt_cancel",
            type="customer.subscription.deleted",
            data={
                "object": {
                    "id": "sub_test123",
                    "customer": "cus_test123",
                    "status": "canceled",
                    "metadata": {"user_id": "user_test123"}
                }
            },
            created=1640995200
        )
        
        with patch.object(webhook_handler, '_handle_subscription_cancelled', new_callable=AsyncMock) as mock_handler:
            mock_handler.return_value = {
                "success": True,
                "subscription_id": "sub_test123"
            }
            
            # 解約Webhook処理
            result = await webhook_handler.process_webhook(cancellation_event, {})
            
            # 検証
            assert result["success"] is True
            mock_handler.assert_called_once()

    @pytest.mark.asyncio
    async def test_payment_failure_webhook(self, webhook_handler):
        """支払い失敗Webhookテスト"""
        payment_failure_event = WebhookEvent(
            id="evt_payment_failed",
            type="invoice.payment_failed",
            data={
                "object": {
                    "subscription": "sub_test123",
                    "customer": "cus_test123",
                    "metadata": {"user_id": "user_test123"}
                }
            },
            created=1640995200
        )
        
        with patch.object(webhook_handler, '_handle_payment_failed', new_callable=AsyncMock) as mock_handler:
            mock_handler.return_value = {
                "success": True,
                "subscription_id": "sub_test123"
            }
            
            # 支払い失敗Webhook処理  
            result = await webhook_handler.process_webhook(payment_failure_event, {})
            
            # 検証
            assert result["success"] is True
            mock_handler.assert_called_once()

    def test_subscription_model_validation(self):
        """Subscriptionモデルバリデーションテスト"""
        # 正常なデータ
        valid_data = {
            "id": "sub_test123",
            "customer_id": "cus_test123",
            "status": "active",
            "current_period_start": datetime.now(),
            "current_period_end": datetime.now(),
            "cancel_at_period_end": False,
            "plan_id": "price_basic",
            "plan_name": "basic",
            "metadata": {}
        }
        
        subscription = StripeSubscription(**valid_data)
        assert subscription.id == "sub_test123"
        assert subscription.status == "active"
        
        # 無効なデータ（必須フィールド不足）
        with pytest.raises(ValueError):
            StripeSubscription(
                customer_id="cus_test123",
                status="active"
                # id が不足
            )

    @pytest.mark.asyncio
    async def test_health_check_endpoint(self):
        """ヘルスチェックエンドポイントテスト"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "service" in data["data"]
        assert data["data"]["service"] == "webhook_service"
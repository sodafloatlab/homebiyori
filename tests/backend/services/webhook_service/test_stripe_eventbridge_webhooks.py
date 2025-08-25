"""
Stripe EventBridge Webhook Tests

EventBridge経由でのStripe webhook処理のテスト
Issue #28: EventBridge移行対応（webhook_service/stripe構造）
"""

import json
import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timezone
import sys
import os

# webhook_service/stripe モジュールをインポートするためのパス設定
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'backend', 'services', 'webhook_service', 'stripe'))

# Import the EventBridge Lambda handlers
from handlers import handle_payment_succeeded
from handlers import handle_payment_failed  
from handlers import handle_subscription_updated


class TestEventBridgePaymentSucceeded:
    """Payment Succeeded Lambda テスト"""
    
    @pytest.mark.asyncio
    async def test_eventbridge_payment_succeeded_event_structure(self):
        """EventBridge経由のイベント構造をテスト"""
        # EventBridge経由で受信するStripeイベントのモック
        eventbridge_event = {
            "version": "0",
            "id": "12345678-1234-1234-1234-123456789012",
            "detail-type": "Invoice Payment Succeeded",
            "source": "aws.partner/stripe.com/acct_XXXXXXXXXXXXXXXXXX",
            "account": "123456789012",
            "time": "2024-08-25T12:00:00Z",
            "region": "us-east-1",
            "detail": {
                "id": "evt_test_payment_succeeded",
                "type": "invoice.payment_succeeded",
                "api_version": "2020-08-27",
                "created": 1692950000,
                "data": {
                    "object": {
                        "id": "in_test_invoice",
                        "customer": "cus_test_customer",
                        "subscription": "sub_test_subscription",
                        "payment_intent": "pi_test_intent",
                        "amount_paid": 98000,
                        "paid": True,
                        "period_start": 1692950000,
                        "period_end": 1695542000,
                        "currency": "jpy"
                    }
                }
            }
        }
        
        context_mock = Mock()
        
        # WebhookDatabaseのモック
        with patch('handle_payment_succeeded.get_webhook_database') as mock_db_factory:
            mock_db = AsyncMock()
            mock_db_factory.return_value = mock_db
            
            # サブスクリプション情報のモック
            mock_db.get_subscription_by_customer_id.return_value = {
                "user_id": "user_test123",
                "customer_id": "cus_test_customer",
                "created": 1690000000
            }
            mock_db.save_payment_history.return_value = True
            
            # PaymentHistoryモックを設定
            with patch('handle_payment_succeeded.PaymentHistory') as mock_payment_history:
                mock_history_instance = Mock()
                mock_history_instance.stripe_payment_intent_id = "pi_test_intent"
                mock_history_instance.amount = 980
                mock_history_instance.to_dynamodb_item.return_value = {"test": "data"}
                mock_payment_history.from_stripe_invoice.return_value = mock_history_instance
                
                # 実際のLambda関数を呼び出し（async対応）
                result = await handle_payment_succeeded.lambda_handler(eventbridge_event, context_mock)
                
                # 結果の検証
                assert result['statusCode'] == 200
                response_body = json.loads(result['body'])
                assert response_body['data']['processed'] is True
                assert response_body['data']['event_id'] == "evt_test_payment_succeeded"
                
                # モック呼び出しの検証
                mock_db.get_subscription_by_customer_id.assert_called_once_with("cus_test_customer")
                mock_payment_history.from_stripe_invoice.assert_called_once()
                mock_db.save_payment_history.assert_called_once()


class TestEventBridgePaymentFailed:
    """Payment Failed Lambda テスト"""
    
    @pytest.mark.asyncio
    async def test_eventbridge_payment_failed_event_structure(self):
        """EventBridge経由の支払い失敗イベント構造をテスト"""
        eventbridge_event = {
            "version": "0",
            "id": "12345678-1234-1234-1234-123456789012",
            "detail-type": "Invoice Payment Failed",
            "source": "aws.partner/stripe.com/acct_XXXXXXXXXXXXXXXXXX",
            "account": "123456789012",
            "time": "2024-08-25T12:00:00Z",
            "region": "us-east-1",
            "detail": {
                "id": "evt_test_payment_failed",
                "type": "invoice.payment_failed",
                "api_version": "2020-08-27",
                "created": 1692950000,
                "data": {
                    "object": {
                        "id": "in_test_invoice_failed",
                        "customer": "cus_test_customer",
                        "subscription": "sub_test_subscription",
                        "payment_intent": "pi_test_failed_intent",
                        "amount_due": 98000,
                        "paid": False,
                        "attempt_count": 1,
                        "next_payment_attempt": 1693036400,
                        "period_start": 1692950000,
                        "period_end": 1695542000,
                        "currency": "jpy"
                    }
                }
            }
        }
        
        context_mock = Mock()
        
        with patch('handle_payment_failed.get_webhook_database') as mock_db_factory:
            mock_db = AsyncMock()
            mock_db_factory.return_value = mock_db
            
            mock_db.get_subscription_by_customer_id.return_value = {
                "user_id": "user_test123",
                "customer_id": "cus_test_customer",
                "created": 1690000000
            }
            mock_db.save_payment_history.return_value = True
            
            with patch('handle_payment_failed.PaymentHistory') as mock_payment_history:
                mock_history_instance = Mock()
                mock_history_instance.stripe_payment_intent_id = "pi_test_failed_intent"
                mock_history_instance.amount = 980
                mock_history_instance.status = "failed"
                mock_history_instance.to_dynamodb_item.return_value = {"test": "data"}
                mock_payment_history.from_stripe_invoice.return_value = mock_history_instance
                
                result = await handle_payment_failed.lambda_handler(eventbridge_event, context_mock)
                
                assert result['statusCode'] == 200
                response_body = json.loads(result['body'])
                assert response_body['data']['processed'] is True
                assert response_body['data']['event_id'] == "evt_test_payment_failed"


class TestEventBridgeSubscriptionUpdated:
    """Subscription Updated Lambda テスト"""
    
    @pytest.mark.asyncio
    async def test_eventbridge_subscription_updated_event_structure(self):
        """EventBridge経由のサブスクリプション更新イベント構造をテスト"""
        eventbridge_event = {
            "version": "0",
            "id": "12345678-1234-1234-1234-123456789012",
            "detail-type": "Customer Subscription Updated",
            "source": "aws.partner/stripe.com/acct_XXXXXXXXXXXXXXXXXX", 
            "account": "123456789012",
            "time": "2024-08-25T12:00:00Z",
            "region": "us-east-1",
            "detail": {
                "id": "evt_test_subscription_updated",
                "type": "customer.subscription.updated",
                "api_version": "2020-08-27",
                "created": 1692950000,
                "data": {
                    "object": {
                        "id": "sub_test_subscription",
                        "customer": "cus_test_customer",
                        "status": "active",
                        "current_period_start": 1692950000,
                        "current_period_end": 1695542000,
                        "cancel_at_period_end": False,
                        "canceled_at": None,
                        "cancel_at": None,
                        "trial_start": None,
                        "trial_end": None,
                        "metadata": {
                            "user_id": "user_test123"  # billing_service/stripe_client.pyに合わせて修正
                        },
                        "items": {
                            "data": [{
                                "price": {
                                    "id": "price_monthly",
                                    "nickname": "月額プラン"
                                }
                            }]
                        }
                    }
                }
            }
        }
        
        context_mock = Mock()
        
        with patch('handle_subscription_updated.SubscriptionSyncService') as mock_sync_service_class:
            mock_sync_service = AsyncMock()
            mock_sync_service_class.return_value = mock_sync_service
            
            # 既存サブスクリプション取得のモック
            mock_sync_service.get_subscription.return_value = {
                "plan_type": "trial",
                "cancel_at_period_end": False
            }
            
            # サブスクリプション更新のモック
            mock_sync_service.update_subscription.return_value = {"status": "updated"}
            
            result = await handle_subscription_updated.lambda_handler(eventbridge_event, context_mock)
            
            assert result['statusCode'] == 200
            response_body = json.loads(result['body'])
            assert response_body['data']['processed'] is True
            assert response_body['data']['event_id'] == "evt_test_subscription_updated"
            
            # サブスクリプション同期サービスが正しく呼び出されたことを確認
            mock_sync_service.get_subscription.assert_called_once_with("user_test123")
            mock_sync_service.update_subscription.assert_called_once()


class TestEventBridgeErrorHandling:
    """EventBridge エラーハンドリングのテスト"""
    
    @pytest.mark.asyncio
    async def test_unexpected_event_type_handling(self):
        """予期しないイベントタイプの処理をテスト"""
        eventbridge_event = {
            "detail": {
                "id": "evt_unexpected",
                "type": "customer.subscription.deleted",  # 処理対象外
                "data": {"object": {}}
            }
        }
        
        context_mock = Mock()
        
        result = await handle_payment_succeeded.lambda_handler(eventbridge_event, context_mock)
        
        assert result['statusCode'] == 200
        response_body = json.loads(result['body'])
        assert response_body['data']['processed'] is False
        assert response_body['data']['reason'] == "unexpected_event_type"
    
    @pytest.mark.asyncio
    async def test_missing_event_detail(self):
        """EventBridge detailフィールドが欠損している場合のテスト"""
        eventbridge_event = {}  # detailフィールド無し
        context_mock = Mock()
        
        result = await handle_payment_succeeded.lambda_handler(eventbridge_event, context_mock)
        
        assert result['statusCode'] == 400
        response_body = json.loads(result['body'])
        assert "error_code" in response_body
    
    @pytest.mark.asyncio
    async def test_non_subscription_invoice_handling(self):
        """非サブスクリプション請求書の処理をテスト"""
        eventbridge_event = {
            "detail": {
                "id": "evt_one_time_payment",
                "type": "invoice.payment_succeeded",
                "data": {
                    "object": {
                        "id": "in_one_time",
                        "customer": "cus_test",
                        "subscription": None,  # サブスクリプション無し
                        "amount_paid": 50000
                    }
                }
            }
        }
        
        context_mock = Mock()
        
        result = await handle_payment_succeeded.lambda_handler(eventbridge_event, context_mock)
        
        assert result['statusCode'] == 200
        response_body = json.loads(result['body'])
        assert response_body['data']['processed'] is False
        assert response_body['data']['reason'] == "non_subscription_invoice"


class TestEventBridgeIntegration:
    """EventBridge統合テスト"""
    
    @pytest.mark.asyncio
    async def test_eventbridge_vs_legacy_webhook_compatibility(self):
        """EventBridge形式と従来のWebhook形式の互換性テスト"""
        # 従来のAPI Gateway + Webhook形式のイベント
        legacy_webhook_event = {
            "id": "evt_legacy_test",
            "type": "invoice.payment_succeeded",
            "data": {
                "object": {
                    "id": "in_legacy",
                    "customer": "cus_legacy",
                    "subscription": "sub_legacy",
                    "amount_paid": 98000
                }
            }
        }
        
        # EventBridge形式のイベント
        eventbridge_event = {
            "detail": legacy_webhook_event
        }
        
        context_mock = Mock()
        
        with patch('handle_payment_succeeded.get_webhook_database') as mock_db_factory:
            mock_db = AsyncMock()
            mock_db_factory.return_value = mock_db
            
            mock_db.get_subscription_by_customer_id.return_value = {
                "user_id": "user_legacy_test",
                "customer_id": "cus_legacy"
            }
            mock_db.save_payment_history.return_value = True
            
            with patch('handle_payment_succeeded.PaymentHistory') as mock_payment_history:
                mock_history_instance = Mock()
                mock_history_instance.to_dynamodb_item.return_value = {"test": "data"}
                mock_payment_history.from_stripe_invoice.return_value = mock_history_instance
                
                # EventBridge Lambdaで処理
                result = await handle_payment_succeeded.lambda_handler(eventbridge_event, context_mock)
                
                # 同じStripe Eventデータが正しく処理されることを確認
                assert result['statusCode'] == 200
                response_body = json.loads(result['body'])
                assert response_body['data']['event_id'] == "evt_legacy_test"
                
                # 同じデータベース操作が実行されることを確認
                mock_db.get_subscription_by_customer_id.assert_called_with("cus_legacy")
                mock_payment_history.from_stripe_invoice.assert_called_with(
                    legacy_webhook_event["data"]["object"],  # invoice_data
                    "user_legacy_test"  # user_id
                )
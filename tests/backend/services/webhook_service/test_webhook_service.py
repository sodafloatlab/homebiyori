"""
Webhook Service テスト

Stripe Webhook処理とSQS連携のテスト。
"""

import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime
import os

# 環境変数を事前に設定（インポート前に必要）- 4テーブル構成対応
os.environ['CORE_TABLE_NAME'] = 'test-homebiyori-core'
os.environ['STRIPE_WEBHOOK_SECRET'] = 'whsec_test_secret'
os.environ['TTL_UPDATE_QUEUE_URL'] = 'https://sqs.ap-northeast-1.amazonaws.com/123456789012/test-ttl-update-queue'
os.environ['INTERNAL_API_BASE_URL'] = 'https://api.test.homebiyori.jp'
os.environ['INTERNAL_API_KEY'] = 'test_internal_api_key'
os.environ['STRIPE_API_KEY'] = 'sk_test_webhook_secret'
os.environ['AWS_DEFAULT_REGION'] = 'ap-northeast-1'

# テスト対象のインポート
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../../backend/services/webhook_service'))

from backend.services.webhook_service.main import app
from backend.services.webhook_service.models.stripe_models import WebhookEvent, StripeSubscription
from backend.services.webhook_service.services.subscription_sync import SubscriptionSyncService


class TestWebhookService:
    """Webhook Service テストクラス"""
    
    @pytest.fixture  
    def subscription_sync(self):
        """SubscriptionSyncServiceフィクスチャ"""
        return SubscriptionSyncService()
    
    @pytest.fixture
    def sample_webhook_event(self):
        """サンプルWebhookイベント"""
        return {
            "id": "evt_test_webhook",
            "type": "customer.subscription.created",
            "data": {
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
            "created": 1640995200
        }
    
    @pytest.fixture
    def sample_subscription(self):
        """サンプルStripeサブスクリプション"""
        from backend.services.webhook_service.models.stripe_models import StripeSubscription, SubscriptionStatus, PlanType
        return StripeSubscription(
            id="sub_test123",
            customer="cus_test123", 
            status=SubscriptionStatus.ACTIVE,
            current_period_start=1640995200,
            current_period_end=1643673600,
            created=1640995200,  # created フィールド追加
            metadata={"user_id": "user_test123", "plan_type": "basic"}
        )

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
            assert result["status"] == "success"
            assert result["subscription_id"] == "sub_test123"
            mock_put.assert_called_once()

    @pytest.mark.asyncio
    async def test_subscription_sync_update(self, subscription_sync, sample_subscription):
        """サブスクリプション同期更新テスト"""
        with patch.object(subscription_sync.db_client, 'get_item', new_callable=AsyncMock) as mock_get:
            with patch.object(subscription_sync.db_client, 'update_item', new_callable=AsyncMock) as mock_update:
                # 既存データをモック
                mock_get.return_value = {
                    "user_id": "user_test123",
                    "subscription_id": "sub_test123",
                    "plan_type": "free",
                    "status": "active"
                }
                mock_update.return_value = True
                
                # サブスクリプション更新
                result = await subscription_sync.update_subscription(
                    sample_subscription,
                    "user_test123"
                )
                
                # 検証（update_itemは2回呼ばれる：SUBSCRIPTIONとPROFILE）
                assert result["status"] == "success"
                assert mock_update.call_count == 2

    @pytest.mark.asyncio
    async def test_subscription_sync_get(self, subscription_sync):
        """サブスクリプション取得テスト"""
        with patch.object(subscription_sync.db_client, 'get_item', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {
                "user_id": "user_test123",
                "subscription_id": "sub_test123"
            }
            
            # サブスクリプション取得
            result = await subscription_sync.get_subscription("user_test123")
            
            # 検証
            assert result is not None
            assert result["subscription_id"] == "sub_test123"
            mock_get.assert_called_once()

    @pytest.mark.asyncio
    async def test_subscription_sync_get_by_stripe_id(self, subscription_sync):
        """Stripe IDによるサブスクリプション取得テスト"""
        with patch.object(subscription_sync.db_client, 'query_gsi', new_callable=AsyncMock) as mock_query:
            # ResultオブジェクトのようなレスポンスをモックA
            class MockResult:
                def __init__(self, items):
                    self.items = items
            
            mock_query.return_value = MockResult([{
                "user_id": "user_test123",
                "subscription_id": "sub_test123"
            }])
            
            # Stripe IDでサブスクリプション取得
            result = await subscription_sync.get_subscription_by_stripe_id("sub_test123")
            
            # 検証
            assert result is not None
            assert result["subscription_id"] == "sub_test123"
            mock_query.assert_called_once()

    def test_subscription_model_validation(self):
        """Subscriptionモデルバリデーションテスト"""
        from backend.services.webhook_service.models.stripe_models import StripeSubscription, SubscriptionStatus, PlanType
        
        # 正常なデータ
        subscription = StripeSubscription(
            id="sub_test123",
            customer="cus_test123",
            status=SubscriptionStatus.ACTIVE,
            current_period_start=1640995200,
            current_period_end=1643673600,
            created=1640995200,
            metadata={"plan_type": "basic"}
        )
        assert subscription.id == "sub_test123"
        assert subscription.status == SubscriptionStatus.ACTIVE
        assert subscription.plan_type == PlanType.BASIC

    @pytest.mark.asyncio
    async def test_health_check_endpoint(self):
        """ヘルスチェックエンドポイントテスト"""
        from fastapi.testclient import TestClient
        import json
        
        client = TestClient(app)
        response = client.get("/health")
        
        assert response.status_code == 200
        response_data = response.json()
        
        # Lambda形式レスポンスの場合はbodyをパース
        if "body" in response_data:
            data = json.loads(response_data["body"])
        else:
            data = response_data
        
        # レスポンス構造確認
        assert "data" in data
        assert data["success"] == True
        # サービス名確認
        assert data["data"]["service"] == "webhook-service"

    @pytest.mark.asyncio
    async def test_webhook_endpoint_structure(self):
        """Webhook エンドポイント構造テスト"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        
        # GETメソッドでWebhookエンドポイントにアクセス（Method Not Allowed）
        response = client.get("/webhook/stripe")
        
        # WebhookはPOSTのみなので405 Method Not Allowedが返されることを確認
        assert response.status_code == 405

    @pytest.mark.asyncio 
    async def test_queue_service_environment_variables(self):
        """QueueService環境変数テスト"""
        from backend.services.webhook_service.services.queue_service import QueueService
        
        # 環境変数が正しく設定されていることを確認
        queue_service = QueueService()
        assert queue_service.ttl_queue_url is not None
        assert "test-ttl-update-queue" in queue_service.ttl_queue_url

    @pytest.mark.asyncio
    async def test_database_client_initialization(self, subscription_sync):
        """データベースクライアント初期化テスト"""
        # DynamoDBClientが正常に初期化されていることを確認
        assert subscription_sync.db_client is not None
        
        # テーブル名が環境変数から取得されていることを確認
        assert "homebiyori" in subscription_sync.db_client.table_name
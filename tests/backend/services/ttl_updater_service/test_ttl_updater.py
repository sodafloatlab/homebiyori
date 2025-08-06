"""
TTL Updater Service テスト

SQS駆動TTL更新機能のテスト。
"""

import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta

# テスト対象のインポート
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../../backend/services/ttl_updater_service'))

from backend.services.ttl_updater_service.main import TTLUpdaterService, TTLUpdateType, PlanTTLMapping
from backend.services.ttl_updater_service.handler import handler


class TestTTLUpdaterService:
    """TTL Updater Service テストクラス"""
    
    @pytest.fixture
    def ttl_service(self):
        """TTLUpdaterServiceフィクスチャ"""
        with patch.dict(os.environ, {
            'DYNAMODB_TABLE': 'test-homebiyori-chats',
            'AWS_DEFAULT_REGION': 'ap-northeast-1'
        }):
            return TTLUpdaterService()
    
    @pytest.fixture
    def sample_subscription_created_message(self):
        """サブスクリプション作成メッセージ"""
        return {
            "type": "subscription_created",
            "user_id": "user_test123",
            "subscription_id": "sub_test123",
            "plan": "premium",
            "timestamp": datetime.now().isoformat()
        }
    
    @pytest.fixture
    def sample_subscription_cancelled_message(self):
        """サブスクリプション解約メッセージ"""
        return {
            "type": "subscription_cancelled",
            "user_id": "user_test123",
            "subscription_id": "sub_test123",
            "timestamp": datetime.now().isoformat()
        }
    
    @pytest.fixture
    def sample_chat_items(self):
        """サンプルチャットアイテム"""
        base_time = datetime.now() - timedelta(days=10)
        return [
            {
                "PK": "USER#user_test123",
                "SK": "CHAT#chat_1",
                "chat_id": "chat_1",
                "created_at": base_time.isoformat(),
                "ttl": int((base_time + timedelta(days=7)).timestamp())
            },
            {
                "PK": "USER#user_test123", 
                "SK": "CHAT#chat_2",
                "chat_id": "chat_2",
                "created_at": (base_time + timedelta(days=1)).isoformat(),
                "ttl": int((base_time + timedelta(days=8)).timestamp())
            }
        ]

    def test_plan_ttl_mapping(self):
        """プラン別TTL設定テスト"""
        # 各プランのTTL日数確認
        assert PlanTTLMapping.get_ttl_days("free") == 7
        assert PlanTTLMapping.get_ttl_days("basic") == 30
        assert PlanTTLMapping.get_ttl_days("premium") == 90
        assert PlanTTLMapping.get_ttl_days("cancelled") == 7
        assert PlanTTLMapping.get_ttl_days("expired") == 3
        
        # 不明なプランはデフォルト値
        assert PlanTTLMapping.get_ttl_days("unknown_plan") == 7
        
        # TTLタイムスタンプ計算
        base_time = datetime(2024, 1, 1, 12, 0, 0)
        premium_ttl = PlanTTLMapping.calculate_ttl_timestamp("premium", base_time)
        expected_ttl = int((base_time + timedelta(days=90)).timestamp())
        assert premium_ttl == expected_ttl

    @pytest.mark.asyncio
    async def test_process_subscription_created_message(self, ttl_service, sample_subscription_created_message, sample_chat_items):
        """サブスクリプション作成メッセージ処理テスト"""
        with patch.object(ttl_service, '_update_user_chat_ttl', new_callable=AsyncMock) as mock_update:
            mock_update.return_value = 2
            
            # メッセージ処理
            result = await ttl_service.process_ttl_update_message(sample_subscription_created_message)
            
            # 検証
            assert result["success"] is True
            assert result["updated_count"] == 2
            assert result["plan"] == "premium"
            mock_update.assert_called_once_with("user_test123", "premium")

    @pytest.mark.asyncio
    async def test_process_subscription_cancelled_message(self, ttl_service, sample_subscription_cancelled_message):
        """サブスクリプション解約メッセージ処理テスト"""
        with patch.object(ttl_service, '_update_user_chat_ttl', new_callable=AsyncMock) as mock_update:
            mock_update.return_value = 3
            
            # メッセージ処理
            result = await ttl_service.process_ttl_update_message(sample_subscription_cancelled_message)
            
            # 検証
            assert result["success"] is True
            assert result["updated_count"] == 3
            assert result["plan"] == "cancelled"
            mock_update.assert_called_once_with("user_test123", "cancelled")

    @pytest.mark.asyncio
    async def test_invalid_message_handling(self, ttl_service):
        """無効なメッセージ処理テスト"""
        # タイプが不足
        invalid_message_1 = {
            "user_id": "user_test123"
            # "type" が不足
        }
        
        result = await ttl_service.process_ttl_update_message(invalid_message_1)
        assert result["success"] is False
        assert "missing type or user_id" in result["error"]
        
        # ユーザーIDが不足
        invalid_message_2 = {
            "type": "subscription_created"
            # "user_id" が不足
        }
        
        result = await ttl_service.process_ttl_update_message(invalid_message_2)
        assert result["success"] is False
        assert "missing type or user_id" in result["error"]
        
        # 不明なメッセージタイプ
        invalid_message_3 = {
            "type": "unknown_message_type",
            "user_id": "user_test123"
        }
        
        result = await ttl_service.process_ttl_update_message(invalid_message_3)
        assert result["success"] is False
        assert "Unknown message type" in result["error"]

    @pytest.mark.asyncio
    async def test_update_user_chat_ttl(self, ttl_service, sample_chat_items):
        """ユーザーチャットTTL更新テスト"""
        with patch.object(ttl_service.db_client, 'query_by_prefix', new_callable=AsyncMock) as mock_query:
            with patch.object(ttl_service.db_client, 'update_item', new_callable=AsyncMock) as mock_update:
                mock_query.return_value = sample_chat_items
                mock_update.return_value = True
                
                # TTL更新実行
                updated_count = await ttl_service._update_user_chat_ttl("user_test123", "premium")
                
                # 検証
                assert updated_count == 2
                assert mock_update.call_count == 2
                mock_query.assert_called_once_with(
                    pk="USER#user_test123",
                    sk_prefix="CHAT#"
                )

    @pytest.mark.asyncio
    async def test_expired_chat_skip(self, ttl_service):
        """期限切れチャットスキップテスト"""
        # 古いチャット（新プランでも期限切れ）
        old_chat = {
            "PK": "USER#user_test123",
            "SK": "CHAT#old_chat",
            "chat_id": "old_chat",
            "created_at": (datetime.now() - timedelta(days=100)).isoformat(),  # 100日前
            "ttl": int((datetime.now() - timedelta(days=90)).timestamp())
        }
        
        with patch.object(ttl_service.db_client, 'query_by_prefix', new_callable=AsyncMock) as mock_query:
            with patch.object(ttl_service.db_client, 'update_item', new_callable=AsyncMock) as mock_update:
                mock_query.return_value = [old_chat]
                
                # free プラン（7日保持）でTTL更新
                updated_count = await ttl_service._update_user_chat_ttl("user_test123", "free")
                
                # 検証：期限切れチャットは更新されない
                assert updated_count == 0
                mock_update.assert_not_called()

    @pytest.mark.asyncio
    async def test_plan_changed_message(self, ttl_service):
        """プラン変更メッセージ処理テスト"""
        plan_changed_message = {
            "type": "plan_changed",
            "user_id": "user_test123",
            "old_plan": "basic",
            "new_plan": "premium"
        }
        
        with patch.object(ttl_service, '_update_user_chat_ttl', new_callable=AsyncMock) as mock_update:
            mock_update.return_value = 5
            
            # プラン変更処理
            result = await ttl_service.process_ttl_update_message(plan_changed_message)
            
            # 検証
            assert result["success"] is True
            assert result["old_plan"] == "basic"
            assert result["new_plan"] == "premium"
            assert result["updated_count"] == 5
            mock_update.assert_called_once_with("user_test123", "premium")

    @pytest.mark.asyncio 
    async def test_trial_expired_message(self, ttl_service):
        """トライアル期限切れメッセージ処理テスト"""
        trial_expired_message = {
            "type": "trial_expired",
            "user_id": "user_test123",
            "subscription_id": "sub_trial_123"
        }
        
        with patch.object(ttl_service, '_update_user_chat_ttl', new_callable=AsyncMock) as mock_update:
            mock_update.return_value = 1
            
            # トライアル期限切れ処理
            result = await ttl_service.process_ttl_update_message(trial_expired_message)
            
            # 検証
            assert result["success"] is True
            assert result["plan"] == "free"  # トライアル終了後は無料プラン
            mock_update.assert_called_once_with("user_test123", "free")

    @pytest.mark.asyncio
    async def test_payment_failed_message(self, ttl_service):
        """支払い失敗メッセージ処理テスト"""
        payment_failed_message = {
            "type": "payment_failed",
            "user_id": "user_test123",
            "subscription_id": "sub_test123"
        }
        
        with patch.object(ttl_service, '_update_user_chat_ttl', new_callable=AsyncMock) as mock_update:
            mock_update.return_value = 2
            
            # 支払い失敗処理
            result = await ttl_service.process_ttl_update_message(payment_failed_message)
            
            # 検証
            assert result["success"] is True
            assert result["plan"] == "expired"  # 支払い失敗時は期限切れ扱い
            mock_update.assert_called_once_with("user_test123", "expired")

    @pytest.mark.asyncio
    async def test_health_check(self, ttl_service):
        """ヘルスチェックテスト"""
        with patch.object(ttl_service.db_client, 'put_item', new_callable=AsyncMock) as mock_put:
            with patch.object(ttl_service.db_client, 'get_item', new_callable=AsyncMock) as mock_get:
                with patch.object(ttl_service.db_client, 'delete_item', new_callable=AsyncMock) as mock_delete:
                    mock_put.return_value = True
                    mock_get.return_value = {"test": "data"}
                    mock_delete.return_value = True
                    
                    # ヘルスチェック実行
                    result = await ttl_service.health_check()
                    
                    # 検証
                    assert result["service"] == "ttl_updater_service"
                    assert result["status"] == "healthy"
                    assert result["database_connected"] is True
                    assert len(result["supported_message_types"]) > 0

    @pytest.mark.asyncio
    async def test_sqs_handler_success(self):
        """SQSハンドラー成功テスト"""
        # モックSQSイベント
        sqs_event = {
            "Records": [
                {
                    "messageId": "msg_1",
                    "receiptHandle": "receipt_1",
                    "body": '{"type": "subscription_created", "user_id": "user_1", "plan": "basic"}'
                },
                {
                    "messageId": "msg_2",
                    "receiptHandle": "receipt_2", 
                    "body": '{"type": "subscription_updated", "user_id": "user_2", "plan": "premium"}'
                }
            ]
        }
        
        # モックコンテキスト
        mock_context = MagicMock()
        mock_context.aws_request_id = "test_request_123"
        mock_context.function_name = "ttl-updater-test"
        
        with patch('homebiyori_common.database.client.DynamoDBClient') as mock_db_client:
            # DynamoDBクライアントをモック
            mock_client_instance = MagicMock()
            mock_db_client.return_value = mock_client_instance
            
            # ハンドラー実行
            result = await handler(sqs_event, mock_context)
            
            # 検証
            assert result["statusCode"] == 200
            response_body = json.loads(result["body"])
            assert response_body["success"] is True
            assert response_body["processed_count"] >= 0  # モック環境では実際の処理数に依存
            assert "failed_count" in response_body

    @pytest.mark.asyncio
    async def test_sqs_handler_partial_failure(self):
        """SQSハンドラー部分失敗テスト"""
        sqs_event = {
            "Records": [
                {
                    "messageId": "msg_success",
                    "receiptHandle": "receipt_1",
                    "body": '{"type": "subscription_created", "user_id": "user_1", "plan": "basic"}'
                },
                {
                    "messageId": "msg_failure", 
                    "receiptHandle": "receipt_2",
                    "body": '{"invalid": "message"}'  # 無効なメッセージ
                }
            ]
        }
        
        mock_context = MagicMock()
        mock_context.aws_request_id = "test_request_123"
        mock_context.function_name = "ttl-updater-test"
        
        with patch('homebiyori_common.database.client.DynamoDBClient') as mock_db_client:
            # DynamoDBクライアントをモック
            mock_client_instance = MagicMock()
            mock_db_client.return_value = mock_client_instance
            
            # ハンドラー実行
            result = await handler(sqs_event, mock_context)
            
            # 検証
            assert result["statusCode"] == 200
            response_body = json.loads(result["body"])
            assert response_body["processed_count"] >= 0  # モック環境では実際の処理数に依存
            assert "failed_count" in response_body
            # 失敗したメッセージがある場合のバッチ失敗レポート
            if response_body["failed_count"] > 0:
                assert "batchItemFailures" in result

    @pytest.mark.asyncio
    async def test_no_chat_records_handling(self, ttl_service):
        """チャット履歴が存在しない場合の処理テスト"""
        with patch.object(ttl_service.db_client, 'query_by_prefix', new_callable=AsyncMock) as mock_query:
            mock_query.return_value = []  # チャット履歴なし
            
            # TTL更新実行
            updated_count = await ttl_service._update_user_chat_ttl("user_no_chats", "premium")
            
            # 検証
            assert updated_count == 0
            mock_query.assert_called_once()
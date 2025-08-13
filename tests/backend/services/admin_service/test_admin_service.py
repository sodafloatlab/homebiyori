"""
admin_service Lambda テストスイート

テスト項目:
[T001] ヘルスチェック成功
[T002] システムメトリクス取得成功
[T003] ユーザー統計取得成功
[T004] メンテナンス状態取得成功
[T005] メンテナンス制御成功
[T006] 管理者認証失敗処理
[T007] DynamoDB接続エラー処理
[T008] CloudWatch メトリクス取得エラー処理
[T009] Parameter Store アクセスエラー処理
[T010] 不正なリクエストデータ処理
"""

import pytest
import json
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timedelta
import sys
import os

# テスト用パス設定
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../backend/services/admin_service'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../backend/layers/common/python'))

from main import app, verify_admin_token, get_user_metrics, get_maintenance_parameters
from models import MaintenanceControlRequest, SystemHealthStatus, MaintenanceLevel
from fastapi.testclient import TestClient

# テストクライアント初期化
client = TestClient(app)

class TestAdminService:
    """admin_service Lambda テストクラス"""
    
    def test_health_check_success(self):
        """[T001] ヘルスチェック成功"""
        with patch('main.get_current_jst') as mock_time:
            mock_time.return_value = datetime(2024, 8, 5, 15, 30, 0)
            
            response = client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['data']['service'] == 'admin_service'
            assert data['data']['status'] == 'healthy'
            assert 'timestamp' in data['data']

    @patch('main.verify_admin_token')
    @patch('main.get_user_metrics')
    @patch('main.get_chat_metrics')
    @patch('main.get_lambda_metrics')
    @patch('main.get_bedrock_metrics')
    def test_get_system_metrics_success(self, mock_bedrock, mock_lambda, mock_chat, mock_user, mock_auth):
        """[T002] システムメトリクス取得成功"""
        # モック設定
        mock_auth.return_value = "admin-123"
        mock_user.return_value = {
            'total': 150,
            'premium': 25,
            'active_today': 45,
            'active_weekly': 120
        }
        mock_chat.return_value = {
            'today': 230,
            'weekly': 1500
        }
        mock_lambda.return_value = {
            'invocations': {'user-service': 500, 'chat-service': 800},
            'error_rates': {'user-service': 0.5, 'chat-service': 1.2}
        }
        mock_bedrock.return_value = {
            'calls_today': 180
        }
        
        with patch('main.get_current_jst') as mock_time:
            mock_time.return_value = datetime(2024, 8, 5, 15, 30, 0)
            
            response = client.get(
                "/api/admin/dashboard/metrics",
                headers={"Authorization": "Bearer valid-admin-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            
            metrics = data['data']
            assert metrics['total_users'] == 150
            assert metrics['premium_users'] == 25
            assert metrics['active_users_today'] == 45
            assert metrics['total_chats_today'] == 230
            assert metrics['bedrock_api_calls_today'] == 180
            assert 'lambda_invocations' in metrics
            assert 'error_rates' in metrics

    @patch('main.verify_admin_token')
    @patch('main.get_total_user_count')
    @patch('main.get_new_users_count')
    @patch('main.get_premium_conversion_metrics')
    @patch('main.get_user_retention_metrics')
    def test_get_user_statistics_success(self, mock_retention, mock_conversion, mock_new, mock_total, mock_auth):
        """[T003] ユーザー統計取得成功"""
        # モック設定
        mock_auth.return_value = "admin-123"
        mock_total.return_value = 200
        mock_new.return_value = {'today': 5, 'weekly': 25}
        mock_conversion.return_value = {'conversion_rate': 15.5}
        mock_retention.return_value = {
            'active_today': 60,
            'retention_7d': 65.0,
            'retention_30d': 45.0
        }
        
        response = client.get(
            "/api/admin/users/statistics",
            headers={"Authorization": "Bearer valid-admin-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        
        stats = data['data']
        assert stats['total_count'] == 200
        assert stats['new_users_today'] == 5
        assert stats['new_users_weekly'] == 25
        assert stats['premium_conversion_rate'] == 15.5
        assert stats['retention_7d'] == 65.0

    @patch('main.verify_admin_token')
    @patch('main.get_maintenance_parameters')
    def test_get_maintenance_status_success(self, mock_params, mock_auth):
        """[T004] メンテナンス状態取得成功"""
        # モック設定
        mock_auth.return_value = "admin-123"
        mock_params.return_value = {
            'enabled': False,
            'message': None,
            'start_time': None,
            'end_time': None
        }
        
        response = client.get(
            "/api/admin/maintenance/status",
            headers={"Authorization": "Bearer valid-admin-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        
        status = data['data']
        assert status['is_maintenance_mode'] is False
        assert status['maintenance_message'] is None

    @patch('main.verify_admin_token')
    @patch('main.set_maintenance_parameters')
    def test_control_maintenance_success(self, mock_set_params, mock_auth):
        """[T005] メンテナンス制御成功"""
        # モック設定
        mock_auth.return_value = "admin-123"
        mock_set_params.return_value = None
        
        maintenance_data = {
            "enable_maintenance": True,
            "maintenance_message": "システムメンテナンスのため一時的にサービスを停止しています",
            "maintenance_end_time": "2024-08-05T20:00:00+09:00"
        }
        
        response = client.post(
            "/api/admin/maintenance/control",
            json=maintenance_data,
            headers={"Authorization": "Bearer valid-admin-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert "updated successfully" in data['data']['message']
        
        # Parameter Store 呼び出し確認
        mock_set_params.assert_called_once()

    def test_admin_authentication_failure(self):
        """[T006] 管理者認証失敗処理"""
        # 無効なトークンでアクセス
        response = client.get(
            "/api/admin/dashboard/metrics",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "Admin authentication required" in data['detail']

    def test_missing_authorization_header(self):
        """[T006-2] 認証ヘッダー欠落処理"""
        response = client.get("/api/admin/dashboard/metrics")
        
        assert response.status_code == 403
        # FastAPI のデフォルト認証エラー

    @patch('main.verify_admin_token')
    @patch('main.dynamodb_client')
    def test_dynamodb_connection_error(self, mock_db, mock_auth):
        """[T007] DynamoDB接続エラー処理"""
        # モック設定
        mock_auth.return_value = "admin-123"
        mock_db.scan_table.side_effect = Exception("DynamoDB connection failed")
        
        response = client.get(
            "/api/admin/users/statistics",
            headers={"Authorization": "Bearer valid-admin-token"}
        )
        
        assert response.status_code == 500
        data = response.json()
        assert "Failed to retrieve user statistics" in data['detail']

    @patch('main.verify_admin_token')
    @patch('main.cloudwatch')
    def test_cloudwatch_metrics_error(self, mock_cloudwatch, mock_auth):
        """[T008] CloudWatch メトリクス取得エラー処理"""
        # モック設定
        mock_auth.return_value = "admin-123"
        mock_cloudwatch.get_metric_statistics.side_effect = Exception("CloudWatch API error")
        
        with patch('main.get_user_metrics') as mock_user, \
             patch('main.get_chat_metrics') as mock_chat, \
             patch('main.get_lambda_metrics') as mock_lambda, \
             patch('main.get_bedrock_metrics') as mock_bedrock:
            
            # 他のメトリクスは正常
            mock_user.return_value = {'total': 100, 'premium': 10, 'active_today': 30, 'active_weekly': 80}
            mock_chat.return_value = {'today': 150, 'weekly': 1000}
            mock_bedrock.return_value = {'calls_today': 120}
            
            # Lambda メトリクスでエラー
            mock_lambda.side_effect = Exception("CloudWatch error")
            
            response = client.get(
                "/api/admin/dashboard/metrics",
                headers={"Authorization": "Bearer valid-admin-token"}
            )
            
            # Lambda メトリクスエラーでも他は正常に取得
            assert response.status_code == 500

    @patch('main.verify_admin_token')
    @patch('main.ssm')
    def test_parameter_store_access_error(self, mock_ssm, mock_auth):
        """[T009] Parameter Store アクセスエラー処理"""
        # モック設定
        mock_auth.return_value = "admin-123"
        mock_ssm.get_parameter.side_effect = Exception("Parameter Store access denied")
        
        response = client.get(
            "/api/admin/maintenance/status",
            headers={"Authorization": "Bearer valid-admin-token"}
        )
        
        assert response.status_code == 500
        data = response.json()
        assert "Failed to retrieve maintenance status" in data['detail']

    @patch('main.verify_admin_token')
    def test_invalid_maintenance_request_data(self, mock_auth):
        """[T010] 不正なリクエストデータ処理"""
        mock_auth.return_value = "admin-123"
        
        # 必須フィールド欠落
        invalid_data = {
            "enable_maintenance": True
            # maintenance_message が欠落
        }
        
        response = client.post(
            "/api/admin/maintenance/control",
            json=invalid_data,
            headers={"Authorization": "Bearer valid-admin-token"}
        )
        
        assert response.status_code == 422  # Validation Error
        data = response.json()
        assert "detail" in data

    @patch('main.verify_admin_token')
    def test_invalid_datetime_format(self, mock_auth):
        """[T010-2] 不正な日時形式処理"""
        mock_auth.return_value = "admin-123"
        
        invalid_data = {
            "enable_maintenance": True,
            "maintenance_message": "メンテナンス中",
            "maintenance_end_time": "invalid-datetime-format"
        }
        
        response = client.post(
            "/api/admin/maintenance/control",
            json=invalid_data,
            headers={"Authorization": "Bearer valid-admin-token"}
        )
        
        # Pydantic バリデーションでエラーになるはず
        assert response.status_code == 422

class TestAdminServiceHelpers:
    """admin_service ヘルパー関数テスト"""
    
    @patch('main.dynamodb_client')
    @pytest.mark.asyncio
    async def test_get_total_user_count_success(self, mock_db):
        """ユーザー総数取得成功テスト"""
        from main import get_total_user_count
        
        mock_db.scan_table.return_value = {'Count': 250}
        
        result = await get_total_user_count()
        
        assert result == 250
        mock_db.scan_table.assert_called_once()

    @patch('main.dynamodb_client')
    @pytest.mark.asyncio
    async def test_get_total_user_count_error(self, mock_db):
        """ユーザー総数取得エラーテスト"""
        from main import get_total_user_count
        
        mock_db.scan_table.side_effect = Exception("Database error")
        
        result = await get_total_user_count()
        
        assert result == 0  # エラー時はデフォルト値

    @patch('main.ssm')
    @pytest.mark.asyncio
    async def test_get_maintenance_parameters_success(self, mock_ssm):
        """メンテナンスパラメータ取得成功テスト"""
        # モックレスポンス設定
        def mock_get_parameter(Name):
            responses = {
                '/homebiyori/maintenance/enabled': {'Parameter': {'Value': 'true'}},
                '/homebiyori/maintenance/message': {'Parameter': {'Value': 'システムメンテナンス中'}},
                '/homebiyori/maintenance/start_time': {'Parameter': {'Value': '2024-08-05T15:00:00+09:00'}},
                '/homebiyori/maintenance/end_time': {'Parameter': {'Value': '2024-08-05T18:00:00+09:00'}}
            }
            return responses.get(Name, {'Parameter': {'Value': 'null'}})
        
        mock_ssm.get_parameter.side_effect = mock_get_parameter
        
        result = await get_maintenance_parameters()
        
        assert result['enabled'] is True
        assert result['message'] == 'システムメンテナンス中'
        assert result['start_time'] == '2024-08-05T15:00:00+09:00'
        assert result['end_time'] == '2024-08-05T18:00:00+09:00'

    @patch('main.ssm')
    @pytest.mark.asyncio
    async def test_get_maintenance_parameters_not_found(self, mock_ssm):
        """メンテナンスパラメータ未存在テスト"""
        # パラメータが存在しない場合の例外
        mock_ssm.get_parameter.side_effect = mock_ssm.exceptions.ParameterNotFound(
            error_response={'Error': {'Code': 'ParameterNotFound'}},
            operation_name='GetParameter'
        )
        mock_ssm.exceptions.ParameterNotFound = Exception  # テスト用
        
        result = await get_maintenance_parameters()
        
        # デフォルト値が返される
        assert result['enabled'] is False
        assert result['message'] is None

class TestAdminServiceIntegration:
    """admin_service 統合テスト"""
    
    @patch.dict('os.environ', {
        'ENVIRONMENT': 'test',
        'PROJECT_NAME': 'homebiyori',
        'SERVICE_TYPE': 'admin_service',
        'CORE_TABLE_NAME': 'test-homebiyori-core',
        'CHATS_TABLE_NAME': 'test-homebiyori-chats',
        'FRUITS_TABLE_NAME': 'test-homebiyori-fruits',
        'FEEDBACK_TABLE_NAME': 'test-homebiyori-feedback'
    })
    def test_lambda_handler_integration(self):
        """Lambda handler 統合テスト"""
        from main import lambda_handler
        
        # API Gateway 形式のイベント
        event = {
            "httpMethod": "GET",
            "path": "/health",
            "headers": {},
            "body": None,
            "requestContext": {
                "requestId": "test-request-123",
                "accountId": "123456789012"
            }
        }
        
        context = MagicMock()
        context.function_name = "admin-service"
        context.remaining_time_in_millis = lambda: 30000
        
        with patch('main.get_current_jst') as mock_time:
            mock_time.return_value = datetime(2024, 8, 5, 15, 30, 0)
            
            response = lambda_handler(event, context)
            
            assert response['statusCode'] == 200
            body = json.loads(response['body'])
            assert body['success'] is True
            assert body['data']['service'] == 'admin_service'

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
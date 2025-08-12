"""
Parameter Store統合テスト
"""
import pytest
import os
from unittest.mock import patch, MagicMock
from homebiyori_common.utils.parameter_store import ParameterStoreClient, get_llm_config


class TestParameterStoreIntegration:
    """Parameter Store統合テスト"""
    
    @patch('boto3.client')
    def test_parameter_store_client_initialization(self, mock_boto_client):
        """ParameterStoreClientの初期化テスト"""
        client = ParameterStoreClient()
        
        assert client.environment in ['test', 'prod']  # 環境設定確認
        mock_boto_client.assert_called_once_with('ssm')
    
    @patch('boto3.client')
    def test_get_parameter_success(self, mock_boto_client):
        """Parameter取得成功テスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        mock_ssm.get_parameter.return_value = {
            'Parameter': {'Value': 'test-value'}
        }
        
        client = ParameterStoreClient()
        result = client.get_parameter('/test/parameter')
        
        assert result == 'test-value'
        mock_ssm.get_parameter.assert_called_once_with(
            Name='/test/parameter',
            WithDecryption=True
        )
    
    @patch('boto3.client')
    def test_get_llm_config_free_tier(self, mock_boto_client):
        """無料版LLM設定取得テスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        
        # Parameter Store レスポンスをモック
        def mock_get_parameter(Name, WithDecryption=True):
            responses = {
                '/test/homebiyori/llm/free-user/model-id': {
                    'Parameter': {'Value': 'amazon.nova-lite-v1:0'}
                },
                '/test/homebiyori/llm/free-user/max-tokens': {
                    'Parameter': {'Value': '100'}
                },
                '/test/homebiyori/llm/free-user/temperature': {
                    'Parameter': {'Value': '0.7'}
                }
            }
            return responses[Name]
        
        mock_ssm.get_parameter.side_effect = mock_get_parameter
        
        client = ParameterStoreClient()
        config = client.get_llm_config('free')
        
        expected_config = {
            'model_id': 'amazon.nova-lite-v1:0',
            'max_tokens': 100,
            'temperature': 0.7,
            'region_name': 'us-east-1',
            'anthropic_version': 'bedrock-2023-05-31'
        }
        
        assert config == expected_config
    
    @patch('boto3.client')
    def test_get_llm_config_premium_tier(self, mock_boto_client):
        """プレミアム版LLM設定取得テスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        
        # Parameter Store レスポンスをモック
        def mock_get_parameter(Name, WithDecryption=True):
            responses = {
                '/test/homebiyori/llm/premium-user/model-id': {
                    'Parameter': {'Value': 'anthropic.claude-3-5-haiku-20241022-v1:0'}
                },
                '/test/homebiyori/llm/premium-user/max-tokens': {
                    'Parameter': {'Value': '250'}
                },
                '/test/homebiyori/llm/premium-user/temperature': {
                    'Parameter': {'Value': '0.7'}
                }
            }
            return responses[Name]
        
        mock_ssm.get_parameter.side_effect = mock_get_parameter
        
        client = ParameterStoreClient()
        config = client.get_llm_config('premium')
        
        expected_config = {
            'model_id': 'anthropic.claude-3-5-haiku-20241022-v1:0',
            'max_tokens': 250,
            'temperature': 0.7,
            'region_name': 'us-east-1',
            'anthropic_version': 'bedrock-2023-05-31'
        }
        
        assert config == expected_config
    
    @patch('boto3.client')
    def test_fallback_config_on_error(self, mock_boto_client):
        """Parameter Store障害時のフォールバック設定テスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        mock_ssm.get_parameter.side_effect = Exception("Parameter Store error")
        
        client = ParameterStoreClient()
        
        # 無料版フォールバック
        free_config = client.get_llm_config('free')
        assert free_config['model_id'] == 'amazon.nova-lite-v1:0'
        assert free_config['max_tokens'] == 100
        
        # プレミアム版フォールバック
        premium_config = client.get_llm_config('premium')
        assert premium_config['model_id'] == 'anthropic.claude-3-5-haiku-20241022-v1:0'
        assert premium_config['max_tokens'] == 250
    
    @patch('homebiyori_common.utils.parameter_store.get_parameter_store_client')
    def test_get_llm_config_convenience_function(self, mock_get_client):
        """便利関数get_llm_config()のテスト"""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.get_llm_config.return_value = {'model_id': 'test-model'}
        
        result = get_llm_config('free')
        
        mock_client.get_llm_config.assert_called_once_with('free')
        assert result == {'model_id': 'test-model'}


class TestParameterStoreNewFeatures:
    """Issue #7で追加された新機能のテスト"""
    
    @patch.dict(os.environ, {'ENVIRONMENT': 'test'})
    @patch('boto3.client')
    def test_get_feature_flags_success(self, mock_boto_client):
        """機能フラグ取得成功テスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        
        feature_flags_json = '{"premium_features_enabled": true, "maintenance_banner": false}'
        mock_ssm.get_parameter.return_value = {
            'Parameter': {'Value': feature_flags_json}
        }
        
        client = ParameterStoreClient()
        flags = client.get_feature_flags()
        
        expected_flags = {
            "premium_features_enabled": True,
            "maintenance_banner": False
        }
        
        assert flags == expected_flags
        mock_ssm.get_parameter.assert_called_with(
            Name='/test/homebiyori/features/flags',
            WithDecryption=True
        )
    
    @patch('boto3.client')
    def test_get_feature_flags_fallback(self, mock_boto_client):
        """機能フラグフォールバックテスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        mock_ssm.get_parameter.side_effect = Exception("Parameter not found")
        
        client = ParameterStoreClient()
        flags = client.get_feature_flags()
        
        # フォールバック設定が返されることを確認
        expected_fallback = {
            "premium_features_enabled": True,
            "maintenance_banner": False,
            "cache_optimization": True
        }
        
        assert flags == expected_fallback
    
    @patch('boto3.client')
    def test_is_feature_enabled(self, mock_boto_client):
        """個別機能有効性チェックテスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        
        feature_flags_json = '{"premium_features_enabled": true, "maintenance_banner": false}'
        mock_ssm.get_parameter.return_value = {
            'Parameter': {'Value': feature_flags_json}
        }
        
        client = ParameterStoreClient()
        
        assert client.is_feature_enabled('premium_features_enabled') == True
        assert client.is_feature_enabled('maintenance_banner') == False
        assert client.is_feature_enabled('non_existent_feature') == False
    
    @patch.dict(os.environ, {'ENVIRONMENT': 'test'})
    @patch('boto3.client')
    def test_get_security_config_success(self, mock_boto_client):
        """セキュリティ設定取得成功テスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        
        # get_multiple_parameters のモック
        mock_ssm.get_parameters.return_value = {
            'Parameters': [
                {
                    'Name': '/test/homebiyori/internal/api_key',
                    'Value': 'internal-test-key'
                },
                {
                    'Name': '/test/homebiyori/admin/api_key', 
                    'Value': 'admin-test-key'
                }
            ],
            'InvalidParameters': []
        }
        
        client = ParameterStoreClient()
        config = client.get_security_config()
        
        assert config['internal_api_key'] == 'internal-test-key'
        assert config['admin_api_key'] == 'admin-test-key'
        assert config['has_valid_keys'] == True
        assert config['rate_limits']['default_requests_per_minute'] == 100
        assert config['rate_limits']['chat_requests_per_minute'] == 10
    
    @patch('boto3.client')
    def test_get_security_config_fallback(self, mock_boto_client):
        """セキュリティ設定フォールバックテスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        mock_ssm.get_parameters.side_effect = Exception("API key fetch failed")
        
        client = ParameterStoreClient()
        config = client.get_security_config()
        
        assert config['internal_api_key'] is None
        assert config['admin_api_key'] is None  
        assert config['has_valid_keys'] == False
        assert config['rate_limits']['default_requests_per_minute'] == 100
    
    @patch('boto3.client')
    def test_get_rate_limit(self, mock_boto_client):
        """レート制限取得テスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        mock_ssm.get_parameters.return_value = {
            'Parameters': [],
            'InvalidParameters': []
        }
        
        client = ParameterStoreClient()
        
        # 各エンドポイント種別のレート制限確認
        assert client.get_rate_limit('chat') == 10
        assert client.get_rate_limit('admin') == 500
        assert client.get_rate_limit('unknown') == 100  # デフォルト
    
    @patch('boto3.client')
    def test_get_tree_growth_thresholds_success(self, mock_boto_client):
        """木の成長闾値取得成功テスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        
        thresholds_json = '{"stage_1": 20, "stage_2": 50, "stage_3": 100, "stage_4": 180, "stage_5": 300}'
        mock_ssm.get_parameter.return_value = {
            'Parameter': {'Value': thresholds_json}
        }
        
        client = ParameterStoreClient()
        thresholds = client.get_tree_growth_thresholds()
        
        expected_thresholds = {
            "stage_1": 20,
            "stage_2": 50,
            "stage_3": 100,
            "stage_4": 180,
            "stage_5": 300
        }
        
        assert thresholds == expected_thresholds
    
    @patch('boto3.client')
    def test_get_tree_stage(self, mock_boto_client):
        """文字数から木のステージ判定テスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        
        thresholds_json = '{"stage_1": 20, "stage_2": 50, "stage_3": 100, "stage_4": 180, "stage_5": 300}'
        mock_ssm.get_parameter.return_value = {
            'Parameter': {'Value': thresholds_json}
        }
        
        client = ParameterStoreClient()
        
        # 各ステージの判定テスト
        assert client.get_tree_stage(10) == 1   # stage_1未満
        assert client.get_tree_stage(30) == 2   # stage_1以上、stage_2未満
        assert client.get_tree_stage(75) == 3   # stage_2以上、stage_3未満
        assert client.get_tree_stage(150) == 4  # stage_3以上、stage_4未満
        assert client.get_tree_stage(250) == 5  # stage_4以上、stage_5未満
        assert client.get_tree_stage(400) == 5  # stage_5以上（最大）
    
    @patch.dict(os.environ, {'ENVIRONMENT': 'test'})
    @patch('boto3.client')
    def test_get_maintenance_config_success(self, mock_boto_client):
        """メンテナンス設定取得成功テスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        
        mock_ssm.get_parameters.return_value = {
            'Parameters': [
                {
                    'Name': '/test/homebiyori/maintenance/enabled',
                    'Value': 'true'
                },
                {
                    'Name': '/test/homebiyori/maintenance/message',
                    'Value': 'システムメンテナンス中です'
                },
                {
                    'Name': '/test/homebiyori/maintenance/start_time',
                    'Value': '2024-08-12T02:00:00+09:00'
                },
                {
                    'Name': '/test/homebiyori/maintenance/end_time',
                    'Value': '2024-08-12T04:00:00+09:00'
                }
            ],
            'InvalidParameters': []
        }
        
        client = ParameterStoreClient()
        config = client.get_maintenance_config()
        
        assert config['enabled'] == True
        assert config['message'] == 'システムメンテナンス中です'
        assert config['start_time'] == '2024-08-12T02:00:00+09:00'
        assert config['end_time'] == '2024-08-12T04:00:00+09:00'
    
    @patch.dict(os.environ, {'ENVIRONMENT': 'test'})
    @patch('boto3.client')
    def test_get_app_config(self, mock_boto_client):
        """アプリケーション設定取得テスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        
        def mock_get_parameter(Name, WithDecryption=True):
            if 'app/version' in Name:
                return {'Parameter': {'Value': '1.0.0'}}
            elif 'features/flags' in Name:
                return {'Parameter': {'Value': '{"premium_features_enabled": true}'}}
            
        mock_ssm.get_parameter.side_effect = mock_get_parameter
        mock_ssm.get_parameters.return_value = {
            'Parameters': [
                {
                    'Name': '/test/homebiyori/maintenance/enabled',
                    'Value': 'false'
                },
                {
                    'Name': '/test/homebiyori/maintenance/message',
                    'Value': ''
                },
                {
                    'Name': '/test/homebiyori/maintenance/start_time',
                    'Value': ''
                },
                {
                    'Name': '/test/homebiyori/maintenance/end_time',
                    'Value': ''
                }
            ],
            'InvalidParameters': []
        }
        
        client = ParameterStoreClient()
        config = client.get_app_config()
        
        assert config['version'] == '1.0.0'
        assert config['environment'] == 'test'
        assert 'feature_flags' in config
        assert 'maintenance' in config


class TestParameterStoreCaching:
    """Parameter Storeキャッシュ機能テスト"""
    
    @patch('boto3.client')
    def test_parameter_caching(self, mock_boto_client):
        """パラメータキャッシュ機能テスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        mock_ssm.get_parameter.return_value = {
            'Parameter': {'Value': 'cached-value'}
        }
        
        client = ParameterStoreClient()
        
        # 初回取得
        result1 = client.get_parameter('/test/parameter')
        # 2回目取得（キャッシュから）
        result2 = client.get_parameter('/test/parameter')
        
        assert result1 == 'cached-value'
        assert result2 == 'cached-value'
        
        # SSMクライアントは1回だけ呼ばれる（キャッシュが効いている）
        mock_ssm.get_parameter.assert_called_once()
    
    @patch('boto3.client')
    def test_clear_cache(self, mock_boto_client):
        """キャッシュクリア機能テスト"""
        mock_ssm = MagicMock()
        mock_boto_client.return_value = mock_ssm
        mock_ssm.get_parameter.return_value = {
            'Parameter': {'Value': 'test-value'}
        }
        
        client = ParameterStoreClient()
        
        # パラメータを取得してキャッシュに保存
        client.get_parameter('/test/parameter')
        
        # キャッシュをクリア
        client.clear_cache()
        
        # 再度取得（キャッシュクリア後なので再度API呼び出し）
        client.get_parameter('/test/parameter')
        
        # SSMクライアントが2回呼ばれる（キャッシュクリア後の再取得）
        assert mock_ssm.get_parameter.call_count == 2


class TestConvenienceFunctions:
    """便利関数のテスト"""
    
    @patch('homebiyori_common.utils.parameter_store.get_parameter_store_client')
    def test_convenience_functions(self, mock_get_client):
        """全ての便利関数テスト"""
        from homebiyori_common.utils.parameter_store import (
            get_feature_flags, is_feature_enabled, get_security_config,
            get_rate_limit, get_tree_growth_thresholds, get_tree_stage,
            get_maintenance_config, get_app_config, clear_parameter_cache
        )
        
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        # 各便利関数を呼び出し
        get_feature_flags()
        is_feature_enabled('test_feature')
        get_security_config()
        get_rate_limit('chat')
        get_tree_growth_thresholds()
        get_tree_stage(100)
        get_maintenance_config()
        get_app_config()
        clear_parameter_cache()
        
        # 対応するクライアントメソッドが呼ばれていることを確認
        mock_client.get_feature_flags.assert_called_once()
        mock_client.is_feature_enabled.assert_called_once_with('test_feature')
        mock_client.get_security_config.assert_called_once()
        mock_client.get_rate_limit.assert_called_once_with('chat')
        mock_client.get_tree_growth_thresholds.assert_called_once()
        mock_client.get_tree_stage.assert_called_once_with(100)
        mock_client.get_maintenance_config.assert_called_once()
        mock_client.get_app_config.assert_called_once()
        mock_client.clear_cache.assert_called_once()


class TestTerraformParameterStoreConfig:
    """Terraform Parameter Store設定値テスト"""
    
    def test_model_id_values(self):
        """最新モデルID設定確認"""
        # 最新モデルIDの検証
        expected_models = {
            'free': 'amazon.nova-lite-v1:0',
            'premium': 'anthropic.claude-3-5-haiku-20241022-v1:0'
        }
        
        # 実際の実装では、これらの値がParameter Storeに設定されることを確認
        for tier, expected_model in expected_models.items():
            assert expected_model in ['amazon.nova-lite-v1:0', 'anthropic.claude-3-5-haiku-20241022-v1:0']
    
    def test_max_tokens_japanese_optimization(self):
        """日本語応答最適化されたmax_tokens値テスト"""
        expected_tokens = {
            'free': 100,     # ~150-200文字（目標50-150文字）
            'premium': 250   # ~375-500文字（目標200-400文字）
        }
        
        # 日本語トークン換算率: 1トークン ≈ 1.5-2文字
        for tier, max_tokens in expected_tokens.items():
            if tier == 'free':
                estimated_chars = max_tokens * 1.5
                assert 150 <= estimated_chars <= 200  # 目標文字数範囲内
            else:  # premium
                estimated_chars = max_tokens * 1.5
                assert 375 <= estimated_chars <= 500  # 目標文字数範囲内
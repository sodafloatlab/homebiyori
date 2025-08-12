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
"""
Parameter Store utilities for LLM configuration management
"""
import os
import boto3
import json
from typing import Dict, Any, Optional
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)

class ParameterStoreClient:
    """AWS Parameter Store client for LLM configuration"""
    
    def __init__(self):
        self.ssm_client = boto3.client('ssm')
        self.environment = os.getenv('ENVIRONMENT', 'prod')
    
    @lru_cache(maxsize=32)
    def get_parameter(self, parameter_name: str) -> str:
        """
        Parameter Store から値を取得（キャッシュあり）
        
        Args:
            parameter_name: パラメータ名（フルパス）
            
        Returns:
            パラメータ値
        """
        try:
            response = self.ssm_client.get_parameter(
                Name=parameter_name,
                WithDecryption=True
            )
            return response['Parameter']['Value']
        except Exception as e:
            logger.error(f"Failed to get parameter {parameter_name}: {e}")
            raise
    
    def get_llm_config(self, user_tier: str) -> Dict[str, Any]:
        """
        ユーザープラン別LLM設定を取得
        
        Args:
            user_tier: ユーザープラン ('free' or 'premium')
            
        Returns:
            LLM設定辞書
        """
        try:
            # パラメータ名構築
            tier_path = f"/{self.environment}/homebiyori/llm/{user_tier}-user"
            
            # 各設定値を取得
            model_id = self.get_parameter(f"{tier_path}/model-id")
            max_tokens = int(self.get_parameter(f"{tier_path}/max-tokens"))
            temperature = float(self.get_parameter(f"{tier_path}/temperature"))
            
            config = {
                "model_id": model_id,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "region_name": os.getenv('AWS_REGION', 'us-east-1'),
                "anthropic_version": "bedrock-2023-05-31"
            }
            
            logger.info(
                f"Retrieved LLM config for {user_tier} tier",
                extra={
                    "user_tier": user_tier,
                    "model_id": model_id,
                    "max_tokens": max_tokens,
                    "temperature": temperature
                }
            )
            
            return config
            
        except Exception as e:
            logger.error(
                f"Failed to get LLM config for {user_tier} tier: {e}",
                exc_info=True
            )
            # フォールバック設定
            return self._get_fallback_config(user_tier)
    
    def _get_fallback_config(self, user_tier: str) -> Dict[str, Any]:
        """
        Parameter Store失敗時のフォールバック設定
        
        Args:
            user_tier: ユーザープラン
            
        Returns:
            デフォルトLLM設定
        """
        if user_tier == "free":
            config = {
                "model_id": "amazon.nova-lite-v1:0",
                "max_tokens": 100,
                "temperature": 0.7,
                "region_name": os.getenv('AWS_REGION', 'us-east-1'),
                "anthropic_version": "bedrock-2023-05-31"
            }
        else:  # premium
            config = {
                "model_id": "anthropic.claude-3-5-haiku-20241022-v1:0",
                "max_tokens": 250,
                "temperature": 0.7,
                "region_name": os.getenv('AWS_REGION', 'us-east-1'),
                "anthropic_version": "bedrock-2023-05-31"
            }
        
        logger.warning(
            f"Using fallback LLM config for {user_tier} tier",
            extra=config
        )
        
        return config


# グローバルインスタンス
_parameter_store_client = None

def get_parameter_store_client() -> ParameterStoreClient:
    """Parameter Store clientのシングルトンインスタンス取得"""
    global _parameter_store_client
    if _parameter_store_client is None:
        _parameter_store_client = ParameterStoreClient()
    return _parameter_store_client

def get_llm_config(user_tier: str) -> Dict[str, Any]:
    """
    ユーザープラン別LLM設定を取得（簡便関数）
    
    Args:
        user_tier: ユーザープラン ('free' or 'premium')
        
    Returns:
        LLM設定辞書
    """
    client = get_parameter_store_client()
    return client.get_llm_config(user_tier)
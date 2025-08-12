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
    """
    統一Parameter Store管理クライアント
    
    LLM設定、機能フラグ、セキュリティ設定、木の成長闾値等の
    全ての動的設定を統合管理
    """
    
    def __init__(self):
        self.ssm_client = boto3.client('ssm')
        self.environment = os.getenv('ENVIRONMENT', 'prod')
        self._base_path = f"/{self.environment}/homebiyori"
    
    @lru_cache(maxsize=64)
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
    
    @lru_cache(maxsize=16)
    def get_multiple_parameters(self, parameter_names: tuple) -> Dict[str, str]:
        """
        複数のParameter Storeパラメータを効率的に取得
        
        Args:
            parameter_names: パラメータ名のタプル
            
        Returns:
            パラメータ名: 値の辞書
        """
        try:
            response = self.ssm_client.get_parameters(
                Names=list(parameter_names),
                WithDecryption=True
            )
            
            result = {}
            for param in response['Parameters']:
                result[param['Name']] = param['Value']
            
            # 取得できなかったパラメータをログ出力
            invalid_params = response.get('InvalidParameters', [])
            if invalid_params:
                logger.warning(f"Invalid parameters: {invalid_params}")
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get multiple parameters: {e}")
            raise
    
    def clear_cache(self):
        """Parameter Storeキャッシュをクリア"""
        self.get_parameter.cache_clear()
        self.get_multiple_parameters.cache_clear()
        self.get_feature_flags.cache_clear()
        self.get_tree_growth_thresholds.cache_clear()
        self.get_security_config.cache_clear()
        logger.info("Parameter Store cache cleared")
    
    # === LLM設定管理 ===
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
            tier_path = f"{self._base_path}/llm/{user_tier}-user"
            
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
            return self._get_fallback_llm_config(user_tier)
    
    def _get_fallback_llm_config(self, user_tier: str) -> Dict[str, Any]:
        """LLM設定のフォールバック"""
        fallback_configs = {
            "free": {
                "model_id": "amazon.nova-lite-v1:0",
                "max_tokens": 100,
                "temperature": 0.7,
                "region_name": os.getenv('AWS_REGION', 'us-east-1'),
                "anthropic_version": "bedrock-2023-05-31"
            },
            "premium": {
                "model_id": "anthropic.claude-3-5-haiku-20241022-v1:0",
                "max_tokens": 250,
                "temperature": 0.7,
                "region_name": os.getenv('AWS_REGION', 'us-east-1'),
                "anthropic_version": "bedrock-2023-05-31"
            }
        }
        
        config = fallback_configs.get(user_tier, fallback_configs["free"])
        logger.warning(
            f"Using fallback LLM config for {user_tier} tier",
            extra=config
        )
        
        return config
    
    # === 機能フラグ制御システム ===
    @lru_cache(maxsize=8)
    def get_feature_flags(self) -> Dict[str, bool]:
        """
        機能フラグ設定を取得
        
        Returns:
            機能名: 有効/無効の辞書
        """
        try:
            feature_flags_json = self.get_parameter(f"{self._base_path}/features/flags")
            flags = json.loads(feature_flags_json)
            
            logger.info("Retrieved feature flags", extra={"flags": flags})
            return flags
            
        except Exception as e:
            logger.warning(f"Feature flags not found in Parameter Store, using defaults: {e}")
            return self._get_fallback_feature_flags()
    
    def is_feature_enabled(self, feature_name: str) -> bool:
        """
        特定機能の有効性をチェック
        
        Args:
            feature_name: 機能名
            
        Returns:
            機能が有効かどうか
        """
        flags = self.get_feature_flags()
        return flags.get(feature_name, False)
    
    def _get_fallback_feature_flags(self) -> Dict[str, bool]:
        """機能フラグのフォールバック設定 - Parameter Store未設定時のデフォルト"""
        fallback_flags = {
            "premium_features_enabled": True,
            "maintenance_banner": False,
            "cache_optimization": True
        }
        
        logger.warning("Using fallback feature flags - consider manual Parameter Store setup", extra=fallback_flags)
        return fallback_flags
    
    # === セキュリティ設定管理 ===
    @lru_cache(maxsize=4)
    def get_security_config(self) -> Dict[str, Any]:
        """
        セキュリティ設定を取得
        
        Returns:
            セキュリティ設定辞書
        """
        try:
            # APIキーのみ取得（レート制限はアプリケーション固定値を使用）
            security_params = (
                f"{self._base_path}/internal/api_key",
                f"{self._base_path}/admin/api_key"
            )
            
            params = self.get_multiple_parameters(security_params)
            
            # API キー（ログには出力しない）
            internal_api_key = params.get(f"{self._base_path}/internal/api_key")
            admin_api_key = params.get(f"{self._base_path}/admin/api_key")
            
            # レート制限はアプリケーション固定値
            rate_limits = {
                "default_requests_per_minute": 100,
                "chat_requests_per_minute": 10,
                "admin_requests_per_minute": 500
            }
            
            config = {
                "rate_limits": rate_limits,
                "internal_api_key": internal_api_key,
                "admin_api_key": admin_api_key,
                "has_valid_keys": bool(internal_api_key and admin_api_key)
            }
            
            logger.info("Retrieved security config", extra={
                "has_valid_keys": config["has_valid_keys"],
                "rate_limits_source": "application_default"
            })
            
            return config
            
        except Exception as e:
            logger.error(f"Failed to get security config: {e}", exc_info=True)
            return self._get_fallback_security_config()
    
    def get_rate_limit(self, endpoint_type: str) -> int:
        """
        特定エンドポイントのレート制限を取得
        
        Args:
            endpoint_type: エンドポイント種別
            
        Returns:
            分間リクエスト制限数
        """
        security_config = self.get_security_config()
        rate_limits = security_config.get("rate_limits", {})
        
        # エンドポイント別制限 → デフォルト制限の順で取得
        limit = rate_limits.get(f"{endpoint_type}_requests_per_minute") or \
                rate_limits.get("default_requests_per_minute", 100)
        
        return limit
    
    def _get_fallback_security_config(self) -> Dict[str, Any]:
        """セキュリティ設定のフォールバック - Parameter Store未設定時のアプリレベル設定"""
        fallback_config = {
            "rate_limits": {
                "default_requests_per_minute": 100,
                "chat_requests_per_minute": 10,
                "admin_requests_per_minute": 500
            },
            "internal_api_key": None,  # 手動設定が必要
            "admin_api_key": None,     # 手動設定が必要
            "has_valid_keys": False
        }
        
        logger.warning("Using fallback security config - API keys require manual Parameter Store setup")
        return fallback_config
    
    # === 木の成長闾値動的変更 ===
    @lru_cache(maxsize=4)
    def get_tree_growth_thresholds(self) -> Dict[str, int]:
        """
        木の成長闾値設定を取得
        
        Returns:
            ステージ別文字数闾値の辞書
        """
        try:
            thresholds_json = self.get_parameter(f"{self._base_path}/tree/growth_thresholds")
            thresholds = json.loads(thresholds_json)
            
            logger.info("Retrieved tree growth thresholds", extra=thresholds)
            return thresholds
            
        except Exception as e:
            logger.error(f"Failed to get tree growth thresholds: {e}", exc_info=True)
            return self._get_fallback_tree_thresholds()
    
    def get_tree_stage(self, character_count: int) -> int:
        """
        文字数から木のステージを判定
        
        Args:
            character_count: 累積文字数
            
        Returns:
            木のステージ (1-5)
        """
        thresholds = self.get_tree_growth_thresholds()
        
        # ステージ判定
        for stage in range(1, 6):
            stage_key = f"stage_{stage}"
            if character_count < thresholds.get(stage_key, float('inf')):
                return stage
        
        return 5  # 最大ステージ
    
    def _get_fallback_tree_thresholds(self) -> Dict[str, int]:
        """木の成長闾値のフォールバック"""
        fallback_thresholds = {
            "stage_1": 20,
            "stage_2": 50,
            "stage_3": 100,
            "stage_4": 180,
            "stage_5": 300
        }
        
        logger.warning("Using fallback tree growth thresholds", extra=fallback_thresholds)
        return fallback_thresholds
    
    # === メンテナンス設定 ===
    def get_maintenance_config(self) -> Dict[str, Any]:
        """
        メンテナンス設定を取得
        
        Returns:
            メンテナンス設定辞書
        """
        try:
            # メンテナンス関連パラメータを一括取得
            maintenance_params = (
                f"{self._base_path}/maintenance/enabled",
                f"{self._base_path}/maintenance/message",
                f"{self._base_path}/maintenance/start_time",
                f"{self._base_path}/maintenance/end_time"
            )
            
            params = self.get_multiple_parameters(maintenance_params)
            
            config = {
                "enabled": params.get(f"{self._base_path}/maintenance/enabled", "false").lower() == "true",
                "message": params.get(f"{self._base_path}/maintenance/message", "システムメンテナンス中です"),
                "start_time": params.get(f"{self._base_path}/maintenance/start_time", ""),
                "end_time": params.get(f"{self._base_path}/maintenance/end_time", "")
            }
            
            logger.info("Retrieved maintenance config", extra={
                "enabled": config["enabled"],
                "has_schedule": bool(config["start_time"] and config["end_time"])
            })
            
            return config
            
        except Exception as e:
            logger.error(f"Failed to get maintenance config: {e}", exc_info=True)
            return {
                "enabled": False,
                "message": "システムメンテナンス中です。しばらくお待ちください。",
                "start_time": "",
                "end_time": ""
            }
    
    # === アプリケーション設定 ===
    def get_app_config(self) -> Dict[str, Any]:
        """
        アプリケーション基本設定を取得
        
        Returns:
            アプリケーション設定辞書
        """
        try:
            app_version = self.get_parameter(f"{self._base_path}/app/version")
            
            config = {
                "version": app_version,
                "environment": self.environment,
                "feature_flags": self.get_feature_flags(),
                "maintenance": self.get_maintenance_config()
            }
            
            logger.info("Retrieved app config", extra={
                "version": app_version,
                "environment": self.environment
            })
            
            return config
            
        except Exception as e:
            logger.error(f"Failed to get app config: {e}", exc_info=True)
            return {
                "version": "1.0.0",
                "environment": self.environment,
                "feature_flags": self._get_fallback_feature_flags(),
                "maintenance": {"enabled": False, "message": ""}
            }


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

# === 統一Parameter Store取得関数（便利関数群） ===

def get_feature_flags() -> Dict[str, bool]:
    """機能フラグを取得（便利関数）"""
    client = get_parameter_store_client()
    return client.get_feature_flags()

def is_feature_enabled(feature_name: str) -> bool:
    """特定機能の有効性をチェック（便利関数）"""
    client = get_parameter_store_client()
    return client.is_feature_enabled(feature_name)

def get_security_config() -> Dict[str, Any]:
    """セキュリティ設定を取得（便利関数）"""
    client = get_parameter_store_client()
    return client.get_security_config()

def get_rate_limit(endpoint_type: str) -> int:
    """特定エンドポイントのレート制限を取得（便利関数）"""
    client = get_parameter_store_client()
    return client.get_rate_limit(endpoint_type)

def get_tree_growth_thresholds() -> Dict[str, int]:
    """木の成長閾値を取得（便利関数）"""
    client = get_parameter_store_client()
    return client.get_tree_growth_thresholds()

def get_tree_stage(character_count: int) -> int:
    """文字数から木のステージを判定（便利関数）"""
    client = get_parameter_store_client()
    return client.get_tree_stage(character_count)

def get_maintenance_config() -> Dict[str, Any]:
    """メンテナンス設定を取得（便利関数）"""
    client = get_parameter_store_client()
    return client.get_maintenance_config()

def get_app_config() -> Dict[str, Any]:
    """アプリケーション基本設定を取得（便利関数）"""
    client = get_parameter_store_client()
    return client.get_app_config()

def clear_parameter_cache():
    """Parameter Storeキャッシュをクリア（便利関数）"""
    client = get_parameter_store_client()
    return client.clear_cache()
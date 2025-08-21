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
    def get_llm_config(self) -> Dict[str, Any]:
        """
        統一LLM設定を取得（Issue #15統一戦略）
        
        【統一戦略】
        - user_tier概念削除：全ユーザー統一設定
        - LangChain Memory統合：メモリ管理設定も含む
        - AI応答生成統合：コア・要約両方の設定を提供
        
        Returns:
            統一LLM設定辞書（LangChain Memory用設定含む）
        """
        try:
            # 統一設定パス
            unified_path = f"{self._base_path}/llm/unified"
            
            # ===== AI応答生成用LLM設定 =====
            # ユーザーへの直接応答を生成するメインLLMの設定
            model_id = self.get_parameter(f"{unified_path}/model-id")
            max_tokens = int(self.get_parameter(f"{unified_path}/max-tokens"))        # 例: 500トークン（ユーザー応答用）
            temperature = float(self.get_parameter(f"{unified_path}/temperature"))   # 例: 0.7（自然な応答のため）
            
            # ===== LangChain Memory管理用設定 =====
            # 会話履歴の要約・管理専用LLMの設定（背景処理用）
            langchainmemory_max_tokens = int(self.get_parameter(f"{unified_path}/langchainmemory-max-tokens"))      # 例: 8000トークン（大量履歴処理用）
            langchainmemory_buffer_messages = int(self.get_parameter(f"{unified_path}/langchainmemory-buffer-messages"))  # 例: 30件（直近履歴保持数）
            
            # ===== DynamoDB取得制御設定（新規追加） =====
            # DynamoDBから初期読み込みするメッセージの最大件数
            # ・用途: _load_messagesでの初期データ取得量制御
            # ・目的: ConversationSummaryBufferMemoryの初期化時に必要十分なデータを取得
            # ・buffer_messagesとの関係: buffer_messages ≤ db_fetch_limit が推奨
            langchainmemory_db_fetch_limit = int(self.get_parameter(f"{unified_path}/langchainmemory-db-fetch-limit"))  # 例: 100件（DB取得制限）
            
            # ===== LangChain Memory要約専用LLM設定（model_kwargs統合） =====
            # 会話履歴要約生成専用の細かいパラメータ設定
            langchainmemory_summary_max_tokens = int(self.get_parameter(f"{unified_path}/langchainmemory-summary-max-tokens"))  # 例: 150トークン（要約生成用）
            langchainmemory_summary_temperature = float(self.get_parameter(f"{unified_path}/langchainmemory-summary-temperature"))  # 例: 0.3（精度重視）
            
            # 【DB取得件数と短期記憶件数の使い分け】
            # ・db_fetch_limit: DynamoDBから取得する会話履歴の最大件数（例: 100件）
            #   - _load_messagesで使用
            #   - ConversationSummaryBufferMemoryの初期化に必要な十分なデータを取得
            #   - 要約処理やコンテキスト構築に必要な過去のデータを含む
            # 
            # ・buffer_messages: ConversationSummaryBufferMemoryが短期記憶として保持する直近件数（例: 30件）
            #   - max_messagesパラメータとして使用
            #   - 要約時も要約せずにそのまま保持される最新の会話
            #   - ユーザーとの直近の文脈として重要なメッセージ
            #
            # 【推奨設定関係】
            # buffer_messages ≤ db_fetch_limit であることが効率的
            # 例: buffer_messages=30, db_fetch_limit=100 → 30件は短期記憶、残り70件は要約対象候補
            
            # 【使い分けの理由】
            # ・AI応答用: ユーザーが読む最終応答の生成（品質重視・適度な長さ）
            # ・LangChain Memory用: 過去の会話を効率的に要約・管理（処理能力重視・長文OK）
            # ・LangChain Memory用はバックグラウンド処理のため、より大きなトークン制限を設定
            # ・AI応答用は即座にユーザーに表示されるため、適切な長さに制限
            #
            # 【Parameter Store設定構造（DB取得制御追加版）】
            # /prod/homebiyori/llm/unified/
            # ├── model-id                              # 共通モデル（Claude 3 HaikuまたはNova Lite）
            # ├── max-tokens                            # AI応答用（例: 500）
            # ├── temperature                           # AI応答用（例: 0.7）
            # ├── langchainmemory-max-tokens           # LangChain Memory管理用（例: 8000）
            # ├── langchainmemory-buffer-messages      # LangChain Memory履歴保持数（例: 30）
            # ├── langchainmemory-db-fetch-limit       # DynamoDB取得件数制限（例: 100）
            # ├── langchainmemory-summary-max-tokens   # LangChain Memory要約生成用（例: 150）
            # └── langchainmemory-summary-temperature  # LangChain Memory要約精度用（例: 0.3）
            
            config = {
                # ===== AI応答生成用設定 =====
                "model_id": model_id,           # 共通モデル（Claude 3 HaikuまたはNova Lite）
                "max_tokens": max_tokens,       # ユーザー応答用制限（例: 500トークン）
                "temperature": temperature,     # 自然な応答のための温度設定（例: 0.7）
                "region_name": os.getenv('AWS_REGION', 'us-east-1'),
                
                # ===== LangChain Memory管理用設定 =====
                "langchainmemory_max_tokens": langchainmemory_max_tokens,         # 履歴管理用制限（例: 8000トークン）
                "langchainmemory_buffer_messages": langchainmemory_buffer_messages, # 直近履歴保持数（例: 30件）
                "langchainmemory_db_fetch_limit": langchainmemory_db_fetch_limit,   # DB取得件数制限（例: 100件）
                "summary_enabled": True,  # 統一戦略：全員要約機能有効
                
                # ===== LangChain Memory要約専用LLM設定 =====
                "langchainmemory_summary_max_tokens": langchainmemory_summary_max_tokens,     # 要約生成用制限（例: 150トークン）
                "langchainmemory_summary_temperature": langchainmemory_summary_temperature   # 要約精度重視（例: 0.3）
            }
            
            # Amazon NovaモデルかAnthropicモデルかを判定してパラメータを調整
            if "anthropic.claude" in model_id:
                config["anthropic_version"] = "bedrock-2023-05-31"
            
            logger.info(
                "Retrieved unified LLM config with DB fetch limit control (Issue #15 strategy)",
                extra={
                    "model_id": model_id,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "langchainmemory_max_tokens": langchainmemory_max_tokens,
                    "langchainmemory_buffer_messages": langchainmemory_buffer_messages,
                    "langchainmemory_db_fetch_limit": langchainmemory_db_fetch_limit,
                    "langchainmemory_summary_max_tokens": langchainmemory_summary_max_tokens,
                    "langchainmemory_summary_temperature": langchainmemory_summary_temperature,
                    "is_anthropic": "anthropic.claude" in model_id,
                    "strategy": "unified configuration with separated DB fetch and buffer controls"
                }
            )
            
            return config
            
        except Exception as e:
            logger.error(
                f"Failed to get unified LLM config: {e}",
                exc_info=True
            )
            raise
    
    
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
            logger.error(f"Failed to get feature flags: {e}", exc_info=True)
            raise
    
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
            raise
    
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
            raise
    
    def get_tree_stage(self, character_count: int) -> int:
        """
        文字数から木のステージを判定
        
        Args:
            character_count: 累積文字数
            
        Returns:
            木のステージ (0-6)
            - 0: 土だけ（累積文字数0）
            - 1: 発芽（累積文字数1以上）
            - 2-6: 成長段階
        """
        # 累積文字数が0の場合は0段階目（土だけ）
        if character_count == 0:
            return 0
        
        try:
            thresholds = self.get_tree_growth_thresholds()
        except Exception:
            # Parameter Storeが利用できない場合のデフォルト値
            thresholds = {
                "stage_1": 100,
                "stage_2": 500, 
                "stage_3": 1500,
                "stage_4": 3000,
                "stage_5": 5000
            }
        
        # ステージ判定（1段階目から6段階目まで）
        for stage in range(1, 7):
            stage_key = f"stage_{stage}"
            if character_count < thresholds.get(stage_key, float('inf')):
                return stage
        
        return 6  # 最大ステージ
    
    
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
            raise
    
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
            raise


# グローバルインスタンス
_parameter_store_client = None

def get_parameter_store_client() -> ParameterStoreClient:
    """Parameter Store clientのシングルトンインスタンス取得"""
    global _parameter_store_client
    if _parameter_store_client is None:
        _parameter_store_client = ParameterStoreClient()
    return _parameter_store_client

def get_llm_config() -> Dict[str, Any]:
    """
    統一LLM設定を取得（Issue #15統一戦略対応 - 便利関数）
    
    【統一戦略】
    - user_tier概念削除：全ユーザー統一設定
    - Parameter Store集約管理：LangChain Memory設定も含む
    
    Returns:
        統一LLM設定辞書（LangChain Memory用設定含む）
    """
    client = get_parameter_store_client()
    return client.get_llm_config()

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
"""
Homebiyori メンテナンスモード管理
Parameter Store連携によるメンテナンス状態制御

主要機能:
- Parameter Store からメンテナンス状態取得
- 同期・非同期両対応のメンテナンスチェック
- MaintenanceError 例外による統一エラーハンドリング

使用方法:
    from homebiyori_common.maintenance import (
        check_maintenance_mode,
        is_maintenance_mode
    )
    
    # 同期版（一般的なケース）
    check_maintenance_mode()  # MaintenanceErrorを投げる可能性
    
    # 非同期版（特定サービス用）
    if await is_maintenance_mode():
        # メンテナンス中処理
"""

import boto3
import asyncio
from botocore.exceptions import ClientError
from typing import Optional
import os

from ..logger import get_logger
from ..exceptions import MaintenanceError

logger = get_logger(__name__)

# Parameter Store設定
MAINTENANCE_PARAMETER_NAME = f"/{os.getenv('PROJECT_NAME', 'homebiyori')}/{os.getenv('ENVIRONMENT', 'prod')}/maintenance/enabled"
MAINTENANCE_MESSAGE_PARAMETER_NAME = f"/{os.getenv('PROJECT_NAME', 'homebiyori')}/{os.getenv('ENVIRONMENT', 'prod')}/maintenance/message"

# SSMクライアント初期化
ssm_client = boto3.client('ssm', region_name=os.getenv('AWS_DEFAULT_REGION', 'ap-northeast-1'))


def check_maintenance_mode() -> None:
    """
    メンテナンスモード同期チェック
    
    Parameter Storeからメンテナンス状態を取得し、
    メンテナンス中の場合はMaintenanceErrorを発生させる。
    
    Raises:
        MaintenanceError: メンテナンス中の場合
        
    Notes:
        - フェイルセーフ設計: Parameter Store接続エラー時は処理継続
        - ログ出力による監視対応
    """
    try:
        response = ssm_client.get_parameter(Name=MAINTENANCE_PARAMETER_NAME)
        maintenance_enabled = response['Parameter']['Value'].lower() in ['true', '1', 'enabled']
        
        if maintenance_enabled:
            # メンテナンスメッセージ取得
            try:
                message_response = ssm_client.get_parameter(Name=MAINTENANCE_MESSAGE_PARAMETER_NAME)
                maintenance_message = message_response['Parameter']['Value']
            except ClientError:
                maintenance_message = "システムメンテナンス中です。しばらくお待ちください。"
            
            logger.warning(
                "Maintenance mode is enabled",
                extra={"maintenance_message": maintenance_message}
            )
            raise MaintenanceError(maintenance_message)
            
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        if error_code == 'ParameterNotFound':
            logger.debug("Maintenance parameter not found, assuming service is available")
            return  # パラメータが存在しない場合は利用可能とみなす
        else:
            logger.warning(
                "Failed to check maintenance mode, allowing request",
                extra={"error": str(e), "error_code": error_code}
            )
            return  # その他のエラーでも利用可能とみなす（フェイルセーフ）
    except Exception as e:
        logger.error(
            "Unexpected error in maintenance check",
            extra={"error": str(e)}
        )
        return  # 予期しないエラーでも利用可能とみなす


async def is_maintenance_mode() -> bool:
    """
    メンテナンスモード非同期チェック
    
    Parameter Storeからメンテナンス状態を非同期で取得する。
    
    Returns:
        bool: メンテナンス中の場合True、利用可能な場合False
        
    Notes:
        - フェイルセーフ設計: エラー時はFalse（利用可能）を返却
        - 非同期対応によるパフォーマンス最適化
    """
    try:
        # 実行中のイベントループを取得
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            # イベントループが存在しない場合は新規作成
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # boto3クライアントは同期なので、executorで非同期実行
        response = await loop.run_in_executor(
            None, 
            lambda: ssm_client.get_parameter(Name=MAINTENANCE_PARAMETER_NAME)
        )
        
        maintenance_enabled = response['Parameter']['Value'].lower() in ['true', '1', 'enabled']
        
        if maintenance_enabled:
            logger.warning("Maintenance mode is enabled (async check)")
            
        return maintenance_enabled
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        if error_code == 'ParameterNotFound':
            logger.debug("Maintenance parameter not found, assuming service is available")
        else:
            logger.warning(
                "Failed to check maintenance mode, assuming service is available",
                extra={"error": str(e), "error_code": error_code}
            )
        return False
    except Exception as e:
        logger.error(
            "Unexpected error in async maintenance check",
            extra={"error": str(e)}
        )
        return False


def get_maintenance_message() -> Optional[str]:
    """
    メンテナンスメッセージ取得
    
    Returns:
        Optional[str]: メンテナンスメッセージ、取得できない場合はNone
    """
    try:
        response = ssm_client.get_parameter(Name=MAINTENANCE_MESSAGE_PARAMETER_NAME)
        return response['Parameter']['Value']
    except ClientError as e:
        logger.debug(
            "Failed to get maintenance message",
            extra={"error": str(e)}
        )
        return None
    except Exception as e:
        logger.error(
            "Unexpected error getting maintenance message",
            extra={"error": str(e)}
        )
        return None


def maintenance_required(skip_paths=None):
    """
    メンテナンスチェック用デコレータ
    
    Args:
        skip_paths: メンテナンスチェックをスキップするパス（リスト）
        
    Notes:
        現在のアーキテクチャではmiddleware方式を推奨しており、
        このデコレータは既存コードとの互換性のために残されています。
    """
    def decorator(handler_func):
        def wrapper(*args, **kwargs):
            # 互換性のため、実際のチェックはmiddlewareで実行
            return handler_func(*args, **kwargs)
        return wrapper
    return decorator
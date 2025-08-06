"""
admin_service Lambda - 管理者ダッシュボードAPI

管理者専用機能:
- システムメトリクス監視
- ユーザー統計情報取得
- メンテナンス制御
- システム健全性チェック
- 課金統計情報表示

認証: 管理者専用Cognito User Pool
"""

import os
import json
import boto3
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel, Field

# Lambda Layers共通ライブラリ
from homebiyori_common.utils.datetime_utils import get_current_jst
import logging
from homebiyori_common.utils.response_utils import success_response, error_response
from homebiyori_common.database.dynamodb_client import DynamoDBClient
from homebiyori_common.exceptions.custom_exceptions import (
    ValidationError,
    DatabaseError,
    AuthenticationError,
    ServiceError
)

# 環境変数取得
ENVIRONMENT = os.getenv('ENVIRONMENT', 'prod')
PROJECT_NAME = os.getenv('PROJECT_NAME', 'homebiyori')
SERVICE_TYPE = os.getenv('SERVICE_TYPE', 'admin_service')

# DynamoDB テーブル名
USERS_TABLE_NAME = os.getenv('USERS_TABLE_NAME')
SUBSCRIPTIONS_TABLE_NAME = os.getenv('SUBSCRIPTIONS_TABLE_NAME')
CHATS_TABLE_NAME = os.getenv('CHATS_TABLE_NAME')
NOTIFICATIONS_TABLE_NAME = os.getenv('NOTIFICATIONS_TABLE_NAME')
FEEDBACK_TABLE_NAME = os.getenv('FEEDBACK_TABLE_NAME')

# AWS クライアント初期化
dynamodb_client = DynamoDBClient()
cloudwatch = boto3.client('cloudwatch')
ssm = boto3.client('ssm')

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(SERVICE_TYPE)

# FastAPI アプリケーション初期化
app = FastAPI(
    title="Homebiyori Admin Service API",
    description="管理者専用ダッシュボードAPI",
    version="1.0.0"
)

# CORS設定（管理者画面専用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://admin.homebiyori.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# セキュリティ設定
security = HTTPBearer()

# レスポンスモデル
class SystemMetrics(BaseModel):
    """システムメトリクス情報"""
    timestamp: str = Field(..., description="取得時刻")
    active_users_today: int = Field(..., description="本日のアクティブユーザー数")
    active_users_weekly: int = Field(..., description="週間アクティブユーザー数")
    total_users: int = Field(..., description="総ユーザー数")
    premium_users: int = Field(..., description="プレミアムユーザー数")
    total_chats_today: int = Field(..., description="本日のチャット数")
    total_chats_weekly: int = Field(..., description="週間チャット数")
    bedrock_api_calls_today: int = Field(..., description="本日のBedrock API呼び出し数")
    lambda_invocations: Dict[str, int] = Field(..., description="Lambda関数別呼び出し数")
    error_rates: Dict[str, float] = Field(..., description="エラー率統計")

class UserStatistics(BaseModel):
    """ユーザー統計情報"""
    total_count: int = Field(..., description="総ユーザー数")
    new_users_today: int = Field(..., description="本日の新規ユーザー数")
    new_users_weekly: int = Field(..., description="週間新規ユーザー数")
    premium_conversion_rate: float = Field(..., description="プレミアム転換率")
    active_users_today: int = Field(..., description="本日のアクティブユーザー数")
    retention_rate_7d: float = Field(..., description="7日間継続率")
    retention_rate_30d: float = Field(..., description="30日間継続率")

class MaintenanceStatus(BaseModel):
    """メンテナンス状態"""
    is_maintenance_mode: bool = Field(..., description="メンテナンスモード状態")
    maintenance_message: Optional[str] = Field(None, description="メンテナンスメッセージ")
    maintenance_start_time: Optional[str] = Field(None, description="メンテナンス開始時刻")
    maintenance_end_time: Optional[str] = Field(None, description="メンテナンス終了予定時刻")

class MaintenanceControl(BaseModel):
    """メンテナンス制御"""
    enable_maintenance: bool = Field(..., description="メンテナンス有効化")
    maintenance_message: str = Field(..., description="メンテナンスメッセージ")
    maintenance_end_time: Optional[str] = Field(None, description="メンテナンス終了予定時刻")

# 管理者認証ヘルパー
async def verify_admin_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """管理者JWTトークン検証"""
    try:
        # 管理者専用Cognito User Pool での検証
        # 実装: JWT検証ロジック（本番では適切なJWT検証ライブラリを使用）
        token = credentials.credentials
        if not token or token == "invalid":
            raise AuthenticationError("Invalid admin token")
        
        # 管理者権限確認（本番ではCognitoのClaimsを確認）
        return "admin-user-id"
    except Exception as e:
        logger.error(f"Admin authentication failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Admin authentication required")

# API エンドポイント

@app.get("/health")
async def health_check():
    """ヘルスチェック（認証不要）"""
    try:
        current_time = get_current_jst()
        
        # 基本的な健全性チェック
        health_status = {
            "service": SERVICE_TYPE,
            "status": "healthy",
            "timestamp": current_time.isoformat(),
            "environment": ENVIRONMENT,
            "version": "1.0.0"
        }
        
        return success_response(health_status)
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return error_response("Health check failed", 500, {"error": str(e)})

@app.get("/api/admin/dashboard/metrics", response_model=SystemMetrics)
async def get_system_metrics(admin_id: str = Depends(verify_admin_token)):
    """システムメトリクス取得"""
    try:
        current_time = get_current_jst()
        today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        
        # 並行してメトリクス取得
        metrics_tasks = [
            get_user_metrics(today_start, week_start),
            get_chat_metrics(today_start, week_start),
            get_lambda_metrics(),
            get_bedrock_metrics(today_start)
        ]
        
        user_metrics, chat_metrics, lambda_metrics, bedrock_metrics = await asyncio.gather(*metrics_tasks)
        
        system_metrics = SystemMetrics(
            timestamp=current_time.isoformat(),
            active_users_today=user_metrics['active_today'],
            active_users_weekly=user_metrics['active_weekly'],
            total_users=user_metrics['total'],
            premium_users=user_metrics['premium'],
            total_chats_today=chat_metrics['today'],
            total_chats_weekly=chat_metrics['weekly'],
            bedrock_api_calls_today=bedrock_metrics['calls_today'],
            lambda_invocations=lambda_metrics['invocations'],
            error_rates=lambda_metrics['error_rates']
        )
        
        return success_response(system_metrics.dict())
        
    except Exception as e:
        logger.error(f"Failed to get system metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve system metrics")

@app.get("/api/admin/users/statistics", response_model=UserStatistics)
async def get_user_statistics(admin_id: str = Depends(verify_admin_token)):
    """ユーザー統計情報取得"""
    try:
        current_time = get_current_jst()
        today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)
        
        # ユーザー統計を並行取得
        stats_tasks = [
            get_total_user_count(),
            get_new_users_count(today_start, week_start),
            get_premium_conversion_metrics(),
            get_user_retention_metrics(week_start, month_start)
        ]
        
        total_count, new_users, premium_metrics, retention_metrics = await asyncio.gather(*stats_tasks)
        
        user_statistics = UserStatistics(
            total_count=total_count,
            new_users_today=new_users['today'],
            new_users_weekly=new_users['weekly'],
            premium_conversion_rate=premium_metrics['conversion_rate'],
            active_users_today=retention_metrics['active_today'],
            retention_rate_7d=retention_metrics['retention_7d'],
            retention_rate_30d=retention_metrics['retention_30d']
        )
        
        return success_response(user_statistics.dict())
        
    except Exception as e:
        logger.error(f"Failed to get user statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user statistics")

@app.get("/api/admin/maintenance/status", response_model=MaintenanceStatus)
async def get_maintenance_status(admin_id: str = Depends(verify_admin_token)):
    """メンテナンス状態取得"""
    try:
        # Parameter Store からメンテナンス情報取得
        maintenance_params = await get_maintenance_parameters()
        
        maintenance_status = MaintenanceStatus(
            is_maintenance_mode=maintenance_params.get('enabled', False),
            maintenance_message=maintenance_params.get('message'),
            maintenance_start_time=maintenance_params.get('start_time'),
            maintenance_end_time=maintenance_params.get('end_time')
        )
        
        return success_response(maintenance_status.dict())
        
    except Exception as e:
        logger.error(f"Failed to get maintenance status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve maintenance status")

@app.post("/api/admin/maintenance/control")
async def control_maintenance(
    maintenance_control: MaintenanceControl,
    admin_id: str = Depends(verify_admin_token)
):
    """メンテナンス制御"""
    try:
        current_time = get_current_jst()
        
        # Parameter Store にメンテナンス設定保存
        await set_maintenance_parameters(
            enabled=maintenance_control.enable_maintenance,
            message=maintenance_control.maintenance_message,
            start_time=current_time.isoformat() if maintenance_control.enable_maintenance else None,
            end_time=maintenance_control.maintenance_end_time
        )
        
        # 管理者操作ログ記録
        logger.info(f"Maintenance control by admin {admin_id}: enabled={maintenance_control.enable_maintenance}")
        
        return success_response({"message": "Maintenance control updated successfully"})
        
    except Exception as e:
        logger.error(f"Failed to control maintenance: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update maintenance control")

# ヘルパー関数

async def get_user_metrics(today_start: datetime, week_start: datetime) -> Dict[str, int]:
    """ユーザーメトリクス取得"""
    try:
        # 総ユーザー数取得
        total_users = await get_total_user_count()
        
        # プレミアムユーザー数取得
        premium_users = await get_premium_user_count()
        
        # アクティブユーザー数取得（チャット履歴から推定）
        active_today = await get_active_users_count(today_start)
        active_weekly = await get_active_users_count(week_start)
        
        return {
            'total': total_users,
            'premium': premium_users,
            'active_today': active_today,
            'active_weekly': active_weekly
        }
        
    except Exception as e:
        logger.error(f"Failed to get user metrics: {str(e)}")
        return {'total': 0, 'premium': 0, 'active_today': 0, 'active_weekly': 0}

async def get_chat_metrics(today_start: datetime, week_start: datetime) -> Dict[str, int]:
    """チャットメトリクス取得"""
    try:
        # DynamoDB Scanでチャット数をカウント（本番では効率的なクエリに変更）
        today_chats = await count_chats_since(today_start)
        weekly_chats = await count_chats_since(week_start)
        
        return {
            'today': today_chats,
            'weekly': weekly_chats
        }
        
    except Exception as e:
        logger.error(f"Failed to get chat metrics: {str(e)}")
        return {'today': 0, 'weekly': 0}

async def get_lambda_metrics() -> Dict[str, Any]:
    """Lambda メトリクス取得"""
    try:
        # CloudWatch からLambda メトリクス取得
        lambda_functions = [
            'user-service', 'chat-service', 'tree-service', 
            'webhook-service', 'notification-service', 'ttl-updater-service',
            'billing-service', 'health-check-service'
        ]
        
        invocations = {}
        error_rates = {}
        
        for function_name in lambda_functions:
            # 呼び出し数取得
            invocations[function_name] = await get_lambda_invocation_count(function_name)
            # エラー率取得
            error_rates[function_name] = await get_lambda_error_rate(function_name)
        
        return {
            'invocations': invocations,
            'error_rates': error_rates
        }
        
    except Exception as e:
        logger.error(f"Failed to get lambda metrics: {str(e)}")
        return {'invocations': {}, 'error_rates': {}}

async def get_bedrock_metrics(today_start: datetime) -> Dict[str, int]:
    """Bedrock API メトリクス取得"""
    try:
        # CloudWatch からBedrock API呼び出し数取得
        calls_today = await get_bedrock_api_calls_count(today_start)
        
        return {
            'calls_today': calls_today
        }
        
    except Exception as e:
        logger.error(f"Failed to get bedrock metrics: {str(e)}")
        return {'calls_today': 0}

async def get_total_user_count() -> int:
    """総ユーザー数取得"""
    try:
        # usersテーブルからユーザー数をカウント
        response = await dynamodb_client.scan_table(
            table_name=USERS_TABLE_NAME,
            select='COUNT'
        )
        return response.get('Count', 0)
        
    except Exception as e:
        logger.error(f"Failed to get total user count: {str(e)}")
        return 0

async def get_premium_user_count() -> int:
    """プレミアムユーザー数取得"""
    try:
        # subscriptionsテーブルからアクティブなサブスクリプション数をカウント
        response = await dynamodb_client.scan_table(
            table_name=SUBSCRIPTIONS_TABLE_NAME,
            filter_expression="subscription_status = :status",
            expression_attribute_values={':status': 'active'},
            select='COUNT'
        )
        return response.get('Count', 0)
        
    except Exception as e:
        logger.error(f"Failed to get premium user count: {str(e)}")
        return 0

async def get_active_users_count(since_time: datetime) -> int:
    """指定時刻以降のアクティブユーザー数取得"""
    try:
        # chatsテーブルから指定時刻以降のユニークユーザー数をカウント
        # 実装注意: 本番では効率的なクエリパターンを使用
        timestamp_str = since_time.isoformat()
        
        # GSI1を使用してタイムスタンプ範囲でクエリ
        response = await dynamodb_client.query_gsi(
            table_name=CHATS_TABLE_NAME,
            index_name='TimestampIndex',  # タイムスタンプ用GSI
            key_condition_expression="SK = :sk_prefix AND created_at >= :timestamp",
            expression_attribute_values={
                ':sk_prefix': 'CHAT#',
                ':timestamp': timestamp_str
            }
        )
        
        # ユニークユーザーIDを抽出
        unique_users = set()
        for item in response.get('Items', []):
            user_id = item['PK'].replace('USER#', '')
            unique_users.add(user_id)
        
        return len(unique_users)
        
    except Exception as e:
        logger.error(f"Failed to get active users count: {str(e)}")
        return 0

async def count_chats_since(since_time: datetime) -> int:
    """指定時刻以降のチャット数カウント"""
    try:
        timestamp_str = since_time.isoformat()
        
        response = await dynamodb_client.scan_table(
            table_name=CHATS_TABLE_NAME,
            filter_expression="created_at >= :timestamp",
            expression_attribute_values={':timestamp': timestamp_str},
            select='COUNT'
        )
        
        return response.get('Count', 0)
        
    except Exception as e:
        logger.error(f"Failed to count chats: {str(e)}")
        return 0

async def get_new_users_count(today_start: datetime, week_start: datetime) -> Dict[str, int]:
    """新規ユーザー数取得"""
    try:
        today_str = today_start.isoformat()
        week_str = week_start.isoformat()
        
        # 本日の新規ユーザー
        today_response = await dynamodb_client.scan_table(
            table_name=USERS_TABLE_NAME,
            filter_expression="created_at >= :timestamp",
            expression_attribute_values={':timestamp': today_str},
            select='COUNT'
        )
        
        # 週間の新規ユーザー
        weekly_response = await dynamodb_client.scan_table(
            table_name=USERS_TABLE_NAME,
            filter_expression="created_at >= :timestamp",
            expression_attribute_values={':timestamp': week_str},
            select='COUNT'
        )
        
        return {
            'today': today_response.get('Count', 0),
            'weekly': weekly_response.get('Count', 0)
        }
        
    except Exception as e:
        logger.error(f"Failed to get new users count: {str(e)}")
        return {'today': 0, 'weekly': 0}

async def get_premium_conversion_metrics() -> Dict[str, float]:
    """プレミアム転換率メトリクス取得"""
    try:
        total_users = await get_total_user_count()
        premium_users = await get_premium_user_count()
        
        conversion_rate = (premium_users / total_users * 100) if total_users > 0 else 0.0
        
        return {
            'conversion_rate': round(conversion_rate, 2)
        }
        
    except Exception as e:
        logger.error(f"Failed to get premium conversion metrics: {str(e)}")
        return {'conversion_rate': 0.0}

async def get_user_retention_metrics(week_start: datetime, month_start: datetime) -> Dict[str, Any]:
    """ユーザー継続率メトリクス取得"""
    try:
        # 簡易実装: アクティブユーザー数をベースに継続率を推定
        active_today = await get_active_users_count(datetime.now().replace(hour=0, minute=0, second=0, microsecond=0))
        active_7d = await get_active_users_count(week_start)
        active_30d = await get_active_users_count(month_start)
        
        total_users = await get_total_user_count()
        
        retention_7d = (active_7d / total_users * 100) if total_users > 0 else 0.0
        retention_30d = (active_30d / total_users * 100) if total_users > 0 else 0.0
        
        return {
            'active_today': active_today,
            'retention_7d': round(retention_7d, 2),
            'retention_30d': round(retention_30d, 2)
        }
        
    except Exception as e:
        logger.error(f"Failed to get user retention metrics: {str(e)}")
        return {'active_today': 0, 'retention_7d': 0.0, 'retention_30d': 0.0}

async def get_lambda_invocation_count(function_name: str) -> int:
    """Lambda関数の呼び出し数取得"""
    try:
        # CloudWatch メトリクス取得（過去24時間）
        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/Lambda',
            MetricName='Invocations',
            Dimensions=[
                {
                    'Name': 'FunctionName',
                    'Value': f"{PROJECT_NAME}-{ENVIRONMENT}-{function_name}"
                }
            ],
            StartTime=datetime.utcnow() - timedelta(days=1),
            EndTime=datetime.utcnow(),
            Period=3600,  # 1時間
            Statistics=['Sum']
        )
        
        total_invocations = sum([datapoint['Sum'] for datapoint in response['Datapoints']])
        return int(total_invocations)
        
    except Exception as e:
        logger.error(f"Failed to get lambda invocation count for {function_name}: {str(e)}")
        return 0

async def get_lambda_error_rate(function_name: str) -> float:
    """Lambda関数のエラー率取得"""
    try:
        # エラー数とトータル呼び出し数を取得してエラー率を計算
        invocations = await get_lambda_invocation_count(function_name)
        
        # エラー数取得
        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/Lambda',
            MetricName='Errors',
            Dimensions=[
                {
                    'Name': 'FunctionName',
                    'Value': f"{PROJECT_NAME}-{ENVIRONMENT}-{function_name}"
                }
            ],
            StartTime=datetime.utcnow() - timedelta(days=1),
            EndTime=datetime.utcnow(),
            Period=3600,  # 1時間
            Statistics=['Sum']
        )
        
        total_errors = sum([datapoint['Sum'] for datapoint in response['Datapoints']])
        error_rate = (total_errors / invocations * 100) if invocations > 0 else 0.0
        
        return round(error_rate, 2)
        
    except Exception as e:
        logger.error(f"Failed to get lambda error rate for {function_name}: {str(e)}")
        return 0.0

async def get_bedrock_api_calls_count(since_time: datetime) -> int:
    """Bedrock API呼び出し数取得"""
    try:
        # CloudWatch からBedrock API呼び出し数取得
        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/Bedrock',
            MetricName='InvocationsCount',
            StartTime=since_time,
            EndTime=datetime.utcnow(),
            Period=3600,  # 1時間
            Statistics=['Sum']
        )
        
        total_calls = sum([datapoint['Sum'] for datapoint in response['Datapoints']])
        return int(total_calls)
        
    except Exception as e:
        logger.error(f"Failed to get bedrock api calls count: {str(e)}")
        return 0

async def get_maintenance_parameters() -> Dict[str, Any]:
    """Parameter Store からメンテナンス設定取得"""
    try:
        parameters = {}
        
        # メンテナンス関連パラメータを取得
        param_keys = [
            f'/homebiyori/maintenance/enabled',
            f'/homebiyori/maintenance/message',
            f'/homebiyori/maintenance/start_time',
            f'/homebiyori/maintenance/end_time'
        ]
        
        for param_key in param_keys:
            try:
                response = ssm.get_parameter(Name=param_key)
                key_name = param_key.split('/')[-1]
                value = response['Parameter']['Value']
                
                # Boolean変換
                if key_name == 'enabled':
                    parameters[key_name] = value.lower() == 'true'
                else:
                    parameters[key_name] = value if value != 'null' else None
                    
            except ssm.exceptions.ParameterNotFound:
                # パラメータが存在しない場合はデフォルト値
                if param_key.endswith('enabled'):
                    parameters['enabled'] = False
                else:
                    key_name = param_key.split('/')[-1]
                    parameters[key_name] = None
        
        return parameters
        
    except Exception as e:
        logger.error(f"Failed to get maintenance parameters: {str(e)}")
        return {'enabled': False, 'message': None, 'start_time': None, 'end_time': None}

async def set_maintenance_parameters(enabled: bool, message: str, start_time: Optional[str], end_time: Optional[str]):
    """Parameter Store にメンテナンス設定保存"""
    try:
        # メンテナンス設定をParameter Store に保存
        parameters = {
            f'/homebiyori/maintenance/enabled': str(enabled).lower(),
            f'/homebiyori/maintenance/message': message or 'null',
            f'/homebiyori/maintenance/start_time': start_time or 'null',
            f'/homebiyori/maintenance/end_time': end_time or 'null'
        }
        
        for param_key, param_value in parameters.items():
            ssm.put_parameter(
                Name=param_key,
                Value=param_value,
                Type='String',
                Overwrite=True
            )
        
        logger.info(f"Maintenance parameters updated: enabled={enabled}")
        
    except Exception as e:
        logger.error(f"Failed to set maintenance parameters: {str(e)}")
        raise ServiceError(f"Failed to update maintenance settings: {str(e)}")

# Lambda handler
handler = Mangum(app)

def lambda_handler(event, context):
    """Lambda エントリーポイント"""
    return handler(event, context)
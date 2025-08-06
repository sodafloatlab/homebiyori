# =====================================
# Homebiyori Lambda Environment Variables
# =====================================
# 
# 全Lambdaファンクションで使用される環境変数の定義
# terraform.tfvarsファイルでカスタマイズ可能
#

# =====================================
# 基本環境設定
# =====================================

variable "environment" {
  description = "デプロイ環境識別子"
  type        = string
  default     = "prod"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "プロジェクト名"
  type        = string
  default     = "homebiyori"
}

# =====================================
# DynamoDB設定
# =====================================

variable "dynamodb_table_prefix" {
  description = "DynamoDBテーブル名プレフィックス"
  type        = string
  default     = "prod-homebiyori"
}

variable "dynamodb_users_table" {
  description = "ユーザーテーブル名"
  type        = string
  default     = "prod-homebiyori-users"
}

variable "dynamodb_chats_table" {
  description = "チャットテーブル名"
  type        = string
  default     = "prod-homebiyori-chats"
}

variable "dynamodb_trees_table" {
  description = "木テーブル名"
  type        = string
  default     = "prod-homebiyori-trees"
}

variable "dynamodb_fruits_table" {
  description = "実テーブル名"
  type        = string
  default     = "prod-homebiyori-fruits"
}

variable "dynamodb_notifications_table" {
  description = "通知テーブル名"
  type        = string
  default     = "prod-homebiyori-notifications"
}

variable "dynamodb_subscriptions_table" {
  description = "サブスクリプションテーブル名"
  type        = string
  default     = "prod-homebiyori-subscriptions"
}

variable "dynamodb_feedback_table" {
  description = "フィードバックテーブル名"
  type        = string
  default     = "prod-homebiyori-feedback"
}

# =====================================
# Stripe決済連携設定
# =====================================

variable "stripe_api_key" {
  description = "Stripe APIキー（秘匿情報）"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe Webhook署名検証用秘密鍵"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_endpoint_secret" {
  description = "Stripe Webhookエンドポイント固有秘密鍵"
  type        = string
  sensitive   = true
}

# =====================================
# SQS キュー設定
# =====================================

variable "ttl_update_queue_name" {
  description = "TTL更新用SQSキュー名"
  type        = string
  default     = "homebiyori-ttl-update-queue"
}

variable "ttl_update_queue_url" {
  description = "TTL更新用SQSキューURL（動的に構築される場合はnull）"
  type        = string
  default     = null
}

# =====================================
# API Gateway・認証設定
# =====================================

variable "internal_api_key" {
  description = "内部API呼び出し用キー"
  type        = string
  sensitive   = true
}

variable "admin_api_key" {
  description = "管理者API用キー"
  type        = string
  sensitive   = true
}

variable "internal_api_base_url" {
  description = "内部APIベースURL"
  type        = string
  default     = null # API Gateway URLから動的構築
}

# =====================================
# 機能フラグ・設定
# =====================================

variable "enable_debug_logging" {
  description = "デバッグログ有効化"
  type        = bool
  default     = false
}

variable "enable_docs" {
  description = "API文書化有効化（swagger/redoc）"
  type        = bool
  default     = false
}

variable "enable_webhook_validation" {
  description = "Webhook署名検証有効化"
  type        = bool
  default     = true
}

variable "enable_admin_notifications" {
  description = "管理者通知機能有効化"
  type        = bool
  default     = true
}

variable "enable_batch_operations" {
  description = "バッチ操作有効化"
  type        = bool
  default     = true
}

# =====================================
# 通知システム設定
# =====================================

variable "default_notification_ttl_days" {
  description = "通知のデフォルトTTL（日数）"
  type        = number
  default     = 30
}

variable "max_notifications_per_user" {
  description = "ユーザー当たり最大通知数"
  type        = number
  default     = 100
}

variable "default_page_size" {
  description = "デフォルトページサイズ"
  type        = number
  default     = 20
}

variable "max_page_size" {
  description = "最大ページサイズ"
  type        = number
  default     = 100
}

# =====================================
# ログレベル設定
# =====================================

variable "log_level" {
  description = "ログレベル"
  type        = string
  default     = "INFO"
  validation {
    condition     = contains(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"], var.log_level)
    error_message = "Log level must be one of: DEBUG, INFO, WARNING, ERROR, CRITICAL."
  }
}

# =====================================
# サービス名設定
# =====================================

variable "service_names" {
  description = "各Lambdaサービス名マッピング"
  type = object({
    health_check_service      = string
    user_service              = string  
    chat_service              = string
    tree_service              = string
    webhook_service           = string
    notification_service      = string
    ttl_updater_service       = string
    billing_service           = string
    admin_service             = string
  })
  default = {
    health_check_service      = "health-check-service"
    user_service              = "user-service"
    chat_service              = "chat-service"
    tree_service              = "tree-service"
    webhook_service           = "webhook-service"
    notification_service      = "notification-service"
    ttl_updater_service       = "ttl-updater-service"
    billing_service           = "billing-service"
    admin_service             = "admin-service"
  }
}

# =====================================
# Lambda関数設定
# =====================================

variable "lambda_timeout" {
  description = "Lambda関数タイムアウト（秒）"
  type        = number
  default     = 30
}

variable "lambda_memory" {
  description = "Lambda関数メモリ（MB）"
  type        = number
  default     = 512
}

variable "lambda_runtime" {
  description = "Lambda関数ランタイム"
  type        = string
  default     = "python3.11"
}

# =====================================
# コスト最適化設定
# =====================================

variable "reserved_concurrent_executions" {
  description = "Lambda予約同時実行数（コスト制御）"
  type        = number
  default     = 10
}

# =====================================
# セキュリティ設定
# =====================================

variable "cors_allowed_origins" {
  description = "CORS許可オリジン"
  type        = list(string)
  default     = ["https://homebiyori.com"]
}

variable "cors_allowed_methods" {
  description = "CORS許可メソッド"
  type        = list(string)
  default     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}

# =====================================
# 出力設定: 各Lambdaで使用する環境変数
# =====================================

locals {
  # 全Lambda共通環境変数
  common_environment_variables = {
    ENVIRONMENT                    = var.environment
    AWS_DEFAULT_REGION            = var.aws_region
    LOG_LEVEL                     = var.log_level
    ENABLE_DEBUG_LOGGING          = tostring(var.enable_debug_logging)
    PROJECT_NAME                  = var.project_name
    
    # DynamoDB共通設定
    DYNAMODB_REGION               = var.aws_region
  }
  
  # health_check_service専用環境変数
  health_check_service_environment_variables = merge(local.common_environment_variables, {
    SERVICE_NAME                  = var.service_names.health_check_service
  })
  
  # user_service専用環境変数
  user_service_environment_variables = merge(local.common_environment_variables, {
    SERVICE_NAME                  = var.service_names.user_service
    DYNAMODB_TABLE               = var.dynamodb_users_table
    DYNAMODB_TABLE_NAME          = var.dynamodb_users_table
  })
  
  # chat_service専用環境変数  
  chat_service_environment_variables = merge(local.common_environment_variables, {
    SERVICE_NAME                  = var.service_names.chat_service
    DYNAMODB_TABLE               = var.dynamodb_chats_table
    DYNAMODB_TABLE_NAME          = var.dynamodb_chats_table
  })
  
  # tree_service専用環境変数
  tree_service_environment_variables = merge(local.common_environment_variables, {
    SERVICE_NAME                  = var.service_names.tree_service
    DYNAMODB_TABLE               = var.dynamodb_trees_table
    DYNAMODB_TABLE_NAME          = var.dynamodb_trees_table
    ENABLE_DOCS                  = tostring(var.enable_docs)
  })
  
  # webhook_service専用環境変数
  webhook_service_environment_variables = merge(local.common_environment_variables, {
    SERVICE_NAME                  = var.service_names.webhook_service
    DYNAMODB_TABLE               = var.dynamodb_subscriptions_table
    STRIPE_API_KEY               = var.stripe_api_key
    STRIPE_WEBHOOK_SECRET        = var.stripe_webhook_secret
    TTL_UPDATE_QUEUE_URL         = var.ttl_update_queue_url != null ? var.ttl_update_queue_url : "https://sqs.${var.aws_region}.amazonaws.com/${data.aws_caller_identity.current.account_id}/${var.ttl_update_queue_name}"
    INTERNAL_API_BASE_URL        = var.internal_api_base_url != null ? var.internal_api_base_url : "https://api.${var.environment}.homebiyori.com"
    INTERNAL_API_KEY             = var.internal_api_key
    ENABLE_WEBHOOK_VALIDATION    = tostring(var.enable_webhook_validation)
  })
  
  # notification_service専用環境変数
  notification_service_environment_variables = merge(local.common_environment_variables, {
    SERVICE_NAME                  = var.service_names.notification_service
    DYNAMODB_TABLE               = var.dynamodb_notifications_table
    INTERNAL_API_KEY             = var.internal_api_key
    ADMIN_API_KEY                = var.admin_api_key
    DEFAULT_NOTIFICATION_TTL_DAYS = tostring(var.default_notification_ttl_days)
    MAX_NOTIFICATIONS_PER_USER   = tostring(var.max_notifications_per_user)
    DEFAULT_PAGE_SIZE            = tostring(var.default_page_size)
    MAX_PAGE_SIZE                = tostring(var.max_page_size)
    ENABLE_ADMIN_NOTIFICATIONS   = tostring(var.enable_admin_notifications)
    ENABLE_BATCH_OPERATIONS      = tostring(var.enable_batch_operations)
  })
  
  # ttl_updater_service専用環境変数
  ttl_updater_service_environment_variables = merge(local.common_environment_variables, {
    SERVICE_NAME                  = var.service_names.ttl_updater_service
    DYNAMODB_TABLE               = var.dynamodb_chats_table
    DYNAMODB_TABLE_NAME          = var.dynamodb_chats_table
  })
}

# =====================================
# データソース
# =====================================

data "aws_caller_identity" "current" {}

# =====================================
# 出力値
# =====================================

output "lambda_environment_variables" {
  description = "各Lambdaファンクションの環境変数マッピング"
  value = {
    health_check_service      = local.health_check_service_environment_variables
    user_service              = local.user_service_environment_variables
    chat_service              = local.chat_service_environment_variables
    tree_service              = local.tree_service_environment_variables
    webhook_service           = local.webhook_service_environment_variables
    notification_service      = local.notification_service_environment_variables
    ttl_updater_service       = local.ttl_updater_service_environment_variables
  }
  sensitive = true
}

output "dynamodb_table_names" {
  description = "DynamoDBテーブル名一覧"
  value = {
    users           = var.dynamodb_users_table
    chats           = var.dynamodb_chats_table
    trees           = var.dynamodb_trees_table
    fruits          = var.dynamodb_fruits_table
    notifications   = var.dynamodb_notifications_table
    subscriptions   = var.dynamodb_subscriptions_table
    feedback        = var.dynamodb_feedback_table
  }
}

output "environment_config" {
  description = "環境設定情報"
  value = {
    environment     = var.environment
    region         = var.aws_region
    project_name   = var.project_name
    log_level      = var.log_level
  }
}
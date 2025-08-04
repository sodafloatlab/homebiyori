variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}


# Lambda デプロイメントパッケージパス - 5サービス
variable "user_service_zip_path" {
  description = "Path to the User Service Lambda deployment package"
  type        = string
  default     = "user_service.zip"
}

variable "chat_service_zip_path" {
  description = "Path to the Chat Service Lambda deployment package"
  type        = string
  default     = "chat_service.zip"
}

variable "tree_service_zip_path" {
  description = "Path to the Tree Service Lambda deployment package"
  type        = string
  default     = "tree_service.zip"
}

variable "health_check_zip_path" {
  description = "Path to the Health Check Lambda deployment package"
  type        = string
  default     = "health_check.zip"
}

variable "admin_service_zip_path" {
  description = "Path to the Admin Service Lambda deployment package"
  type        = string
  default     = "admin_service.zip"
}

variable "environment_variables" {
  description = "Environment variables for Lambda functions"
  type        = map(string)
  default     = {}
}

# Lambda Layer 設定 - 共通レイヤー
variable "create_common_layer" {
  description = "Whether to create a common Lambda layer for dependencies"
  type        = bool
  default     = true
}

variable "common_layer_zip_path" {
  description = "Path to the common Lambda layer zip file"
  type        = string
  default     = "common_layer.zip"
}

variable "common_layer_source_code_hash" {
  description = "Source code hash for common Lambda layer"
  type        = string
  default     = ""
}

# AI特化レイヤー
variable "create_ai_layer" {
  description = "Whether to create an AI-specific Lambda layer"
  type        = bool
  default     = true
}

variable "ai_layer_zip_path" {
  description = "Path to the AI Lambda layer zip file"
  type        = string
  default     = "ai_layer.zip"
}

variable "ai_layer_source_code_hash" {
  description = "Source code hash for AI Lambda layer"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 14
}

# 注意: API Gateway execution ARNsはAPI Gatewayモジュールで管理されます

# DynamoDB テーブル設定
variable "user_data_table_name" {
  description = "Name of the user data DynamoDB table"
  type        = string
}

variable "user_data_table_arn" {
  description = "ARN of the user data DynamoDB table"
  type        = string
}

variable "chat_free_table_name" {
  description = "Name of the free chat DynamoDB table"
  type        = string
}

variable "chat_premium_table_name" {
  description = "Name of the premium chat DynamoDB table"
  type        = string
}

variable "chat_table_arns" {
  description = "List of chat DynamoDB table ARNs for IAM policies"
  type        = list(string)
  default     = []
}

# Parameter Store ARN
variable "parameter_store_arns" {
  description = "List of Parameter Store ARNs for IAM policies"
  type        = list(string)
  default     = []
}
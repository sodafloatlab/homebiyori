variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "homebiyori"
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "homebiyori"
    Environment = "prod"
    ManagedBy   = "terraform"
  }
}

# Lambda configuration - 9 microservices
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

variable "health_check_service_zip_path" {
  description = "Path to the Health Check Service Lambda deployment package"
  type        = string
  default     = "health_check_service.zip"
}

variable "webhook_service_zip_path" {
  description = "Path to the Webhook Service Lambda deployment package"
  type        = string
  default     = "webhook_service.zip"
}

variable "notification_service_zip_path" {
  description = "Path to the Notification Service Lambda deployment package"
  type        = string
  default     = "notification_service.zip"
}

variable "ttl_updater_service_zip_path" {
  description = "Path to the TTL Updater Service Lambda deployment package"
  type        = string
  default     = "ttl_updater_service.zip"
}

variable "billing_service_zip_path" {
  description = "Path to the Billing Service Lambda deployment package"
  type        = string
  default     = "billing_service.zip"
}

variable "admin_service_zip_path" {
  description = "Path to the Admin Service Lambda deployment package"
  type        = string
  default     = "admin_service.zip"
}

# Lambda Layers configuration
variable "common_layer_zip_path" {
  description = "Path to the Common Layer deployment package"
  type        = string
  default     = "common_layer.zip"
}

variable "ai_layer_zip_path" {
  description = "Path to the AI Layer deployment package"
  type        = string
  default     = "ai_layer.zip"
}

variable "create_common_layer" {
  description = "Whether to create the common dependencies layer"
  type        = bool
  default     = true
}

variable "create_ai_layer" {
  description = "Whether to create the AI dependencies layer"
  type        = bool
  default     = true
}

variable "environment_variables" {
  description = "Environment variables for Lambda functions"
  type        = map(string)
  default     = {}
}

# Cognito configuration
variable "callback_urls" {
  description = "List of allowed callback URLs for OAuth"
  type        = list(string)
  default     = ["https://d123456789.cloudfront.net"]
}

variable "logout_urls" {
  description = "List of allowed logout URLs for OAuth"
  type        = list(string)
  default     = ["https://d123456789.cloudfront.net"]
}

variable "enable_google_oauth" {
  description = "Enable Google OAuth integration"
  type        = bool
  default     = true
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  default     = ""
  sensitive   = true
}

# Additional variables needed for the new architecture
variable "bedrock_model_id" {
  description = "Amazon Bedrock model ID for AI functionality"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "lambda_zip_paths" {
  description = "Map of Lambda service names to their zip file paths"
  type        = map(string)
  default = {
    user-service           = "user_service.zip"
    chat-service          = "chat_service.zip"
    tree-service          = "tree_service.zip"
    health-check-service  = "health_check_service.zip"
    webhook-service       = "webhook_service.zip"
    notification-service  = "notification_service.zip"
    ttl-updater-service   = "ttl_updater_service.zip"
    billing-service       = "billing_service.zip"
    admin-service         = "admin_service.zip"
  }
}

variable "lambda_source_code_hashes" {
  description = "Map of Lambda service names to their source code hashes"
  type        = map(string)
  default     = {}
}

variable "lambda_layer_source_code_hashes" {
  description = "Map of Lambda layer names to their source code hashes"
  type        = map(string)
  default     = {}
}

variable "common_layer_arn" {
  description = "ARN of the common Lambda layer"
  type        = string
  default     = ""
}

variable "ai_layer_arn" {
  description = "ARN of the AI Lambda layer"
  type        = string
  default     = ""
}
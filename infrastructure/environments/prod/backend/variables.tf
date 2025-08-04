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

# Lambda configuration - 5 microservices
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
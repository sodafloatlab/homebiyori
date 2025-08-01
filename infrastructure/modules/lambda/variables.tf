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


variable "core_service_zip_path" {
  description = "Path to the Core Service Lambda deployment package"
  type        = string
  default     = "core_service.zip"
}

variable "ai_service_zip_path" {
  description = "Path to the AI Service Lambda deployment package"
  type        = string
  default     = "ai_service.zip"
}

variable "environment_variables" {
  description = "Environment variables for Lambda functions"
  type        = map(string)
  default     = {}
}

variable "create_lambda_layer" {
  description = "Whether to create a Lambda layer for dependencies"
  type        = bool
  default     = false
}

variable "lambda_layer_zip_path" {
  description = "Path to the Lambda layer zip file"
  type        = string
  default     = ""
}

variable "lambda_layer_source_code_hash" {
  description = "Source code hash for Lambda layer"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 14
}

variable "api_gateway_execution_arn" {
  description = "ARN of the API Gateway for Lambda permissions"
  type        = string
  default     = ""
}
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

variable "main_lambda_invoke_arn" {
  description = "Invoke ARN of the main Lambda function"
  type        = string
}

variable "ai_praise_lambda_invoke_arn" {
  description = "Invoke ARN of the AI praise Lambda function"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool for authorization"
  type        = string
}


variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 14
}
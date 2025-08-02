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

# Lambda Function Invoke ARNs - 5 Microservices
variable "user_service_invoke_arn" {
  description = "Invoke ARN of the User Service Lambda function"
  type        = string
}

variable "chat_service_invoke_arn" {
  description = "Invoke ARN of the Chat Service Lambda function"
  type        = string
}

variable "tree_service_invoke_arn" {
  description = "Invoke ARN of the Tree Service Lambda function"
  type        = string
}

variable "health_check_invoke_arn" {
  description = "Invoke ARN of the Health Check Lambda function"
  type        = string
}

variable "admin_service_invoke_arn" {
  description = "Invoke ARN of the Admin Service Lambda function"
  type        = string
}

# Cognito User Pool ARNs - Separated for Users and Admins
variable "user_cognito_user_pool_arn" {
  description = "ARN of the User Cognito User Pool for authorization"
  type        = string
}

variable "admin_cognito_user_pool_arn" {
  description = "ARN of the Admin Cognito User Pool for authorization"
  type        = string
}


variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 14
}
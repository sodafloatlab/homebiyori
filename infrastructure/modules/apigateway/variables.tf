# Variables for reusable API Gateway Service Module

variable "project_name" {
  description = "The name of the project"
  type        = string
  
  validation {
    condition     = length(var.project_name) > 0 && length(var.project_name) <= 50
    error_message = "Project name must be between 1-50 characters."
  }
}

variable "environment" {
  description = "The deployment environment"
  type        = string
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "api_type" {
  description = "The type of API (e.g., user, admin)"
  type        = string
  default     = "user"
  
  validation {
    condition     = length(var.api_type) > 0 && length(var.api_type) <= 30
    error_message = "API type must be between 1-30 characters."
  }
}

variable "endpoint_type" {
  description = "The API Gateway endpoint type"
  type        = string
  default     = "REGIONAL"
  
  validation {
    condition     = contains(["REGIONAL", "EDGE", "PRIVATE"], var.endpoint_type)
    error_message = "Endpoint type must be one of: REGIONAL, EDGE, PRIVATE."
  }
}

variable "cognito_user_pool_arn" {
  description = "The ARN of the Cognito User Pool for authorization"
  type        = string
  default     = null
}

variable "lambda_services" {
  description = "Map of Lambda services and their configurations for API Gateway integration"
  type = map(object({
    path_part             = string
    lambda_function_name  = string
    lambda_invoke_arn     = string
    http_method          = string
    require_auth         = bool
    use_proxy           = bool
    enable_cors         = bool
  }))
  
  validation {
    condition = alltrue([
      for k, v in var.lambda_services : contains(["GET", "POST", "PUT", "DELETE", "PATCH", "ANY"], v.http_method)
    ])
    error_message = "HTTP method must be one of: GET, POST, PUT, DELETE, PATCH, ANY."
  }
}

variable "cors_allow_origin" {
  description = "The CORS allow origin value"
  type        = string
  default     = "'*'"
}

variable "enable_detailed_logging" {
  description = "Enable detailed logging for API Gateway"
  type        = bool
  default     = false
}

variable "access_log_format" {
  description = "The access log format for API Gateway"
  type = object({
    requestId      = string
    ip            = string
    caller        = string
    user          = string
    requestTime   = string
    httpMethod    = string
    resourcePath  = string
    status        = string
    protocol      = string
    responseLength = string
  })
  default = {
    requestId      = "$context.requestId"
    ip            = "$context.identity.sourceIp"
    caller        = "$context.identity.caller"
    user          = "$context.identity.user"
    requestTime   = "$context.requestTime"
    httpMethod    = "$context.httpMethod"
    resourcePath  = "$context.resourcePath"
    status        = "$context.status"
    protocol      = "$context.protocol"
    responseLength = "$context.responseLength"
  }
}

variable "log_retention_days" {
  description = "The retention period for CloudWatch logs in days"
  type        = number
  default     = 14
  
  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch retention period."
  }
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
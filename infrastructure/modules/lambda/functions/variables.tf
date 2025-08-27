# Lambda Function Module Variables

# Required variables
variable "project_name" {
  description = "The name of the project"
  type        = string
  
  validation {
    condition     = length(var.project_name) > 0 && length(var.project_name) <= 32
    error_message = "Project name must be between 1-32 characters."
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

variable "service_name" {
  description = "The name of the service (used in function naming)"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.service_name))
    error_message = "Service name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "filename" {
  description = "Path to the Lambda deployment package"
  type        = string
}

# Lambda configuration
variable "handler" {
  description = "The Lambda handler function"
  type        = string
  default     = "handler.lambda_handler"
}

variable "runtime" {
  description = "The Lambda runtime"
  type        = string
  default     = "python3.13"
  
  validation {
    condition = contains([
      "python3.11", "python3.12", "python3.13",
      "nodejs18.x", "nodejs20.x",
      "java11", "java17", "java21",
      "dotnet6", "dotnet8",
      "go1.x",
      "ruby3.2", "ruby3.3"
    ], var.runtime)
    error_message = "Runtime must be a valid AWS Lambda runtime."
  }
}

variable "timeout" {
  description = "The Lambda timeout in seconds"
  type        = number
  default     = 30
  
  validation {
    condition     = var.timeout >= 1 && var.timeout <= 900
    error_message = "Timeout must be between 1-900 seconds."
  }
}

variable "memory_size" {
  description = "The Lambda memory size in MB"
  type        = number
  default     = 256
  
  validation {
    condition     = var.memory_size >= 128 && var.memory_size <= 10240
    error_message = "Memory size must be between 128-10240 MB."
  }
}

variable "layers" {
  description = "List of Lambda Layer ARNs"
  type        = list(string)
  default     = []
}

variable "source_code_hash" {
  description = "Source code hash for triggering updates"
  type        = string
  default     = null
}

# Environment variables
variable "environment_variables" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

# IAM configuration
variable "iam_policy_document" {
  description = "IAM policy document for the Lambda function"
  type        = string
  default     = null
}

variable "additional_policy_arns" {
  description = "Additional IAM policy ARNs to attach to the Lambda role"
  type        = list(string)
  default     = []
}

# Network configuration
variable "vpc_config" {
  description = "VPC configuration for the Lambda function"
  type = object({
    subnet_ids         = list(string)
    security_group_ids = list(string)
  })
  default = null
}

# Error handling
variable "dead_letter_config" {
  description = "Dead letter configuration for failed invocations"
  type = object({
    target_arn = string
  })
  default = null
}

# Tracing
variable "tracing_mode" {
  description = "AWS X-Ray tracing mode"
  type        = string
  default     = null
  
  validation {
    condition = var.tracing_mode == null || contains([
      "Active", "PassThrough"
    ], var.tracing_mode)
    error_message = "Tracing mode must be 'Active' or 'PassThrough'."
  }
}

# Logging
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
  
  validation {
    condition = contains([
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653
    ], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch value."
  }
}

# Event source mappings
variable "event_source_mappings" {
  description = "Event source mappings for the Lambda function"
  type = map(object({
    event_source_arn                   = string
    batch_size                         = optional(number, 10)
    maximum_batching_window_in_seconds = optional(number)
    starting_position                  = optional(string)
    function_response_types            = optional(list(string))
  }))
  default = {}
}

# Lambda permissions
variable "lambda_permissions" {
  description = "Lambda permissions for external invocation"
  type = map(object({
    principal  = string
    source_arn = optional(string)
  }))
  default = {}
}

# Tags
variable "tags" {
  description = "Additional tags for the Lambda function"
  type        = map(string)
  default     = {}
}
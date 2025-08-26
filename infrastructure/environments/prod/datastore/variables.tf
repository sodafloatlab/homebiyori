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

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for DynamoDB tables"
  type        = bool
  default     = true
}

# S3 Logs Bucket lifecycle variables
variable "logs_transition_to_glacier_days" {
  description = "Number of days after which logs are transitioned to Glacier"
  type        = number
  default     = 90
}

variable "logs_expiration_days" {
  description = "Number of days after which logs are permanently deleted"
  type        = number
  default     = 400
}
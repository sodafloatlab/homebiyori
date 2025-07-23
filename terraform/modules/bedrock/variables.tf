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

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 30
}

variable "alarm_topic_arn" {
  description = "ARN of SNS topic for CloudWatch alarms"
  type        = string
  default     = ""
}

variable "token_usage_alarm_threshold" {
  description = "Threshold for token usage alarm (tokens per hour)"
  type        = number
  default     = 100000
}
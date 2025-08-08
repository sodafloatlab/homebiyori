# Variables for Operation Layer
# Handles logging infrastructure configuration

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

# CloudWatch Logs retention configuration
variable "log_retention_in_days" {
  description = "CloudWatch Logs retention period in days"
  type        = number
  default     = 7
}

# Kinesis Data Firehose configuration
variable "firehose_buffer_size" {
  description = "Buffer size in MBs for Kinesis Data Firehose"
  type        = number
  default     = 5
}

variable "firehose_buffer_interval" {
  description = "Buffer interval in seconds for Kinesis Data Firehose"
  type        = number
  default     = 300
}

variable "firehose_compression_format" {
  description = "Compression format for Kinesis Data Firehose"
  type        = string
  default     = "GZIP"
}

# Note: Log groups are now managed by their respective modules (Lambda, API Gateway)
# and referenced via terraform_remote_state for subscription filter configuration
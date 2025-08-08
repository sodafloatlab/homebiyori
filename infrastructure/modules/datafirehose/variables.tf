# Kinesis Data Firehose Module Variables

variable "project_name" {
  description = "The name of the project"
  type        = string
}

variable "environment" {
  description = "The deployment environment"
  type        = string
}

variable "firehose_name" {
  description = "The name of the Kinesis Data Firehose delivery stream"
  type        = string
}

variable "destination_bucket_arn" {
  description = "ARN of the S3 bucket to deliver logs to"
  type        = string
}

variable "firehose_role_arn" {
  description = "ARN of the IAM role for Firehose delivery"
  type        = string
}

# Buffering configuration
variable "buffer_size" {
  description = "Buffer size in MBs for Kinesis Data Firehose"
  type        = number
  default     = 5
}

variable "buffer_interval" {
  description = "Buffer interval in seconds for Kinesis Data Firehose"
  type        = number
  default     = 300
}

variable "compression_format" {
  description = "Compression format for Kinesis Data Firehose"
  type        = string
  default     = "GZIP"
  
  validation {
    condition     = contains(["GZIP", "ZIP", "Snappy", "HADOOP_SNAPPY", "UNCOMPRESSED"], var.compression_format)
    error_message = "Compression format must be one of: GZIP, ZIP, Snappy, HADOOP_SNAPPY, UNCOMPRESSED."
  }
}

# S3 prefix configuration
variable "s3_prefix" {
  description = "S3 prefix for delivered files"
  type        = string
  default     = "year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/"
}

variable "error_output_prefix" {
  description = "S3 prefix for error records"
  type        = string
  default     = "error-records/"
}

# CloudWatch Logging
variable "enable_cloudwatch_logging" {
  description = "Enable CloudWatch logging for Firehose"
  type        = bool
  default     = true
}

variable "log_group_name" {
  description = "CloudWatch log group name for Firehose logging"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 7
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to resources (default_tags handle basic tags)"
  type        = map(string)
  default     = {}
}
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

variable "force_destroy" {
  description = "Force destroy S3 buckets even if they contain objects"
  type        = bool
  default     = false
}

variable "enable_versioning" {
  description = "Enable versioning on S3 buckets"
  type        = bool
  default     = true
}

variable "enable_lifecycle" {
  description = "Enable lifecycle policies on S3 buckets"
  type        = bool
  default     = true
}

variable "lifecycle_noncurrent_version_expiration_days" {
  description = "Number of days after which noncurrent versions are deleted"
  type        = number
  default     = 30
}

variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution for bucket policies"
  type        = string
  default     = ""
}

variable "lambda_role_arn" {
  description = "ARN of the Lambda execution role for bucket policies"
  type        = string
  default     = ""
}

variable "create_chat_content_bucket" {
  description = "Whether to create a bucket for chat content storage"
  type        = bool
  default     = false
}

variable "chat_content_bucket_prefix" {
  description = "Prefix for the chat content bucket name"
  type        = string
  default     = "chat-content"
}
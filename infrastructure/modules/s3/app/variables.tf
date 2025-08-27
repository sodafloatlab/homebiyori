# Variables for reusable S3 Bucket Module

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

variable "bucket_type" {
  description = "The type of bucket (e.g., images, static, logs)"
  type        = string
  
  validation {
    condition     = length(var.bucket_type) > 0 && length(var.bucket_type) <= 30
    error_message = "Bucket type must be between 1-30 characters."
  }
}

variable "bucket_purpose" {
  description = "The purpose/description of the bucket"
  type        = string
  default     = "General purpose S3 bucket"
}

variable "bucket_name_override" {
  description = "Override the default bucket naming convention (for special requirements like WAF logs)"
  type        = string
  default     = null
}


variable "force_destroy" {
  description = "Allow the bucket to be destroyed even if it contains objects"
  type        = bool
  default     = false
}

variable "enable_versioning" {
  description = "Enable S3 bucket versioning"
  type        = bool
  default     = false
}

variable "kms_key_id" {
  description = "The KMS key ID to use for server-side encryption"
  type        = string
  default     = null
}

variable "bucket_key_enabled" {
  description = "Whether to use S3 bucket keys for SSE-KMS"
  type        = bool
  default     = true
}

# Public access block settings
variable "block_public_acls" {
  description = "Whether to block public ACLs for this bucket"
  type        = bool
  default     = true
}

variable "block_public_policy" {
  description = "Whether to block public bucket policies for this bucket"
  type        = bool
  default     = true
}

variable "ignore_public_acls" {
  description = "Whether to ignore public ACLs for this bucket"
  type        = bool
  default     = true
}

variable "restrict_public_buckets" {
  description = "Whether to restrict public bucket policies for this bucket"
  type        = bool
  default     = true
}

# Lifecycle configuration
variable "lifecycle_rules" {
  description = "List of lifecycle rules for the bucket"
  type = list(object({
    id      = string
    enabled = bool
    filter = optional(object({
      prefix = optional(string)
      tags   = optional(map(string))
    }))
    transitions = optional(list(object({
      days          = optional(number)
      date          = optional(string)
      storage_class = string
    })), [])
    expiration = optional(object({
      days                         = optional(number)
      date                         = optional(string)
      expired_object_delete_marker = optional(bool)
    }))
    noncurrent_version_expiration = optional(object({
      days                      = optional(number)
      newer_noncurrent_versions = optional(number)
    }))
    abort_incomplete_multipart_upload_days = optional(number)
  }))
  default = []
}

# CORS configuration
variable "cors_rules" {
  description = "List of CORS rules for the bucket"
  type = list(object({
    id              = optional(string)
    allowed_headers = optional(list(string))
    allowed_methods = list(string)
    allowed_origins = list(string)
    expose_headers  = optional(list(string))
    max_age_seconds = optional(number)
  }))
  default = []
}

variable "bucket_policy" {
  description = "IAM policy document for the bucket"
  type        = string
  default     = null
}

variable "notification_configuration" {
  description = "S3 bucket notification configuration"
  type = object({
    lambda_functions = optional(list(object({
      lambda_function_arn = string
      events             = list(string)
      filter_prefix      = optional(string)
      filter_suffix      = optional(string)
    })), [])
    topics = optional(list(object({
      topic_arn     = string
      events        = list(string)
      filter_prefix = optional(string)
      filter_suffix = optional(string)
    })), [])
    queues = optional(list(object({
      queue_arn     = string
      events        = list(string)
      filter_prefix = optional(string)
      filter_suffix = optional(string)
    })), [])
  })
  default = null
}

variable "access_logging_config" {
  description = "S3 bucket access logging configuration"
  type = object({
    target_bucket = string
    target_prefix = optional(string)
    target_grants = optional(list(object({
      grantee = object({
        id            = optional(string)
        type          = string
        uri           = optional(string)
        email_address = optional(string)
        display_name  = optional(string)
      })
      permission = string
    })), [])
  })
  default = null
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
# DynamoDB Table Module Variables

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

variable "table_name" {
  description = "The name of the DynamoDB table (will be prefixed with project-environment)"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.table_name))
    error_message = "Table name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "table_type" {
  description = "The type of the table for categorization and tagging"
  type        = string
  default     = "general"
}

# Table schema
variable "hash_key" {
  description = "The hash key (partition key) for the table"
  type        = string
}

variable "range_key" {
  description = "The range key (sort key) for the table"
  type        = string
  default     = null
}

variable "attributes" {
  description = "List of table attributes"
  type = list(object({
    name = string
    type = string
  }))
  
  validation {
    condition = alltrue([
      for attr in var.attributes : contains(["S", "N", "B"], attr.type)
    ])
    error_message = "Attribute type must be S (String), N (Number), or B (Binary)."
  }
}

# Billing configuration
variable "billing_mode" {
  description = "Controls how you are charged for read and write throughput"
  type        = string
  default     = "PAY_PER_REQUEST"
  
  validation {
    condition     = contains(["PAY_PER_REQUEST", "PROVISIONED"], var.billing_mode)
    error_message = "Billing mode must be PAY_PER_REQUEST or PROVISIONED."
  }
}

variable "read_capacity" {
  description = "The number of read units for PROVISIONED billing mode"
  type        = number
  default     = 20
}

variable "write_capacity" {
  description = "The number of write units for PROVISIONED billing mode"
  type        = number
  default     = 20
}

# Global Secondary Indexes
variable "global_secondary_indexes" {
  description = "Global secondary indexes configuration"
  type = map(object({
    hash_key                    = string
    range_key                   = optional(string)
    projection_type             = optional(string, "ALL")
    non_key_attributes          = optional(list(string))
    read_capacity               = optional(number)
    write_capacity              = optional(number)
    autoscaling_read_max_capacity  = optional(number)
    autoscaling_read_min_capacity  = optional(number)
    autoscaling_write_max_capacity = optional(number)
    autoscaling_write_min_capacity = optional(number)
  }))
  default = null
}

# Local Secondary Indexes
variable "local_secondary_indexes" {
  description = "Local secondary indexes configuration"
  type = map(object({
    range_key          = string
    projection_type    = optional(string, "ALL")
    non_key_attributes = optional(list(string))
  }))
  default = null
}

# TTL configuration
variable "ttl_enabled" {
  description = "Whether TTL is enabled"
  type        = bool
  default     = false
}

variable "ttl_attribute_name" {
  description = "The name of the TTL attribute"
  type        = string
  default     = "ttl"
}

# Point-in-time recovery
variable "point_in_time_recovery_enabled" {
  description = "Whether point-in-time recovery is enabled"
  type        = bool
  default     = true
}

# Server-side encryption
variable "server_side_encryption_enabled" {
  description = "Whether server-side encryption is enabled"
  type        = bool
  default     = true
}

variable "server_side_encryption_kms_key_id" {
  description = "The KMS key ID for server-side encryption"
  type        = string
  default     = null
}

# DynamoDB Streams
variable "stream_enabled" {
  description = "Whether DynamoDB streams are enabled"
  type        = bool
  default     = false
}

variable "stream_view_type" {
  description = "The stream view type"
  type        = string
  default     = "NEW_AND_OLD_IMAGES"
  
  validation {
    condition = contains([
      "KEYS_ONLY", "NEW_IMAGE", "OLD_IMAGE", "NEW_AND_OLD_IMAGES"
    ], var.stream_view_type)
    error_message = "Stream view type must be a valid DynamoDB stream view type."
  }
}

# Table configuration
variable "deletion_protection_enabled" {
  description = "Whether deletion protection is enabled"
  type        = bool
  default     = false
}

variable "table_class" {
  description = "The table class"
  type        = string
  default     = "STANDARD"
  
  validation {
    condition     = contains(["STANDARD", "STANDARD_INFREQUENT_ACCESS"], var.table_class)
    error_message = "Table class must be STANDARD or STANDARD_INFREQUENT_ACCESS."
  }
}

# Auto Scaling configuration
variable "autoscaling_enabled" {
  description = "Whether auto scaling is enabled for PROVISIONED billing mode"
  type        = bool
  default     = true
}

variable "autoscaling_read" {
  description = "Read capacity auto scaling configuration"
  type = object({
    min_capacity = number
    max_capacity = number
    target_value = number
  })
  default = {
    min_capacity = 20
    max_capacity = 4000
    target_value = 70
  }
}

variable "autoscaling_write" {
  description = "Write capacity auto scaling configuration"
  type = object({
    min_capacity = number
    max_capacity = number
    target_value = number
  })
  default = {
    min_capacity = 20
    max_capacity = 4000
    target_value = 70
  }
}

# Tags
variable "tags" {
  description = "Additional tags for the DynamoDB table"
  type        = map(string)
  default     = {}
}
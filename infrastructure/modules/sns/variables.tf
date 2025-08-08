# SNS Module Variables

variable "topic_name" {
  description = "Name of the SNS topic"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9._-]+$", var.topic_name))
    error_message = "Topic name must contain only alphanumeric characters, hyphens, periods, and underscores."
  }
}

variable "display_name" {
  description = "Display name for the SNS topic"
  type        = string
  default     = null
}

variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "tags" {
  description = "Tags to be applied to all resources"
  type        = map(string)
  default     = {}
}

variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring and alarms"
  type        = bool
  default     = true
}

variable "alarm_actions" {
  description = "List of ARNs to notify when alarm triggers"
  type        = list(string)
  default     = []
}

variable "subscription_emails" {
  description = "List of email addresses to subscribe to the topic (Note: Subscriptions must be confirmed manually)"
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for email in var.subscription_emails : can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", email))
    ])
    error_message = "All subscription emails must be valid email addresses."
  }
}

variable "delivery_policy" {
  description = "SNS delivery policy configuration"
  type = object({
    http_retry_policy = object({
      min_delay_target     = number
      max_delay_target     = number
      num_retries          = number
      num_max_delay_retries = number
      num_min_delay_retries = number
      num_no_delay_retries  = number
      backoff_function     = string
    })
  })
  default = {
    http_retry_policy = {
      min_delay_target     = 20
      max_delay_target     = 20
      num_retries          = 3
      num_max_delay_retries = 0
      num_min_delay_retries = 0
      num_no_delay_retries  = 0
      backoff_function     = "linear"
    }
  }
}
# =====================================
# EventBridge Rule Module Variables
# =====================================

variable "rule_name" {
  description = "Name of the EventBridge rule"
  type        = string
}

variable "rule_description" {
  description = "Description of the EventBridge rule"
  type        = string
}

variable "event_bus_name" {
  description = "Name of the EventBridge bus"
  type        = string
}

variable "event_pattern" {
  description = "Event pattern for the rule (JSON string)"
  type        = string
}

variable "target_id" {
  description = "Target ID for the EventBridge target"
  type        = string
}

variable "target_arn" {
  description = "ARN of the target (Lambda, SQS, SNS, etc.)"
  type        = string
}

variable "target_type" {
  description = "Type of target (lambda, sqs, sns, etc.)"
  type        = string
  default     = "lambda"
}

variable "lambda_function_name" {
  description = "Name of the Lambda function (if target_type is lambda)"
  type        = string
  default     = null
}

variable "retry_policy" {
  description = "Retry policy configuration"
  type = object({
    maximum_retry_attempts       = number
    maximum_event_age_in_seconds = number
  })
  default = null
}

variable "dlq_arn" {
  description = "ARN of the Dead Letter Queue"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
# Generic SQS Module Variables

variable "queue_name" {
  description = "Name of the SQS queue"
  type        = string
}

variable "delay_seconds" {
  description = "The time in seconds that the delivery of all messages in the queue will be delayed"
  type        = number
  default     = 0
}

variable "max_message_size" {
  description = "The limit of how many bytes a message can contain before Amazon SQS rejects it"
  type        = number
  default     = 262144
}

variable "message_retention_seconds" {
  description = "The number of seconds Amazon SQS retains a message"
  type        = number
  default     = 1209600  # 14 days
}

variable "receive_wait_time_seconds" {
  description = "The time for which a ReceiveMessage call will wait for a message to arrive"
  type        = number
  default     = 0
}

variable "visibility_timeout_seconds" {
  description = "The visibility timeout for the queue"
  type        = number
  default     = 300  # 5 minutes
}

variable "enable_dlq" {
  description = "Whether to create a dead letter queue"
  type        = bool
  default     = true
}

variable "max_receive_count" {
  description = "The number of times a message is delivered to the source queue before moving to the dead letter queue"
  type        = number
  default     = 3
}

variable "enable_encryption" {
  description = "Whether to enable server-side encryption"
  type        = bool
  default     = true
}

variable "queue_policy" {
  description = "JSON policy for the SQS queue"
  type        = string
  default     = null
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}
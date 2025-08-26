# =====================================
# EventBridge Bus Module Variables
# =====================================

variable "bus_name" {
  description = "Name of the EventBridge custom bus"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 14
}
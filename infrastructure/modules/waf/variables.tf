variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}


variable "rate_limit" {
  description = "Rate limit for requests per 5-minute window"
  type        = number
  default     = 2000
}

variable "enable_geo_blocking" {
  description = "Enable geographic blocking"
  type        = bool
  default     = false
}

variable "blocked_countries" {
  description = "List of country codes to block"
  type        = list(string)
  default     = []
}

variable "allowed_ips" {
  description = "List of IP addresses to allow (IP whitelist)"
  type        = list(string)
  default     = []
}

variable "maintenance_mode" {
  description = "Enable maintenance mode"
  type        = bool
  default     = false
}

variable "maintenance_allowed_ips" {
  description = "List of IP addresses allowed during maintenance"
  type        = list(string)
  default     = []
}

variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution to associate with WAF"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 90
}
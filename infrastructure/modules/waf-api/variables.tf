variable "project_name" {
  description = "The name of the project"
  type        = string
}

variable "environment" {
  description = "The deployment environment (e.g., prod, staging, dev)"
  type        = string
}

variable "api_rate_limit" {
  description = "Rate limit for API requests per 5-minute period per IP"
  type        = number
  default     = 2000
  
  validation {
    condition     = var.api_rate_limit >= 100 && var.api_rate_limit <= 20000
    error_message = "API rate limit must be between 100 and 20,000 requests per 5-minute period."
  }
}

variable "maintenance_mode" {
  description = "Enable maintenance mode (blocks all traffic except allowed IPs)"
  type        = bool
  default     = false
}

variable "maintenance_allowed_ips" {
  description = "List of IP addresses/CIDR blocks allowed during maintenance mode"
  type        = list(string)
  default     = []
  
  validation {
    condition = alltrue([
      for ip in var.maintenance_allowed_ips : 
      can(cidrhost(ip, 0)) || can(regex("^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$", ip))
    ])
    error_message = "All maintenance allowed IPs must be valid IP addresses or CIDR blocks."
  }
}

variable "blocked_countries" {
  description = "List of country codes to block (ISO 3166-1 alpha-2)"
  type        = list(string)
  default     = []
  
  validation {
    condition = alltrue([
      for country in var.blocked_countries :
      length(country) == 2 && upper(country) == country
    ])
    error_message = "Country codes must be 2-letter uppercase ISO 3166-1 alpha-2 codes."
  }
}

variable "blocked_ips" {
  description = "List of IP addresses/CIDR blocks to block"
  type        = list(string)
  default     = []
  
  validation {
    condition = alltrue([
      for ip in var.blocked_ips : 
      can(cidrhost(ip, 0)) || can(regex("^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$", ip))
    ])
    error_message = "All blocked IPs must be valid IP addresses or CIDR blocks."
  }
}

variable "enable_geo_blocking" {
  description = "Enable geographic blocking based on country codes"
  type        = bool
  default     = false
}

variable "enable_logging" {
  description = "Enable WAF access logging to S3"
  type        = bool
  default     = true
}

variable "waf_logs_bucket_name" {
  description = "Name of the S3 bucket for WAF access logs"
  type        = string
  default     = ""
}

variable "waf_logs_prefix" {
  description = "S3 prefix for WAF access logs"
  type        = string
  default     = "api-waf-logs/"
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
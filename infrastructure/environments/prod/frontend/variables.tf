variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "homebiyori"
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "homebiyori"
    Environment = "prod"
    ManagedBy   = "terraform"
  }
}

# S3 configuration
variable "force_destroy" {
  description = "Force destroy S3 buckets even if they contain objects"
  type        = bool
  default     = false
}

# CloudFront configuration
variable "custom_domain" {
  description = "Custom domain for CloudFront distribution"
  type        = string
  default     = ""
}

variable "ssl_certificate_arn" {
  description = "ARN of the SSL certificate for custom domain"
  type        = string
  default     = ""
}

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

# WAF configuration
variable "rate_limit" {
  description = "Rate limit for requests per 5-minute window"
  type        = number
  default     = 2000
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
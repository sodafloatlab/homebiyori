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
  default     = "homebiyori.com"
}

variable "ssl_certificate_arn" {
  description = "ARN of the SSL certificate for custom domain"
  type        = string
  default     = "arn:aws:acm:us-east-1:859493432410:certificate/f08b2c5a-7d55-4196-9154-542ad2b3b46c"
}

variable "price_class" {
  description = "CloudFront price class (PriceClass_200 for Japan support)"
  type        = string
  default     = "PriceClass_200"
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

variable "blocked_countries" {
  description = "List of country codes to block"
  type        = list(string)
  default     = []
}

variable "blocked_ips" {
  description = "List of IP addresses to block (blacklist)"
  type        = list(string)
  default     = []
}

variable "enable_geo_blocking" {
  description = "Enable geographic blocking"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}
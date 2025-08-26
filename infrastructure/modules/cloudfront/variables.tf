variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}


variable "static_bucket_name" {
  description = "Name of the S3 bucket for static assets"
  type        = string
}

variable "static_bucket_domain_name" {
  description = "Domain name of the S3 bucket for static assets"
  type        = string
}

variable "api_gateway_url" {
  description = "URL of the API Gateway"
  type        = string
}

variable "api_gateway_stage_name" {
  description = "Stage name of the API Gateway"
  type        = string
}


variable "waf_web_acl_id" {
  description = "ID of the WAF Web ACL"
  type        = string
  default     = ""
}

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
  
  validation {
    condition = contains([
      "PriceClass_All",
      "PriceClass_200",
      "PriceClass_100"
    ], var.price_class)
    error_message = "Price class must be PriceClass_All, PriceClass_200, or PriceClass_100."
  }
}
aws_region   = "ap-northeast-1"
environment  = "prod"
project_name = "homebiyori"

# S3 configuration
force_destroy = false  # Set to true only for development/testing

# CloudFront configuration
# custom_domain = "homebiyori.example.com"  # Uncomment and set your domain
# ssl_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"  # Uncomment and set your certificate ARN
price_class = "PriceClass_All"

# WAF configuration
rate_limit = 2000  # Requests per 5-minute window per IP
maintenance_mode = false

# Maintenance mode IPs (your admin IPs)
maintenance_allowed_ips = [
  # "203.0.113.1/32",  # Add your admin IP addresses here
]

common_tags = {
  Project     = "homebiyori"
  Environment = "prod"
  ManagedBy   = "terraform"
  Description = "AI-powered parenting support application"
  Layer       = "frontend"
}
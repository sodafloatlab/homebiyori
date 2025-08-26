# Local values for shared configurations
locals {
  project_name = var.project_name
  environment  = var.environment
  
  # Common tags
  common_tags = merge(var.common_tags, {
    Environment = local.environment
    Project     = local.project_name
    ManagedBy   = "terraform"
    Layer       = "frontend"
  })
}

# S3 Static Bucket (moved from datastore state)
module "static_bucket" {
  source = "../../../modules/s3/app"
  
  project_name = local.project_name
  environment  = local.environment
  bucket_type  = "static"
  bucket_purpose = "Store static website assets for CloudFront distribution"
  
  enable_versioning = true
  
  # CloudFront OAC integration requires specific public access settings
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
  
  tags = merge(local.common_tags, {
    BucketType = "static"
    Purpose    = "website-hosting"
    Integration = "cloudfront-oac"
  })
}

# WAF for security
module "waf" {
  source = "../../../modules/waf"
  
  project_name                = local.project_name
  environment                 = local.environment
  common_tags                 = local.common_tags
  rate_limit                  = var.rate_limit
  maintenance_mode            = var.maintenance_mode
  maintenance_allowed_ips     = var.maintenance_allowed_ips
  blocked_countries           = var.blocked_countries
  allowed_ips                 = var.allowed_ips
  enable_geo_blocking         = var.enable_geo_blocking
  log_retention_days          = var.log_retention_days
}

# CloudFront distribution
module "cloudfront" {
  source = "../../../modules/cloudfront"
  
  project_name                = local.project_name
  environment                 = local.environment
  common_tags                 = local.common_tags
  
  # S3 bucket information from local static bucket
  static_bucket_name          = module.static_bucket.bucket_id
  static_bucket_domain_name   = module.static_bucket.bucket_regional_domain_name
  
  # API Gateway information from backend layer  
  api_gateway_url             = data.terraform_remote_state.backend.outputs.user_api_gateway_url
  api_gateway_stage_name      = local.environment
  
  # WAF integration
  waf_web_acl_id             = module.waf.web_acl_id
  
  # Custom domain configuration
  custom_domain              = var.custom_domain
  ssl_certificate_arn        = var.ssl_certificate_arn
  price_class                = var.price_class
}
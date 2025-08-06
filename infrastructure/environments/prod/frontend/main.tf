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
  
  # S3 bucket information from datastore layer
  static_bucket_name          = data.terraform_remote_state.datastore.outputs.static_bucket_name
  static_bucket_domain_name   = "${data.terraform_remote_state.datastore.outputs.static_bucket_name}.s3.${var.aws_region}.amazonaws.com"
  images_bucket_name          = data.terraform_remote_state.datastore.outputs.images_bucket_name
  images_bucket_domain_name   = "${data.terraform_remote_state.datastore.outputs.images_bucket_name}.s3.${var.aws_region}.amazonaws.com"
  
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
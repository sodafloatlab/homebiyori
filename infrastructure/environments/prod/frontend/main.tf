# Data sources to get information from other layers
data "terraform_remote_state" "backend" {
  backend = "s3"
  config = {
    bucket = "homebiyori-terraform-state"
    key    = "backend/terraform.tfstate"
    region = var.aws_region
  }
}

# S3 buckets for static assets and images
module "s3" {
  source = "../../../modules/s3"
  
  project_name                 = var.project_name
  environment                  = var.environment
  common_tags                  = var.common_tags
  force_destroy                = var.force_destroy
  lambda_role_arn              = data.terraform_remote_state.backend.outputs.lambda_execution_role_arn
  cloudfront_distribution_arn  = module.cloudfront.distribution_arn
}

# WAF for security
module "waf" {
  source = "../../../modules/waf"
  
  project_name                 = var.project_name
  environment                  = var.environment
  common_tags                  = var.common_tags
  rate_limit                   = var.rate_limit
  maintenance_mode             = var.maintenance_mode
  maintenance_allowed_ips      = var.maintenance_allowed_ips
  cloudfront_distribution_arn  = module.cloudfront.distribution_arn
}

# CloudFront distribution
module "cloudfront" {
  source = "../../../modules/cloudfront"
  
  project_name                 = var.project_name
  environment                  = var.environment
  common_tags                  = var.common_tags
  static_bucket_name           = module.s3.static_bucket_name
  static_bucket_domain_name    = module.s3.static_bucket_domain_name
  images_bucket_name           = module.s3.images_bucket_name
  images_bucket_domain_name    = module.s3.images_bucket_domain_name
  api_gateway_url              = data.terraform_remote_state.backend.outputs.api_gateway_url
  api_gateway_stage_name       = data.terraform_remote_state.backend.outputs.api_gateway_stage_name
  waf_web_acl_id              = module.waf.web_acl_id
  custom_domain               = var.custom_domain
  ssl_certificate_arn         = var.ssl_certificate_arn
  price_class                 = var.price_class
}
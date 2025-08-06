# S3 outputs - referenced from datastore layer
output "static_bucket_name" {
  description = "Name of the static assets bucket"
  value       = data.terraform_remote_state.datastore.outputs.static_bucket_name
}

output "images_bucket_name" {
  description = "Name of the images bucket"  
  value       = data.terraform_remote_state.datastore.outputs.images_bucket_name
}

# CloudFront outputs
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.cloudfront.distribution_domain_name
}

output "cloudfront_url" {
  description = "URL of the CloudFront distribution"
  value       = module.cloudfront.distribution_url
}

# WAF outputs
output "waf_web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = module.waf.web_acl_id
}

# Application URLs
output "application_url" {
  description = "Main application URL"
  value       = var.custom_domain != "" ? "https://${var.custom_domain}" : module.cloudfront.distribution_url
}

output "api_url" {
  description = "API endpoint URL via CloudFront"
  value       = "${var.custom_domain != "" ? "https://${var.custom_domain}" : module.cloudfront.distribution_url}/api"
}
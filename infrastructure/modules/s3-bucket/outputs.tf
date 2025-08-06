# Outputs for reusable S3 Bucket Module

output "bucket_id" {
  description = "The ID (name) of the bucket"
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "The ARN of the bucket"
  value       = aws_s3_bucket.this.arn
}

output "bucket_domain_name" {
  description = "The bucket domain name"
  value       = aws_s3_bucket.this.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "The bucket regional domain name"
  value       = aws_s3_bucket.this.bucket_regional_domain_name
}

output "bucket_hosted_zone_id" {
  description = "The Route 53 hosted zone ID for this bucket's region"
  value       = aws_s3_bucket.this.hosted_zone_id
}

output "bucket_region" {
  description = "The AWS region this bucket resides in"
  value       = aws_s3_bucket.this.region
}

output "versioning_enabled" {
  description = "Whether versioning is enabled for this bucket"
  value       = var.enable_versioning
}

output "encryption_configuration" {
  description = "The server-side encryption configuration"
  value = {
    sse_algorithm     = var.kms_key_id != null ? "aws:kms" : "AES256"
    kms_master_key_id = var.kms_key_id
    bucket_key_enabled = var.kms_key_id != null ? var.bucket_key_enabled : false
  }
}

output "public_access_block" {
  description = "The public access block configuration"
  value = {
    block_public_acls       = var.block_public_acls
    block_public_policy     = var.block_public_policy
    ignore_public_acls      = var.ignore_public_acls
    restrict_public_buckets = var.restrict_public_buckets
  }
}

output "bucket_policy" {
  description = "The bucket policy JSON"
  value       = var.bucket_policy
}

output "lifecycle_rules_count" {
  description = "The number of lifecycle rules configured"
  value       = length(var.lifecycle_rules)
}

output "cors_rules_count" {
  description = "The number of CORS rules configured"
  value       = length(var.cors_rules)
}

output "tags" {
  description = "The tags applied to the bucket"
  value       = local.tags
}
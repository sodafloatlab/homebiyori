# 監査ログ環境アウトプット

# S3バケット関連
output "audit_bucket_name" {
  description = "監査ログ用S3バケット名"
  value       = module.audit_s3_bucket.bucket_name
}

output "audit_bucket_arn" {
  description = "監査ログ用S3バケットARN"
  value       = module.audit_s3_bucket.bucket_arn
}

output "audit_bucket_id" {
  description = "監査ログ用S3バケットID"
  value       = module.audit_s3_bucket.bucket_id
}

output "audit_bucket_domain_name" {
  description = "監査ログ用S3バケットドメイン名"
  value       = module.audit_s3_bucket.bucket_domain_name
}

# CloudTrail関連
output "cloudtrail_arn" {
  description = "CloudTrailのARN"
  value       = module.cloudtrail.cloudtrail_arn
}

output "cloudtrail_name" {
  description = "CloudTrail名"
  value       = module.cloudtrail.cloudtrail_name
}

output "cloudtrail_home_region" {
  description = "CloudTrailのホームリージョン"
  value       = module.cloudtrail.cloudtrail_home_region
}

# 運用情報
output "audit_configuration_summary" {
  description = "監査設定の概要"
  value = {
    s3_bucket_name         = module.audit_s3_bucket.bucket_name
    cloudtrail_name        = module.cloudtrail.cloudtrail_name
    encryption_enabled     = module.audit_s3_bucket.encryption_enabled
    versioning_enabled     = module.audit_s3_bucket.bucket_versioning_enabled
    public_access_blocked  = module.audit_s3_bucket.public_access_blocked
  }
}

# セキュリティとコンプライアンス情報
output "security_features" {
  description = "セキュリティ機能の状況"
  value = {
    encryption_at_rest     = true
    versioning_enabled     = true
    audit_trail_enabled    = true
    public_access_blocked  = true
    retention_policy       = "90 days to Glacier, 7 years retention"
  }
}
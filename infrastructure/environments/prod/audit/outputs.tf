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

output "audit_bucket_kms_key_id" {
  description = "監査ログ暗号化用KMSキーID"
  value       = module.audit_s3_bucket.kms_key_id
}

output "audit_bucket_kms_key_arn" {
  description = "監査ログ暗号化用KMSキーARN"
  value       = module.audit_s3_bucket.kms_key_arn
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

output "cloudtrail_cloudwatch_log_group_name" {
  description = "CloudTrail CloudWatch Logグループ名"
  value       = null
}


# 運用情報
output "audit_configuration_summary" {
  description = "監査設定の概要"
  value = {
    s3_bucket_name           = module.audit_s3_bucket.bucket_name
    cloudtrail_name          = module.cloudtrail.cloudtrail_name
    encryption_enabled       = module.audit_s3_bucket.encryption_enabled
    versioning_enabled       = module.audit_s3_bucket.bucket_versioning_enabled
    notifications_enabled    = false
    cloudwatch_logs_enabled  = false
    insights_enabled         = false
    security_alarms_enabled  = false
    mfa_delete_enabled      = var.enable_mfa_delete
  }
}

# コンプライアンス情報
output "compliance_features" {
  description = "コンプライアンス対応機能の状況"
  value = {
    soc2_ready = {
      encryption              = true
      access_logging         = false
      audit_trail_enabled    = true
      data_retention_policy  = true
      version_control        = true
    }
    iso27001_ready = {
      security_monitoring    = false
      incident_response_logs = true
      access_control_audit   = true
      data_classification    = true
    }
    gdpr_ready = {
      data_processing_logs   = true
      retention_management   = true
      access_audit_trail     = true
      encryption_at_rest     = true
    }
  }
}

# コスト情報
output "estimated_monthly_costs" {
  description = "推定月額料金（100GB/月の場合）"
  value = {
    s3_storage_standard     = "$2.30"
    s3_storage_ia          = "$1.25"
    s3_storage_glacier     = "$0.40"
    s3_storage_deep_archive = "$0.10"
    kms_encryption         = "$1.00"
    cloudtrail_data_events = "$0.10 per 100,000 events"
    total_estimated        = "~$5.05/month (excluding data events)"
  }
}
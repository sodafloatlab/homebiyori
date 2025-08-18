# 監査ログ専用S3バケットモジュールアウトプット

output "bucket_name" {
  description = "作成されたS3バケット名"
  value       = aws_s3_bucket.audit_logs.bucket
}

output "bucket_arn" {
  description = "S3バケットのARN"
  value       = aws_s3_bucket.audit_logs.arn
}

output "bucket_id" {
  description = "S3バケットのID"
  value       = aws_s3_bucket.audit_logs.id
}

output "bucket_domain_name" {
  description = "S3バケットのドメイン名"
  value       = aws_s3_bucket.audit_logs.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "S3バケットのリージョナルドメイン名"
  value       = aws_s3_bucket.audit_logs.bucket_regional_domain_name
}

# KMS関連アウトプット
output "kms_key_id" {
  description = "暗号化用KMSキーのID"
  value       = var.kms_key_id != null ? var.kms_key_id : aws_kms_key.audit_logs[0].id
}

output "kms_key_arn" {
  description = "暗号化用KMSキーのARN"
  value       = var.kms_key_id != null ? var.kms_key_id : aws_kms_key.audit_logs[0].arn
}

output "kms_alias_name" {
  description = "KMSキーエイリアス名"
  value       = var.kms_key_id == null ? aws_kms_alias.audit_logs[0].name : null
}

# CloudWatch関連アウトプット
output "size_alarm_arn" {
  description = "バケットサイズアラームのARN"
  value       = var.enable_cloudwatch_monitoring ? aws_cloudwatch_metric_alarm.bucket_size[0].arn : null
}

# セキュリティ情報
output "bucket_versioning_enabled" {
  description = "バケットバージョニングが有効かどうか"
  value       = true
}

output "encryption_enabled" {
  description = "暗号化が有効かどうか"
  value       = true
}

output "public_access_blocked" {
  description = "パブリックアクセスがブロックされているかどうか"
  value       = true
}

# 運用情報
output "lifecycle_rules_count" {
  description = "設定されているライフサイクルルール数"
  value       = 3  # cloudtrail-logs, access-logs, cleanup-incomplete-uploads
}

output "notifications_enabled" {
  description = "通知機能が有効かどうか"
  value       = var.enable_notifications
}

output "access_logging_enabled" {
  description = "アクセスログ記録が有効かどうか"
  value       = var.enable_access_logging
}

output "mfa_delete_enabled" {
  description = "MFA削除保護が有効かどうか"
  value       = var.enable_mfa_delete
}
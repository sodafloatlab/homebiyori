# CloudTrailモジュールアウトプット

output "cloudtrail_arn" {
  description = "CloudTrailのARN"
  value       = aws_cloudtrail.main.arn
}

output "cloudtrail_name" {
  description = "CloudTrail名"
  value       = aws_cloudtrail.main.name
}

output "cloudtrail_home_region" {
  description = "CloudTrailのホームリージョン"
  value       = aws_cloudtrail.main.home_region
}

output "cloudwatch_log_group_arn" {
  description = "CloudWatch LogグループのARN（有効化時のみ）"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.cloudtrail[0].arn : null
}

output "cloudwatch_log_group_name" {
  description = "CloudWatch Logグループ名（有効化時のみ）"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.cloudtrail[0].name : null
}

output "event_data_store_arn" {
  description = "CloudTrail Event Data StoreのARN（有効化時のみ）"
  value       = var.enable_event_data_store ? aws_cloudtrail_event_data_store.main[0].arn : null
}

output "iam_role_arn" {
  description = "CloudWatch Logs用IAMロールARN（有効化時のみ）"
  value       = var.enable_cloudwatch_logs ? aws_iam_role.cloudtrail_logs_role[0].arn : null
}
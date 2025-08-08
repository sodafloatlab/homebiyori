# SNS Module Outputs

output "topic_arn" {
  description = "ARN of the SNS topic"
  value       = aws_sns_topic.contact_notifications.arn
}

output "topic_name" {
  description = "Name of the SNS topic"
  value       = aws_sns_topic.contact_notifications.name
}

output "topic_id" {
  description = "ID of the SNS topic"
  value       = aws_sns_topic.contact_notifications.id
}

output "dlq_arn" {
  description = "ARN of the Dead Letter Queue"
  value       = aws_sqs_queue.contact_notifications_dlq.arn
}

output "dlq_name" {
  description = "Name of the Dead Letter Queue"
  value       = aws_sqs_queue.contact_notifications_dlq.name
}

output "dlq_url" {
  description = "URL of the Dead Letter Queue"
  value       = aws_sqs_queue.contact_notifications_dlq.url
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group for delivery failures"
  value       = aws_cloudwatch_log_group.sns_delivery_failures.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group for delivery failures"
  value       = aws_cloudwatch_log_group.sns_delivery_failures.arn
}

output "alarm_arn" {
  description = "ARN of the CloudWatch alarm for delivery failures"
  value       = var.enable_monitoring ? aws_cloudwatch_metric_alarm.sns_failure_alarm[0].arn : null
}

output "dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = var.enable_monitoring ? "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.sns_dashboard[0].dashboard_name}" : null
}
output "model_id" {
  description = "ID of the Bedrock foundation model"
  value       = data.aws_bedrock_foundation_model.claude_haiku.model_id
}

output "model_arn" {
  description = "ARN of the Bedrock foundation model"
  value       = data.aws_bedrock_foundation_model.claude_haiku.model_arn
}

output "log_group_name" {
  description = "Name of the CloudWatch log group for Bedrock"
  value       = aws_cloudwatch_log_group.bedrock.name
}

output "dashboard_url" {
  description = "URL of the CloudWatch dashboard for Bedrock"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${aws_cloudwatch_dashboard.bedrock.dashboard_name}"
}
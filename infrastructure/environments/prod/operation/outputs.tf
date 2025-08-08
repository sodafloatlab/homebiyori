# Outputs for Operation Layer
# Logging infrastructure information

# Log Groups (from remote state)
output "monitored_log_groups" {
  description = "Map of all monitored log groups"
  value       = local.all_log_groups
}

# Kinesis Data Firehose
output "firehose_delivery_stream_name" {
  description = "Name of the Kinesis Data Firehose delivery stream"
  value       = module.logs_delivery_stream.delivery_stream_name
}

output "firehose_delivery_stream_arn" {
  description = "ARN of the Kinesis Data Firehose delivery stream"  
  value       = module.logs_delivery_stream.delivery_stream_arn
}

# IAM Roles
output "firehose_delivery_role_arn" {
  description = "ARN of the Firehose delivery IAM role"
  value       = aws_iam_role.firehose_delivery_role.arn
}

output "cloudwatch_logs_role_arn" {
  description = "ARN of the CloudWatch Logs IAM role"
  value       = aws_iam_role.cloudwatch_logs_role.arn
}

# Log Configuration
output "log_retention_days" {
  description = "CloudWatch Logs retention period in days"
  value       = data.terraform_remote_state.backend.outputs.log_retention_days
}

output "logs_s3_bucket_name" {
  description = "Name of the S3 bucket where logs are stored"
  value       = data.terraform_remote_state.datastore.outputs.logs_bucket_name
}

# Subscription Filters
output "subscription_filter_names" {
  description = "Map of service names to subscription filter names"
  value = {
    for service, filter in aws_cloudwatch_log_subscription_filter.logs_filter : service => filter.name
  }
}

# Firehose log group
output "firehose_log_group_name" {
  description = "Name of the CloudWatch log group for Firehose"
  value       = module.logs_delivery_stream.firehose_log_group_name
}

output "firehose_log_group_arn" {
  description = "ARN of the CloudWatch log group for Firehose"
  value       = module.logs_delivery_stream.firehose_log_group_arn
}
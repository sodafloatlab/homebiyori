# Kinesis Data Firehose Module Outputs

output "delivery_stream_name" {
  description = "Name of the Kinesis Data Firehose delivery stream"
  value       = aws_kinesis_firehose_delivery_stream.this.name
}

output "delivery_stream_arn" {
  description = "ARN of the Kinesis Data Firehose delivery stream"
  value       = aws_kinesis_firehose_delivery_stream.this.arn
}

output "delivery_stream_version" {
  description = "Version of the Kinesis Data Firehose delivery stream"
  value       = aws_kinesis_firehose_delivery_stream.this.version_id
}

output "firehose_log_group_name" {
  description = "Name of the CloudWatch log group for Firehose"
  value       = var.enable_cloudwatch_logging ? aws_cloudwatch_log_group.firehose_logs[0].name : null
}

output "firehose_log_group_arn" {
  description = "ARN of the CloudWatch log group for Firehose"
  value       = var.enable_cloudwatch_logging ? aws_cloudwatch_log_group.firehose_logs[0].arn : null
}
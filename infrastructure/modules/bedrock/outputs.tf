output "logging_configuration_id" {
  description = "ID of the Bedrock model invocation logging configuration"
  value       = aws_bedrock_model_invocation_logging_configuration.main.id
}

output "logs_bucket_name" {
  description = "S3 bucket name for Bedrock logs"
  value       = var.logs_bucket_name
}

output "logs_key_prefix" {
  description = "S3 key prefix for Bedrock logs"
  value       = "bedrock-invocation-logs"
}
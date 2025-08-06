# Lambda Function Module Outputs

# Function information
output "function_arn" {
  description = "The ARN of the Lambda function"
  value       = aws_lambda_function.this.arn
}

output "function_name" {
  description = "The name of the Lambda function"
  value       = aws_lambda_function.this.function_name
}

output "function_qualified_arn" {
  description = "The qualified ARN of the Lambda function"
  value       = aws_lambda_function.this.qualified_arn
}

output "function_version" {
  description = "The version of the Lambda function"
  value       = aws_lambda_function.this.version
}

output "function_last_modified" {
  description = "The date the Lambda function was last modified"
  value       = aws_lambda_function.this.last_modified
}

output "function_source_code_hash" {
  description = "The source code hash of the Lambda function"
  value       = aws_lambda_function.this.source_code_hash
}

output "function_source_code_size" {
  description = "The source code size of the Lambda function"
  value       = aws_lambda_function.this.source_code_size
}

# IAM information
output "iam_role_arn" {
  description = "The ARN of the IAM role for the Lambda function"
  value       = aws_iam_role.this.arn
}

output "iam_role_name" {
  description = "The name of the IAM role for the Lambda function"
  value       = aws_iam_role.this.name
}

output "iam_role_id" {
  description = "The ID of the IAM role for the Lambda function"
  value       = aws_iam_role.this.id
}

# CloudWatch information
output "log_group_arn" {
  description = "The ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.this.arn
}

output "log_group_name" {
  description = "The name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.this.name
}

# Event source mappings
output "event_source_mapping_uuids" {
  description = "UUIDs of the event source mappings"
  value = {
    for k, v in aws_lambda_event_source_mapping.this : k => v.uuid
  }
}

# Lambda permissions
output "lambda_permission_statement_ids" {
  description = "Statement IDs of the Lambda permissions"
  value = {
    for k, v in aws_lambda_permission.this : k => v.statement_id
  }
}

# Computed values
output "invoke_arn" {
  description = "The ARN to be used for invoking Lambda function from API Gateway"
  value       = aws_lambda_function.this.invoke_arn
}

output "tags" {
  description = "Tags applied to the Lambda function"
  value       = aws_lambda_function.this.tags
}
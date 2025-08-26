# DynamoDB Table Outputs - 4テーブル構成
output "core_table_name" {
  description = "Name of the core table (統合テーブル)"
  value       = module.dynamodb_tables["core"].table_name
}

output "core_table_arn" {
  description = "ARN of the core table (統合テーブル)"
  value       = module.dynamodb_tables["core"].table_arn
}

output "chats_table_name" {
  description = "Name of the chats table"
  value       = module.dynamodb_tables["chats"].table_name
}

output "chats_table_arn" {
  description = "ARN of the chats table"
  value       = module.dynamodb_tables["chats"].table_arn
}

output "fruits_table_name" {
  description = "Name of the fruits table"
  value       = module.dynamodb_tables["fruits"].table_name
}

output "fruits_table_arn" {
  description = "ARN of the fruits table"
  value       = module.dynamodb_tables["fruits"].table_arn
}

output "feedback_table_name" {
  description = "Name of the feedback table"
  value       = module.dynamodb_tables["feedback"].table_name
}

output "feedback_table_arn" {
  description = "ARN of the feedback table"
  value       = module.dynamodb_tables["feedback"].table_arn
}

output "payments_table_name" {
  description = "Name of the payments table"
  value       = module.dynamodb_tables["payments"].table_name
}

output "payments_table_arn" {
  description = "ARN of the payments table"
  value       = module.dynamodb_tables["payments"].table_arn
}

# S3 Bucket Outputs
output "logs_bucket_name" {
  description = "Name of the logs S3 bucket"
  value       = module.logs_bucket.bucket_id
}

output "logs_bucket_arn" {
  description = "ARN of the logs S3 bucket"
  value       = module.logs_bucket.bucket_arn
}

# Combined outputs for convenience
output "dynamodb_table_names" {
  description = "Map of all DynamoDB table names"
  value = {
    for table_key, table_config in local.dynamodb_tables : table_key => module.dynamodb_tables[table_key].table_name
  }
}

output "dynamodb_table_arns" {
  description = "Map of all DynamoDB table ARNs"
  value = {
    for table_key, table_config in local.dynamodb_tables : table_key => module.dynamodb_tables[table_key].table_arn
  }
}

output "s3_bucket_names" {
  description = "Map of all S3 bucket names"
  value = {
    logs = module.logs_bucket.bucket_id
  }
}

output "s3_bucket_arns" {
  description = "Map of all S3 bucket ARNs"
  value = {
    logs = module.logs_bucket.bucket_arn
  }
}

# ========================================
# SSM Parameter Store Outputs
# ========================================
output "ssm_parameter_names" {
  description = "Map of all SSM parameter names for Lambda environment variables"
  value       = module.ssm_parameters.parameter_names
}

output "ssm_parameter_arns" {
  description = "List of all SSM parameter ARNs for IAM policy attachment"
  value       = module.ssm_parameters.parameter_arns
}

output "maintenance_parameters" {
  description = "Maintenance control parameter ARNs"
  value       = module.ssm_parameters.maintenance_parameters
}

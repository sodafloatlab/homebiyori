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
output "chat_content_bucket_name" {
  description = "Name of the chat content S3 bucket"
  value       = module.chat_content_bucket.bucket_id
}

output "chat_content_bucket_arn" {
  description = "ARN of the chat content S3 bucket"
  value       = module.chat_content_bucket.bucket_arn
}

output "images_bucket_name" {
  description = "Name of the images S3 bucket"
  value       = module.images_bucket.bucket_id
}

output "images_bucket_arn" {
  description = "ARN of the images S3 bucket"
  value       = module.images_bucket.bucket_arn
}

output "static_bucket_name" {
  description = "Name of the static S3 bucket"
  value       = module.static_bucket.bucket_id
}

output "static_bucket_arn" {
  description = "ARN of the static S3 bucket"
  value       = module.static_bucket.bucket_arn
}

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
    chat-content = module.chat_content_bucket.bucket_id
    images       = module.images_bucket.bucket_id
    static       = module.static_bucket.bucket_id
    logs         = module.logs_bucket.bucket_id
  }
}

output "s3_bucket_arns" {
  description = "Map of all S3 bucket ARNs"
  value = {
    chat-content = module.chat_content_bucket.bucket_arn
    images       = module.images_bucket.bucket_arn
    static       = module.static_bucket.bucket_arn
    logs         = module.logs_bucket.bucket_arn
  }
}

# SQS Queue Outputs
output "ttl_updates_queue_url" {
  description = "URL of the TTL updates SQS queue"
  value       = module.sqs.ttl_updates_queue_url
}

output "ttl_updates_queue_arn" {
  description = "ARN of the TTL updates SQS queue"
  value       = module.sqs.ttl_updates_queue_arn
}

output "webhook_events_queue_url" {
  description = "URL of the webhook events SQS queue"
  value       = module.sqs.webhook_events_queue_url
}

output "webhook_events_queue_arn" {
  description = "ARN of the webhook events SQS queue"
  value       = module.sqs.webhook_events_queue_arn
}
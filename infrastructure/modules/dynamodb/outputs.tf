# DynamoDB Simplified Architecture Outputs
# Updated for single chat table with dynamic TTL management

# User Data Table outputs
output "main_table_name" {
  description = "Name of the main user data table"
  value       = aws_dynamodb_table.homebiyori_data.name
}

output "main_table_arn" {
  description = "ARN of the main user data table"
  value       = aws_dynamodb_table.homebiyori_data.arn
}

output "main_table_stream_arn" {
  description = "ARN of the main table stream (if enabled)"
  value       = aws_dynamodb_table.homebiyori_data.stream_arn
}

# Chat Table outputs
output "chat_table_name" {
  description = "Name of the unified chat table"
  value       = aws_dynamodb_table.chat.name
}

output "chat_table_arn" {
  description = "ARN of the unified chat table"
  value       = aws_dynamodb_table.chat.arn
}

# GSI outputs
output "main_table_gsi1_name" {
  description = "Name of GSI1 for cross-entity queries"
  value       = "GSI1"
}


# Combined outputs for Lambda environment variables
output "dynamodb_tables" {
  description = "Map of all DynamoDB table information for Lambda functions"
  value = {
    user_data_table = {
      name        = aws_dynamodb_table.homebiyori_data.name
      arn         = aws_dynamodb_table.homebiyori_data.arn
      stream_arn  = aws_dynamodb_table.homebiyori_data.stream_arn
    }
    chat_table = {
      name = aws_dynamodb_table.chat.name
      arn  = aws_dynamodb_table.chat.arn
    }
  }
}

# IAM policy-friendly output
output "table_arns" {
  description = "List of all table ARNs for IAM policy attachment"
  value = [
    aws_dynamodb_table.homebiyori_data.arn,
    "${aws_dynamodb_table.homebiyori_data.arn}/index/*",
    aws_dynamodb_table.chat.arn,
    "${aws_dynamodb_table.chat.arn}/index/*"
  ]
}

# Legacy compatibility outputs (will be deprecated)
output "users_table_name" {
  description = "[DEPRECATED] Use main_table_name instead"
  value       = aws_dynamodb_table.homebiyori_data.name
}

output "tree_table_name" {
  description = "[DEPRECATED] Use main_table_name instead"  
  value       = aws_dynamodb_table.homebiyori_data.name
}

# Chat TTL management helper
output "chat_ttl_config" {
  description = "Helper output for Lambda functions to manage chat TTL"
  value = {
    table_name     = aws_dynamodb_table.chat.name
    ttl_attribute  = "TTL"
    free_days      = 30
    premium_days   = 180
    ttl_logic      = "Dynamic TTL based on subscription plan, updated via SQS + Lambda"
  }
}
# DynamoDB Table Module Outputs

# Table information
output "table_arn" {
  description = "The ARN of the DynamoDB table"
  value       = aws_dynamodb_table.this.arn
}

output "table_name" {
  description = "The name of the DynamoDB table"
  value       = aws_dynamodb_table.this.name
}

output "table_id" {
  description = "The ID of the DynamoDB table"
  value       = aws_dynamodb_table.this.id
}

output "table_stream_arn" {
  description = "The ARN of the DynamoDB table stream"
  value       = var.stream_enabled ? aws_dynamodb_table.this.stream_arn : null
}

output "table_stream_label" {
  description = "The stream label of the DynamoDB table"
  value       = var.stream_enabled ? aws_dynamodb_table.this.stream_label : null
}

# Global Secondary Index information
output "global_secondary_index_names" {
  description = "List of global secondary index names"
  value = var.global_secondary_indexes != null ? [
    for gsi_name, gsi_config in var.global_secondary_indexes : gsi_name
  ] : []
}

output "global_secondary_index_arns" {
  description = "Map of global secondary index names to ARNs"
  value = var.global_secondary_indexes != null ? {
    for gsi_name, gsi_config in var.global_secondary_indexes : 
    gsi_name => "${aws_dynamodb_table.this.arn}/index/${gsi_name}"
  } : {}
}

# Local Secondary Index information
output "local_secondary_index_names" {
  description = "List of local secondary index names"
  value = var.local_secondary_indexes != null ? [
    for lsi_name, lsi_config in var.local_secondary_indexes : lsi_name
  ] : []
}

# Auto Scaling information
output "autoscaling_read_target_arn" {
  description = "ARN of the read capacity auto scaling target"
  value = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? (
    length(aws_appautoscaling_target.table_read) > 0 ? aws_appautoscaling_target.table_read[0].arn : null
  ) : null
}

output "autoscaling_write_target_arn" {
  description = "ARN of the write capacity auto scaling target"
  value = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? (
    length(aws_appautoscaling_target.table_write) > 0 ? aws_appautoscaling_target.table_write[0].arn : null
  ) : null
}

output "autoscaling_read_policy_arn" {
  description = "ARN of the read capacity auto scaling policy"
  value = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? (
    length(aws_appautoscaling_policy.table_read) > 0 ? aws_appautoscaling_policy.table_read[0].arn : null
  ) : null
}

output "autoscaling_write_policy_arn" {
  description = "ARN of the write capacity auto scaling policy"
  value = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? (
    length(aws_appautoscaling_policy.table_write) > 0 ? aws_appautoscaling_policy.table_write[0].arn : null
  ) : null
}

# Configuration information
output "billing_mode" {
  description = "The billing mode of the table"
  value       = aws_dynamodb_table.this.billing_mode
}

output "hash_key" {
  description = "The hash key of the table"
  value       = aws_dynamodb_table.this.hash_key
}

output "range_key" {
  description = "The range key of the table"
  value       = aws_dynamodb_table.this.range_key
}

output "ttl_enabled" {
  description = "Whether TTL is enabled"
  value       = var.ttl_enabled
}

output "ttl_attribute_name" {
  description = "The TTL attribute name"
  value       = var.ttl_enabled ? var.ttl_attribute_name : null
}

output "point_in_time_recovery_enabled" {
  description = "Whether point-in-time recovery is enabled"
  value       = var.point_in_time_recovery_enabled
}

output "server_side_encryption_enabled" {
  description = "Whether server-side encryption is enabled"
  value       = var.server_side_encryption_enabled
}

# Tags
output "tags" {
  description = "Tags applied to the DynamoDB table"
  value       = aws_dynamodb_table.this.tags
}
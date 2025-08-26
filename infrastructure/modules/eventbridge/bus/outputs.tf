# =====================================
# EventBridge Bus Module Outputs
# =====================================

output "eventbridge_bus_name" {
  description = "Name of the EventBridge custom bus"
  value       = aws_cloudwatch_event_bus.custom_bus.name
}

output "eventbridge_bus_arn" {
  description = "ARN of the EventBridge custom bus"
  value       = aws_cloudwatch_event_bus.custom_bus.arn
}

output "eventbridge_log_group_name" {
  description = "Name of the CloudWatch log group for EventBridge"
  value       = aws_cloudwatch_log_group.eventbridge_log_group.name
}

output "eventbridge_log_group_arn" {
  description = "ARN of the CloudWatch log group for EventBridge"
  value       = aws_cloudwatch_log_group.eventbridge_log_group.arn
}
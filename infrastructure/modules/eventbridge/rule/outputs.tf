# =====================================
# EventBridge Rule Module Outputs
# =====================================

output "rule_name" {
  description = "Name of the EventBridge rule"
  value       = aws_cloudwatch_event_rule.rule.name
}

output "rule_arn" {
  description = "ARN of the EventBridge rule"
  value       = aws_cloudwatch_event_rule.rule.arn
}

output "target_id" {
  description = "Target ID of the EventBridge target"
  value       = aws_cloudwatch_event_target.target.target_id
}
# SQS Module Outputs

# TTL Updates Queue Outputs
output "ttl_updates_queue_name" {
  description = "Name of the TTL updates queue"
  value       = aws_sqs_queue.ttl_updates.name
}

output "ttl_updates_queue_arn" {
  description = "ARN of the TTL updates queue"
  value       = aws_sqs_queue.ttl_updates.arn
}

output "ttl_updates_queue_url" {
  description = "URL of the TTL updates queue"
  value       = aws_sqs_queue.ttl_updates.url
}

output "ttl_updates_dlq_arn" {
  description = "ARN of the TTL updates dead letter queue"
  value       = aws_sqs_queue.ttl_updates_dlq.arn
}

# Webhook Events Queue Outputs
output "webhook_events_queue_name" {
  description = "Name of the webhook events queue"
  value       = aws_sqs_queue.webhook_events.name
}

output "webhook_events_queue_arn" {
  description = "ARN of the webhook events queue"
  value       = aws_sqs_queue.webhook_events.arn
}

output "webhook_events_queue_url" {
  description = "URL of the webhook events queue"
  value       = aws_sqs_queue.webhook_events.url
}

output "webhook_events_dlq_arn" {
  description = "ARN of the webhook events dead letter queue"
  value       = aws_sqs_queue.webhook_events_dlq.arn
}

# Combined SQS Configuration for Lambda Environment Variables
output "sqs_queues" {
  description = "Complete SQS queue configuration for Lambda functions"
  value = {
    ttl_updates = {
      name = aws_sqs_queue.ttl_updates.name
      arn  = aws_sqs_queue.ttl_updates.arn
      url  = aws_sqs_queue.ttl_updates.url
    }
    webhook_events = {
      name = aws_sqs_queue.webhook_events.name
      arn  = aws_sqs_queue.webhook_events.arn
      url  = aws_sqs_queue.webhook_events.url
    }
  }
}

# IAM Policy ARNs for Lambda functions
output "queue_arns" {
  description = "List of all queue ARNs for IAM policy attachment"
  value = [
    aws_sqs_queue.ttl_updates.arn,
    aws_sqs_queue.ttl_updates_dlq.arn,
    aws_sqs_queue.webhook_events.arn,
    aws_sqs_queue.webhook_events_dlq.arn
  ]
}
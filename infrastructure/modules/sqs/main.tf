# Generic SQS Queue Module for Homebiyori
# Creates a single SQS queue with optional dead letter queue

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Main SQS Queue
resource "aws_sqs_queue" "this" {
  name                       = var.queue_name
  delay_seconds              = var.delay_seconds
  max_message_size           = var.max_message_size
  message_retention_seconds  = var.message_retention_seconds
  receive_wait_time_seconds  = var.receive_wait_time_seconds
  visibility_timeout_seconds = var.visibility_timeout_seconds

  # Dead letter queue configuration (optional)
  redrive_policy = var.enable_dlq ? jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[0].arn
    maxReceiveCount     = var.max_receive_count
  }) : null

  # Server-side encryption (optional)
  sqs_managed_sse_enabled = var.enable_encryption

  tags = merge(var.tags, {
    Name = var.queue_name
  })
}

# Dead Letter Queue (conditional)
resource "aws_sqs_queue" "dlq" {
  count = var.enable_dlq ? 1 : 0

  name                       = "${var.queue_name}-dlq"
  message_retention_seconds  = var.message_retention_seconds

  # Server-side encryption (optional)
  sqs_managed_sse_enabled = var.enable_encryption

  tags = merge(var.tags, {
    Name = "${var.queue_name}-dlq"
  })
}

# Queue Policy (optional)
resource "aws_sqs_queue_policy" "this" {
  count     = var.queue_policy != null ? 1 : 0
  queue_url = aws_sqs_queue.this.id
  policy    = var.queue_policy
}
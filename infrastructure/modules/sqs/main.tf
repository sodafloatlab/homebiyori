# SQS Queues for Homebiyori
# Based on microservices architecture requirements:
# - TTL updates queue for subscription plan changes
# - Webhook events queue for Stripe webhook processing

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# 1. TTL Updates Queue - For subscription plan changes
resource "aws_sqs_queue" "ttl_updates" {
  name                       = "${var.project_name}-${var.environment}-ttl-updates"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600  # 14 days
  receive_wait_time_seconds  = 0
  visibility_timeout_seconds = 300      # 5 minutes for Lambda processing

  # Dead letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.ttl_updates_dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(var.common_tags, {
    Name     = "${var.project_name}-${var.environment}-ttl-updates"
    Type     = "ttl-management"
    Consumer = "ttl_updater_service"
  })
}

# TTL Updates Dead Letter Queue
resource "aws_sqs_queue" "ttl_updates_dlq" {
  name                       = "${var.project_name}-${var.environment}-ttl-updates-dlq"
  message_retention_seconds  = 1209600  # 14 days

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-ttl-updates-dlq"
    Type = "dead-letter-queue"
  })
}

# 2. Webhook Events Queue - For Stripe webhook processing
resource "aws_sqs_queue" "webhook_events" {
  name                       = "${var.project_name}-${var.environment}-webhook-events"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600  # 14 days
  receive_wait_time_seconds  = 0
  visibility_timeout_seconds = 180      # 3 minutes for webhook processing

  # Dead letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.webhook_events_dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(var.common_tags, {
    Name     = "${var.project_name}-${var.environment}-webhook-events"
    Type     = "webhook-processing"
    Consumer = "webhook_service"
  })
}

# Webhook Events Dead Letter Queue
resource "aws_sqs_queue" "webhook_events_dlq" {
  name                       = "${var.project_name}-${var.environment}-webhook-events-dlq"
  message_retention_seconds  = 1209600  # 14 days

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-webhook-events-dlq"
    Type = "dead-letter-queue"
  })
}

# SQS Queue Policies for Lambda access
resource "aws_sqs_queue_policy" "ttl_updates_policy" {
  queue_url = aws_sqs_queue.ttl_updates.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = var.lambda_execution_role_arn
        }
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.ttl_updates.arn
      }
    ]
  })
}

resource "aws_sqs_queue_policy" "webhook_events_policy" {
  queue_url = aws_sqs_queue.webhook_events.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = var.lambda_execution_role_arn
        }
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.webhook_events.arn
      }
    ]
  })
}
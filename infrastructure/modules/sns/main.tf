# SNS Topic Module for Homebiyori
# Provides email notifications for contact inquiries

resource "aws_sns_topic" "contact_notifications" {
  name         = var.topic_name
  display_name = var.display_name

  # Enable server-side encryption
  kms_master_key_id = "alias/aws/sns"

  # Delivery policy for retry logic
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = "*"
        Action = [
          "SNS:GetTopicAttributes",
          "SNS:SetTopicAttributes",
          "SNS:AddPermission",
          "SNS:RemovePermission",
          "SNS:DeleteTopic",
          "SNS:Subscribe",
          "SNS:ListSubscriptionsByTopic",
          "SNS:Publish"
        ]
        Resource = "arn:aws:sns:${var.aws_region}:${var.aws_account_id}:${var.topic_name}"
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = var.aws_account_id
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = var.topic_name
    Type = "ContactNotification"
  })
}

# Dead Letter Queue for failed notifications
resource "aws_sqs_queue" "contact_notifications_dlq" {
  name = "${var.topic_name}-dlq"

  # Message retention for 14 days
  message_retention_seconds = 1209600

  # Server-side encryption
  sqs_managed_sse_enabled = true

  tags = merge(var.tags, {
    Name = "${var.topic_name}-dlq"
    Type = "ContactNotificationDLQ"
  })
}

# IAM role for SNS to access DLQ
resource "aws_iam_role" "sns_dlq_role" {
  name = "${var.topic_name}-dlq-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "sns_dlq_policy" {
  name = "${var.topic_name}-dlq-policy"
  role = aws_iam_role.sns_dlq_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.contact_notifications_dlq.arn
      }
    ]
  })
}

# CloudWatch Logs for SNS delivery failures
resource "aws_cloudwatch_log_group" "sns_delivery_failures" {
  name              = "/aws/sns/${var.topic_name}/delivery-failures"
  retention_in_days = 14

  tags = merge(var.tags, {
    Name = "${var.topic_name}-delivery-failures"
    Type = "SNSDeliveryFailures"
  })
}

# CloudWatch Alarm for failed notifications
resource "aws_cloudwatch_metric_alarm" "sns_failure_alarm" {
  count = var.enable_monitoring ? 1 : 0

  alarm_name          = "${var.topic_name}-delivery-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "NumberOfNotificationsFailed"
  namespace           = "AWS/SNS"
  period              = "60"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "This metric monitors failed SNS notifications"
  alarm_actions       = var.alarm_actions

  dimensions = {
    TopicName = aws_sns_topic.contact_notifications.name
  }

  tags = var.tags
}

# CloudWatch Dashboard for SNS metrics (optional)
resource "aws_cloudwatch_dashboard" "sns_dashboard" {
  count = var.enable_monitoring ? 1 : 0

  dashboard_name = "${var.topic_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/SNS", "NumberOfMessagesPublished", "TopicName", aws_sns_topic.contact_notifications.name],
            [".", "NumberOfNotificationsDelivered", ".", "."],
            [".", "NumberOfNotificationsFailed", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "SNS Contact Notifications Metrics"
          period  = 300
        }
      }
    ]
  })
}

# Output topic attributes for reference
data "aws_sns_topic" "contact_notifications" {
  name = aws_sns_topic.contact_notifications.name
}
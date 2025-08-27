# Operation Layer - Logging Infrastructure
# CloudWatch Logs subscription filters and Kinesis Data Firehose configuration

locals {
  project_name = var.project_name
  environment  = var.environment
  region       = data.aws_region.current.name
  account_id   = data.aws_caller_identity.current.account_id

  # Additional tags specific to operation layer
  layer_tags = {
    Layer = "operation"
  }
  
  # All log groups from backend remote state
  all_log_groups = merge(
    data.terraform_remote_state.backend.outputs.lambda_log_group_names,
    data.terraform_remote_state.backend.outputs.api_gateway_log_group_names
  )
}

# IAM Role for Kinesis Data Firehose
resource "aws_iam_role" "firehose_delivery_role" {
  name = "${local.project_name}-${local.environment}-firehose-logs-role"

  assume_role_policy = file("${path.module}/policies/firehose_assume_role_policy.json")

  tags = merge(local.layer_tags, {
    Component = "logging"
    Purpose   = "firehose-delivery"
  })
}

# IAM Policy for Firehose to access S3 and CloudWatch
resource "aws_iam_role_policy" "firehose_delivery_policy" {
  name = "${local.project_name}-${local.environment}-firehose-logs-policy"
  role = aws_iam_role.firehose_delivery_role.id

  policy = templatefile("${path.module}/policies/firehose_delivery_policy.json", {
    logs_bucket_arn = data.terraform_remote_state.datastore.outputs.logs_bucket_arn
  })
}

# Kinesis Data Firehose using reusable module
module "logs_delivery_stream" {
  source = "../../../modules/datafirehose"

  project_name           = local.project_name
  environment           = local.environment
  firehose_name         = "${local.project_name}-${local.environment}-logs-delivery-stream"
  destination_bucket_arn = data.terraform_remote_state.datastore.outputs.logs_bucket_arn
  firehose_role_arn     = aws_iam_role.firehose_delivery_role.arn

  # Buffering configuration
  buffer_size        = var.firehose_buffer_size
  buffer_interval    = var.firehose_buffer_interval
  compression_format = var.firehose_compression_format

  # S3 prefix configuration
  s3_prefix           = "year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/"
  error_output_prefix = "error-records/"

  # CloudWatch logging for Firehose itself
  enable_cloudwatch_logging = true
  log_retention_days       = var.log_retention_in_days

  additional_tags = local.layer_tags
}

# IAM Role for CloudWatch Logs to send data to Firehose
resource "aws_iam_role" "cloudwatch_logs_role" {
  name = "${local.project_name}-${local.environment}-cloudwatch-logs-role"

  assume_role_policy = file("${path.module}/policies/cloudwatch_logs_assume_role_policy.json")

  tags = merge(local.layer_tags, {
    Component = "logging" 
    Purpose   = "cloudwatch-logs"
  })
}

# IAM Policy for CloudWatch Logs to put records to Firehose
resource "aws_iam_role_policy" "cloudwatch_logs_policy" {
  name = "${local.project_name}-${local.environment}-cloudwatch-logs-policy"
  role = aws_iam_role.cloudwatch_logs_role.id

  policy = templatefile("${path.module}/policies/cloudwatch_logs_policy.json", {
    delivery_stream_arn = module.logs_delivery_stream.delivery_stream_arn
  })
}

# CloudWatch Logs Subscription Filters
resource "aws_cloudwatch_log_subscription_filter" "logs_filter" {
  for_each = local.all_log_groups

  name            = "${local.project_name}-${local.environment}-${each.key}-subscription"
  log_group_name  = each.value
  filter_pattern  = ""  # Send all log events
  destination_arn = module.logs_delivery_stream.delivery_stream_arn
  role_arn        = aws_iam_role.cloudwatch_logs_role.arn

  depends_on = [
    module.logs_delivery_stream,
    aws_iam_role_policy.cloudwatch_logs_policy
  ]
}

# ========================================
# CloudWatch Monitoring - Stripe EventBridge
# ========================================
# Moved from backend state for centralized monitoring

# EventBridge Failed Invocations Alarm
resource "aws_cloudwatch_metric_alarm" "eventbridge_failed_invocations" {
  alarm_name          = "${local.project_name}-${local.environment}-eventbridge-failed-invocations"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FailedInvocations"
  namespace           = "AWS/Events"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "This metric monitors failed EventBridge rule invocations"
  
  dimensions = {
    EventBusName = data.terraform_remote_state.backend.outputs.stripe_eventbridge_bus_name
  }

  tags = merge(local.layer_tags, {
    Component = "stripe-eventbridge"
    Purpose   = "monitoring"
  })
}

# Stripe DLQ Messages Alarm
resource "aws_cloudwatch_metric_alarm" "stripe_dlq_messages" {
  alarm_name          = "${local.project_name}-${local.environment}-stripe-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ApproximateNumberOfVisibleMessages"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "This metric monitors messages in Stripe EventBridge DLQ"
  
  dimensions = {
    QueueName = data.terraform_remote_state.backend.outputs.stripe_eventbridge_dlq_name
  }

  tags = merge(local.layer_tags, {
    Component = "stripe-eventbridge"
    Purpose   = "monitoring"
  })
}

# ========================================
# SNS Monitoring
# ========================================
# Monitoring for contact notification system

# CloudWatch Alarm for failed SNS notifications
resource "aws_cloudwatch_metric_alarm" "sns_failure_alarm" {
  alarm_name          = "${local.project_name}-${local.environment}-sns-delivery-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "NumberOfNotificationsFailed"
  namespace           = "AWS/SNS"
  period              = "60"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "This metric monitors failed SNS notifications for contact inquiries"

  dimensions = {
    TopicName = data.terraform_remote_state.backend.outputs.contact_sns_topic_name
  }

  tags = merge(local.layer_tags, {
    Component = "sns"
    Purpose   = "monitoring"
  })
}

# CloudWatch Dashboard for SNS metrics
resource "aws_cloudwatch_dashboard" "sns_dashboard" {
  dashboard_name = "${local.project_name}-${local.environment}-sns-contact-notifications"

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
            ["AWS/SNS", "NumberOfMessagesPublished", "TopicName", data.terraform_remote_state.backend.outputs.contact_sns_topic_name],
            [".", "NumberOfNotificationsDelivered", ".", "."],
            [".", "NumberOfNotificationsFailed", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = local.region
          title   = "SNS Contact Notifications Metrics"
          period  = 300
        }
      }
    ]
  })

  tags = merge(local.layer_tags, {
    Component = "sns"
    Purpose   = "dashboard"
  })
}

# ========================================
# Amazon Bedrock Monitoring
# ========================================
# Moved from bedrock module for centralized monitoring in operation stack

# CloudWatch Log Group for Bedrock API calls
resource "aws_cloudwatch_log_group" "bedrock" {
  name              = "/aws/bedrock/${local.project_name}-${local.environment}"
  retention_in_days = var.log_retention_in_days

  tags = merge(local.layer_tags, {
    Name      = "${local.project_name}-${local.environment}-bedrock-logs"
    Component = "bedrock"
    Purpose   = "logging"
  })
}

# CloudWatch Metric Filters for Bedrock monitoring
resource "aws_cloudwatch_log_metric_filter" "bedrock_invocations" {
  name           = "BedrockInvocations"
  log_group_name = aws_cloudwatch_log_group.bedrock.name
  pattern        = "[timestamp, request_id, \"BEDROCK_INVOKE\", ...]"

  metric_transformation {
    name      = "BedrockInvocations"
    namespace = "${local.project_name}/${local.environment}/Bedrock"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "bedrock_errors" {
  name           = "BedrockErrors"
  log_group_name = aws_cloudwatch_log_group.bedrock.name
  pattern        = "[timestamp, request_id, \"BEDROCK_ERROR\", ...]"

  metric_transformation {
    name      = "BedrockErrors"
    namespace = "${local.project_name}/${local.environment}/Bedrock"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "bedrock_token_usage" {
  name           = "BedrockTokenUsage"
  log_group_name = aws_cloudwatch_log_group.bedrock.name
  pattern        = "[timestamp, request_id, \"BEDROCK_TOKENS\", input_tokens, output_tokens]"

  metric_transformation {
    name      = "BedrockInputTokens"
    namespace = "${local.project_name}/${local.environment}/Bedrock"
    value     = "$input_tokens"
  }
}

# CloudWatch Alarms for Bedrock monitoring
resource "aws_cloudwatch_metric_alarm" "bedrock_error_rate" {
  alarm_name          = "${local.project_name}-${local.environment}-bedrock-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "BedrockErrors"
  namespace           = "${local.project_name}/${local.environment}/Bedrock"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors Bedrock error rate for Amazon Nova models"

  tags = merge(local.layer_tags, {
    Component = "bedrock"
    Purpose   = "monitoring"
  })
}

resource "aws_cloudwatch_metric_alarm" "bedrock_high_token_usage" {
  alarm_name          = "${local.project_name}-${local.environment}-bedrock-high-token-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BedrockInputTokens"
  namespace           = "${local.project_name}/${local.environment}/Bedrock"
  period              = "3600"  # 1 hour
  statistic           = "Sum"
  threshold           = var.bedrock_token_usage_threshold
  alarm_description   = "This metric monitors high Bedrock token usage for Amazon Nova models"

  tags = merge(local.layer_tags, {
    Component = "bedrock"
    Purpose   = "monitoring"
  })
}

# CloudWatch Dashboard for Bedrock metrics
resource "aws_cloudwatch_dashboard" "bedrock" {
  dashboard_name = "${local.project_name}-${local.environment}-bedrock"

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
            ["${local.project_name}/${local.environment}/Bedrock", "BedrockInvocations"],
            [".", "BedrockErrors"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = local.region
          title   = "Amazon Bedrock API Calls (Nova Models)"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["${local.project_name}/${local.environment}/Bedrock", "BedrockInputTokens"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = local.region
          title   = "Token Usage (Amazon Nova Models)"
          period  = 300
        }
      }
    ]
  })
}
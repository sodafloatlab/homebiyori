# Bedrock Model Access
# Note: Bedrock models need to be enabled manually in the AWS Console first
# This module mainly provides configuration and monitoring setup

data "aws_bedrock_foundation_model" "claude_haiku" {
  model_id = "anthropic.claude-3-haiku-20240307-v1:0"
}

# CloudWatch Log Group for Bedrock API calls
resource "aws_cloudwatch_log_group" "bedrock" {
  name              = "/aws/bedrock/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-bedrock-logs"
  })
}

# CloudWatch Metric Filters for Bedrock monitoring
resource "aws_cloudwatch_log_metric_filter" "bedrock_invocations" {
  name           = "BedrockInvocations"
  log_group_name = aws_cloudwatch_log_group.bedrock.name
  pattern        = "[timestamp, request_id, \"BEDROCK_INVOKE\", ...]"

  metric_transformation {
    name      = "BedrockInvocations"
    namespace = "${var.project_name}/${var.environment}/Bedrock"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "bedrock_errors" {
  name           = "BedrockErrors"
  log_group_name = aws_cloudwatch_log_group.bedrock.name
  pattern        = "[timestamp, request_id, \"BEDROCK_ERROR\", ...]"

  metric_transformation {
    name      = "BedrockErrors"
    namespace = "${var.project_name}/${var.environment}/Bedrock"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "bedrock_token_usage" {
  name           = "BedrockTokenUsage"
  log_group_name = aws_cloudwatch_log_group.bedrock.name
  pattern        = "[timestamp, request_id, \"BEDROCK_TOKENS\", input_tokens, output_tokens]"

  metric_transformation {
    name      = "BedrockInputTokens"
    namespace = "${var.project_name}/${var.environment}/Bedrock"
    value     = "$input_tokens"
  }
}

# CloudWatch Alarms for Bedrock monitoring
resource "aws_cloudwatch_metric_alarm" "bedrock_error_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-bedrock-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "BedrockErrors"
  namespace           = "${var.project_name}/${var.environment}/Bedrock"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors Bedrock error rate"
  alarm_actions       = var.alarm_topic_arn != "" ? [var.alarm_topic_arn] : []

  insufficient_data_actions = []

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "bedrock_high_token_usage" {
  alarm_name          = "${var.project_name}-${var.environment}-bedrock-high-token-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BedrockInputTokens"
  namespace           = "${var.project_name}/${var.environment}/Bedrock"
  period              = "3600"  # 1 hour
  statistic           = "Sum"
  threshold           = var.token_usage_alarm_threshold
  alarm_description   = "This metric monitors high Bedrock token usage"
  alarm_actions       = var.alarm_topic_arn != "" ? [var.alarm_topic_arn] : []

  insufficient_data_actions = []

  tags = var.common_tags
}

# CloudWatch Dashboard for Bedrock metrics
resource "aws_cloudwatch_dashboard" "bedrock" {
  dashboard_name = "${var.project_name}-${var.environment}-bedrock"

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
            ["${var.project_name}/${var.environment}/Bedrock", "BedrockInvocations"],
            [".", "BedrockErrors"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Bedrock API Calls"
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
            ["${var.project_name}/${var.environment}/Bedrock", "BedrockInputTokens"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Token Usage"
          period  = 300
        }
      }
    ]
  })
}

# Data sources
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}
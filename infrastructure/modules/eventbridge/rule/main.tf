# =====================================
# EventBridge Rule Module - Reusable
# =====================================
#
# 再利用可能なEventBridge Rule & Targetモジュール
# 任意のイベントパターンとターゲットに対応

# EventBridge Rule
resource "aws_cloudwatch_event_rule" "rule" {
  name           = var.rule_name
  description    = var.rule_description
  event_bus_name = var.event_bus_name
  
  event_pattern = var.event_pattern

  tags = var.tags
}

# EventBridge Target
resource "aws_cloudwatch_event_target" "target" {
  rule           = aws_cloudwatch_event_rule.rule.name
  event_bus_name = var.event_bus_name
  target_id      = var.target_id
  arn            = var.target_arn

  # リトライ設定
  dynamic "retry_policy" {
    for_each = var.retry_policy != null ? [var.retry_policy] : []
    content {
      maximum_retry_attempts       = retry_policy.value.maximum_retry_attempts
      maximum_event_age_in_seconds = retry_policy.value.maximum_event_age_in_seconds
    }
  }

  # Dead Letter Queue設定
  dynamic "dead_letter_config" {
    for_each = var.dlq_arn != null ? [var.dlq_arn] : []
    content {
      arn = dead_letter_config.value
    }
  }
}

# Lambda Permission (ターゲットがLambdaの場合)
resource "aws_lambda_permission" "allow_eventbridge" {
  count = var.target_type == "lambda" ? 1 : 0
  
  statement_id  = "AllowExecutionFromEventBridge-${var.rule_name}"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.rule.arn
}
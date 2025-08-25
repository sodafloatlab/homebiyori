# =====================================
# EventBridge Bus Module - Reusable
# =====================================
#
# 再利用可能なEventBridge Busモジュール
# 任意のイベントソースに対応可能

# EventBridge Custom Bus
resource "aws_cloudwatch_event_bus" "custom_bus" {
  name = var.bus_name

  tags = var.tags
}

# CloudWatch Log Group for EventBridge Bus (デバッグ用)
resource "aws_cloudwatch_log_group" "eventbridge_log_group" {
  name              = "/aws/events/${aws_cloudwatch_event_bus.custom_bus.name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Component = "eventbridge-logging"
  })
}
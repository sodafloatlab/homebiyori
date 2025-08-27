# Kinesis Data Firehose Module
# Delivers CloudWatch Logs to S3 for long-term storage

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# Local values for computed configurations
locals {
  # Default log group name if not provided
  firehose_log_group = var.log_group_name != "" ? var.log_group_name : "/aws/kinesis/firehose/${var.firehose_name}"
  
  # Module-specific tags (merged with provider default_tags)
  tags = merge({
    Name        = var.firehose_name
    Component   = "logging"
    Purpose     = "log-delivery"
    Module      = "datafirehose"
  }, var.additional_tags)
}

# CloudWatch Log Group for Firehose itself
resource "aws_cloudwatch_log_group" "firehose_logs" {
  count = var.enable_cloudwatch_logging ? 1 : 0
  
  name              = local.firehose_log_group
  retention_in_days = var.log_retention_days

  tags = merge(local.tags, {
    LogType = "infrastructure"
  })
}

# Kinesis Data Firehose Delivery Stream
resource "aws_kinesis_firehose_delivery_stream" "this" {
  name        = var.firehose_name
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn             = var.firehose_role_arn
    bucket_arn           = var.destination_bucket_arn
    prefix               = var.s3_prefix
    error_output_prefix  = var.error_output_prefix
    buffering_size       = var.buffer_size
    buffering_interval   = var.buffer_interval
    compression_format   = var.compression_format

    dynamic "cloudwatch_logging_options" {
      for_each = var.enable_cloudwatch_logging ? [1] : []
      content {
        enabled         = true
        log_group_name  = aws_cloudwatch_log_group.firehose_logs[0].name
        log_stream_name = "S3Delivery"
      }
    }
  }

  tags = local.tags
}
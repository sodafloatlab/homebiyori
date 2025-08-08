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

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(local.layer_tags, {
    Component = "logging"
    Purpose   = "firehose-delivery"
  })
}

# IAM Policy for Firehose to access S3 and CloudWatch
resource "aws_iam_role_policy" "firehose_delivery_policy" {
  name = "${local.project_name}-${local.environment}-firehose-logs-policy"
  role = aws_iam_role.firehose_delivery_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject"
        ]
        Resource = [
          data.terraform_remote_state.datastore.outputs.logs_bucket_arn,
          "${data.terraform_remote_state.datastore.outputs.logs_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
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

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "logs.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(local.layer_tags, {
    Component = "logging" 
    Purpose   = "cloudwatch-logs"
  })
}

# IAM Policy for CloudWatch Logs to put records to Firehose
resource "aws_iam_role_policy" "cloudwatch_logs_policy" {
  name = "${local.project_name}-${local.environment}-cloudwatch-logs-policy"
  role = aws_iam_role.cloudwatch_logs_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "firehose:PutRecord",
          "firehose:PutRecordBatch"
        ]
        Resource = module.logs_delivery_stream.delivery_stream_arn
      }
    ]
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
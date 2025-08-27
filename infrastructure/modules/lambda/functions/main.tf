# Reusable Lambda Function Module
# Based on terraform-aws-modules/lambda best practices

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
  # Function naming
  function_name = "${var.project_name}-${var.environment}-${var.service_name}"
  
  # IAM role naming
  role_name = "${var.project_name}-${var.environment}-${var.service_name}-role"
  
  # Policy naming
  policy_name = "${var.project_name}-${var.environment}-${var.service_name}-policy"
  
  # Log group naming
  log_group_name = "/aws/lambda/${local.function_name}"
  
  # Default environment variables
  default_environment_variables = {
    ENVIRONMENT    = var.environment
    PROJECT_NAME   = var.project_name
    SERVICE_TYPE   = var.service_name
  }
  
  # Merged environment variables
  environment_variables = merge(
    local.default_environment_variables,
    var.environment_variables
  )
  
  # Module-specific tags (merged with provider default_tags)
  tags = merge({
    Name        = local.function_name
    Service     = var.service_name
    Module      = "lambda-functions"
  }, var.tags)
}

# Lambda execution role
resource "aws_iam_role" "this" {
  name = local.role_name
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.tags
}

# Basic execution policy attachment
resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom IAM policy for service-specific permissions
resource "aws_iam_role_policy" "this" {
  count = var.iam_policy_document != null ? 1 : 0
  
  name = local.policy_name
  role = aws_iam_role.this.id
  
  policy = var.iam_policy_document
}

# Additional policy attachments
resource "aws_iam_role_policy_attachment" "additional" {
  for_each = toset(var.additional_policy_arns)
  
  role       = aws_iam_role.this.name
  policy_arn = each.value
}

# Lambda function
resource "aws_lambda_function" "this" {
  filename         = var.filename
  function_name    = local.function_name
  role            = aws_iam_role.this.arn
  handler         = var.handler
  runtime         = var.runtime
  timeout         = var.timeout
  memory_size     = var.memory_size
  layers          = var.layers
  
  source_code_hash = var.source_code_hash
  
  dynamic "environment" {
    for_each = length(local.environment_variables) > 0 ? [1] : []
    
    content {
      variables = local.environment_variables
    }
  }
  
  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }
  
  dynamic "dead_letter_config" {
    for_each = var.dead_letter_config != null ? [var.dead_letter_config] : []
    
    content {
      target_arn = dead_letter_config.value.target_arn
    }
  }
  
  dynamic "tracing_config" {
    for_each = var.tracing_mode != null ? [1] : []
    
    content {
      mode = var.tracing_mode
    }
  }
  
  tags = local.tags
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "this" {
  name              = local.log_group_name
  retention_in_days = var.log_retention_days
  
  tags = merge(local.tags, {
    Type = "lambda-logs"
  })
}

# Event source mappings
resource "aws_lambda_event_source_mapping" "this" {
  for_each = var.event_source_mappings
  
  event_source_arn                   = each.value.event_source_arn
  function_name                      = aws_lambda_function.this.function_name
  batch_size                         = lookup(each.value, "batch_size", 10)
  maximum_batching_window_in_seconds = lookup(each.value, "maximum_batching_window_in_seconds", null)
  starting_position                  = lookup(each.value, "starting_position", null)
  function_response_types            = lookup(each.value, "function_response_types", null)
}

# Lambda permissions for external invocation
resource "aws_lambda_permission" "this" {
  for_each = var.lambda_permissions
  
  statement_id  = each.key
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = each.value.principal
  source_arn    = lookup(each.value, "source_arn", null)
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
# Reusable API Gateway Service Module
# Based on best practices for microservices architecture

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
  # API Gateway naming
  api_name = "${var.project_name}-${var.environment}-${var.api_type}-api"
  
  # CloudWatch log group naming
  log_group_name = "API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.this.id}/${var.environment}"
  
  # Default tags
  default_tags = {
    Name        = local.api_name
    Environment = var.environment
    Project     = var.project_name
    APIType     = var.api_type
    ManagedBy   = "terraform"
  }
  
  # Merged tags
  tags = merge(local.default_tags, var.tags)
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "this" {
  name        = local.api_name
  description = "${var.api_type} API for ${var.project_name} application"

  endpoint_configuration {
    types = [var.endpoint_type]
  }

  tags = local.tags
}

# API Gateway Authorizer (if Cognito authentication is enabled)
resource "aws_api_gateway_authorizer" "cognito" {
  count = var.cognito_user_pool_arn != null ? 1 : 0
  
  name                   = "${local.api_name}-cognito-authorizer"
  rest_api_id           = aws_api_gateway_rest_api.this.id
  type                  = "COGNITO_USER_POOLS"
  provider_arns         = [var.cognito_user_pool_arn]
  identity_source       = "method.request.header.Authorization"
}

# API prefix resource
resource "aws_api_gateway_resource" "api_prefix" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_rest_api.this.root_resource_id
  path_part   = "api"
}

# Dynamic service resources
resource "aws_api_gateway_resource" "services" {
  for_each = var.lambda_services
  
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.api_prefix.id
  path_part   = each.value.path_part
}

# Dynamic proxy resources for services
resource "aws_api_gateway_resource" "service_proxies" {
  for_each = {
    for k, v in var.lambda_services : k => v
    if v.use_proxy
  }
  
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.services[each.key].id
  path_part   = "{proxy+}"
}

# Dynamic methods for services
resource "aws_api_gateway_method" "service_methods" {
  for_each = var.lambda_services
  
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = each.value.use_proxy ? aws_api_gateway_resource.service_proxies[each.key].id : aws_api_gateway_resource.services[each.key].id
  http_method   = each.value.http_method
  authorization = each.value.require_auth ? "COGNITO_USER_POOLS" : "NONE"
  authorizer_id = each.value.require_auth && var.cognito_user_pool_arn != null ? aws_api_gateway_authorizer.cognito[0].id : null
}

# Dynamic integrations for services
resource "aws_api_gateway_integration" "service_integrations" {
  for_each = var.lambda_services
  
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = each.value.use_proxy ? aws_api_gateway_resource.service_proxies[each.key].id : aws_api_gateway_resource.services[each.key].id
  http_method             = aws_api_gateway_method.service_methods[each.key].http_method
  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = each.value.lambda_invoke_arn
}

# CORS configuration
resource "aws_api_gateway_method" "cors_options" {
  for_each = {
    for k, v in var.lambda_services : k => v
    if v.enable_cors
  }
  
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = each.value.use_proxy ? aws_api_gateway_resource.service_proxies[each.key].id : aws_api_gateway_resource.services[each.key].id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "cors_options" {
  for_each = {
    for k, v in var.lambda_services : k => v
    if v.enable_cors
  }
  
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = each.value.use_proxy ? aws_api_gateway_resource.service_proxies[each.key].id : aws_api_gateway_resource.services[each.key].id
  http_method = aws_api_gateway_method.cors_options[each.key].http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "cors_options" {
  for_each = {
    for k, v in var.lambda_services : k => v
    if v.enable_cors
  }
  
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = each.value.use_proxy ? aws_api_gateway_resource.service_proxies[each.key].id : aws_api_gateway_resource.services[each.key].id
  http_method = aws_api_gateway_method.cors_options[each.key].http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "cors_options" {
  for_each = {
    for k, v in var.lambda_services : k => v
    if v.enable_cors
  }
  
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = each.value.use_proxy ? aws_api_gateway_resource.service_proxies[each.key].id : aws_api_gateway_resource.services[each.key].id
  http_method = aws_api_gateway_method.cors_options[each.key].http_method
  status_code = aws_api_gateway_method_response.cors_options[each.key].status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE'"
    "method.response.header.Access-Control-Allow-Origin"  = var.cors_allow_origin
  }
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "this" {
  depends_on = [
    aws_api_gateway_integration.service_integrations,
    aws_api_gateway_integration.cors_options,
  ]

  rest_api_id = aws_api_gateway_rest_api.this.id

  triggers = {
    redeployment = sha1(jsonencode({
      api_resources    = [for k, v in aws_api_gateway_resource.services : v.id]
      proxy_resources  = [for k, v in aws_api_gateway_resource.service_proxies : v.id]
      methods         = [for k, v in aws_api_gateway_method.service_methods : v.id]
      integrations    = [for k, v in aws_api_gateway_integration.service_integrations : v.id]
      cors_methods    = [for k, v in aws_api_gateway_method.cors_options : v.id]
      cors_integrations = [for k, v in aws_api_gateway_integration.cors_options : v.id]
    }))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "this" {
  deployment_id = aws_api_gateway_deployment.this.id
  rest_api_id   = aws_api_gateway_rest_api.this.id
  stage_name    = var.environment

  tags = local.tags
}

# API Gateway Method Settings (if detailed logging is enabled)
resource "aws_api_gateway_method_settings" "detailed_logging" {
  count = var.enable_detailed_logging ? 1 : 0
  
  rest_api_id = aws_api_gateway_rest_api.this.id
  stage_name  = aws_api_gateway_stage.this.stage_name
  method_path = "*/*"

  settings {
    logging_level      = "INFO"
    data_trace_enabled = true
    metrics_enabled    = true
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = local.log_group_name
  retention_in_days = var.log_retention_days

  tags = merge(local.tags, {
    Type = "api-gateway-logs"
  })
}

# IAM Role for CloudWatch Logs
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${local.api_name}-cloudwatch-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })

  tags = local.tags
}

# IAM Role Policy Attachment
resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# API Gateway Account (for CloudWatch logging)
resource "aws_api_gateway_account" "this" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

# Lambda permissions for API Gateway invocation
resource "aws_lambda_permission" "api_gateway" {
  for_each = var.lambda_services
  
  statement_id  = "AllowExecutionFrom${title(var.api_type)}APIGateway"
  action        = "lambda:InvokeFunction"
  function_name = each.value.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
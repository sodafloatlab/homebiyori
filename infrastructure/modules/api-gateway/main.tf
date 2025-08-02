# API Gateway for Homebiyori - Separated User and Admin APIs
# Based on design.md - implements separated API endpoints with microservices architecture
# Ensures proper access control and security isolation

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# API Gateway CloudWatch Logs ロール
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${var.project_name}-${var.environment}-api-gateway-cloudwatch"

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

  tags = var.common_tags
}

# API Gateway CloudWatch Logs ポリシー
resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# ==============================
# USER API GATEWAY
# ==============================

# User API Gateway REST API
resource "aws_api_gateway_rest_api" "user_api" {
  name        = "${var.project_name}-${var.environment}-user-api"
  description = "User API for ${var.project_name} application"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = merge(var.common_tags, {
    Type = "user-api"
  })
}

# User API Gateway Authorizer
resource "aws_api_gateway_authorizer" "user_cognito" {
  name                   = "${var.project_name}-${var.environment}-user-cognito-authorizer"
  rest_api_id           = aws_api_gateway_rest_api.user_api.id
  type                  = "COGNITO_USER_POOLS"
  provider_arns         = [var.user_cognito_user_pool_arn]
  identity_source       = "method.request.header.Authorization"
}

# User API Resources
resource "aws_api_gateway_resource" "user_api_v1" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  parent_id   = aws_api_gateway_rest_api.user_api.root_resource_id
  path_part   = "v1"
}

# Health Check Resource (Public)
resource "aws_api_gateway_resource" "health" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  parent_id   = aws_api_gateway_resource.user_api_v1.id
  path_part   = "health"
}

# User Service Resources
resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  parent_id   = aws_api_gateway_resource.user_api_v1.id
  path_part   = "users"
}

# Chat Service Resources
resource "aws_api_gateway_resource" "chat" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  parent_id   = aws_api_gateway_resource.user_api_v1.id
  path_part   = "chat"
}

# Tree Service Resources
resource "aws_api_gateway_resource" "tree" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  parent_id   = aws_api_gateway_resource.user_api_v1.id
  path_part   = "tree"
}

# Proxy resources for microservices
resource "aws_api_gateway_resource" "users_proxy" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  parent_id   = aws_api_gateway_resource.users.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_resource" "chat_proxy" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  parent_id   = aws_api_gateway_resource.chat.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_resource" "tree_proxy" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  parent_id   = aws_api_gateway_resource.tree.id
  path_part   = "{proxy+}"
}

# ==============================
# USER API METHODS & INTEGRATIONS
# ==============================

# Health Check - Public endpoint
resource "aws_api_gateway_method" "health_get" {
  rest_api_id   = aws_api_gateway_rest_api.user_api.id
  resource_id   = aws_api_gateway_resource.health.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "health_get" {
  rest_api_id             = aws_api_gateway_rest_api.user_api.id
  resource_id             = aws_api_gateway_resource.health.id
  http_method             = aws_api_gateway_method.health_get.http_method
  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.health_check_invoke_arn
}

# User Service - Protected endpoints
resource "aws_api_gateway_method" "users_proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.user_api.id
  resource_id   = aws_api_gateway_resource.users_proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.user_cognito.id
}

resource "aws_api_gateway_integration" "users_lambda_proxy" {
  rest_api_id             = aws_api_gateway_rest_api.user_api.id
  resource_id             = aws_api_gateway_resource.users_proxy.id
  http_method             = aws_api_gateway_method.users_proxy_any.http_method
  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.user_service_invoke_arn
}

# Chat Service - Protected endpoints
resource "aws_api_gateway_method" "chat_proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.user_api.id
  resource_id   = aws_api_gateway_resource.chat_proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.user_cognito.id
}

resource "aws_api_gateway_integration" "chat_lambda_proxy" {
  rest_api_id             = aws_api_gateway_rest_api.user_api.id
  resource_id             = aws_api_gateway_resource.chat_proxy.id
  http_method             = aws_api_gateway_method.chat_proxy_any.http_method
  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.chat_service_invoke_arn
}

# Tree Service - Protected endpoints
resource "aws_api_gateway_method" "tree_proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.user_api.id
  resource_id   = aws_api_gateway_resource.tree_proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.user_cognito.id
}

resource "aws_api_gateway_integration" "tree_lambda_proxy" {
  rest_api_id             = aws_api_gateway_rest_api.user_api.id
  resource_id             = aws_api_gateway_resource.tree_proxy.id
  http_method             = aws_api_gateway_method.tree_proxy_any.http_method
  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.tree_service_invoke_arn
}

# ==============================
# ADMIN API GATEWAY
# ==============================

# Admin API Gateway REST API
resource "aws_api_gateway_rest_api" "admin_api" {
  name        = "${var.project_name}-${var.environment}-admin-api"
  description = "Admin API for ${var.project_name} application"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = merge(var.common_tags, {
    Type = "admin-api"
  })
}

# Admin API Gateway Authorizer
resource "aws_api_gateway_authorizer" "admin_cognito" {
  name                   = "${var.project_name}-${var.environment}-admin-cognito-authorizer"
  rest_api_id           = aws_api_gateway_rest_api.admin_api.id
  type                  = "COGNITO_USER_POOLS"
  provider_arns         = [var.admin_cognito_user_pool_arn]
  identity_source       = "method.request.header.Authorization"
}

# Admin API Resources
resource "aws_api_gateway_resource" "admin_api_v1" {
  rest_api_id = aws_api_gateway_rest_api.admin_api.id
  parent_id   = aws_api_gateway_rest_api.admin_api.root_resource_id
  path_part   = "v1"
}

resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.admin_api.id
  parent_id   = aws_api_gateway_resource.admin_api_v1.id
  path_part   = "admin"
}

resource "aws_api_gateway_resource" "admin_proxy" {
  rest_api_id = aws_api_gateway_rest_api.admin_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "{proxy+}"
}

# Admin Service Method & Integration
resource "aws_api_gateway_method" "admin_proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.admin_api.id
  resource_id   = aws_api_gateway_resource.admin_proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.admin_cognito.id
}

resource "aws_api_gateway_integration" "admin_lambda_proxy" {
  rest_api_id             = aws_api_gateway_rest_api.admin_api.id
  resource_id             = aws_api_gateway_resource.admin_proxy.id
  http_method             = aws_api_gateway_method.admin_proxy_any.http_method
  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.admin_service_invoke_arn
}

# ==============================
# DEPLOYMENTS & STAGES
# ==============================

# User API Deployment
resource "aws_api_gateway_deployment" "user_api" {
  depends_on = [
    aws_api_gateway_integration.health_get,
    aws_api_gateway_integration.users_lambda_proxy,
    aws_api_gateway_integration.chat_lambda_proxy,
    aws_api_gateway_integration.tree_lambda_proxy,
  ]

  rest_api_id = aws_api_gateway_rest_api.user_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.health.id,
      aws_api_gateway_method.health_get.id,
      aws_api_gateway_integration.health_get.id,
      aws_api_gateway_resource.users_proxy.id,
      aws_api_gateway_method.users_proxy_any.id,
      aws_api_gateway_integration.users_lambda_proxy.id,
      aws_api_gateway_resource.chat_proxy.id,
      aws_api_gateway_method.chat_proxy_any.id,
      aws_api_gateway_integration.chat_lambda_proxy.id,
      aws_api_gateway_resource.tree_proxy.id,
      aws_api_gateway_method.tree_proxy_any.id,
      aws_api_gateway_integration.tree_lambda_proxy.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Admin API Deployment
resource "aws_api_gateway_deployment" "admin_api" {
  depends_on = [
    aws_api_gateway_integration.admin_lambda_proxy,
  ]

  rest_api_id = aws_api_gateway_rest_api.admin_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.admin_proxy.id,
      aws_api_gateway_method.admin_proxy_any.id,
      aws_api_gateway_integration.admin_lambda_proxy.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# User API Stage
resource "aws_api_gateway_stage" "user_api" {
  deployment_id = aws_api_gateway_deployment.user_api.id
  rest_api_id   = aws_api_gateway_rest_api.user_api.id
  stage_name    = var.environment

  access_log_destination_arn = aws_cloudwatch_log_group.user_api_gateway.arn
  access_log_format = jsonencode({
    requestId      = "$context.requestId"
    ip            = "$context.identity.sourceIp"
    caller        = "$context.identity.caller"
    user          = "$context.identity.user"
    requestTime   = "$context.requestTime"
    httpMethod    = "$context.httpMethod"
    resourcePath  = "$context.resourcePath"
    status        = "$context.status"
    protocol      = "$context.protocol"
    responseLength = "$context.responseLength"
  })

  tags = merge(var.common_tags, {
    Type = "user-api-stage"
  })
}

# Admin API Stage
resource "aws_api_gateway_stage" "admin_api" {
  deployment_id = aws_api_gateway_deployment.admin_api.id
  rest_api_id   = aws_api_gateway_rest_api.admin_api.id
  stage_name    = var.environment

  access_log_destination_arn = aws_cloudwatch_log_group.admin_api_gateway.arn
  access_log_format = jsonencode({
    requestId      = "$context.requestId"
    ip            = "$context.identity.sourceIp"
    caller        = "$context.identity.caller"
    user          = "$context.identity.user"
    requestTime   = "$context.requestTime"
    httpMethod    = "$context.httpMethod"
    resourcePath  = "$context.resourcePath"
    status        = "$context.status"
    protocol      = "$context.protocol"
    responseLength = "$context.responseLength"
  })

  tags = merge(var.common_tags, {
    Type = "admin-api-stage"
  })
}

# ==============================
# CLOUDWATCH LOGS
# ==============================

# CloudWatch Log Group for User API Gateway
resource "aws_cloudwatch_log_group" "user_api_gateway" {
  name              = "API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.user_api.id}/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Type = "user-api-logs"
  })
}

# CloudWatch Log Group for Admin API Gateway
resource "aws_cloudwatch_log_group" "admin_api_gateway" {
  name              = "API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.admin_api.id}/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Type = "admin-api-logs"
  })
}

# API Gateway Account (for CloudWatch logging)
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

# ==============================
# CORS CONFIGURATION
# ==============================

# CORS for User Services
resource "aws_api_gateway_method" "users_options" {
  rest_api_id   = aws_api_gateway_rest_api.user_api.id
  resource_id   = aws_api_gateway_resource.users_proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "users_options" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  resource_id = aws_api_gateway_resource.users_proxy.id
  http_method = aws_api_gateway_method.users_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "users_options" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  resource_id = aws_api_gateway_resource.users_proxy.id
  http_method = aws_api_gateway_method.users_options.http_method
  status_code = "200"

  response_headers = {
    "Access-Control-Allow-Headers" = true
    "Access-Control-Allow-Methods" = true
    "Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "users_options" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  resource_id = aws_api_gateway_resource.users_proxy.id
  http_method = aws_api_gateway_method.users_options.http_method
  status_code = aws_api_gateway_method_response.users_options.status_code

  response_headers = {
    "Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE'"
    "Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS for Chat Service
resource "aws_api_gateway_method" "chat_options" {
  rest_api_id   = aws_api_gateway_rest_api.user_api.id
  resource_id   = aws_api_gateway_resource.chat_proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "chat_options" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  resource_id = aws_api_gateway_resource.chat_proxy.id
  http_method = aws_api_gateway_method.chat_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "chat_options" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  resource_id = aws_api_gateway_resource.chat_proxy.id
  http_method = aws_api_gateway_method.chat_options.http_method
  status_code = "200"

  response_headers = {
    "Access-Control-Allow-Headers" = true
    "Access-Control-Allow-Methods" = true
    "Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "chat_options" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  resource_id = aws_api_gateway_resource.chat_proxy.id
  http_method = aws_api_gateway_method.chat_options.http_method
  status_code = aws_api_gateway_method_response.chat_options.status_code

  response_headers = {
    "Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE'"
    "Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS for Tree Service
resource "aws_api_gateway_method" "tree_options" {
  rest_api_id   = aws_api_gateway_rest_api.user_api.id
  resource_id   = aws_api_gateway_resource.tree_proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "tree_options" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  resource_id = aws_api_gateway_resource.tree_proxy.id
  http_method = aws_api_gateway_method.tree_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "tree_options" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  resource_id = aws_api_gateway_resource.tree_proxy.id
  http_method = aws_api_gateway_method.tree_options.http_method
  status_code = "200"

  response_headers = {
    "Access-Control-Allow-Headers" = true
    "Access-Control-Allow-Methods" = true
    "Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "tree_options" {
  rest_api_id = aws_api_gateway_rest_api.user_api.id
  resource_id = aws_api_gateway_resource.tree_proxy.id
  http_method = aws_api_gateway_method.tree_options.http_method
  status_code = aws_api_gateway_method_response.tree_options.status_code

  response_headers = {
    "Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE'"
    "Access-Control-Allow-Origin"  = "'*'"
  }
}
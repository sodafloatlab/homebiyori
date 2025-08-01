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

# API Gateway REST API
resource "aws_api_gateway_rest_api" "main" {
  name = "${var.project_name}-${var.environment}-api"
  description = "API for ${var.project_name} application"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.common_tags
}

# API Gateway Resources and Methods
resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "api"
}

# Auth resource
resource "aws_api_gateway_resource" "auth" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "auth"
}

# Users resource
resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "users"
}

# Core Service Resources (chat, tree, users, children, settings)
resource "aws_api_gateway_resource" "core" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "core"
}

# AI Service Resources (AI処理、感情検出、褒め生成)
resource "aws_api_gateway_resource" "ai" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "ai"
}

# Core Service Proxy resource
resource "aws_api_gateway_resource" "core_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.core.id
  path_part   = "{proxy+}"
}

# AI Service Proxy resource
resource "aws_api_gateway_resource" "ai_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.ai.id
  path_part   = "{proxy+}"
}

# Core Service API Gateway Methods
resource "aws_api_gateway_method" "core_proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.core_proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# Core Service Lambda integration
resource "aws_api_gateway_integration" "core_lambda_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.core_proxy.id
  http_method = aws_api_gateway_method.core_proxy_any.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.core_service_invoke_arn
}

# AI Service API Gateway Methods
resource "aws_api_gateway_method" "ai_proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.ai_proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# AI Service Lambda integration
resource "aws_api_gateway_integration" "ai_lambda_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_proxy.id
  http_method = aws_api_gateway_method.ai_proxy_any.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.ai_service_invoke_arn
}

# Cognito User Pool Authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name                   = "${var.project_name}-${var.environment}-cognito-authorizer"
  rest_api_id           = aws_api_gateway_rest_api.main.id
  type                  = "COGNITO_USER_POOLS"
  provider_arns         = [var.cognito_user_pool_arn]
  identity_source       = "method.request.header.Authorization"
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.core_lambda_proxy,
    aws_api_gateway_integration.ai_lambda_proxy,
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.core_proxy.id,
      aws_api_gateway_method.core_proxy_any.id,
      aws_api_gateway_integration.core_lambda_proxy.id,
      aws_api_gateway_resource.ai_proxy.id,
      aws_api_gateway_method.ai_proxy_any.id,
      aws_api_gateway_integration.ai_lambda_proxy.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  access_log_destination_arn = aws_cloudwatch_log_group.api_gateway.arn
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

  tags = var.common_tags
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.main.id}/${var.environment}"
  retention_in_days = var.log_retention_days

  tags = var.common_tags
}

# API Gateway Account (for CloudWatch logging)
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

# CORS configuration for Core Service
resource "aws_api_gateway_method" "core_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.core_proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "core_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.core_proxy.id
  http_method = aws_api_gateway_method.core_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "core_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.core_proxy.id
  http_method = aws_api_gateway_method.core_options.http_method
  status_code = "200"

  response_headers = {
    "Access-Control-Allow-Headers" = true
    "Access-Control-Allow-Methods" = true
    "Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "core_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.core_proxy.id
  http_method = aws_api_gateway_method.core_options.http_method
  status_code = aws_api_gateway_method_response.core_options.status_code

  response_headers = {
    "Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE'"
    "Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS configuration for AI Service
resource "aws_api_gateway_method" "ai_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.ai_proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "ai_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_proxy.id
  http_method = aws_api_gateway_method.ai_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "ai_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_proxy.id
  http_method = aws_api_gateway_method.ai_options.http_method
  status_code = "200"

  response_headers = {
    "Access-Control-Allow-Headers" = true
    "Access-Control-Allow-Methods" = true
    "Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "ai_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_proxy.id
  http_method = aws_api_gateway_method.ai_options.http_method
  status_code = aws_api_gateway_method_response.ai_options.status_code

  response_headers = {
    "Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE'"
    "Access-Control-Allow-Origin"  = "'*'"
  }
}
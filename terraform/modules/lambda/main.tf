# Lambda実行ロール
resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-${var.environment}-lambda-execution"

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

  tags = var.common_tags
}

# Lambda基本実行ポリシー
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda用のカスタムポリシー
resource "aws_iam_role_policy" "lambda_custom" {
  name = "${var.project_name}-${var.environment}-lambda-custom"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.project_name}-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.project_name}-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/*"
        ]
      }
    ]
  })
}

# Core Service Lambda (統合コアサービス)
resource "aws_lambda_function" "core_service" {
  filename         = var.core_service_zip_path
  function_name    = "${var.project_name}-${var.environment}-core-service"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "handler.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 512

  environment {
    variables = merge(var.environment_variables, {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
      SERVICE_TYPE = "core"
    })
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-core-service"
    Type = "core-api"
    Service = "chat-tree-user"
  })
}

# AI Service Lambda (AI専用サービス)
resource "aws_lambda_function" "ai_service" {
  filename         = var.ai_service_zip_path
  function_name    = "${var.project_name}-${var.environment}-ai-service"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "handler.lambda_handler"
  runtime         = "python3.11"
  timeout         = 60
  memory_size     = 1024

  environment {
    variables = merge(var.environment_variables, {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
      SERVICE_TYPE = "ai"
      BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"
    })
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-ai-service"
    Type = "ai-processing"
    Service = "bedrock-emotion-chat"
  })
}

# Lambda Layer for common dependencies
resource "aws_lambda_layer_version" "dependencies" {
  count           = var.create_lambda_layer ? 1 : 0
  filename        = var.lambda_layer_zip_path
  layer_name      = "${var.project_name}-${var.environment}-dependencies"
  description     = "Common dependencies for ${var.project_name}"
  
  compatible_runtimes = ["python3.11"]
  
  source_code_hash = var.lambda_layer_source_code_hash
}

# CloudWatch Log Groups for Lambda functions
resource "aws_cloudwatch_log_group" "core_service" {
  name              = "/aws/lambda/${aws_lambda_function.core_service.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Service = "core-service"
  })
}

resource "aws_cloudwatch_log_group" "ai_service" {
  name              = "/aws/lambda/${aws_lambda_function.ai_service.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Service = "ai-service"
  })
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "api_gateway_core" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.core_service.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_ai" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ai_service.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}

# データソース
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
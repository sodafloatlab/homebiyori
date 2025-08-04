# Lambda実行ロール - 共通
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

# 管理者専用Lambda実行ロール
resource "aws_iam_role" "admin_lambda_execution" {
  name = "${var.project_name}-${var.environment}-admin-lambda-execution"

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

  tags = merge(var.common_tags, {
    Type = "admin"
  })
}

# Lambda基本実行ポリシー - 一般ユーザー
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda基本実行ポリシー - 管理者
resource "aws_iam_role_policy_attachment" "admin_lambda_basic_execution" {
  role       = aws_iam_role.admin_lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ユーザーサービス用ポリシー - ユーザーデータテーブルのみアクセス
resource "aws_iam_role_policy" "user_service_policy" {
  name = "${var.project_name}-${var.environment}-user-service-policy"
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
          "dynamodb:Query"
        ]
        Resource = [var.user_data_table_arn, "${var.user_data_table_arn}/index/*"]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = ["USER#*"]
          }
        }
      },
      {
        Effect = "Allow"
        Action = ["ssm:GetParameter"]
        Resource = var.parameter_store_arns
      }
    ]
  })
}

# チャットサービス用ポリシー - 複数チャットテーブルアクセス
resource "aws_iam_role_policy" "chat_service_policy" {
  name = "${var.project_name}-${var.environment}-chat-service-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query"
        ]
        Resource = [var.user_data_table_arn]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = ["USER#*"]
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query"
        ]
        Resource = var.chat_table_arns
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = ["USER#*"]
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = [
          "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
        ]
      },
      {
        Effect = "Allow"
        Action = ["ssm:GetParameter"]
        Resource = var.parameter_store_arns
      }
    ]
  })
}

# ツリーサービス用ポリシー - ユーザーデータとチャット統計用
resource "aws_iam_role_policy" "tree_service_policy" {
  name = "${var.project_name}-${var.environment}-tree-service-policy"
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
          "dynamodb:Query"
        ]
        Resource = [var.user_data_table_arn, "${var.user_data_table_arn}/index/*"]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = ["USER#*"]
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Query"
        ]
        Resource = var.chat_table_arns
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = ["USER#*"]
          }
        }
      },
      {
        Effect = "Allow"
        Action = ["ssm:GetParameter"]
        Resource = var.parameter_store_arns
      }
    ]
  })
}

# 管理者サービス用ポリシー - 全テーブルフルアクセス
resource "aws_iam_role_policy" "admin_service_policy" {
  name = "${var.project_name}-${var.environment}-admin-service-policy"
  role = aws_iam_role.admin_lambda_execution.id

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
        Resource = concat(
          [var.user_data_table_arn, "${var.user_data_table_arn}/index/*"],
          var.chat_table_arns,
          [for arn in var.chat_table_arns : "${arn}/index/*"]
        )
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:PutParameter"
        ]
        Resource = var.parameter_store_arns
      }
    ]
  })
}

# 1. ユーザーサービス Lambda
resource "aws_lambda_function" "user_service" {
  filename         = var.user_service_zip_path
  function_name    = "${var.project_name}-${var.environment}-user-service"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "handler.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 256
  layers          = var.create_common_layer ? [aws_lambda_layer_version.common_dependencies[0].arn] : []

  environment {
    variables = merge(var.environment_variables, {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
      SERVICE_TYPE = "user"
      USER_DATA_TABLE_NAME = var.user_data_table_name
    })
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-user-service"
    Type = "microservice"
    Service = "user-management"
  })
}

# 2. チャットサービス Lambda
resource "aws_lambda_function" "chat_service" {
  filename         = var.chat_service_zip_path
  function_name    = "${var.project_name}-${var.environment}-chat-service"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "handler.lambda_handler"
  runtime         = "python3.11"
  timeout         = 60
  memory_size     = 512
  layers          = compact([var.create_common_layer ? aws_lambda_layer_version.common_dependencies[0].arn : "", var.create_ai_layer ? aws_lambda_layer_version.ai_dependencies[0].arn : ""])

  environment {
    variables = merge(var.environment_variables, {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
      SERVICE_TYPE = "chat"
      USER_DATA_TABLE_NAME = var.user_data_table_name
      CHAT_FREE_TABLE_NAME = var.chat_free_table_name
      CHAT_PREMIUM_TABLE_NAME = var.chat_premium_table_name
      BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"
    })
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-chat-service"
    Type = "microservice"
    Service = "chat-ai-processing"
  })
}

# 3. ツリーサービス Lambda
resource "aws_lambda_function" "tree_service" {
  filename         = var.tree_service_zip_path
  function_name    = "${var.project_name}-${var.environment}-tree-service"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "handler.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 256
  layers          = var.create_common_layer ? [aws_lambda_layer_version.common_dependencies[0].arn] : []

  environment {
    variables = merge(var.environment_variables, {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
      SERVICE_TYPE = "tree"
      USER_DATA_TABLE_NAME = var.user_data_table_name
      CHAT_FREE_TABLE_NAME = var.chat_free_table_name
      CHAT_PREMIUM_TABLE_NAME = var.chat_premium_table_name
    })
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-tree-service"
    Type = "microservice"
    Service = "tree-growth-visualization"
  })
}

# 4. ヘルスチェックサービス Lambda
resource "aws_lambda_function" "health_check" {
  filename         = var.health_check_zip_path
  function_name    = "${var.project_name}-${var.environment}-health-check"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "handler.lambda_handler"
  runtime         = "python3.11"
  timeout         = 10
  memory_size     = 128

  environment {
    variables = merge(var.environment_variables, {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
      SERVICE_TYPE = "health"
    })
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-health-check"
    Type = "utility"
    Service = "health-monitoring"
  })
}

# 5. 管理者サービス Lambda
resource "aws_lambda_function" "admin_service" {
  filename         = var.admin_service_zip_path
  function_name    = "${var.project_name}-${var.environment}-admin-service"
  role            = aws_iam_role.admin_lambda_execution.arn
  handler         = "handler.lambda_handler"
  runtime         = "python3.11"
  timeout         = 60
  memory_size     = 512
  layers          = var.create_common_layer ? [aws_lambda_layer_version.common_dependencies[0].arn] : []

  environment {
    variables = merge(var.environment_variables, {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
      SERVICE_TYPE = "admin"
      USER_DATA_TABLE_NAME = var.user_data_table_name
      CHAT_FREE_TABLE_NAME = var.chat_free_table_name
      CHAT_PREMIUM_TABLE_NAME = var.chat_premium_table_name
    })
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-admin-service"
    Type = "admin-microservice"
    Service = "admin-management"
  })
}

# 共通依存関係Layer（全サービス共通）
resource "aws_lambda_layer_version" "common_dependencies" {
  count           = var.create_common_layer ? 1 : 0
  filename        = var.common_layer_zip_path
  layer_name      = "${var.project_name}-${var.environment}-common-dependencies"
  description     = "Common dependencies: boto3, pydantic, fastapi, etc."
  
  compatible_runtimes = ["python3.11"]
  
  source_code_hash = var.common_layer_source_code_hash
}

# AI依存関係Layer（チャットサービス用）
resource "aws_lambda_layer_version" "ai_dependencies" {
  count           = var.create_ai_layer ? 1 : 0
  filename        = var.ai_layer_zip_path
  layer_name      = "${var.project_name}-${var.environment}-ai-dependencies"
  description     = "AI-specific dependencies: langchain, bedrock SDK, etc."
  
  compatible_runtimes = ["python3.11"]
  
  source_code_hash = var.ai_layer_source_code_hash
}

# CloudWatch Log Groups for all Lambda functions
resource "aws_cloudwatch_log_group" "user_service" {
  name              = "/aws/lambda/${aws_lambda_function.user_service.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Service = "user-service"
  })
}

resource "aws_cloudwatch_log_group" "chat_service" {
  name              = "/aws/lambda/${aws_lambda_function.chat_service.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Service = "chat-service"
  })
}

resource "aws_cloudwatch_log_group" "tree_service" {
  name              = "/aws/lambda/${aws_lambda_function.tree_service.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Service = "tree-service"
  })
}

resource "aws_cloudwatch_log_group" "health_check" {
  name              = "/aws/lambda/${aws_lambda_function.health_check.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Service = "health-check"
  })
}

resource "aws_cloudwatch_log_group" "admin_service" {
  name              = "/aws/lambda/${aws_lambda_function.admin_service.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Service = "admin-service"
  })
}

# 注意: Lambda permissionsはAPI Gatewayモジュールで管理されます

# データソース
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
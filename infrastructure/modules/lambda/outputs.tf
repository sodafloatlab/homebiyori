# ユーザーサービス出力
output "user_service_function_name" {
  description = "Name of the User Service Lambda function"
  value       = aws_lambda_function.user_service.function_name
}

output "user_service_function_arn" {
  description = "ARN of the User Service Lambda function"
  value       = aws_lambda_function.user_service.arn
}

output "user_service_invoke_arn" {
  description = "Invoke ARN of the User Service Lambda function"
  value       = aws_lambda_function.user_service.invoke_arn
}

# チャットサービス出力
output "chat_service_function_name" {
  description = "Name of the Chat Service Lambda function"
  value       = aws_lambda_function.chat_service.function_name
}

output "chat_service_function_arn" {
  description = "ARN of the Chat Service Lambda function"
  value       = aws_lambda_function.chat_service.arn
}

output "chat_service_invoke_arn" {
  description = "Invoke ARN of the Chat Service Lambda function"
  value       = aws_lambda_function.chat_service.invoke_arn
}

# ツリーサービス出力
output "tree_service_function_name" {
  description = "Name of the Tree Service Lambda function"
  value       = aws_lambda_function.tree_service.function_name
}

output "tree_service_function_arn" {
  description = "ARN of the Tree Service Lambda function"
  value       = aws_lambda_function.tree_service.arn
}

output "tree_service_invoke_arn" {
  description = "Invoke ARN of the Tree Service Lambda function"
  value       = aws_lambda_function.tree_service.invoke_arn
}

# ヘルスチェック出力
output "health_check_function_name" {
  description = "Name of the Health Check Lambda function"
  value       = aws_lambda_function.health_check.function_name
}

output "health_check_function_arn" {
  description = "ARN of the Health Check Lambda function"
  value       = aws_lambda_function.health_check.arn
}

output "health_check_invoke_arn" {
  description = "Invoke ARN of the Health Check Lambda function"
  value       = aws_lambda_function.health_check.invoke_arn
}

# 管理者サービス出力
output "admin_service_function_name" {
  description = "Name of the Admin Service Lambda function"
  value       = aws_lambda_function.admin_service.function_name
}

output "admin_service_function_arn" {
  description = "ARN of the Admin Service Lambda function"
  value       = aws_lambda_function.admin_service.arn
}

output "admin_service_invoke_arn" {
  description = "Invoke ARN of the Admin Service Lambda function"
  value       = aws_lambda_function.admin_service.invoke_arn
}

# Lambda Layer出力
output "common_layer_arn" {
  description = "ARN of the common Lambda layer"
  value       = var.create_common_layer ? aws_lambda_layer_version.common_dependencies[0].arn : null
}

output "ai_layer_arn" {
  description = "ARN of the AI Lambda layer"
  value       = var.create_ai_layer ? aws_lambda_layer_version.ai_dependencies[0].arn : null
}

# IAMロール出力
output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.arn
}

output "admin_lambda_execution_role_arn" {
  description = "ARN of the Admin Lambda execution role"
  value       = aws_iam_role.admin_lambda_execution.arn
}

# 統合出力 - API Gateway用
output "lambda_functions" {
  description = "Map of all Lambda function information for API Gateway integration"
  value = {
    user_service = {
      function_name = aws_lambda_function.user_service.function_name
      invoke_arn    = aws_lambda_function.user_service.invoke_arn
    }
    chat_service = {
      function_name = aws_lambda_function.chat_service.function_name
      invoke_arn    = aws_lambda_function.chat_service.invoke_arn
    }
    tree_service = {
      function_name = aws_lambda_function.tree_service.function_name
      invoke_arn    = aws_lambda_function.tree_service.invoke_arn
    }
    health_check = {
      function_name = aws_lambda_function.health_check.function_name
      invoke_arn    = aws_lambda_function.health_check.invoke_arn
    }
    admin_service = {
      function_name = aws_lambda_function.admin_service.function_name
      invoke_arn    = aws_lambda_function.admin_service.invoke_arn
    }
  }
}
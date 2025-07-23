output "main_api_function_name" {
  description = "Name of the main API Lambda function"
  value       = aws_lambda_function.main_api.function_name
}

output "main_api_function_arn" {
  description = "ARN of the main API Lambda function"
  value       = aws_lambda_function.main_api.arn
}

output "main_api_invoke_arn" {
  description = "Invoke ARN of the main API Lambda function"
  value       = aws_lambda_function.main_api.invoke_arn
}

output "ai_praise_function_name" {
  description = "Name of the AI praise Lambda function"
  value       = aws_lambda_function.ai_praise.function_name
}

output "ai_praise_function_arn" {
  description = "ARN of the AI praise Lambda function"
  value       = aws_lambda_function.ai_praise.arn
}

output "ai_praise_invoke_arn" {
  description = "Invoke ARN of the AI praise Lambda function"
  value       = aws_lambda_function.ai_praise.invoke_arn
}

output "lambda_layer_arn" {
  description = "ARN of the Lambda layer"
  value       = var.create_lambda_layer ? aws_lambda_layer_version.dependencies[0].arn : null
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.arn
}
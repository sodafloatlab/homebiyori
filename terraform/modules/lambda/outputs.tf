output "core_service_function_name" {
  description = "Name of the Core Service Lambda function"
  value       = aws_lambda_function.core_service.function_name
}

output "core_service_function_arn" {
  description = "ARN of the Core Service Lambda function"
  value       = aws_lambda_function.core_service.arn
}

output "core_service_invoke_arn" {
  description = "Invoke ARN of the Core Service Lambda function"
  value       = aws_lambda_function.core_service.invoke_arn
}

output "ai_service_function_name" {
  description = "Name of the AI Service Lambda function"
  value       = aws_lambda_function.ai_service.function_name
}

output "ai_service_function_arn" {
  description = "ARN of the AI Service Lambda function"
  value       = aws_lambda_function.ai_service.arn
}

output "ai_service_invoke_arn" {
  description = "Invoke ARN of the AI Service Lambda function"
  value       = aws_lambda_function.ai_service.invoke_arn
}

output "lambda_layer_arn" {
  description = "ARN of the Lambda layer"
  value       = var.create_lambda_layer ? aws_lambda_layer_version.dependencies[0].arn : null
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.arn
}
# Lambda outputs
output "user_service_function_name" {
  description = "Name of the User Service Lambda function"
  value       = module.lambda.user_service_function_name
}

output "chat_service_function_name" {
  description = "Name of the Chat Service Lambda function"
  value       = module.lambda.chat_service_function_name
}

output "tree_service_function_name" {
  description = "Name of the Tree Service Lambda function"
  value       = module.lambda.tree_service_function_name
}

output "health_check_function_name" {
  description = "Name of the Health Check Lambda function"
  value       = module.lambda.health_check_function_name
}

output "admin_service_function_name" {
  description = "Name of the Admin Service Lambda function"
  value       = module.lambda.admin_service_function_name
}

# API Gateway outputs
output "user_api_gateway_url" {
  description = "URL of the User API Gateway"
  value       = module.api_gateway.user_api_gateway_url
}

output "admin_api_gateway_url" {
  description = "URL of the Admin API Gateway"
  value       = module.api_gateway.admin_api_gateway_url
}

output "user_api_gateway_id" {
  description = "ID of the User API Gateway"
  value       = module.api_gateway.user_api_gateway_id
}

output "admin_api_gateway_id" {
  description = "ID of the Admin API Gateway"
  value       = module.api_gateway.admin_api_gateway_id
}

# Cognito outputs
output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = module.cognito.user_pool_client_id
}

output "user_pool_domain" {
  description = "Domain of the Cognito User Pool"
  value       = module.cognito.user_pool_domain
}

# Bedrock outputs
output "bedrock_model_id" {
  description = "ID of the Bedrock foundation model"
  value       = module.bedrock.model_id
}

output "bedrock_dashboard_url" {
  description = "URL of the CloudWatch dashboard for Bedrock"
  value       = module.bedrock.dashboard_url
}

# IAM role output for use by other layers
output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = module.lambda.lambda_execution_role_arn
}
# Lambda outputs
output "main_api_function_name" {
  description = "Name of the main API Lambda function"
  value       = module.lambda.main_api_function_name
}

output "ai_praise_function_name" {
  description = "Name of the AI praise Lambda function"  
  value       = module.lambda.ai_praise_function_name
}

# API Gateway outputs
output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = module.api_gateway.api_gateway_url
}

output "api_gateway_stage_name" {
  description = "Stage name of the API Gateway"
  value       = module.api_gateway.api_gateway_stage_name
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
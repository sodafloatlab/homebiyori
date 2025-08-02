# User API Gateway Outputs
output "user_api_gateway_id" {
  description = "ID of the User API Gateway"
  value       = aws_api_gateway_rest_api.user_api.id
}

output "user_api_gateway_arn" {
  description = "ARN of the User API Gateway"
  value       = aws_api_gateway_rest_api.user_api.arn
}

output "user_api_gateway_execution_arn" {
  description = "Execution ARN of the User API Gateway"
  value       = aws_api_gateway_rest_api.user_api.execution_arn
}

output "user_api_gateway_url" {
  description = "URL of the User API Gateway"
  value       = aws_api_gateway_stage.user_api.invoke_url
}

# Admin API Gateway Outputs
output "admin_api_gateway_id" {
  description = "ID of the Admin API Gateway"
  value       = aws_api_gateway_rest_api.admin_api.id
}

output "admin_api_gateway_arn" {
  description = "ARN of the Admin API Gateway"
  value       = aws_api_gateway_rest_api.admin_api.arn
}

output "admin_api_gateway_execution_arn" {
  description = "Execution ARN of the Admin API Gateway"
  value       = aws_api_gateway_rest_api.admin_api.execution_arn
}

output "admin_api_gateway_url" {
  description = "URL of the Admin API Gateway"
  value       = aws_api_gateway_stage.admin_api.invoke_url
}

# Combined outputs for convenience
output "api_gateways" {
  description = "Combined API Gateway information"
  value = {
    user_api = {
      id            = aws_api_gateway_rest_api.user_api.id
      arn           = aws_api_gateway_rest_api.user_api.arn
      execution_arn = aws_api_gateway_rest_api.user_api.execution_arn
      url           = aws_api_gateway_stage.user_api.invoke_url
      stage_name    = aws_api_gateway_stage.user_api.stage_name
    }
    admin_api = {
      id            = aws_api_gateway_rest_api.admin_api.id
      arn           = aws_api_gateway_rest_api.admin_api.arn
      execution_arn = aws_api_gateway_rest_api.admin_api.execution_arn
      url           = aws_api_gateway_stage.admin_api.invoke_url
      stage_name    = aws_api_gateway_stage.admin_api.stage_name
    }
  }
}

# Legacy compatibility outputs (deprecated)
output "api_gateway_id" {
  description = "[DEPRECATED] Use user_api_gateway_id instead"
  value       = aws_api_gateway_rest_api.user_api.id
}

output "api_gateway_execution_arn" {
  description = "[DEPRECATED] Use user_api_gateway_execution_arn instead"
  value       = aws_api_gateway_rest_api.user_api.execution_arn
}

output "api_gateway_url" {
  description = "[DEPRECATED] Use user_api_gateway_url instead"
  value       = aws_api_gateway_stage.user_api.invoke_url
}
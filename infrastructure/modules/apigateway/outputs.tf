# Outputs for reusable API Gateway Service Module

output "rest_api_id" {
  description = "The ID of the REST API"
  value       = aws_api_gateway_rest_api.this.id
}

output "rest_api_arn" {
  description = "The ARN of the REST API"
  value       = aws_api_gateway_rest_api.this.arn
}

output "rest_api_name" {
  description = "The name of the REST API"
  value       = aws_api_gateway_rest_api.this.name
}

output "execution_arn" {
  description = "The execution ARN of the REST API"
  value       = aws_api_gateway_rest_api.this.execution_arn
}

output "invoke_url" {
  description = "The invoke URL for the API Gateway stage"
  value       = "https://${aws_api_gateway_rest_api.this.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${var.environment}"
}

output "stage_name" {
  description = "The name of the API Gateway stage"
  value       = aws_api_gateway_stage.this.stage_name
}

output "deployment_id" {
  description = "The ID of the API Gateway deployment"
  value       = aws_api_gateway_deployment.this.id
}

output "authorizer_id" {
  description = "The ID of the Cognito authorizer (if enabled)"
  value       = var.cognito_user_pool_arn != null ? aws_api_gateway_authorizer.cognito[0].id : null
}

output "cloudwatch_log_group_name" {
  description = "The name of the CloudWatch log group for API Gateway"
  value       = aws_cloudwatch_log_group.api_gateway.name
}

output "cloudwatch_log_group_arn" {
  description = "The ARN of the CloudWatch log group for API Gateway"
  value       = aws_cloudwatch_log_group.api_gateway.arn
}

output "service_resources" {
  description = "Map of service resources created"
  value = {
    for k, v in aws_api_gateway_resource.services : k => {
      id        = v.id
      path      = v.path
      path_part = v.path_part
    }
  }
}

output "api_gateway_account_role_arn" {
  description = "The ARN of the IAM role for API Gateway CloudWatch logs"
  value       = aws_iam_role.api_gateway_cloudwatch.arn
}
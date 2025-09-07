# Lambda Function Outputs
output "lambda_function_names" {
  description = "Map of all Lambda function names"
  value = {
    for service_name, lambda_config in module.lambda_functions :
    service_name => lambda_config.function_name
  }
}

output "lambda_function_arns" {
  description = "Map of all Lambda function ARNs"
  value = {
    for service_name, lambda_config in module.lambda_functions :
    service_name => lambda_config.function_arn
  }
}

output "lambda_invoke_arns" {
  description = "Map of all Lambda invoke ARNs"
  value = {
    for service_name, lambda_config in module.lambda_functions :
    service_name => lambda_config.invoke_arn
  }
}

# Individual service outputs for backwards compatibility
output "user_service_function_name" {
  description = "Name of the user service Lambda function"
  value       = module.lambda_functions["user-service"].function_name
}

output "chat_service_function_name" {
  description = "Name of the chat service Lambda function"
  value       = module.lambda_functions["chat-service"].function_name
}

output "tree_service_function_name" {
  description = "Name of the tree service Lambda function"
  value       = module.lambda_functions["tree-service"].function_name
}

output "health_check_function_name" {
  description = "Name of the health check Lambda function"
  value       = module.lambda_functions["health-check-service"].function_name
}

# output "admin_service_function_name" {
#   description = "Name of the admin service Lambda function"
#   value       = module.lambda_functions["admin-service"].function_name
# }

# API Gateway Outputs
output "user_api_gateway_url" {
  description = "URL of the User API Gateway"
  value       = module.user_api_gateway.invoke_url
}

# output "admin_api_gateway_url" {
#   description = "URL of the Admin API Gateway"
#   value       = module.admin_api_gateway.invoke_url
# }

output "user_api_gateway_id" {
  description = "ID of the User API Gateway"
  value       = module.user_api_gateway.rest_api_id
}

# output "admin_api_gateway_id" {
#   description = "ID of the Admin API Gateway"
#   value       = module.admin_api_gateway.rest_api_id
# }

output "user_api_execution_arn" {
  description = "Execution ARN of the User API Gateway"
  value       = module.user_api_gateway.execution_arn
}

# output "admin_api_execution_arn" {
#   description = "Execution ARN of the Admin API Gateway"
#   value       = module.admin_api_gateway.execution_arn
# }

# Cognito Outputs - Users Pool
output "user_pool_id" {
  description = "ID of the Users Pool"
  value       = module.cognito_users.user_pool_id
}

output "user_pool_arn" {
  description = "ARN of the Users Pool"
  value       = module.cognito_users.user_pool_arn
}

output "user_pool_client_id" {
  description = "ID of the Users Pool Client"
  value       = module.cognito_users.user_pool_client_id
}

output "user_pool_domain" {
  description = "Domain of the Users Pool"
  value       = module.cognito_users.user_pool_domain
}

# Cognito Outputs - Admins Pool
# output "admin_pool_id" {
#   description = "ID of the Admins Pool"
#   value       = module.cognito_admins.user_pool_id
# }

# output "admin_pool_arn" {
#   description = "ARN of the Admins Pool"
#   value       = module.cognito_admins.user_pool_arn
# }

# output "admin_pool_client_id" {
#   description = "ID of the Admins Pool Client"
#   value       = module.cognito_admins.user_pool_client_id
# }

# Bedrock outputs
output "bedrock_logging_configuration_id" {
  description = "ID of the Bedrock model invocation logging configuration"
  value       = module.bedrock.logging_configuration_id
}

output "bedrock_logs_bucket" {
  description = "S3 bucket name for Bedrock logs"
  value       = module.bedrock.logs_bucket_name
}

# Lambda Layer Outputs
output "lambda_layer_arns" {
  description = "Map of all Lambda layer ARNs"
  value = var.create_common_layer ? {
    common = module.lambda_layers[0].layer_arn
  } : {}
}

output "lambda_layer_versions" {
  description = "Map of all Lambda layer versions"
  value = var.create_common_layer ? {
    common = module.lambda_layers[0].layer_version
  } : {}
}

output "common_layer_arn" {
  description = "ARN of the common Lambda layer"
  value       = var.create_common_layer ? module.lambda_layers[0].layer_arn : var.common_layer_arn
}

# IAM Role ARN for Lambda execution
output "lambda_execution_role_arns" {
  description = "Map of Lambda execution role ARNs"
  value = {
    for service_name, lambda_config in module.lambda_functions :
    service_name => lambda_config.iam_role_arn
  }
}

# Contact Service Outputs
output "contact_sns_topic_arn" {
  description = "ARN of the SNS topic for contact notifications"
  value       = module.contact_notifications.topic_arn
}

output "contact_sns_topic_name" {
  description = "Name of the SNS topic for contact notifications" 
  value       = module.contact_notifications.topic_name
}

output "contact_dlq_arn" {
  description = "ARN of the Dead Letter Queue for failed contact notifications"
  value       = module.contact_notifications.dlq_arn
}

output "contact_dlq_url" {
  description = "URL of the Dead Letter Queue for failed contact notifications"
  value       = module.contact_notifications.dlq_url
}


output "contact_service_function_name" {
  description = "Name of the contact service Lambda function"
  value       = length(module.lambda_functions) > 0 ? module.lambda_functions["contact-service"].function_name : null
}

output "contact_service_function_arn" {
  description = "ARN of the contact service Lambda function"
  value       = length(module.lambda_functions) > 0 ? module.lambda_functions["contact-service"].function_arn : null
}

# CloudWatch Logs configuration
output "log_retention_days" {
  description = "CloudWatch Logs retention period in days"
  value       = var.log_retention_days
}

output "lambda_log_group_names" {
  description = "Map of Lambda service names to CloudWatch log group names"
  value = {
    for service_name, lambda_config in module.lambda_functions :
    service_name => lambda_config.log_group_name
  }
}

output "lambda_log_group_arns" {
  description = "Map of Lambda service names to CloudWatch log group ARNs" 
  value = {
    for service_name, lambda_config in module.lambda_functions :
    service_name => lambda_config.log_group_arn
  }
}

output "api_gateway_log_group_names" {
  description = "Map of API Gateway types to CloudWatch log group names"
  value = {
    user  = module.user_api_gateway.cloudwatch_log_group_name
    # admin = module.admin_api_gateway.cloudwatch_log_group_name
  }
}

output "api_gateway_log_group_arns" {
  description = "Map of API Gateway types to CloudWatch log group ARNs"
  value = {
    user  = module.user_api_gateway.cloudwatch_log_group_arn
    # admin = module.admin_api_gateway.cloudwatch_log_group_arn
  }
}

# SQS Queue Outputs (moved from datastore state) - see EventBridge section below for details

# ========================================
# Stripe EventBridge Outputs - for operation monitoring
# ========================================

output "stripe_eventbridge_bus_name" {
  description = "Name of the Stripe EventBridge custom bus"
  value       = local.stripe_event_bus_name
  sensitive   = true
}

output "stripe_eventbridge_bus_arn" {
  description = "ARN of the Stripe EventBridge custom bus"
  value       = "arn:aws:events:${local.region}:${local.account_id}:event-bus/${local.stripe_event_bus_name}"
  sensitive   = true
}

output "stripe_eventbridge_dlq_name" {
  description = "Name of the Stripe EventBridge dead letter queue"
  value       = module.stripe_eventbridge_dlq.queue_name
}

output "stripe_eventbridge_dlq_arn" {
  description = "ARN of the Stripe EventBridge dead letter queue"
  value       = module.stripe_eventbridge_dlq.queue_arn
}

output "stripe_eventbridge_dlq_url" {
  description = "URL of the Stripe EventBridge dead letter queue"
  value       = module.stripe_eventbridge_dlq.queue_url
}

# ========================================
# Account Deletion SQS Outputs
# ========================================

output "account_deletion_queue_name" {
  description = "Name of the account deletion queue"
  value       = module.account_deletion_queue.queue_name
}

output "account_deletion_queue_arn" {
  description = "ARN of the account deletion queue"
  value       = module.account_deletion_queue.queue_arn
}

output "account_deletion_queue_url" {
  description = "URL of the account deletion queue"
  value       = module.account_deletion_queue.queue_url
}

output "account_deletion_dlq_name" {
  description = "Name of the account deletion dead letter queue"
  value       = module.account_deletion_queue.dlq_name
}

output "account_deletion_dlq_arn" {
  description = "ARN of the account deletion dead letter queue"
  value       = module.account_deletion_queue.dlq_arn
}

output "account_deletion_dlq_url" {
  description = "URL of the account deletion dead letter queue"
  value       = module.account_deletion_queue.dlq_url
}

# Stripe Webhook Lambda Function Outputs
output "stripe_webhook_function_names" {
  description = "Map of Stripe webhook Lambda function names"
  value = {
    for service_name, lambda_config in module.stripe_webhook_functions :
    service_name => lambda_config.function_name
  }
}

output "stripe_webhook_function_arns" {
  description = "Map of Stripe webhook Lambda function ARNs"
  value = {
    for service_name, lambda_config in module.stripe_webhook_functions :
    service_name => lambda_config.function_arn
  }
}
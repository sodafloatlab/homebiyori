# Parameter Store for maintenance control and configuration management
# Based on design.md requirements for centralized maintenance control

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Maintenance mode control parameters
resource "aws_ssm_parameter" "maintenance_enabled" {
  name        = "/${var.environment}/homebiyori/maintenance/enabled"
  description = "Boolean flag to enable/disable maintenance mode"
  type        = "String"
  value       = "false"
  
  # Ignore changes to value since this is managed dynamically by operations
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}

resource "aws_ssm_parameter" "maintenance_message" {
  name        = "/${var.environment}/homebiyori/maintenance/message"
  description = "Maintenance mode message displayed to users"
  type        = "String"
  value       = "システムメンテナンス中です。しばらくお待ちください。"
  
  # Ignore changes to value since this is managed dynamically by operations
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}

resource "aws_ssm_parameter" "maintenance_end_time" {
  name        = "/${var.environment}/homebiyori/maintenance/end_time"
  description = "Expected maintenance end time (ISO 8601 format)"
  type        = "String"
  value       = ""
  
  # Ignore changes to value since this is managed dynamically by operations
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}

resource "aws_ssm_parameter" "maintenance_start_time" {
  name        = "/${var.environment}/homebiyori/maintenance/start_time"
  description = "Maintenance start time (ISO 8601 format)"
  type        = "String"
  value       = ""
  
  # Ignore changes to value since this is managed dynamically by operations
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}

# Security parameters - for internal service authentication
resource "aws_ssm_parameter" "internal_api_key" {
  name        = "/${var.environment}/homebiyori/internal/api_key"
  description = "Internal API key for service-to-service authentication"
  type        = "SecureString"
  value       = "placeholder-internal-key-must-update-after-deployment"
  
  # Ignore changes to value since this should be managed manually for security
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}

resource "aws_ssm_parameter" "admin_api_key" {
  name        = "/${var.environment}/homebiyori/admin/api_key"
  description = "Admin API key for administrative operations"
  type        = "SecureString"
  value       = "placeholder-admin-key-must-update-after-deployment"
  
  # Ignore changes to value since this should be managed manually for security
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}

# Application configuration parameters
resource "aws_ssm_parameter" "app_version" {
  name        = "/${var.environment}/homebiyori/app/version"
  description = "Current application version"
  type        = "String"
  value       = "1.0.0"
  
  # Tags are automatically applied via provider default_tags
}

resource "aws_ssm_parameter" "feature_flags" {
  name        = "/${var.environment}/homebiyori/features/flags"
  description = "JSON object containing feature flags"
  type        = "String"
  value       = jsonencode({
    premium_features_enabled = true
    group_chat_beta         = false
    new_ai_characters       = false
  })
  
  # Tags are automatically applied via provider default_tags
}

# AI configuration parameters - Free user LLM settings (Amazon Nova Lite)
resource "aws_ssm_parameter" "ai_free_user_model_id" {
  name        = "/${var.environment}/homebiyori/llm/free-user/model-id"
  description = "Model ID for free tier users (Amazon Nova Lite - latest)"
  type        = "String"
  value       = "amazon.nova-lite-v1:0"
  
  # Tags are automatically applied via provider default_tags
}

resource "aws_ssm_parameter" "ai_free_user_max_tokens" {
  name        = "/${var.environment}/homebiyori/llm/free-user/max-tokens"
  description = "Maximum output tokens for free tier users (Japanese optimized: ~150-200 chars)"
  type        = "String"
  value       = "100"
  
  # Tags are automatically applied via provider default_tags
}

resource "aws_ssm_parameter" "ai_free_user_temperature" {
  name        = "/${var.environment}/homebiyori/llm/free-user/temperature"
  description = "Temperature setting for free tier users"
  type        = "String"
  value       = "0.7"
  
  # Tags are automatically applied via provider default_tags
}

# AI configuration parameters - Premium user LLM settings (Claude 3.5 Haiku)
resource "aws_ssm_parameter" "ai_premium_user_model_id" {
  name        = "/${var.environment}/homebiyori/llm/premium-user/model-id"
  description = "Model ID for premium tier users (Claude 3.5 Haiku - latest)"
  type        = "String"
  value       = "anthropic.claude-3-5-haiku-20241022-v1:0"
  
  # Tags are automatically applied via provider default_tags
}

resource "aws_ssm_parameter" "ai_premium_user_max_tokens" {
  name        = "/${var.environment}/homebiyori/llm/premium-user/max-tokens"
  description = "Maximum output tokens for premium tier users (Japanese optimized: ~375-500 chars)"
  type        = "String"
  value       = "250"
  
  # Tags are automatically applied via provider default_tags
}

resource "aws_ssm_parameter" "ai_premium_user_temperature" {
  name        = "/${var.environment}/homebiyori/llm/premium-user/temperature"
  description = "Temperature setting for premium tier users"
  type        = "String"
  value       = "0.7"
  
  # Tags are automatically applied via provider default_tags
}

# Tree growth thresholds
resource "aws_ssm_parameter" "tree_growth_thresholds" {
  name        = "/${var.environment}/homebiyori/tree/growth_thresholds"
  description = "Character count thresholds for tree growth stages"
  type        = "String"
  value       = jsonencode({
    stage_1 = 20
    stage_2 = 50
    stage_3 = 100
    stage_4 = 180
    stage_5 = 300
  })
  
  # Tags are automatically applied via provider default_tags
}

# Rate limiting configuration
resource "aws_ssm_parameter" "rate_limits" {
  name        = "/${var.environment}/homebiyori/security/rate_limits"
  description = "API rate limiting configuration"
  type        = "String"
  value       = jsonencode({
    default_requests_per_minute = 100
    chat_requests_per_minute   = 10
    admin_requests_per_minute  = 500
  })
  
  # Tags are automatically applied via provider default_tags
}
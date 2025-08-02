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
  name        = "/homebiyori/maintenance/enabled"
  description = "Boolean flag to enable/disable maintenance mode"
  type        = "String"
  value       = "false"
  
  tags = var.tags
}

resource "aws_ssm_parameter" "maintenance_message" {
  name        = "/homebiyori/maintenance/message"
  description = "Maintenance mode message displayed to users"
  type        = "String"
  value       = "システムメンテナンス中です。しばらくお待ちください。"
  
  tags = var.tags
}

resource "aws_ssm_parameter" "maintenance_end_time" {
  name        = "/homebiyori/maintenance/end_time"
  description = "Expected maintenance end time (ISO 8601 format)"
  type        = "String"
  value       = ""
  
  tags = var.tags
}

# Application configuration parameters
resource "aws_ssm_parameter" "app_version" {
  name        = "/homebiyori/app/version"
  description = "Current application version"
  type        = "String"
  value       = "1.0.0"
  
  tags = var.tags
}

resource "aws_ssm_parameter" "feature_flags" {
  name        = "/homebiyori/features/flags"
  description = "JSON object containing feature flags"
  type        = "String"
  value       = jsonencode({
    premium_features_enabled = true
    group_chat_beta         = false
    new_ai_characters       = false
  })
  
  tags = var.tags
}

# AI configuration parameters
resource "aws_ssm_parameter" "ai_model_config" {
  name        = "/homebiyori/ai/model_config"
  description = "AI model configuration for Bedrock"
  type        = "String"
  value       = jsonencode({
    model_id            = "anthropic.claude-3-haiku-20240307-v1:0"
    max_tokens         = 150
    temperature        = 0.7
    top_p              = 0.9
    default_system_prompt = "あなたは育児中の親を優しく褒めるAIアシスタントです。"
  })
  
  tags = var.tags
}

# Tree growth thresholds
resource "aws_ssm_parameter" "tree_growth_thresholds" {
  name        = "/homebiyori/tree/growth_thresholds"
  description = "Character count thresholds for tree growth stages"
  type        = "String"
  value       = jsonencode({
    stage_1 = 20
    stage_2 = 50
    stage_3 = 100
    stage_4 = 180
    stage_5 = 300
  })
  
  tags = var.tags
}

# Rate limiting configuration
resource "aws_ssm_parameter" "rate_limits" {
  name        = "/homebiyori/security/rate_limits"
  description = "API rate limiting configuration"
  type        = "String"
  value       = jsonencode({
    default_requests_per_minute = 100
    chat_requests_per_minute   = 10
    admin_requests_per_minute  = 500
  })
  
  tags = var.tags
}
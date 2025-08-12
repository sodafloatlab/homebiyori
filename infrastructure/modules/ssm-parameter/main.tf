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

# セキュリティパラメータ
# API キーは手動設定方針のため、Terraformでは管理しない
# 運用時にAWSコンソール/CLIで直接設定:
# - /${var.environment}/homebiyori/internal/api_key (SecureString)
# - /${var.environment}/homebiyori/admin/api_key (SecureString)

# Application configuration parameters
resource "aws_ssm_parameter" "app_version" {
  name        = "/${var.environment}/homebiyori/app/version"
  description = "Current application version"
  type        = "String"
  value       = "1.0.0"
  
  # Tags are automatically applied via provider default_tags
}

# 機能フラグは削除 - 運用時に必要に応じて手動追加

# AI設定 - 無料ユーザー向けLLM設定（Amazon Nova Lite）
# 無料プランユーザーのチャット機能で使用するLLMモデル設定
resource "aws_ssm_parameter" "ai_free_user_model_id" {
  name        = "/${var.environment}/homebiyori/llm/free-user/model-id"
  description = "LLM model ID for free tier users - Amazon Nova Lite (cost-optimized)"
  type        = "String"
  value       = "amazon.nova-lite-v1:0"  # 2025年時点の最新Nova Liteモデル
  
  # 運用時のモデルバージョン切り替えに備えて値変更を許可
  # Tags are automatically applied via provider default_tags
}

# 無料ユーザー向け出力トークン制限
# 用途: コスト制御と適切な応答長バランス
# 換算: 100トークン = 約150-200日本語文字（1トークン≈1.5-2文字）
# 目標応答長: 50-150文字（無料プランの制限内）
resource "aws_ssm_parameter" "ai_free_user_max_tokens" {
  name        = "/${var.environment}/homebiyori/llm/free-user/max-tokens"
  description = "Max output tokens for free users - cost control (100 tokens = ~150-200 JP chars)"
  type        = "String"
  value       = "100"
  
  # 運用時のコスト調整・応答品質バランスに備えて動的変更を許可
  # Tags are automatically applied via provider default_tags
}

resource "aws_ssm_parameter" "ai_free_user_temperature" {
  name        = "/${var.environment}/homebiyori/llm/free-user/temperature"
  description = "Temperature setting for free tier users"
  type        = "String"
  value       = "0.7"
  
  # Tags are automatically applied via provider default_tags
}

# AI設定 - プレミアムユーザー向けLLM設定（Claude 3.5 Haiku）
# プレミアムプランユーザーのチャット機能で使用する高品質LLMモデル設定
resource "aws_ssm_parameter" "ai_premium_user_model_id" {
  name        = "/${var.environment}/homebiyori/llm/premium-user/model-id"
  description = "LLM model ID for premium users - Claude 3.5 Haiku (high-quality)"
  type        = "String"
  value       = "anthropic.claude-3-5-haiku-20241022-v1:0"  # 2024年10月時点の最新Claude 3.5 Haiku
  
  # プレミアム体験向上のため、より高性能モデルへの切り替えに備える
  # Tags are automatically applied via provider default_tags
}

# プレミアムユーザー向け出力トークン制限
# 用途: 高品質で詳細な応答提供（プレミアム価値創出）
# 換算: 250トークン = 約375-500日本語文字（1トークン≈1.5-2文字）
# 目標応答長: 200-400文字（プレミアムプランの豊富な応答）
resource "aws_ssm_parameter" "ai_premium_user_max_tokens" {
  name        = "/${var.environment}/homebiyori/llm/premium-user/max-tokens"
  description = "Max output tokens for premium users - quality focus (250 tokens = ~375-500 JP chars)"
  type        = "String"
  value       = "250"
  
  # プレミアム体験最適化のため応答品質調整を動的変更で対応
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

# レート制限設定は削除 - アプリケーションレベルで固定値を使用
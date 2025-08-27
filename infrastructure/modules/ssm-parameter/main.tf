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

# セキュリティパラメータ削除
# 不要な概念のため削除（Issue #33対応）
# - internal/api_key削除
# - admin/api_key削除

# Application configuration parameters
resource "aws_ssm_parameter" "app_version" {
  name        = "/${var.environment}/homebiyori/app/version"
  description = "Current application version"
  type        = "String"
  value       = "1.0.0"
  
  # Tags are automatically applied via provider default_tags
}

# rate_limitsパラメータ削除 - 不要な概念（Issue #33対応）
# ai_model_configパラメータ削除 - ひとまず削除（Issue #33対応）

# ========================================
# AI設定（新戦略：全ユーザー統一）
# ========================================

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

# レート制限設定は削除済み - アプリケーションレベルで固定値を使用

# ========================================
# 新戦略パラメータ（1週間トライアル→有料化）
# ========================================

# チャット保持期間削除（パフォーマンス考慮）
# 固定値180日をアプリケーション側に埋め込み（Issue #33対応）

# トライアル期間設定
resource "aws_ssm_parameter" "trial_duration_days" {
  name        = "/${var.environment}/homebiyori/trial/duration_days"
  description = "Trial period duration in days"
  type        = "String"
  value       = "7"
  
  # 運用時のマーケティング戦略調整に備えて動的変更を許可
  # Tags are automatically applied via provider default_tags
}

# 全ユーザー共通LLM設定
resource "aws_ssm_parameter" "ai_unified_model_id" {
  name        = "/${var.environment}/homebiyori/llm/unified/model-id"
  description = "Unified LLM model ID for all users - Amazon Nova Lite"
  type        = "String"
  value       = "amazon.nova-lite-v1:0"
  
  # 全ユーザー統一体験のためのモデル選択
  # Tags are automatically applied via provider default_tags
}

# 全ユーザー共通出力トークン設定
resource "aws_ssm_parameter" "ai_unified_max_tokens" {
  name        = "/${var.environment}/homebiyori/llm/unified/max-tokens"
  description = "Unified max output tokens for all users (250 tokens = ~375-500 JP chars)"
  type        = "String"
  value       = "250"
  
  # 統一品質体験のための設定
  # Tags are automatically applied via provider default_tags
}

# 全ユーザー共通温度設定
resource "aws_ssm_parameter" "ai_unified_temperature" {
  name        = "/${var.environment}/homebiyori/llm/unified/temperature"
  description = "Unified temperature setting for all users"
  type        = "String"
  value       = "0.7"
  
  # Tags are automatically applied via provider default_tags
}

# ========================================
# LangChain Memory管理設定（統合版）
# ========================================

# LangChain Memory用最大トークン数
resource "aws_ssm_parameter" "langchainmemory_max_tokens" {
  name        = "/${var.environment}/homebiyori/llm/unified/langchainmemory-max-tokens"
  description = "Maximum tokens for LangChain ConversationSummaryBufferMemory management (summary trigger threshold)"
  type        = "String"
  value       = "8000"
  
  # LangChain Memory履歴管理用トークン上限（要約トリガー）
  # Tags are automatically applied via provider default_tags
}

# LangChain Memory用バッファメッセージ数
resource "aws_ssm_parameter" "langchainmemory_buffer_messages" {
  name        = "/${var.environment}/homebiyori/llm/unified/langchainmemory-buffer-messages"
  description = "Number of recent messages to keep in buffer without summarization (short-term memory)"
  type        = "String"
  value       = "30"
  
  # 短期記憶として要約せずに保持する直近メッセージ件数
  # Tags are automatically applied via provider default_tags
}

# DynamoDB取得件数制御（新規追加）
resource "aws_ssm_parameter" "langchainmemory_db_fetch_limit" {
  name        = "/${var.environment}/homebiyori/llm/unified/langchainmemory-db-fetch-limit"
  description = "Maximum number of messages to fetch from DynamoDB for LangChain Memory initialization"
  type        = "String"
  value       = "100"
  
  # _load_messagesでの初期データ取得量制御（ハードコード削除）
  # 推奨: buffer_messages ≤ db_fetch_limit
  # Tags are automatically applied via provider default_tags
}

# LangChain Memory要約専用最大トークン数
resource "aws_ssm_parameter" "langchainmemory_summary_max_tokens" {
  name        = "/${var.environment}/homebiyori/llm/unified/langchainmemory-summary-max-tokens"
  description = "Maximum tokens for LangChain Memory summary generation (background processing)"
  type        = "String"
  value       = "150"
  
  # 会話履歴要約生成用トークン制限（ユーザーには直接表示されない）
  # Tags are automatically applied via provider default_tags
}

# LangChain Memory要約専用温度設定
resource "aws_ssm_parameter" "langchainmemory_summary_temperature" {
  name        = "/${var.environment}/homebiyori/llm/unified/langchainmemory-summary-temperature"
  description = "Temperature setting for LangChain Memory summary generation (precision-focused)"
  type        = "String"
  value       = "0.3"
  
  # 要約精度重視の低温度設定（事実に忠実な要約生成）
  # Tags are automatically applied via provider default_tags
}

# ========================================
# 機能フラグ制御（LangChain Memory統合）
# ========================================

# 機能フラグJSON（要約機能制御含む）
resource "aws_ssm_parameter" "feature_flags" {
  name        = "/${var.environment}/homebiyori/features/flags"
  description = "Feature flags for dynamic feature control (JSON format)"
  type        = "String"
  value       = jsonencode({
    summary_enabled      = true   # LangChain Memory要約機能有効フラグ
    group_chat_enabled   = true   # グループチャット機能
    premium_features     = true   # プレミアム機能（統一戦略により全員有効）
    maintenance_mode     = false  # メンテナンスモード
  })
  
  # 運用時の機能制御調整に備えて動的変更を許可
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}

# ========================================
# Stripe統合設定（新戦略）
# ========================================

# Stripe API設定
resource "aws_ssm_parameter" "stripe_api_key" {
  name        = "/${var.environment}/homebiyori/stripe/api_key"
  description = "Stripe Secret API Key - managed via AWS Console/CLI"
  type        = "SecureString"
  value       = "placeholder_value_set_manually"
  
  # 手動設定方針：セキュリティ重要パラメータはTerraform管理外
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}

resource "aws_ssm_parameter" "stripe_webhook_secret" {
  name        = "/${var.environment}/homebiyori/stripe/webhook_secret"
  description = "Stripe Webhook Endpoint Secret - managed via AWS Console/CLI"
  type        = "SecureString"
  value       = "placeholder_value_set_manually"
  
  # 手動設定方針：セキュリティ重要パラメータはTerraform管理外
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}

# Stripe価格ID設定（新戦略）
resource "aws_ssm_parameter" "stripe_monthly_price_id" {
  name        = "/${var.environment}/homebiyori/stripe/monthly_price_id"
  description = "Stripe Price ID for monthly plan (580 JPY)"
  type        = "String"
  value       = "price_monthly_580jpy_placeholder"
  
  # 運用時にStripe Dashboard確認後に実際のPrice IDに更新
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}

resource "aws_ssm_parameter" "stripe_yearly_price_id" {
  name        = "/${var.environment}/homebiyori/stripe/yearly_price_id"
  description = "Stripe Price ID for yearly plan (5800 JPY)"
  type        = "String"
  value       = "price_yearly_5800jpy_placeholder"
  
  # 運用時にStripe Dashboard確認後に実際のPrice IDに更新
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}

# プロモーションコード設定
resource "aws_ssm_parameter" "stripe_first_month_promo_code" {
  name        = "/${var.environment}/homebiyori/stripe/first_month_promo_code"
  description = "Stripe Promotion Code for first month 300 JPY discount"
  type        = "String"
  value       = "promo_first_month_300yen_placeholder"
  
  # 運用時にStripe Dashboard確認後に実際のPromotion Codeに更新
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}

# Stripe設定フラグ
resource "aws_ssm_parameter" "stripe_test_mode" {
  name        = "/${var.environment}/homebiyori/stripe/test_mode"
  description = "Stripe test mode flag (true for development, false for production)"
  type        = "String"
  value       = var.environment == "prod" ? "false" : "true"
  
  # Tags are automatically applied via provider default_tags
}

# ========================================
# Google OAuth設定
# ========================================

# Google OAuth Client ID
resource "aws_ssm_parameter" "google_client_id" {
  name        = "/${var.environment}/homebiyori/oauth/google/client_id"
  description = "Google OAuth Client ID - managed via AWS Console/CLI"
  type        = "String"
  value       = "placeholder_google_client_id_set_manually"
  
  # 手動設定方針：セキュリティ重要パラメータはTerraform管理外
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}

# Google OAuth Client Secret
resource "aws_ssm_parameter" "google_client_secret" {
  name        = "/${var.environment}/homebiyori/oauth/google/client_secret"
  description = "Google OAuth Client Secret - managed via AWS Console/CLI"
  type        = "SecureString"
  value       = "placeholder_google_client_secret_set_manually"
  
  # 手動設定方針：セキュリティ重要パラメータはTerraform管理外
  lifecycle {
    ignore_changes = [value]
  }
  
  # Tags are automatically applied via provider default_tags
}
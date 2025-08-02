# DynamoDB Simplified Architecture for Homebiyori
# Based on application requirements analysis:
# - User data: Single table for related permanent data
# - Chat data: Single table with dynamic TTL management
# - TTL updates via SQS + Lambda for plan switching
# This approach optimizes for simplicity and operational efficiency

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# User Data Table - Single Table Design for permanent user-related data
# Contains: User profiles, tree growth data, children info, settings
resource "aws_dynamodb_table" "homebiyori_data" {
  name         = "${var.project_name}-${var.environment}-data"
  billing_mode = "ON_DEMAND"
  hash_key     = "PK"
  range_key    = "SK"

  # Primary key attributes
  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI1 attributes for admin queries and cross-entity access patterns
  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # Global Secondary Index 1 - for admin queries and analytics
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  # Point-in-time recovery for permanent data protection
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Server-side encryption with AWS managed key
  server_side_encryption {
    enabled = true
  }

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-${var.environment}-data"
    Type        = "user-data"
    DataModel   = "Single Table Design"
    Privacy     = "GDPR-compliant"
    Retention   = "Permanent"
  })
}

# Chat Table - Single table with dynamic TTL management
resource "aws_dynamodb_table" "chat" {
  name         = "${var.project_name}-${var.environment}-chat"
  billing_mode = "ON_DEMAND"
  hash_key     = "PK"
  range_key    = "SK"

  # Primary key attributes
  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI for chat queries by timestamp
  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  # TTL for automatic cleanup - dynamically managed by subscription plan
  ttl {
    attribute_name = "TTL"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-${var.environment}-chat"
    Type        = "chat-data"
    TTLStrategy = "dynamic"
    Retention   = "plan-based"
  })
}


# Data access patterns for reference:
#
# HOMEBIYORI-DATA TABLE (Permanent user data):
# 
# User Profile (Privacy-focused):
# PK: "USER#{cognito_sub}", SK: "PROFILE"
# Attributes: user_id, nickname, onboarding_completed, selected_ai_role, praise_level, subscription_plan
# Note: NO email, name, or personal identifiable information stored
#
# Tree Growth Data:
# PK: "USER#{user_id}", SK: "TREE#STATS"
# GSI1: PK: "TREE", SK: "STATS#{user_id}" (for admin analytics)
#
# Children Information:
# PK: "USER#{user_id}", SK: "CHILD#{child_id}"
# Attributes: nickname, birth_month (privacy-focused, no exact dates)
#
# User Settings:
# PK: "USER#{user_id}", SK: "SETTINGS"
# Attributes: ai_role, praise_level, notification_preferences
#
# Admin queries (nickname only):
# GSI1: PK: "USER", SK: "PROFILE#{user_id}"
# Returns: user_id, nickname, onboarding_completed, subscription_plan, created_at
#
# CHAT TABLE (Single table with dynamic TTL):
#
# Chat Messages (All Users - chat table):
# PK: "USER#{user_id}", SK: "CHAT#{timestamp}"
# GSI1: PK: "CHAT#{user_id}", SK: "{timestamp}"
# TTL Logic:
#   - Free users: TTL = created_at + 30 days
#   - Premium users: TTL = created_at + 180 days
#   - Plan switching: TTL updated via SQS + Lambda
#     * Free to Premium: Add 150 days to existing TTL
#     * Premium to Free: Subtract 150 days from existing TTL
#
# TTL Update Process:
# 1. User plan change triggers SQS message
# 2. Lambda function processes TTL updates asynchronously
# 3. Batch UpdateItem operations modify TTL for user's chat history
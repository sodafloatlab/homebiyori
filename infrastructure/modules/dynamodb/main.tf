# Reusable DynamoDB Table Module
# Based on terraform-aws-modules/dynamodb-table best practices

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# Local values for computed configurations
locals {
  # Table naming
  table_name = "${var.environment}-${var.project_name}-${var.table_name}"
  
  # Tags with table-specific additions
  tags = merge(var.tags, {
    Name      = local.table_name
    TableType = var.table_type
  })
  
  # GSI configuration
  global_secondary_indexes = var.global_secondary_indexes != null ? var.global_secondary_indexes : {}
  
  # LSI configuration  
  local_secondary_indexes = var.local_secondary_indexes != null ? var.local_secondary_indexes : {}
}

# DynamoDB Table
resource "aws_dynamodb_table" "this" {
  name         = local.table_name
  billing_mode = var.billing_mode
  hash_key     = var.hash_key
  range_key    = var.range_key

  # オンデマンドモードのみサポート（プロビジョニングモードは使用しない）
  # read_capacity / write_capacityはオンデマンドモードではnullに設定

  # Table attributes
  dynamic "attribute" {
    for_each = var.attributes
    
    content {
      name = attribute.value.name
      type = attribute.value.type
    }
  }

  # Global Secondary Indexes
  dynamic "global_secondary_index" {
    for_each = local.global_secondary_indexes
    
    content {
      name     = global_secondary_index.key
      hash_key = global_secondary_index.value.hash_key
      range_key = lookup(global_secondary_index.value, "range_key", null)
      projection_type = lookup(global_secondary_index.value, "projection_type", "ALL")
      non_key_attributes = lookup(global_secondary_index.value, "non_key_attributes", null)
      
      # GSIもオンデマンドモードではキャパシティ指定不要
      # read_capacity / write_capacityはオンデマンドモードではnull
    }
  }

  # Local Secondary Indexes
  dynamic "local_secondary_index" {
    for_each = local.local_secondary_indexes
    
    content {
      name            = local_secondary_index.key
      range_key       = local_secondary_index.value.range_key
      projection_type = lookup(local_secondary_index.value, "projection_type", "ALL")
      non_key_attributes = lookup(local_secondary_index.value, "non_key_attributes", null)
    }
  }

  # TTL configuration
  dynamic "ttl" {
    # ttl_enabledがtrueの場合のみ定義反映
    for_each = var.ttl_enabled ? [1] : []
    
    content {
      attribute_name = var.ttl_attribute_name
      enabled        = var.ttl_enabled
    }
  }

  # Point-in-time recovery
  dynamic "point_in_time_recovery" {
    for_each = var.point_in_time_recovery_enabled ? [1] : []
    
    content {
      enabled = var.point_in_time_recovery_enabled
    }
  }

  # Server-side encryption
  server_side_encryption {
    enabled = var.server_side_encryption_enabled
  }

  # Stream configuration
  stream_enabled   = var.stream_enabled
  stream_view_type = var.stream_enabled ? var.stream_view_type : null

  # Deletion protection
  deletion_protection_enabled = var.deletion_protection_enabled

  # Table class
  table_class = var.table_class

  tags = local.tags
}

# =========================================
# オートスケーリング関連リソースを削除
# =========================================
# Homebiyoriではコスト最適化のためPAY_PER_REQUESTモードで運用
# プロビジョニングモードやオートスケーリングは使用しない

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
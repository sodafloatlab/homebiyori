# DynamoDB tables for Homebiyori application - using new reusable modules
locals {
  project_name = var.project_name
  environment  = var.environment
  
  # DynamoDB table configurations - 最適化された4テーブル構成
  dynamodb_tables = {
    # 1. 統合テーブル（core）- users + subscriptions + trees + notifications統合
    core = {
      table_type         = "core"
      hash_key           = "PK"     # USER#user_id
      range_key          = "SK"     # PROFILE | AI_SETTINGS | TREE | SUBSCRIPTION | NOTIFICATION#timestamp
      billing_mode       = "PAY_PER_REQUEST"
      ttl_enabled        = true
      ttl_attribute_name = "expires_at"  # 通知の90日後自動削除（エポック秒）
      attributes = [
        { name = "PK", type = "S" },
        { name = "SK", type = "S" },
        { name = "current_plan", type = "S" },  # GSI1PK用
        { name = "status", type = "S" },        # GSI1SK用
        { name = "customer_id", type = "S" }    # GSI2PK用（Stripe Customer ID）
      ]
      global_secondary_indexes = {
        # サブスクリプション検索GSI（プレミアムユーザー管理用）
        GSI1 = {
          hash_key        = "current_plan"    # free|monthly|yearly
          range_key       = "status"          # active|canceled|cancel_scheduled|past_due
          projection_type = "ALL"
        }
        # Stripe Webhook最適化GSI（customer_id検索用）
        GSI2 = {
          hash_key        = "customer_id"     # Stripe Customer ID
          projection_type = "ALL"
        }
      }
    }
    
    # 2. チャット履歴（独立保持）- TTL管理と大容量データ特性
    chats = {
      table_type         = "chats"
      hash_key           = "PK"     # USER#user_id
      range_key          = "SK"     # CHAT#2024-01-01T12:00:00+09:00
      billing_mode       = "PAY_PER_REQUEST"
      ttl_enabled        = true
      ttl_attribute_name = "expires_at"  # TTL（180日）
      attributes = [
        { name = "PK", type = "S" },
        { name = "SK", type = "S" }
      ]
      # GSI削除（コスト削減）
    }
    
    # 3. 実の情報（独立保持）- 永続保存の特別なライフサイクル
    fruits = {
      table_type   = "fruits"
      hash_key     = "PK"     # USER#user_id
      range_key    = "SK"     # FRUIT#2024-01-01T12:00:00+09:00
      billing_mode = "PAY_PER_REQUEST"
      attributes = [
        { name = "PK", type = "S" },
        { name = "SK", type = "S" }
      ]
      # GSI削除（コスト削減）
    }
    
    # 4. フィードバック（分析最適化）- 完全に異なる用途とアクセス権限
    feedback = {
      table_type   = "feedback"
      hash_key     = "PK"     # FEEDBACK#subscription_cancellation | FEEDBACK#account_deletion
      range_key    = "SK"     # 2024-01-01T12:00:00+09:00
      billing_mode = "PAY_PER_REQUEST"
      attributes = [
        { name = "PK", type = "S" },
        { name = "SK", type = "S" },
        { name = "feedback_type", type = "S" },    # GSI1PK
        { name = "reason_category", type = "S" },   # GSI1SK
        { name = "satisfaction_score", type = "S" }, # GSI2PK
        { name = "created_at", type = "S" }          # GSI2SK
      ]
      global_secondary_indexes = {
        # 理由カテゴリ別分析GSI (design_database.md準拠)
        GSI1 = {
          hash_key        = "feedback_type"     # subscription_cancellation|account_deletion
          range_key       = "reason_category"   # price|features|usability|competitors|other
          projection_type = "ALL"
        }
        # 満足度スコア別分析GSI (design_database.md準拠)
        GSI2 = {
          hash_key        = "satisfaction_score" # 1-5
          range_key       = "created_at"         # 時系列分析
          projection_type = "ALL"
        }
      }
    }
    
    # 5. 決済履歴（7年保管）- 法的要件準拠の専用テーブル
    payments = {
      table_type         = "payments"
      hash_key           = "PK"     # USER#user_id
      range_key          = "SK"     # PAYMENT#2024-01-01T12:00:00+09:00
      billing_mode       = "PAY_PER_REQUEST"
      ttl_enabled        = true
      ttl_attribute_name = "ttl"    # 7年後自動削除
      attributes = [
        { name = "PK", type = "S" },
        { name = "SK", type = "S" },
        { name = "customer_id", type = "S" }    # GSI1PK用（Stripe Customer ID）
      ]
      global_secondary_indexes = {
        # Stripe Customer ID検索用GSI
        GSI1 = {
          hash_key        = "customer_id"     # Stripe Customer ID
          projection_type = "ALL"
        }
      }
    }
  }
}

# DynamoDB Tables using reusable modules
module "dynamodb_tables" {
  source = "../../../modules/dynamodb"
  
  for_each = local.dynamodb_tables
  
  project_name = local.project_name
  environment  = local.environment
  table_name   = each.key
  table_type   = each.value.table_type
  
  hash_key     = each.value.hash_key
  range_key    = lookup(each.value, "range_key", null)
  billing_mode = each.value.billing_mode
  
  attributes = each.value.attributes
  
  global_secondary_indexes = lookup(each.value, "global_secondary_indexes", null)
  local_secondary_indexes  = lookup(each.value, "local_secondary_indexes", null)
  
  ttl_enabled        = lookup(each.value, "ttl_enabled", false)
  ttl_attribute_name = lookup(each.value, "ttl_attribute_name", null)
  
  point_in_time_recovery_enabled = var.enable_point_in_time_recovery
  server_side_encryption_enabled = true
  
  tags = {
    TableType = each.value.table_type
  }
}

# S3 Buckets using reusable modules


module "logs_bucket" {
  source = "../../../modules/s3/app"
  
  project_name = local.project_name
  environment  = local.environment
  bucket_type  = "logs"
  bucket_purpose = "Store CloudWatch Logs via Kinesis Data Firehose"
  
  enable_versioning = false
  
  # Lifecycle configuration for log retention and cost optimization
  lifecycle_rules = [
    {
      id      = "logs_lifecycle"
      enabled = true
      filter  = {}  # Apply to all objects
      transitions = [
        {
          days          = var.logs_transition_to_glacier_days
          storage_class = "GLACIER"
        }
      ]
      expiration = {
        days = var.logs_expiration_days
      }
    }
  ]
  
  tags = {
    BucketType = "logs"
    Purpose    = "log-storage"
  }
}

# ========================================
# SSM Parameter Store - データ保存層での管理
# ========================================
# backendレイヤーでの参照に先立ち、datastore層で作成
module "ssm_parameters" {
  source = "../../../modules/ssm-parameter"
  
  project_name = local.project_name
  environment  = local.environment
}


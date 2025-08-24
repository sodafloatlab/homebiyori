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
      ttl_attribute_name = "expires_at"  # プラン別TTL（30日/180日）
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
        { name = "GSI1PK", type = "S" },  # FEEDBACK#{feedback_type}#{reason_category}
        { name = "GSI2PK", type = "S" },  # FEEDBACK#{feedback_type}#{satisfaction_score}
        { name = "created_at", type = "S" }   # GSI1SK、GSI2SKで共通使用
      ]
      global_secondary_indexes = {
        # カテゴリー別分析GSI
        GSI1 = {
          hash_key        = "GSI1PK"      # FEEDBACK#{feedback_type}#{reason_category}
          range_key       = "created_at"  # 時系列分析
          projection_type = "ALL"
        }
        # 満足度別分析GSI
        GSI2 = {
          hash_key        = "GSI2PK"      # FEEDBACK#{feedback_type}#{satisfaction_score}
          range_key       = "created_at"  # 時系列分析
          projection_type = "ALL"
        }
      }
    }
  }
  
  # Common tags
  common_tags = merge(var.common_tags, {
    Environment = local.environment
    Project     = local.project_name
    ManagedBy   = "terraform"
    Layer       = "datastore"
  })
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
  
  tags = merge(local.common_tags, {
    TableType = each.value.table_type
  })
}

# S3 Buckets using reusable modules
module "chat_content_bucket" {
  source = "../../../modules/s3"
  
  project_name = local.project_name
  environment  = local.environment
  bucket_type  = "chat-content"
  bucket_purpose = "Store chat messages and conversation content"
  
  enable_versioning = false
  
  # Lifecycle configuration for cost optimization
  lifecycle_rules = [
    {
      id      = "chat_content_lifecycle"
      enabled = true
      transitions = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER_IR"
        },
        {
          days          = 365
          storage_class = "DEEP_ARCHIVE"
        }
      ]
    }
  ]
  
  tags = merge(local.common_tags, {
    BucketType = "chat-content"
    Purpose    = "long-term-storage"
  })
}

module "images_bucket" {
  source = "../../../modules/s3"
  
  project_name = local.project_name
  environment  = local.environment
  bucket_type  = "images"
  bucket_purpose = "Store user uploaded images"
  
  enable_versioning = false
  
  # Lifecycle configuration for cost optimization
  lifecycle_rules = [
    {
      id      = "images_lifecycle"
      enabled = true
      transitions = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER_IR"
        }
      ]
    }
  ]
  
  tags = merge(local.common_tags, {
    BucketType = "images"
    Purpose    = "user-content"
  })
}

module "static_bucket" {
  source = "../../../modules/s3"
  
  project_name = local.project_name
  environment  = local.environment
  bucket_type  = "static"
  bucket_purpose = "Store static website assets"
  
  enable_versioning = true
  
  tags = merge(local.common_tags, {
    BucketType = "static"
    Purpose    = "website-hosting"
  })
}

module "logs_bucket" {
  source = "../../../modules/s3"
  
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
      transitions = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER_IR"
        },
        {
          days          = 365
          storage_class = "DEEP_ARCHIVE"
        }
      ]
      expiration = {
        days = 2555  # 7 years retention for logs
      }
    }
  ]
  
  tags = merge(local.common_tags, {
    BucketType = "logs"
    Purpose    = "log-storage"
  })
}

# SQS Queues for microservices communication
module "sqs" {
  source = "../../../modules/sqs"
  
  project_name                = local.project_name
  environment                 = local.environment
  common_tags                 = local.common_tags
  lambda_execution_role_arn   = "*"  # Will be updated after backend is deployed
}
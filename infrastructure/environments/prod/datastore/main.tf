# DynamoDB tables for Homebiyori application - using new reusable modules
locals {
  project_name = var.project_name
  environment  = var.environment
  
  # DynamoDB table configurations
  dynamodb_tables = {
    users = {
      table_type  = "users"
      hash_key    = "PK"
      range_key   = "SK"
      billing_mode = "PAY_PER_REQUEST"
      attributes = [
        { name = "PK", type = "S" },
        { name = "SK", type = "S" }
      ]
    }
    subscriptions = {
      table_type  = "subscriptions"
      hash_key    = "PK"
      range_key   = "SK"
      billing_mode = "PAY_PER_REQUEST"
      attributes = [
        { name = "PK", type = "S" },
        { name = "SK", type = "S" }
      ]
    }
    trees = {
      table_type  = "trees"
      hash_key    = "PK"
      range_key   = "SK"
      billing_mode = "PAY_PER_REQUEST"
      attributes = [
        { name = "PK", type = "S" },
        { name = "SK", type = "S" }
      ]
    }
    fruits = {
      table_type  = "fruits"
      hash_key    = "PK"
      range_key   = "SK"
      billing_mode = "PAY_PER_REQUEST"
      attributes = [
        { name = "PK", type = "S" },
        { name = "SK", type = "S" },
        { name = "GSI1PK", type = "S" },
        { name = "GSI1SK", type = "S" }
      ]
      global_secondary_indexes = {
        GSI1 = {
          hash_key = "GSI1PK"
          range_key = "GSI1SK"
          projection_type = "ALL"
        }
      }
    }
    chats = {
      table_type  = "chats"
      hash_key    = "PK"
      range_key   = "SK"
      billing_mode = "PAY_PER_REQUEST"
      ttl_enabled = true
      ttl_attribute_name = "TTL"
      attributes = [
        { name = "PK", type = "S" },
        { name = "SK", type = "S" },
        { name = "GSI1PK", type = "S" },
        { name = "GSI1SK", type = "S" }
      ]
      global_secondary_indexes = {
        GSI1 = {
          hash_key = "GSI1PK"
          range_key = "GSI1SK"
          projection_type = "ALL"
        }
      }
    }
    notifications = {
      table_type  = "notifications"
      hash_key    = "PK"
      range_key   = "SK"
      billing_mode = "PAY_PER_REQUEST"
      ttl_enabled = true
      ttl_attribute_name = "TTL"
      attributes = [
        { name = "PK", type = "S" },
        { name = "SK", type = "S" },
        { name = "GSI1PK", type = "S" },
        { name = "GSI1SK", type = "S" }
      ]
      global_secondary_indexes = {
        GSI1 = {
          hash_key = "GSI1PK"
          range_key = "GSI1SK"
          projection_type = "ALL"
        }
      }
    }
    feedback = {
      table_type  = "feedback"
      hash_key    = "PK"
      range_key   = "SK"
      billing_mode = "PAY_PER_REQUEST"
      attributes = [
        { name = "PK", type = "S" },
        { name = "SK", type = "S" }
      ]
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
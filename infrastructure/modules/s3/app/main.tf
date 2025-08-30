# Reusable S3 Bucket Module
# Based on terraform-aws-modules/s3-bucket best practices

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
  # Bucket naming - use override if provided, otherwise use default naming
  bucket_name = var.bucket_name_override != null ? var.bucket_name_override : "${var.environment}-${var.project_name}-${var.bucket_type}"
  
  # Module-specific tags (merged with provider default_tags)
  tags = merge({
    Name        = local.bucket_name
    BucketType  = var.bucket_type
    Purpose     = var.bucket_purpose
    Module      = "s3-app"
  }, var.tags)
  
  # Lifecycle configuration
  has_lifecycle_config = length(var.lifecycle_rules) > 0
  
  # CORS configuration
  has_cors_config = length(var.cors_rules) > 0
}

# S3 Bucket
resource "aws_s3_bucket" "this" {
  bucket        = local.bucket_name
  force_destroy = var.force_destroy

  tags = local.tags
}

# Bucket versioning
resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  
  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Disabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_id != null ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_id
    }
    bucket_key_enabled = var.kms_key_id != null ? var.bucket_key_enabled : false
  }
}

# Public access block
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = var.block_public_acls
  block_public_policy     = var.block_public_policy
  ignore_public_acls      = var.ignore_public_acls
  restrict_public_buckets = var.restrict_public_buckets
}

# Bucket lifecycle configuration
resource "aws_s3_bucket_lifecycle_configuration" "this" {
  count  = local.has_lifecycle_config ? 1 : 0
  bucket = aws_s3_bucket.this.id

  dynamic "rule" {
    for_each = var.lifecycle_rules
    
    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      # Filter configuration - always include at least empty filter
      filter {
        prefix = lookup(rule.value, "filter", null) != null ? lookup(rule.value.filter, "prefix", null) : null
        
        dynamic "tag" {
          for_each = lookup(rule.value, "filter", null) != null ? coalesce(lookup(rule.value.filter, "tags", null), {}) : {}
          
          content {
            key   = tag.key
            value = tag.value
          }
        }
      }

      # Transition rules
      dynamic "transition" {
        for_each = lookup(rule.value, "transitions", [])
        
        content {
          days          = lookup(transition.value, "days", null)
          date          = lookup(transition.value, "date", null)
          storage_class = transition.value.storage_class
        }
      }

      # Expiration rule
      dynamic "expiration" {
        for_each = rule.value.expiration != null ? [rule.value.expiration] : []
        
        content {
          days                         = lookup(expiration.value, "days", null)
          date                         = lookup(expiration.value, "date", null)
          expired_object_delete_marker = lookup(expiration.value, "expired_object_delete_marker", false)
        }
      }

      # Noncurrent version expiration
      dynamic "noncurrent_version_expiration" {
        for_each = rule.value.noncurrent_version_expiration != null ? [rule.value.noncurrent_version_expiration] : []
        
        content {
          noncurrent_days           = lookup(noncurrent_version_expiration.value, "days", null)
          newer_noncurrent_versions = lookup(noncurrent_version_expiration.value, "newer_noncurrent_versions", null)
        }
      }

      # Abort incomplete multipart uploads
      dynamic "abort_incomplete_multipart_upload" {
        for_each = rule.value.abort_incomplete_multipart_upload_days != null ? [1] : []
        
        content {
          days_after_initiation = rule.value.abort_incomplete_multipart_upload_days
        }
      }
    }
  }
}

# CORS configuration
resource "aws_s3_bucket_cors_configuration" "this" {
  count  = local.has_cors_config ? 1 : 0
  bucket = aws_s3_bucket.this.id

  dynamic "cors_rule" {
    for_each = var.cors_rules
    
    content {
      id              = lookup(cors_rule.value, "id", null)
      allowed_headers = lookup(cors_rule.value, "allowed_headers", null)
      allowed_methods = cors_rule.value.allowed_methods
      allowed_origins = cors_rule.value.allowed_origins
      expose_headers  = lookup(cors_rule.value, "expose_headers", null)
      max_age_seconds = lookup(cors_rule.value, "max_age_seconds", null)
    }
  }
}

# Bucket policy
resource "aws_s3_bucket_policy" "this" {
  count  = var.bucket_policy != null ? 1 : 0
  bucket = aws_s3_bucket.this.id
  policy = var.bucket_policy
}

# Bucket notification
resource "aws_s3_bucket_notification" "this" {
  count  = var.notification_configuration != null ? 1 : 0
  bucket = aws_s3_bucket.this.id

  # Lambda notifications
  dynamic "lambda_function" {
    for_each = lookup(var.notification_configuration, "lambda_functions", [])
    
    content {
      lambda_function_arn = lambda_function.value.lambda_function_arn
      events              = lambda_function.value.events
      filter_prefix       = lookup(lambda_function.value, "filter_prefix", null)
      filter_suffix       = lookup(lambda_function.value, "filter_suffix", null)
    }
  }

  # SNS notifications
  dynamic "topic" {
    for_each = lookup(var.notification_configuration, "topics", [])
    
    content {
      topic_arn     = topic.value.topic_arn
      events        = topic.value.events
      filter_prefix = lookup(topic.value, "filter_prefix", null)
      filter_suffix = lookup(topic.value, "filter_suffix", null)
    }
  }

  # SQS notifications
  dynamic "queue" {
    for_each = lookup(var.notification_configuration, "queues", [])
    
    content {
      queue_arn     = queue.value.queue_arn
      events        = queue.value.events
      filter_prefix = lookup(queue.value, "filter_prefix", null)
      filter_suffix = lookup(queue.value, "filter_suffix", null)
    }
  }
}

# Bucket logging
resource "aws_s3_bucket_logging" "this" {
  count  = var.access_logging_config != null ? 1 : 0
  bucket = aws_s3_bucket.this.id

  target_bucket = var.access_logging_config.target_bucket
  target_prefix = lookup(var.access_logging_config, "target_prefix", null)

  dynamic "target_grant" {
    for_each = lookup(var.access_logging_config, "target_grants", [])
    
    content {
      grantee {
        id            = lookup(target_grant.value.grantee, "id", null)
        type          = target_grant.value.grantee.type
        uri           = lookup(target_grant.value.grantee, "uri", null)
        email_address = lookup(target_grant.value.grantee, "email_address", null)
        display_name  = lookup(target_grant.value.grantee, "display_name", null)
      }
      permission = target_grant.value.permission
    }
  }
}


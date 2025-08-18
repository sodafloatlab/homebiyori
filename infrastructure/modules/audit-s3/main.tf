# 監査ログ専用S3バケット設定
# CloudTrail、VPC Flow Logs、Access Logs等の長期保存用

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# 監査ログ用S3バケット
resource "aws_s3_bucket" "audit_logs" {
  bucket        = var.bucket_name
  force_destroy = var.force_destroy

  tags = merge(var.common_tags, {
    Name    = var.bucket_name
    Purpose = "Security Audit Logs"
    Type    = "Audit Storage"
  })
}

# バケットバージョニング有効化（監査ログ保護）
resource "aws_s3_bucket_versioning" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

# サーバーサイド暗号化（KMS）
resource "aws_s3_bucket_server_side_encryption_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_id != null ? var.kms_key_id : aws_kms_key.audit_logs[0].arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# 監査ログ専用KMSキー（カスタムキー未指定時）
resource "aws_kms_key" "audit_logs" {
  count                   = var.kms_key_id == null ? 1 : 0
  description             = "KMS key for ${var.bucket_name} audit logs encryption"
  deletion_window_in_days = var.kms_deletion_window_days
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudTrail to encrypt logs"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey*",
          "kms:ReEncrypt*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.bucket_name}-kms-key"
  })
}

# KMSキーエイリアス
resource "aws_kms_alias" "audit_logs" {
  count         = var.kms_key_id == null ? 1 : 0
  name          = "alias/${var.bucket_name}-audit-key"
  target_key_id = aws_kms_key.audit_logs[0].key_id
}

# パブリックアクセスブロック（完全無効化）
resource "aws_s3_bucket_public_access_block" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}


# ライフサイクル管理（長期保存・コスト最適化）
resource "aws_s3_bucket_lifecycle_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  # CloudTrailログのライフサイクル
  rule {
    id     = "cloudtrail-logs-lifecycle"
    status = "Enabled"

    filter {
      prefix = "cloudtrail-logs/"
    }

    transition {
      days          = var.transition_to_ia_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.transition_to_glacier_days
      storage_class = "GLACIER"
    }

    transition {
      days          = var.transition_to_deep_archive_days
      storage_class = "DEEP_ARCHIVE"
    }

    # 古いバージョンの削除（監査要件に応じて調整）
    noncurrent_version_transition {
      noncurrent_days = var.transition_to_ia_days
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = var.transition_to_glacier_days
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }

  # アクセスログのライフサイクル
  rule {
    id     = "access-logs-lifecycle"
    status = "Enabled"

    filter {
      prefix = "access-logs/"
    }

    transition {
      days          = var.access_logs_transition_days
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = var.access_logs_expiration_days
    }
  }

  # 未完了マルチパートアップロードの削除
  rule {
    id     = "cleanup-incomplete-uploads"
    status = "Enabled"
    
    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# バケット所有権設定
resource "aws_s3_bucket_ownership_controls" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

# CloudTrail書き込み権限用バケットポリシー
resource "aws_s3_bucket_policy" "cloudtrail_logging_policy" {
  bucket = aws_s3_bucket.audit_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.audit_logs.arn
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "arn:aws:cloudtrail:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:trail/*"
          }
        }
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.audit_logs.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
            "AWS:SourceArn" = "arn:aws:cloudtrail:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:trail/*"
          }
        }
      }
    ]
  })
}

# アクセスログ設定（バケット自体のアクセス記録）
resource "aws_s3_bucket_logging" "audit_logs" {
  count  = var.enable_access_logging ? 1 : 0
  bucket = aws_s3_bucket.audit_logs.id

  target_bucket = var.access_log_bucket_name
  target_prefix = "audit-bucket-access-logs/"
}

# MFA削除保護（重要な監査ログ保護）
# 注意: Terraformではaws_s3_bucket_mfa_deleteリソースは存在しないため、
# MFA削除保護はAWS CLIまたはコンソールから手動で有効化する必要があります

# CloudWatch メトリクス・アラーム
resource "aws_cloudwatch_metric_alarm" "bucket_size" {
  count               = var.enable_cloudwatch_monitoring ? 1 : 0
  alarm_name          = "${var.bucket_name}-size-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "BucketSizeBytes"
  namespace           = "AWS/S3"
  period              = "86400" # 1日
  statistic           = "Average"
  threshold           = var.bucket_size_alarm_threshold
  alarm_description   = "This metric monitors S3 bucket size"

  dimensions = {
    BucketName  = aws_s3_bucket.audit_logs.bucket
    StorageType = "StandardStorage"
  }

  alarm_actions = var.alarm_sns_topic_arns

  tags = var.common_tags
}

# 現在のAWSアカウント情報
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
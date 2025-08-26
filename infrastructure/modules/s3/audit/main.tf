# 監査ログ専用S3バケット設定
# CloudTrail等の監査ログ用シンプル構成

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# 監査ログ用S3バケット
resource "aws_s3_bucket" "this" {
  bucket        = var.bucket_name
  force_destroy = var.force_destroy

  tags = {
    Name = var.bucket_name
  }
}

# バケットバージョニング有効化（監査ログ保護）
resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration {
    status = "Enabled"
  }
}

# サーバーサイド暗号化（S3キー）
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# パブリックアクセスブロック（完全無効化）
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ライフサイクル管理（90日後Glacier、7年後削除のみ）
resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    id     = "audit-logs-lifecycle"
    status = "Enabled"
    
    filter {}

    transition {
      days          = var.transition_to_glacier_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.noncurrent_version_expiration_days
    }

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }

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
resource "aws_s3_bucket_ownership_controls" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

# CloudTrail書き込み権限用バケットポリシー
resource "aws_s3_bucket_policy" "this" {
  bucket = aws_s3_bucket.this.id
  policy = var.bucket_policy
}

# 現在のAWSアカウント情報
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
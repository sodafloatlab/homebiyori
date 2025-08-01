# 画像保存用S3バケット
resource "aws_s3_bucket" "images" {
  bucket        = "${var.project_name}-${var.environment}-images"
  force_destroy = var.force_destroy

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-images"
    Type = "images"
  })
}

# 画像バケットのバージョニング
resource "aws_s3_bucket_versioning" "images" {
  bucket = aws_s3_bucket.images.id
  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Disabled"
  }
}

# 画像バケットの暗号化
resource "aws_s3_bucket_server_side_encryption_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 画像バケットのパブリックアクセス制御
resource "aws_s3_bucket_public_access_block" "images" {
  bucket = aws_s3_bucket.images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 画像バケットのライフサイクル設定
resource "aws_s3_bucket_lifecycle_configuration" "images" {
  count  = var.enable_lifecycle ? 1 : 0
  bucket = aws_s3_bucket.images.id

  rule {
    id     = "images_lifecycle"
    status = "Enabled"

    # インテリジェントティアリング移行
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }

    # 古いバージョンの削除
    noncurrent_version_expiration {
      noncurrent_days = var.lifecycle_noncurrent_version_expiration_days
    }
  }
}

# 静的サイト用S3バケット
resource "aws_s3_bucket" "static" {
  bucket        = "${var.project_name}-${var.environment}-static"
  force_destroy = var.force_destroy

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-static"
    Type = "static"
  })
}

# 静的サイトバケットのバージョニング
resource "aws_s3_bucket_versioning" "static" {
  bucket = aws_s3_bucket.static.id
  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Disabled"
  }
}

# 静的サイトバケットの暗号化
resource "aws_s3_bucket_server_side_encryption_configuration" "static" {
  bucket = aws_s3_bucket.static.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 静的サイトバケットのパブリックアクセス制御
resource "aws_s3_bucket_public_access_block" "static" {
  bucket = aws_s3_bucket.static.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# チャットコンテンツ用S3バケット（チャット内容をS3に保存）
resource "aws_s3_bucket" "chat_content" {
  count         = var.create_chat_content_bucket ? 1 : 0
  bucket        = "${var.project_name}-${var.environment}-${var.chat_content_bucket_prefix}"
  force_destroy = var.force_destroy

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-${var.chat_content_bucket_prefix}"
    Type = "chat-content"
    Purpose = "Store chat messages and conversation content"
  })
}

# チャットコンテンツバケットの暗号化
resource "aws_s3_bucket_server_side_encryption_configuration" "chat_content" {
  count  = var.create_chat_content_bucket ? 1 : 0
  bucket = aws_s3_bucket.chat_content[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# チャットコンテンツバケットのパブリックアクセス制御
resource "aws_s3_bucket_public_access_block" "chat_content" {
  count  = var.create_chat_content_bucket ? 1 : 0
  bucket = aws_s3_bucket.chat_content[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# チャットコンテンツバケットのライフサイクル設定
resource "aws_s3_bucket_lifecycle_configuration" "chat_content" {
  count  = var.create_chat_content_bucket && var.enable_lifecycle ? 1 : 0
  bucket = aws_s3_bucket.chat_content[0].id

  rule {
    id     = "chat_content_lifecycle"
    status = "Enabled"

    # インテリジェントティアリング移行（チャット履歴の長期保存）
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
  }
}

# CloudFront OAC用のバケットポリシー（静的サイト）
resource "aws_s3_bucket_policy" "static" {
  count  = var.cloudfront_distribution_arn != "" ? 1 : 0
  bucket = aws_s3_bucket.static.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = var.cloudfront_distribution_arn
          }
        }
      }
    ]
  })
}

# CloudFront OAC用のバケットポリシー（画像）
resource "aws_s3_bucket_policy" "images" {
  count  = var.cloudfront_distribution_arn != "" ? 1 : 0
  bucket = aws_s3_bucket.images.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.images.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = var.cloudfront_distribution_arn
          }
        }
      },
      {
        Sid       = "AllowApplicationAccess"
        Effect    = "Allow"
        Principal = {
          AWS = var.lambda_role_arn
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.images.arn}/*"
      }
    ]
  })
}

# Lambda用のチャットコンテンツバケットポリシー
resource "aws_s3_bucket_policy" "chat_content" {
  count  = var.create_chat_content_bucket && var.lambda_role_arn != "" ? 1 : 0
  bucket = aws_s3_bucket.chat_content[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCoreServiceAccess"
        Effect    = "Allow"
        Principal = {
          AWS = var.lambda_role_arn
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.chat_content[0].arn,
          "${aws_s3_bucket.chat_content[0].arn}/*"
        ]
      }
    ]
  })
}
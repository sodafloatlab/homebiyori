# CloudFront and related log delivery resources must be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# 🚧 開発用キャッシュ設定変更メモ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 開発中はS3向けキャッシュを無効化しています
# 
# 本番復帰手順:
# 1. line 71: cache_policy_id を Managed-CachingOptimized に戻す
# 2. line 80-81: default_ttl, max_ttl を本番値（3600, 86400）に戻す  
# 3. terraform apply で変更を適用
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "${var.environment}-${var.project_name}-oac"
  description                       = "Origin Access Control for ${var.project_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Function for URI rewriting (index.html auto-append)
resource "aws_cloudfront_function" "uri_rewrite" {
  provider = aws.us_east_1
  name    = "${var.environment}-${var.project_name}-uri-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Add index.html for subdirectory requests (except /api/*)"
  publish = true
  code    = file("${path.module}/src/uri-rewrite.js")
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  comment = "${var.project_name} ${var.environment} distribution"
  # default_root_object removed - handled by CloudFront Function
  enabled             = true
  is_ipv6_enabled     = false
  price_class         = var.price_class

  # Origin for static assets (S3)
  origin {
    domain_name              = var.static_bucket_domain_name
    origin_id                = "S3-${var.static_bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id

    s3_origin_config {
      origin_access_identity = ""
    }
  }



  # Default cache behavior for static assets
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.static_bucket_name}"

    # 🚧 開発用: キャッシュ無効化設定
    # 開発中は都度キャッシュクリアが手間なため、キャッシュを無効化
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # AWS管理ポリシー: Managed-CachingDisabled
    
    # 🔄 本番用: キャッシュ最適化設定（開発完了後に戻す）
    # cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6" # AWS管理ポリシー: Managed-CachingOptimized

    viewer_protocol_policy = "redirect-to-https"
    
    # 🚧 開発用: キャッシュTTL無効化
    min_ttl                = 0
    default_ttl            = 0      # No caching for development
    max_ttl                = 0      # No caching for development
    
    # 🔄 本番用: キャッシュTTL設定（開発完了後に戻す）
    # min_ttl                = 0
    # default_ttl            = 3600   # 1 hour
    # max_ttl                = 86400  # 24 hours

    compress = true

    # CloudFront Function for URI rewriting
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.uri_rewrite.arn
    }
  }



  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL certificate
  viewer_certificate {
    cloudfront_default_certificate = var.custom_domain == "" ? true : false
    acm_certificate_arn            = var.ssl_certificate_arn
    ssl_support_method             = var.custom_domain == "" ? null : "sni-only"
    minimum_protocol_version       = var.custom_domain == "" ? null : "TLSv1.2_2021"
  }

  # Custom domain (if provided)
  aliases = var.custom_domain == "" ? [] : [var.custom_domain]

  # Custom error responses - dedicated static error pages (no backend API calls)
  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/error/404.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 403
    response_page_path = "/error/403.html"
  }

  custom_error_response {
    error_code         = 500
    response_code      = 500
    response_page_path = "/error/500.html"
  }

  custom_error_response {
    error_code         = 503
    response_code      = 503
    response_page_path = "/error/503.html"
  }


  # WAF association
  web_acl_id = var.waf_web_acl_id

  tags = {
    Name = "${var.environment}-${var.project_name}-cloudfront"
  }
}

# CloudWatch Log Delivery Source for CloudFront Access Logs
resource "aws_cloudwatch_log_delivery_source" "cloudfront_access_logs" {
  provider = aws.us_east_1
  for_each = var.enable_logging ? { enabled = true } : {}
  
  name         = "${var.environment}-${var.project_name}-cloudfront-access-logs"
  resource_arn = aws_cloudfront_distribution.main.arn
  log_type     = "ACCESS_LOGS"
  tags = {
    Name = "${var.environment}-${var.project_name}-cloudfront-log-source"
  }
}

# CloudWatch Log Delivery Destination (S3)
resource "aws_cloudwatch_log_delivery_destination" "s3_destination" {
  provider = aws.us_east_1
  for_each = var.enable_logging ? { enabled = true } : {}
  
  name                     = "${var.environment}-${var.project_name}-cloudfront-s3-destination"
  output_format           = "json"
  
  delivery_destination_configuration {
    destination_resource_arn = "arn:aws:s3:::${var.logging_bucket_name}/${var.logging_prefix}"
  }
  
  tags = {
    Name = "${var.environment}-${var.project_name}-cloudfront-s3-destination"
  }
}

# CloudWatch Log Delivery
resource "aws_cloudwatch_log_delivery" "cloudfront_to_s3" {
  provider = aws.us_east_1
  for_each = var.enable_logging ? { enabled = true } : {}
  
  delivery_source_name      = aws_cloudwatch_log_delivery_source.cloudfront_access_logs["enabled"].name
  delivery_destination_arn  = aws_cloudwatch_log_delivery_destination.s3_destination["enabled"].arn
  
  s3_delivery_configuration {
    suffix_path = "/{DistributionId}/{yyyy}/{MM}/{dd}/{HH}"
  }

  tags = {
    Name = "${var.environment}-${var.project_name}-cloudfront-log-delivery"
  }
}

# S3 Bucket Policy for CloudFront OAC
resource "aws_s3_bucket_policy" "static_bucket_policy" {
  bucket = var.static_bucket_name
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
        Resource = "arn:aws:s3:::${var.static_bucket_name}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}
# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "${var.project_name}-${var.environment}-oac"
  description                       = "Origin Access Control for ${var.project_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  comment             = "${var.project_name} ${var.environment} distribution"
  default_root_object = "index.html"
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = var.price_class

  # Origin for static assets (S3)
  origin {
    domain_name              = var.static_bucket_domain_name
    origin_id                = "S3-${var.static_bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }


  # Origin for API Gateway
  origin {
    domain_name = replace(var.api_gateway_url, "/^https:\\/\\//", "")
    origin_id   = "API-Gateway"
    origin_path = "/${var.api_gateway_stage_name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default cache behavior for static assets
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.static_bucket_name}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600   # 1 hour
    max_ttl                = 86400  # 24 hours

    compress = true
  }


  # Cache behavior for API requests
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "API-Gateway"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"]
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0      # No caching for API
    max_ttl                = 0      # No caching for API

    compress = false
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

  # Custom error responses
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  # WAF association
  web_acl_id = var.waf_web_acl_id

  tags = {
    Name = "${var.project_name}-${var.environment}-cloudfront"
  }
}

# CloudFront Origin Request Policy for API Gateway
resource "aws_cloudfront_origin_request_policy" "api_gateway" {
  name    = "${var.project_name}-${var.environment}-api-gateway-policy"
  comment = "Origin request policy for API Gateway"

  cookies_config {
    cookie_behavior = "none"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Authorization", "Content-Type", "Accept"]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

# CloudFront Cache Policy for static assets
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${var.project_name}-${var.environment}-static-assets"
  comment     = "Cache policy for static assets"
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 1

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
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
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# WAF for CloudFront must be created in us-east-1 region
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# WAF Web ACL for CloudFront
resource "aws_wafv2_web_acl" "main" {
  provider = aws.us_east_1
  
  name        = "${var.environment}-${var.project_name}-web-acl"
  description = "WAF Web ACL for ${var.project_name}"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}KnownBadInputsMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}RateLimitMetric"
      sampled_requests_enabled   = true
    }
  }

  # Geographic restriction rule (if enabled)
  dynamic "rule" {
    for_each = var.enable_geo_blocking ? [1] : []
    content {
      name     = "GeoBlockRule"
      priority = 4

      action {
        block {}
      }

      statement {
        geo_match_statement {
          country_codes = var.blocked_countries
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${var.project_name}GeoBlockMetric"
        sampled_requests_enabled   = true
      }
    }
  }

  # IP blacklist rule (if enabled)
  dynamic "rule" {
    for_each = length(var.blocked_ips) > 0 ? [1] : []
    content {
      name     = "IPBlacklistRule"
      priority = 5

      action {
        block {}
      }

      statement {
        ip_set_reference_statement {
          arn = aws_wafv2_ip_set.blocked_ips[0].arn
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${var.project_name}IPBlacklistMetric"
        sampled_requests_enabled   = true
      }
    }
  }

  # Maintenance mode rule (if enabled)
  dynamic "rule" {
    for_each = var.maintenance_mode ? [1] : []
    content {
      name     = "MaintenanceModeRule"
      priority = 10

      action {
        block {
          custom_response {
            response_code = 503
            custom_response_body_key = "maintenance"
          }
        }
      }

      statement {
        not_statement {
          statement {
            ip_set_reference_statement {
              arn = aws_wafv2_ip_set.maintenance_allowed_ips[0].arn
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${var.project_name}MaintenanceModeMetric"
        sampled_requests_enabled   = true
      }
    }
  }

  tags = {
    Name = "${var.environment}-${var.project_name}-web-acl"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}WebACL"
    sampled_requests_enabled   = true
  }
}

# IP Set for blocked IPs (IP blacklist)
resource "aws_wafv2_ip_set" "blocked_ips" {
  count              = length(var.blocked_ips) > 0 ? 1 : 0
  name               = "${var.environment}-${var.project_name}-blocked-ips"
  description        = "Blocked IP addresses"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = var.blocked_ips

}

# IP Set for maintenance mode allowed IPs
resource "aws_wafv2_ip_set" "maintenance_allowed_ips" {
  count              = var.maintenance_mode ? 1 : 0
  name               = "${var.environment}-${var.project_name}-maintenance-allowed-ips"
  description        = "IP addresses allowed during maintenance"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = var.maintenance_allowed_ips

}

# WAF Web ACL Association with CloudFront
# NOTE: このAssociationはメンテナンスモード時のみ実行される設定ですが、
# 通常時のWAF適用はCloudFrontモジュール側でwaf_web_acl_idを指定することで行われます。
# CloudFrontディストリビューション作成時にwaf_web_acl_idが設定されることで、
# 常時WAFが適用される状態となります。
resource "aws_wafv2_web_acl_association" "maintenance_response" {
  count        = var.maintenance_mode ? 1 : 0
  resource_arn = var.cloudfront_distribution_arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# WAF Logging Configuration - S3 output
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  provider = aws.us_east_1
  
  resource_arn            = aws_wafv2_web_acl.main.arn
  log_destination_configs = [var.waf_logs_bucket_arn]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }
}
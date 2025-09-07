terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# WAF Web ACL for API Gateway (Regional scope)
resource "aws_wafv2_web_acl" "api_gateway" {
  name        = "${var.environment}-${var.project_name}-api-web-acl"
  description = "WAF Web ACL for ${var.project_name} API Gateway"
  scope       = "REGIONAL"

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
      metric_name                = "${var.project_name}APICommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs Rule Set
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
      metric_name                = "${var.project_name}APIKnownBadInputsMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rate Limiting Rule
  dynamic "rule" {
    for_each = var.api_rate_limit > 0 ? [1] : []
    content {
      name     = "APIRateLimitRule"
      priority = 10

      action {
        block {}
      }

      statement {
        rate_based_statement {
          limit              = var.api_rate_limit
          aggregate_key_type = "IP"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${var.project_name}APIRateLimitMetric"
        sampled_requests_enabled   = true
      }
    }
  }

  # Geographic Blocking Rule
  dynamic "rule" {
    for_each = var.enable_geo_blocking && length(var.blocked_countries) > 0 ? [1] : []
    content {
      name     = "APIGeoBlockRule"
      priority = 20

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
        metric_name                = "${var.project_name}APIGeoBlockMetric"
        sampled_requests_enabled   = true
      }
    }
  }

  # IP Blocking Rule
  dynamic "rule" {
    for_each = length(var.blocked_ips) > 0 ? [1] : []
    content {
      name     = "APIIPBlockRule"
      priority = 30

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
        metric_name                = "${var.project_name}APIIPBlockMetric"
        sampled_requests_enabled   = true
      }
    }
  }

  # Maintenance Mode Rule (Allow only specific IPs during maintenance)
  dynamic "rule" {
    for_each = var.maintenance_mode && length(var.maintenance_allowed_ips) > 0 ? [1] : []
    content {
      name     = "APIMaintenanceModeRule"
      priority = 5

      action {
        block {}
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
        metric_name                = "${var.project_name}APIMaintenanceMetric"
        sampled_requests_enabled   = true
      }
    }
  }

  tags = {
    Name        = "${var.environment}-${var.project_name}-api-web-acl"
    Environment = var.environment
    Project     = var.project_name
    Type        = "api-gateway-waf"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}APIWebACL"
    sampled_requests_enabled   = true
  }
}

# IP Set for blocked IPs
resource "aws_wafv2_ip_set" "blocked_ips" {
  count = length(var.blocked_ips) > 0 ? 1 : 0
  
  name               = "${var.environment}-${var.project_name}-api-blocked-ips"
  description        = "IP addresses blocked from accessing API Gateway"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = var.blocked_ips

  tags = {
    Name        = "${var.environment}-${var.project_name}-api-blocked-ips"
    Environment = var.environment
    Project     = var.project_name
    Type        = "api-gateway-waf-ipset"
  }
}

# IP Set for maintenance allowed IPs
resource "aws_wafv2_ip_set" "maintenance_allowed_ips" {
  count = var.maintenance_mode && length(var.maintenance_allowed_ips) > 0 ? 1 : 0
  
  name               = "${var.environment}-${var.project_name}-api-maintenance-allowed-ips"
  description        = "IP addresses allowed during API maintenance mode"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = var.maintenance_allowed_ips

  tags = {
    Name        = "${var.environment}-${var.project_name}-api-maintenance-allowed-ips"
    Environment = var.environment
    Project     = var.project_name
    Type        = "api-gateway-waf-maintenance-ipset"
  }
}

# WAF Logging Configuration to S3
resource "aws_wafv2_web_acl_logging_configuration" "api_gateway" {
  count                   = var.enable_logging ? 1 : 0
  resource_arn            = aws_wafv2_web_acl.api_gateway.arn
  log_destination_configs = ["arn:aws:s3:::${var.waf_logs_bucket_name}/${var.waf_logs_prefix}"]

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
# WAF Web ACL for CloudFront
resource "aws_wafv2_web_acl" "main" {
  name  = "${var.project_name}-${var.environment}-web-acl"
  description = "WAF Web ACL for ${var.project_name}"
  scope = "CLOUDFRONT"

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

  # IP whitelist rule (if enabled)
  dynamic "rule" {
    for_each = length(var.allowed_ips) > 0 ? [1] : []
    content {
      name     = "IPWhitelistRule"
      priority = 5

      action {
        allow {}
      }

      statement {
        ip_set_reference_statement {
          arn = aws_wafv2_ip_set.allowed_ips[0].arn
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${var.project_name}IPWhitelistMetric"
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

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-web-acl"
  })

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}WebACL"
    sampled_requests_enabled   = true
  }
}

# IP Set for allowed IPs (if IP whitelist is enabled)
resource "aws_wafv2_ip_set" "allowed_ips" {
  count              = length(var.allowed_ips) > 0 ? 1 : 0
  name               = "${var.project_name}-${var.environment}-allowed-ips"
  description        = "Allowed IP addresses"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = var.allowed_ips

  tags = var.common_tags
}

# IP Set for maintenance mode allowed IPs
resource "aws_wafv2_ip_set" "maintenance_allowed_ips" {
  count              = var.maintenance_mode ? 1 : 0
  name               = "${var.project_name}-${var.environment}-maintenance-allowed-ips"
  description        = "IP addresses allowed during maintenance"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = var.maintenance_allowed_ips

  tags = var.common_tags
}

# Custom response body for maintenance mode
resource "aws_wafv2_web_acl_association" "maintenance_response" {
  count      = var.maintenance_mode ? 1 : 0
  resource_arn = var.cloudfront_distribution_arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# CloudWatch Log Group for WAF logs
resource "aws_cloudwatch_log_group" "waf" {
  name              = "/aws/wafv2/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = var.common_tags
}

# WAF Logging Configuration
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  resource_arn            = aws_wafv2_web_acl.main.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]

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
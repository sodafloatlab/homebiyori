# CloudTrail監査ログ設定
# 全AWSアカウントAPIアクセスの記録・分析用

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# CloudTrail本体
resource "aws_cloudtrail" "this" {
  name           = var.cloudtrail_name
  s3_bucket_name = var.s3_bucket_name
  s3_key_prefix  = var.s3_key_prefix

  # 全リージョンでの記録
  is_multi_region_trail = true
  
  # 管理イベント記録
  include_global_service_events = true
  
  # ログファイル検証
  enable_log_file_validation = true

  # データイベント設定（DynamoDB, Lambda, S3アクセス）
  event_selector {
    read_write_type           = "All"
    include_management_events = true

    # DynamoDBテーブル監査
    data_resource {
      type   = "AWS::DynamoDB::Table"
      values = var.dynamodb_tables_to_audit
    }

    # Lambda関数監査
    data_resource {
      type   = "AWS::Lambda::Function"
      values = var.lambda_functions_to_audit
    }

    # S3バケット監査
    data_resource {
      type   = "AWS::S3::Object"
      values = var.s3_objects_to_audit
    }
  }

  # Insightイベント（異常なアクティビティ検出）
  dynamic "insight_selector" {
    for_each = var.enable_insights ? [1] : []
    content {
      insight_type = "ApiCallRateInsight"
    }
  }

  tags = {
    Name = var.cloudtrail_name
  }
}

# CloudWatch Logs統合（オプション）
resource "aws_cloudwatch_log_group" "this" {
  count             = var.enable_cloudwatch_logs ? 1 : 0
  name              = "/aws/cloudtrail/${var.cloudtrail_name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.cloudtrail_name}-logs"
  }
}

# CloudWatch Logs用IAMロール
resource "aws_iam_role" "this" {
  count = var.enable_cloudwatch_logs ? 1 : 0
  name  = "${var.cloudtrail_name}-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
      }
    ]
  })
}

# CloudWatch Logs書き込み権限
resource "aws_iam_role_policy" "this" {
  count = var.enable_cloudwatch_logs ? 1 : 0
  name  = "${var.cloudtrail_name}-logs-policy"
  role  = aws_iam_role.this[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}


# CloudTrailイベント分析用のEventBridge統合（オプション）
resource "aws_cloudtrail_event_data_store" "this" {
  count                         = var.enable_event_data_store ? 1 : 0
  name                         = "${var.cloudtrail_name}-data-store"
  multi_region_enabled         = true
  organization_enabled         = false
  advanced_event_selector {
    name = "Log all management and data events"
    
    field_selector {
      field  = "eventCategory"
      equals = ["Management", "Data"]
    }
  }

  tags = {
    Name = "${var.cloudtrail_name}-data-store"
  }
}

# データソース
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
# 本番環境監査ログ設定
# CloudTrail + S3による包括的な監査ログ基盤

# プロジェクト共通変数読み込み
locals {
  project_name = var.project_name
  environment  = var.environment
  
  # 監査ログ用の命名規則
  audit_bucket_name    = "${local.project_name}-${local.environment}-audit-logs"
  cloudtrail_name      = "${local.project_name}-${local.environment}-audit-trail"
  security_topic_name  = "${local.project_name}-${local.environment}-security-alerts"
  
  # 共通タグ
  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    Purpose     = "security-audit"
    Compliance  = "SOC2-ISO27001"
  }
}

# CloudTrailと監査ログS3のみに絞った構成

# 監査ログ専用S3バケット
module "audit_s3_bucket" {
  source = "../../../modules/audit-s3"

  # 基本設定
  bucket_name = local.audit_bucket_name
  environment = local.environment

  # セキュリティ設定
  enable_mfa_delete = var.enable_mfa_delete
  kms_key_id       = null  # 新規KMSキー作成

  # ライフサイクル設定（コンプライアンス要件）
  transition_to_ia_days               = var.transition_to_ia_days
  transition_to_glacier_days          = var.transition_to_glacier_days
  transition_to_deep_archive_days     = var.transition_to_deep_archive_days
  noncurrent_version_expiration_days  = var.noncurrent_version_expiration_days

  # 通知機能は無効化
  enable_notifications         = false
  security_alert_topic_arn     = null

  # 基本監視のみ有効
  enable_cloudwatch_monitoring = false
  bucket_size_alarm_threshold  = var.bucket_size_alarm_threshold
  alarm_sns_topic_arns        = []

  # アクセスログは無効化
  enable_access_logging    = false
  access_log_bucket_name   = null

  # タグ
  common_tags = local.common_tags
}

# CloudTrail監査設定
module "cloudtrail" {
  source = "../../../modules/cloudtrail"

  # 基本設定
  cloudtrail_name = local.cloudtrail_name
  s3_bucket_name  = module.audit_s3_bucket.bucket_name
  s3_key_prefix   = "cloudtrail-logs"
  environment     = local.environment

  # 監査対象設定（HomebiyoriプロジェクトリソースのみFocus）
  dynamodb_tables_to_audit = [
    "arn:aws:dynamodb:${var.aws_region}:*:table/${local.project_name}-${local.environment}-*"
  ]
  
  lambda_functions_to_audit = [
    "arn:aws:lambda:${var.aws_region}:*:function:${local.project_name}-*"
  ]

  s3_objects_to_audit = [
    "arn:aws:s3:::${local.project_name}-*/*"
  ]

  # 基本機能のみ有効化
  enable_cloudwatch_logs   = false
  enable_insights         = false
  enable_event_data_store = false
  log_retention_days      = 90

  # タグ
  common_tags = local.common_tags

  depends_on = [module.audit_s3_bucket]
}


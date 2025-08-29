# 本番環境監査ログ設定
# CloudTrail + S3によるシンプルな監査ログ基盤

locals {
  project_name = var.project_name
  environment  = var.environment
  
  # 監査ログ用の命名規則
  audit_bucket_name = "${local.environment}-${local.project_name}-audit-logs"
  cloudtrail_name   = "${local.environment}-${local.project_name}-audit-trail"
}

# 監査ログ専用S3バケット
module "audit_s3_bucket" {
  source = "../../../modules/s3/audit"

  # 基本設定
  bucket_name   = local.audit_bucket_name
  force_destroy = false

  # ライフサイクル設定（90日後Glacier、7年後削除）
  transition_to_glacier_days         = var.transition_to_glacier_days
  noncurrent_version_expiration_days = var.noncurrent_version_expiration_days
  
  # バケットポリシー（JSON外だし）
  bucket_policy = templatefile("${path.module}/policies/cloudtrail_bucket_policy.json", {
    bucket_arn      = "arn:aws:s3:::${local.audit_bucket_name}"
    trail_name      = "${local.cloudtrail_name}"
    s3_key_prefix   = "cloudtrail-logs"
    region          = data.aws_region.current.name
    account_id      = data.aws_caller_identity.current.account_id
  })
}

# CloudTrail監査設定
module "cloudtrail" {
  source = "../../../modules/cloudtrail"

  # 基本設定
  cloudtrail_name = local.cloudtrail_name
  s3_bucket_name  = module.audit_s3_bucket.bucket_name
  s3_key_prefix   = "cloudtrail-logs"
  environment     = local.environment

  # 基本機能のみ有効化
  enable_cloudwatch_logs   = false
  enable_insights         = false
  enable_event_data_store = false
  log_retention_days      = 90

  depends_on = [module.audit_s3_bucket]
}


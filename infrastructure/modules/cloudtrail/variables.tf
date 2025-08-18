# CloudTrailモジュール変数定義

variable "cloudtrail_name" {
  description = "CloudTrail名"
  type        = string
}

variable "s3_bucket_name" {
  description = "ログ保存用S3バケット名"
  type        = string
}

variable "s3_key_prefix" {
  description = "S3オブジェクトキープレフィックス"
  type        = string
  default     = "cloudtrail-logs"
}

variable "environment" {
  description = "環境名 (prod, dev, etc.)"
  type        = string
}

variable "common_tags" {
  description = "共通タグ"
  type        = map(string)
  default     = {}
}

# データイベント監査対象
variable "dynamodb_tables_to_audit" {
  description = "監査対象のDynamoDBテーブルARNリスト"
  type        = list(string)
  default     = ["arn:aws:dynamodb:*:*:table/*"]
}

variable "lambda_functions_to_audit" {
  description = "監査対象のLambda関数ARNリスト"
  type        = list(string)
  default     = ["arn:aws:lambda:*:*:function/*"]
}

variable "s3_objects_to_audit" {
  description = "監査対象のS3オブジェクトARNリスト"
  type        = list(string)
  default     = ["arn:aws:s3:::*/*"]
}

# 追加機能設定
variable "enable_insights" {
  description = "CloudTrail Insightsを有効にするか"
  type        = bool
  default     = false
}

variable "enable_cloudwatch_logs" {
  description = "CloudWatch Logs統合を有効にするか"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch Logsの保持期間（日数）"
  type        = number
  default     = 90
}

variable "enable_event_data_store" {
  description = "CloudTrail Event Data Storeを有効にするか（高度な分析用）"
  type        = bool
  default     = false
}
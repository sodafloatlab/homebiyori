# 監査ログ専用S3バケットモジュール変数定義

variable "bucket_name" {
  description = "監査ログ用S3バケット名"
  type        = string
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

variable "force_destroy" {
  description = "バケット内にオブジェクトがある状態での強制削除を許可するか"
  type        = bool
  default     = false
}

# KMS暗号化設定
variable "kms_key_id" {
  description = "KMSキーID（null の場合は新規作成）"
  type        = string
  default     = null
}

variable "kms_deletion_window_days" {
  description = "KMSキー削除待機期間（日数）"
  type        = number
  default     = 30
  
  validation {
    condition     = var.kms_deletion_window_days >= 7 && var.kms_deletion_window_days <= 30
    error_message = "KMS deletion window must be between 7 and 30 days."
  }
}

# ライフサイクル管理設定
variable "transition_to_ia_days" {
  description = "Standard-IA ストレージクラスへの移行日数"
  type        = number
  default     = 30
}

variable "transition_to_glacier_days" {
  description = "Glacier ストレージクラスへの移行日数"
  type        = number
  default     = 90
}

variable "transition_to_deep_archive_days" {
  description = "Deep Archive ストレージクラスへの移行日数"
  type        = number
  default     = 365
}

variable "noncurrent_version_expiration_days" {
  description = "古いバージョンの削除日数"
  type        = number
  default     = 2555  # 約7年（監査要件）
}

variable "access_logs_transition_days" {
  description = "アクセスログのIA移行日数"
  type        = number
  default     = 30
}

variable "access_logs_expiration_days" {
  description = "アクセスログの削除日数"
  type        = number
  default     = 90
}

# 通知設定
variable "enable_notifications" {
  description = "S3バケット通知を有効にするか"
  type        = bool
  default     = false
}

variable "security_alert_topic_arn" {
  description = "セキュリティアラート用SNSトピックARN"
  type        = string
  default     = null
}

# アクセスログ設定
variable "enable_access_logging" {
  description = "バケット自体のアクセスログを有効にするか"
  type        = bool
  default     = false
}

variable "access_log_bucket_name" {
  description = "アクセスログ保存用バケット名"
  type        = string
  default     = null
}

# MFA削除保護
variable "enable_mfa_delete" {
  description = "MFA削除保護を有効にするか（rootユーザーとMFA必須）"
  type        = bool
  default     = false
}

# CloudWatch監視
variable "enable_cloudwatch_monitoring" {
  description = "CloudWatch監視を有効にするか"
  type        = bool
  default     = true
}

variable "bucket_size_alarm_threshold" {
  description = "バケットサイズアラームのしきい値（バイト）"
  type        = number
  default     = 107374182400  # 100GB
}

variable "alarm_sns_topic_arns" {
  description = "アラーム通知用SNSトピックARNリスト"
  type        = list(string)
  default     = []
}
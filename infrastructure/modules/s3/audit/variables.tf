# 監査ログ専用S3バケットモジュール変数定義

variable "bucket_name" {
  description = "監査ログ用S3バケット名"
  type        = string
}

variable "force_destroy" {
  description = "バケット内にオブジェクトがある状態での強制削除を許可するか"
  type        = bool
  default     = false
}

# ライフサイクル管理設定
variable "transition_to_glacier_days" {
  description = "Glacier ストレージクラスへの移行日数"
  type        = number
  default     = 90
}

variable "noncurrent_version_expiration_days" {
  description = "古いバージョンの削除日数"
  type        = number
  default     = 2555  # 約7年（監査要件）
}

variable "bucket_policy" {
  description = "JSON形式のバケットポリシー"
  type        = string
}
# 監査ログ専用S3バケットモジュールアウトプット

output "bucket_name" {
  description = "作成されたS3バケット名"
  value       = aws_s3_bucket.this.bucket
}

output "bucket_arn" {
  description = "S3バケットのARN"
  value       = aws_s3_bucket.this.arn
}

output "bucket_id" {
  description = "S3バケットのID"
  value       = aws_s3_bucket.this.id
}

output "bucket_domain_name" {
  description = "S3バケットのドメイン名"
  value       = aws_s3_bucket.this.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "S3バケットのリージョナルドメイン名"
  value       = aws_s3_bucket.this.bucket_regional_domain_name
}

# セキュリティ情報
output "bucket_versioning_enabled" {
  description = "バケットバージョニングが有効かどうか"
  value       = true
}

output "encryption_enabled" {
  description = "暗号化が有効かどうか"
  value       = true
}

output "public_access_blocked" {
  description = "パブリックアクセスがブロックされているかどうか"
  value       = true
}
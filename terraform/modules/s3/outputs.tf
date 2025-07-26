output "images_bucket_name" {
  description = "Name of the images bucket"
  value       = aws_s3_bucket.images.bucket
}

output "images_bucket_arn" {
  description = "ARN of the images bucket"
  value       = aws_s3_bucket.images.arn
}

output "images_bucket_domain_name" {
  description = "Domain name of the images bucket"
  value       = aws_s3_bucket.images.bucket_domain_name
}

output "static_bucket_name" {
  description = "Name of the static bucket"
  value       = aws_s3_bucket.static.bucket
}

output "static_bucket_arn" {
  description = "ARN of the static bucket"
  value       = aws_s3_bucket.static.arn
}

output "static_bucket_domain_name" {
  description = "Domain name of the static bucket"
  value       = aws_s3_bucket.static.bucket_domain_name
}

output "chat_content_bucket_name" {
  description = "Name of the chat content bucket"
  value       = var.create_chat_content_bucket ? aws_s3_bucket.chat_content[0].bucket : null
}

output "chat_content_bucket_arn" {
  description = "ARN of the chat content bucket"
  value       = var.create_chat_content_bucket ? aws_s3_bucket.chat_content[0].arn : null
}

output "bucket_names" {
  description = "List of all bucket names"
  value = concat(
    [
      aws_s3_bucket.images.bucket,
      aws_s3_bucket.static.bucket
    ],
    var.create_chat_content_bucket ? [aws_s3_bucket.chat_content[0].bucket] : []
  )
}
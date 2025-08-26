# Lambda Layer Module Outputs

output "layer_arn" {
  description = "ARN of the Lambda layer"
  value       = aws_lambda_layer_version.this.arn
}

output "layer_version" {
  description = "Version number of the Lambda layer"
  value       = aws_lambda_layer_version.this.version
}

output "layer_name" {
  description = "Name of the Lambda layer"
  value       = aws_lambda_layer_version.this.layer_name
}

output "source_code_hash" {
  description = "Base64-encoded SHA256 hash of the layer package"
  value       = aws_lambda_layer_version.this.source_code_hash
}

output "source_code_size" {
  description = "Size of the layer package in bytes"
  value       = aws_lambda_layer_version.this.source_code_size
}

output "compatible_runtimes" {
  description = "List of compatible Lambda runtimes"
  value       = aws_lambda_layer_version.this.compatible_runtimes
}

output "compatible_architectures" {
  description = "List of compatible instruction set architectures"  
  value       = aws_lambda_layer_version.this.compatible_architectures
}

output "created_date" {
  description = "Date this layer version was created"
  value       = aws_lambda_layer_version.this.created_date
}
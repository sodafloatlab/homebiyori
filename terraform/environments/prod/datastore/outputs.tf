output "users_table_name" {
  description = "Name of the users table"
  value       = module.dynamodb.users_table_name
}

output "chat_table_name" {
  description = "Name of the chat table"
  value       = module.dynamodb.chat_table_name
}

output "tree_table_name" {
  description = "Name of the tree table"
  value       = module.dynamodb.tree_table_name
}

output "fruits_table_name" {
  description = "Name of the fruits table"
  value       = module.dynamodb.fruits_table_name
}

output "chat_content_bucket_name" {
  description = "Name of the chat content S3 bucket"
  value       = module.s3.chat_content_bucket_name
}

output "children_table_name" {
  description = "Name of the children table"
  value       = module.dynamodb.children_table_name
}

output "table_names" {
  description = "List of all table names"
  value       = module.dynamodb.table_names
}
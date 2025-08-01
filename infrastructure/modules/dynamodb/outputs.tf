output "users_table_name" {
  description = "Name of the users table"
  value       = aws_dynamodb_table.users.name
}

output "users_table_arn" {
  description = "ARN of the users table"
  value       = aws_dynamodb_table.users.arn
}

output "chat_table_name" {
  description = "Name of the chat table"
  value       = aws_dynamodb_table.chat.name
}

output "chat_table_arn" {
  description = "ARN of the chat table"
  value       = aws_dynamodb_table.chat.arn
}

output "tree_table_name" {
  description = "Name of the tree table"
  value       = aws_dynamodb_table.tree.name
}

output "tree_table_arn" {
  description = "ARN of the tree table"
  value       = aws_dynamodb_table.tree.arn
}

output "fruits_table_name" {
  description = "Name of the fruits table"
  value       = aws_dynamodb_table.fruits.name
}

output "fruits_table_arn" {
  description = "ARN of the fruits table"
  value       = aws_dynamodb_table.fruits.arn
}

output "children_table_name" {
  description = "Name of the children table"
  value       = aws_dynamodb_table.children.name
}

output "children_table_arn" {
  description = "ARN of the children table"
  value       = aws_dynamodb_table.children.arn
}

output "table_names" {
  description = "List of all table names"
  value = [
    aws_dynamodb_table.users.name,
    aws_dynamodb_table.chat.name,
    aws_dynamodb_table.tree.name,
    aws_dynamodb_table.fruits.name,
    aws_dynamodb_table.children.name
  ]
}
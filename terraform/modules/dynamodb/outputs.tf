output "users_table_name" {
  description = "Name of the users table"
  value       = aws_dynamodb_table.users.name
}

output "users_table_arn" {
  description = "ARN of the users table"
  value       = aws_dynamodb_table.users.arn
}

output "posts_table_name" {
  description = "Name of the posts table"
  value       = aws_dynamodb_table.posts.name
}

output "posts_table_arn" {
  description = "ARN of the posts table"
  value       = aws_dynamodb_table.posts.arn
}

output "praises_table_name" {
  description = "Name of the praises table"
  value       = aws_dynamodb_table.praises.name
}

output "praises_table_arn" {
  description = "ARN of the praises table"
  value       = aws_dynamodb_table.praises.arn
}

output "stats_table_name" {
  description = "Name of the stats table"
  value       = aws_dynamodb_table.stats.name
}

output "stats_table_arn" {
  description = "ARN of the stats table"
  value       = aws_dynamodb_table.stats.arn
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
    aws_dynamodb_table.posts.name,
    aws_dynamodb_table.praises.name,
    aws_dynamodb_table.stats.name,
    aws_dynamodb_table.children.name
  ]
}
output "users_table_name" {
  description = "Name of the users table"
  value       = module.dynamodb.users_table_name
}

output "posts_table_name" {
  description = "Name of the posts table"
  value       = module.dynamodb.posts_table_name
}

output "praises_table_name" {
  description = "Name of the praises table"
  value       = module.dynamodb.praises_table_name
}

output "stats_table_name" {
  description = "Name of the stats table"
  value       = module.dynamodb.stats_table_name
}

output "children_table_name" {
  description = "Name of the children table"
  value       = module.dynamodb.children_table_name
}

output "table_names" {
  description = "List of all table names"
  value       = module.dynamodb.table_names
}
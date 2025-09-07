output "web_acl_id" {
  description = "The ID of the WAF Web ACL for API Gateway"
  value       = aws_wafv2_web_acl.api_gateway.id
}

output "web_acl_arn" {
  description = "The ARN of the WAF Web ACL for API Gateway"
  value       = aws_wafv2_web_acl.api_gateway.arn
}

output "web_acl_name" {
  description = "The name of the WAF Web ACL for API Gateway"
  value       = aws_wafv2_web_acl.api_gateway.name
}

output "blocked_ips_set_arn" {
  description = "The ARN of the blocked IPs IP set (if created)"
  value       = length(aws_wafv2_ip_set.blocked_ips) > 0 ? aws_wafv2_ip_set.blocked_ips[0].arn : null
}

output "maintenance_allowed_ips_set_arn" {
  description = "The ARN of the maintenance allowed IPs IP set (if created)"
  value       = length(aws_wafv2_ip_set.maintenance_allowed_ips) > 0 ? aws_wafv2_ip_set.maintenance_allowed_ips[0].arn : null
}
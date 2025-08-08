# Parameter Store Module Outputs

output "maintenance_parameters" {
  description = "Maintenance control parameter ARNs"
  value = {
    enabled  = aws_ssm_parameter.maintenance_enabled.arn
    message  = aws_ssm_parameter.maintenance_message.arn
    end_time = aws_ssm_parameter.maintenance_end_time.arn
  }
}

output "parameter_names" {
  description = "All parameter names for Lambda environment variables"
  value = {
    maintenance_enabled      = aws_ssm_parameter.maintenance_enabled.name
    maintenance_message      = aws_ssm_parameter.maintenance_message.name
    maintenance_end_time     = aws_ssm_parameter.maintenance_end_time.name
    app_version             = aws_ssm_parameter.app_version.name
    feature_flags           = aws_ssm_parameter.feature_flags.name
    ai_model_config         = aws_ssm_parameter.ai_model_config.name
    tree_growth_thresholds  = aws_ssm_parameter.tree_growth_thresholds.name
    rate_limits             = aws_ssm_parameter.rate_limits.name
  }
}

output "parameter_arns" {
  description = "All parameter ARNs for IAM policy attachment"
  value = [
    aws_ssm_parameter.maintenance_enabled.arn,
    aws_ssm_parameter.maintenance_message.arn,
    aws_ssm_parameter.maintenance_end_time.arn,
    aws_ssm_parameter.app_version.arn,
    aws_ssm_parameter.feature_flags.arn,
    aws_ssm_parameter.ai_model_config.arn,
    aws_ssm_parameter.tree_growth_thresholds.arn,
    aws_ssm_parameter.rate_limits.arn
  ]
}
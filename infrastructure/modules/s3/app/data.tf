# Data sources for the S3 module

# Current AWS caller identity
data "aws_caller_identity" "current" {}

# Current AWS region
data "aws_region" "current" {}
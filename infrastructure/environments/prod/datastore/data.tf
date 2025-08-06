# Data Sources for Datastore Environment
# Centralizes all data sources for dependency management

# AWS data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Note: Datastore layer has no remote state dependencies as it's the foundation layer
# SNS Topic Module

This module creates an Amazon SNS topic with email notifications for the Homebiyori contact service.

## Features

- 📧 **Email Notifications**: SNS topic for contact inquiry notifications
- 🔒 **Security**: Server-side encryption and proper IAM policies
- 🚨 **Monitoring**: CloudWatch alarms and dashboards
- 💀 **Dead Letter Queue**: Failed notification handling
- 📊 **Logging**: CloudWatch logs for delivery failures

## Usage

```hcl
module "contact_notifications" {
  source = "../../modules/sns"

  topic_name    = "prod-homebiyori-contact-notifications"
  display_name  = "Homebiyori Contact Notifications"
  aws_region    = var.aws_region
  aws_account_id = var.aws_account_id

  # Email subscriptions (must be confirmed manually)
  subscription_emails = [
    "support@homebiyori.com",
    "admin@homebiyori.com"
  ]

  # Monitoring
  enable_monitoring = true
  alarm_actions     = []

  tags = {
    Environment = "prod"
    Project     = "homebiyori"
    Service     = "contact"
    Component   = "notifications"
  }
}
```

## Manual Setup Required

After Terraform deployment, **email subscriptions must be confirmed manually**:

1. Check email inboxes for subscription confirmation emails
2. Click the confirmation links in the emails
3. Verify subscriptions in AWS SNS Console

## Monitoring

The module includes:

- **CloudWatch Alarm**: Triggers on failed notifications
- **CloudWatch Dashboard**: SNS metrics visualization  
- **Dead Letter Queue**: Captures failed messages
- **CloudWatch Logs**: Delivery failure details

## Outputs

- `topic_arn`: SNS topic ARN for Lambda environment variables
- `topic_name`: SNS topic name
- `dlq_arn`: Dead Letter Queue ARN
- `cloudwatch_log_group_name`: Log group name
- `alarm_arn`: CloudWatch alarm ARN

## Security

- Server-side encryption enabled
- IAM policies following least privilege
- Resource-based policies for access control
- Dead letter queue for failed notifications

## Cost Optimization

- CloudWatch logs retention: 14 days
- DLQ message retention: 14 days
- Minimal CloudWatch metrics usage
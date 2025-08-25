# EventBridge Rule Module

再利用可能なEventBridge Rule & Targetモジュール

## 概要

任意のイベントパターンとターゲット（Lambda、SQS、SNS等）に対応可能な汎用EventBridge Rule作成モジュール。

## 作成されるリソース

- **EventBridge Rule**: 指定されたイベントパターンでルール作成
- **EventBridge Target**: 指定されたターゲットにイベントルーティング
- **Lambda Permission**: ターゲットがLambdaの場合の呼び出し許可
- **Retry Policy**: 自動リトライ設定
- **Dead Letter Queue**: 失敗イベント保管

## 使用方法

```hcl
module "payment_success_rule" {
  source = "./modules/eventbridge-rule"

  rule_name        = "payment-success-rule"
  rule_description = "Route payment success events to Lambda"
  event_bus_name   = module.eventbridge_bus.eventbridge_bus_name
  
  event_pattern = jsonencode({
    source      = ["payment.processor"]
    detail-type = ["Payment Success"]
    detail = {
      status = ["succeeded"]
    }
  })

  target_id            = "PaymentSuccessLambdaTarget"
  target_arn           = aws_lambda_function.handler.arn
  target_type          = "lambda"
  lambda_function_name = aws_lambda_function.handler.function_name

  retry_policy = {
    maximum_retry_attempts       = 3
    maximum_event_age_in_seconds = 3600
  }
  dlq_arn = aws_sqs_queue.dlq.arn

  tags = {
    Environment = "prod"
    Component   = "eventbridge"
  }
}
```

## 入力変数

| 変数名 | 説明 | 型 | 必須 |
|--------|------|-----|------|
| `rule_name` | EventBridge Rule名 | `string` | ✅ |
| `rule_description` | Rule説明 | `string` | ✅ |
| `event_bus_name` | EventBridge Bus名 | `string` | ✅ |
| `event_pattern` | イベントパターン（JSON） | `string` | ✅ |
| `target_id` | Target ID | `string` | ✅ |
| `target_arn` | ターゲットARN | `string` | ✅ |
| `target_type` | ターゲット種別 | `string` | ❌ (default: "lambda") |
| `lambda_function_name` | Lambda関数名 | `string` | ❌ |
| `retry_policy` | リトライポリシー | `object` | ❌ |
| `dlq_arn` | Dead Letter Queue ARN | `string` | ❌ |
| `tags` | リソースタグ | `map(string)` | ❌ |

## 出力値

| 出力名 | 説明 |
|--------|------|
| `rule_name` | EventBridge Rule名 |
| `rule_arn` | EventBridge Rule ARN |
| `target_id` | EventBridge Target ID |

## 対応ターゲット種別

- `lambda`: AWS Lambda関数
- `sqs`: Amazon SQS キュー
- `sns`: Amazon SNS トピック
- `kinesis`: Amazon Kinesis ストリーム
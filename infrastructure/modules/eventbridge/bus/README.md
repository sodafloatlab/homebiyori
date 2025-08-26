# EventBridge Bus Module

再利用可能なEventBridge Custom Busモジュール

## 概要

任意のイベントソースに対応可能な汎用EventBridge Bus作成モジュール。
Stripe以外のイベントソースにも対応可能。

## 作成されるリソース

- **EventBridge Custom Bus**: 指定された名前でカスタムバス作成
- **CloudWatch Log Group**: EventBridgeバス用デバッグログ

## 使用方法

```hcl
module "custom_eventbridge_bus" {
  source = "./modules/eventbridge-bus"

  bus_name           = "my-custom-event-bus"
  log_retention_days = 14

  tags = {
    Environment = "prod"
    Component   = "eventbridge"
  }
}
```

## 入力変数

| 変数名 | 説明 | 型 | 必須 |
|--------|------|-----|------|
| `bus_name` | EventBridge Bus名 | `string` | ✅ |
| `log_retention_days` | ログ保持期間（日数） | `number` | ❌ (default: 14) |
| `tags` | リソースタグ | `map(string)` | ❌ |

## 出力値

| 出力名 | 説明 |
|--------|------|
| `eventbridge_bus_name` | EventBridge Bus名 |
| `eventbridge_bus_arn` | EventBridge Bus ARN |
| `eventbridge_log_group_name` | CloudWatch Log Group名 |
| `eventbridge_log_group_arn` | CloudWatch Log Group ARN |
# Stripe Webhooks EventBridge Service

**Issue #28 対応完了版**: Stripe WebhookをAmazon EventBridge + 分割Lambda方式で処理

## アーキテクチャ

### 🎯 最終アーキテクチャ
```
Stripe → EventBridge Partner Event Source → Custom EventBus → Rules → 分割Lambda → DynamoDB
```

### ⚡ 処理フロー
1. **Stripe**: Webhookイベント送信
2. **EventBridge Partner Source**: Stripe連携でイベント受信
3. **Custom EventBus**: `prod-homebiyori-stripe-webhook-bus`でイベントルーティング
4. **EventBridge Rules**: イベントタイプ別に適切なLambdaに振り分け
5. **分割Lambda関数**: 各イベントタイプ専用の処理実行
6. **DynamoDB**: サブスクリプション・決済履歴データ保存

## ディレクトリ構造

```
webhook_service/
├── __init__.py
└── stripe/                      # Stripe Webhook EventBridge処理
    ├── __init__.py
    ├── README.md
    ├── requirements.txt
    ├── handlers/                # Lambda関数ハンドラー群
    │   ├── __init__.py
    │   ├── handle_payment_succeeded.py      # 支払い成功処理
    │   ├── handle_payment_failed.py         # 支払い失敗処理
    │   └── handle_subscription_updated.py   # サブスクリプション更新処理
    └── common/                  # 共通モジュール
        ├── __init__.py
        ├── models.py            # データモデル定義
        ├── database.py          # DynamoDB操作
        └── subscription_sync.py # サブスクリプション同期サービス
```

## Lambda関数一覧

### 1. handlers/handle_payment_succeeded.py
**EventBridge トリガー**: `invoice.payment_succeeded`

**処理内容**:
- 支払い成功時の PaymentHistory 保存
- GSI2 を使用した高速 customer_id 検索
- 成功ログ記録

**EventBridge Event Pattern**:
```json
{
  "source": ["aws.partner/stripe.com/{account_id}"],
  "detail-type": ["Invoice Payment Succeeded"],
  "detail": {
    "type": ["invoice.payment_succeeded"]
  }
}
```

### 2. handlers/handle_payment_failed.py
**EventBridge トリガー**: `invoice.payment_failed`

**処理内容**:
- 支払い失敗時の PaymentHistory 保存（失敗理由含む）
- アラート用のログ出力
- 失敗詳細の記録

**EventBridge Event Pattern**:
```json
{
  "source": ["aws.partner/stripe.com/{account_id}"],
  "detail-type": ["Invoice Payment Failed"],
  "detail": {
    "type": ["invoice.payment_failed"]
  }
}
```

### 3. handlers/handle_subscription_updated.py
**EventBridge トリガー**: `customer.subscription.updated`

**処理内容**:
- サブスクリプション情報の同期
- プラン変更・キャンセル予定の検出
- 状態変更ログ記録

**EventBridge Event Pattern**:
```json
{
  "source": ["aws.partner/stripe.com/{account_id}"],
  "detail-type": ["Customer Subscription Updated"],
  "detail": {
    "type": ["customer.subscription.updated"]
  }
}
```

## 共通モジュール

### common/models.py
- `PaymentHistory`: 決済履歴データモデル
- `SubscriptionData`: サブスクリプション情報モデル
- Stripe JSON から Pydantic モデルへの変換

### common/database.py
- `StripeWebhookDatabase`: DynamoDB操作クライアント
- GSI2を活用した高速検索
- PaymentHistory・Subscription データの CRUD

### common/subscription_sync.py
- `SubscriptionSyncService`: サブスクリプション同期サービス
- プラン変更検出
- キャンセル・再開処理

## EventBridge設定

### Custom EventBus
- **名前**: `prod-homebiyori-stripe-webhook-bus`
- **目的**: Stripe webhook専用のイベント分離
- **ログ**: CloudWatch Logs統合

### Rules & Targets
| Rule名 | イベントタイプ | Lambda関数 |
|--------|--------------|------------|
| `payment-succeeded-rule` | `invoice.payment_succeeded` | `handle-payment-succeeded` |
| `payment-failed-rule` | `invoice.payment_failed` | `handle-payment-failed` |
| `subscription-updated-rule` | `customer.subscription.updated` | `handle-subscription-updated` |

### エラーハンドリング
- **リトライ**: 最大3回、1時間以内
- **Dead Letter Queue**: 処理失敗イベントを保管
- **CloudWatch Alarms**: 失敗・DLQメッセージの監視

## データベース構造

### DynamoDB テーブル
1. **Core Table** (`HOMEBIYORI_CORE`)
   - サブスクリプション情報保存
   - GSI2: `customer_id` による高速検索

2. **Payments Table** (`HOMEBIYORI_PAYMENTS`)
   - 決済履歴保存 (7年保管対応)
   - TTL による自動削除

### PaymentHistory スキーマ
```json
{
  "payment_id": "pi_xxx or in_xxx",
  "user_id": "user_123",
  "customer_id": "cus_xxx", 
  "subscription_id": "sub_xxx",
  "stripe_payment_intent_id": "pi_xxx",
  "stripe_invoice_id": "in_xxx",
  "amount": 980,
  "currency": "jpy",
  "status": "succeeded|failed",
  "billing_period_start": 1692950000,
  "billing_period_end": 1695542000,
  "stripe_created": 1692950000,
  "created_at": 1692950000,
  "expires_at": 1913590000,
  "failure_reason": "payment_failed",
  "attempt_count": 1
}
```

## デプロイ手順

### 1. Stripe Partner Event Source有効化
```bash
# Stripeダッシュボード → Webhooks → EventBridge統合
# Partner Source IDを取得: acct_XXXXXXXXXXXXXXXXXX
export TF_VAR_stripe_partner_source_id="acct_XXXXXXXXXXXXXXXXXX"
```

### 2. Lambda関数のビルド・デプロイ
```bash
# Lambda ZIP作成（各関数毎 - webhook_service/stripe構造対応）
cd backend/services/webhook_service/stripe

# 各ハンドラーに共通モジュールを含めてZIP作成
zip -r handle_payment_succeeded.zip handlers/handle_payment_succeeded.py common/
zip -r handle_payment_failed.zip handlers/handle_payment_failed.py common/
zip -r handle_subscription_updated.zip handlers/handle_subscription_updated.py common/
```

### 3. Terraformデプロイ
```bash
cd infrastructure/environments/prod/backend
terraform init
terraform plan
terraform apply
```

## 運用・監視

### CloudWatch Metrics
- **EventBridge**: Rule実行数、失敗数
- **Lambda**: 実行数、エラー率、実行時間
- **DLQ**: メッセージ数

### ログ監視
```bash
# EventBridge ログ
aws logs tail /aws/events/prod-homebiyori-stripe-webhook-bus --follow

# Lambda ログ
aws logs tail /aws/lambda/prod-homebiyori-handle-payment-succeeded --follow
aws logs tail /aws/lambda/prod-homebiyori-handle-payment-failed --follow
aws logs tail /aws/lambda/prod-homebiyori-handle-subscription-updated --follow
```

### アラート設定
- EventBridge Rule 実行失敗
- DLQ にメッセージ蓄積
- Lambda 関数エラー率上昇

## テスト

### ユニットテスト
```bash
# EventBridge Lambda関数テスト実行
pytest tests/backend/services/stripe_webhooks/ -v
```

### 結合テスト
```bash
# Stripe Test Webhook送信でEventBridge動作確認
stripe webhooks resend evt_test_xxx --api-key sk_test_xxx
```

## セキュリティ

### IAM権限
- **Lambda**: DynamoDB読み書き、CloudWatch Logs出力のみ
- **EventBridge**: Lambda呼び出しのみ
- **最小権限原則**: 各Lambdaは必要最小限のリソースアクセス

### データ保護
- **機密情報**: Stripe APIキーは Parameter Store保管
- **データ暗号化**: DynamoDB保存時暗号化
- **TTL管理**: PaymentHistory 7年自動削除

## パフォーマンス

### スケーラビリティ
- **EventBridge**: 無制限イベント処理
- **Lambda**: 自動スケーリング（各関数独立）
- **DynamoDB**: オンデマンドスケーリング

### レイテンシ
- **EventBridge**: <100ms イベントルーティング
- **Lambda冷却**: 初回数秒、その後<500ms
- **DynamoDB**: <10ms クエリレスポンス

## 利点

### ✅ 従来との比較
| 項目 | 従来（API Gateway + 単一Lambda） | EventBridge + 分割Lambda |
|------|----------------------------------|-------------------------|
| **可用性** | 単一障害点 | 各Lambda独立 |
| **スケーラビリティ** | 1つのLambdaが制約 | 個別スケーリング |
| **保守性** | モノリシック | マイクロサービス |
| **エラーハンドリング** | 手動実装 | EventBridge標準機能 |
| **リトライ** | 手動実装 | 自動リトライ・DLQ |
| **監視** | 単一メトリクス | 機能別詳細メトリクス |

### 🚀 EventBridge活用メリット
- **ネイティブリトライ**: 自動再試行・DLQ連携
- **イベント駆動**: 疎結合アーキテクチャ
- **運用負荷軽減**: AWS マネージドサービス活用
- **拡張性**: 新イベントタイプ追加が容易
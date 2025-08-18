# CloudTrail監査ログモジュール

このモジュールはAWS CloudTrailを使用して、AWSアカウント内の全APIアクセスを記録・監査するためのインフラストラクチャを構築します。

## 機能概要

### 基本機能
- **全AWSリージョン監査**: `is_multi_region_trail = true`
- **管理イベント記録**: IAM、EC2、Lambda等の管理操作
- **データイベント記録**: DynamoDB、S3、Lambda関数の実行記録
- **ログファイル検証**: 改ざん検出機能付き

### 監査対象
- **DynamoDBテーブル**: 全テーブルへのRead/Write操作
- **Lambda関数**: 関数実行・設定変更
- **S3オブジェクト**: オブジェクトアクセス・変更
- **管理イベント**: IAM、セキュリティグループ、VPC等

### 追加機能
- **CloudWatch Logs統合**: リアルタイム分析・アラート
- **CloudTrail Insights**: 異常なAPIアクティビティ検出
- **Event Data Store**: 高度なクエリ・分析機能

## 使用方法

```hcl
module "audit_cloudtrail" {
  source = "../../modules/cloudtrail"

  # 基本設定
  cloudtrail_name = "homebiyori-prod-audit-trail"
  s3_bucket_name  = "homebiyori-prod-audit-logs"
  s3_key_prefix   = "cloudtrail-logs"
  environment     = "prod"

  # 監査対象カスタマイズ
  dynamodb_tables_to_audit = [
    "arn:aws:dynamodb:ap-northeast-1:*:table/prod-homebiyori-*"
  ]
  
  lambda_functions_to_audit = [
    "arn:aws:lambda:ap-northeast-1:*:function/homebiyori-*"
  ]

  # 追加機能
  enable_cloudwatch_logs = true
  enable_insights       = true
  log_retention_days    = 90

  # タグ
  common_tags = {
    Project     = "homebiyori"
    Environment = "prod"
    Purpose     = "security-audit"
  }
}
```

## セキュリティ考慮事項

### アクセス制御
- S3バケット書き込み権限の最小化
- CloudTrailサービスからのアクセスのみ許可
- SourceArn条件による制限

### データ保護
- ログファイル整合性検証機能
- S3バケット暗号化（別途設定必要）
- VPC Flow Logsとの連携推奨

### コンプライアンス
- SOC 2、ISO 27001対応
- GDPR監査証跡対応
- 金融業界監査基準準拠

## 運用・監視

### 推奨アラート設定
- CloudWatch LogsでのAPIエラー検出
- 異常なIAM操作検出
- セキュリティグループ変更通知
- DynamoDBテーブル削除検出

### パフォーマンス影響
- 管理イベントのみ: 影響最小
- データイベント有効化: 軽微な影響
- Insights機能: 追加料金発生

## コスト考慮事項

### 料金構成
- CloudTrail管理イベント: 最初の1つのトレイルは無料
- データイベント: $0.10/100,000イベント
- CloudWatch Logs: ログ取り込み・保存料金
- Insights: $0.35/100,000 API呼び出し分析

### 最適化推奨事項
- 不要なデータイベント除外
- ログ保持期間の適切な設定
- S3ライフサイクルポリシー活用

## 依存関係

### 前提条件
- 監査ログ用S3バケットが作成済み
- 適切なIAM権限の設定完了
- VPCエンドポイント設定（オプション）

### 推奨モジュール
- `../audit-s3`: 監査ログ専用S3バケット
- `../sns`: セキュリティアラート通知
- `../waf`: Webアプリケーション保護

## トラブルシューティング

### よくある問題
1. **ログが記録されない**: S3バケット権限確認
2. **CloudWatch連携失敗**: IAMロール権限確認  
3. **Insights機能無効**: 課金設定確認

### デバッグ方法
- CloudTrail管理画面でのイベント履歴確認
- CloudWatch Logsでのエラーログ確認
- S3バケット内のログファイル確認

## バージョン履歴

- v1.0.0: 基本機能実装
- v1.1.0: Event Data Store対応
- v1.2.0: Insights機能追加
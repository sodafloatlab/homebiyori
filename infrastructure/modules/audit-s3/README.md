# 監査ログ専用S3バケットモジュール

このモジュールは監査ログ（CloudTrail、VPC Flow Logs、アクセスログ等）の長期保存・セキュリティ保護に特化したS3バケットを構築します。

## 機能概要

### セキュリティ機能
- **KMS暗号化**: AWS KMSによるサーバーサイド暗号化
- **バージョニング**: 監査ログの改ざん防止・履歴保持
- **MFA削除保護**: 重要ログの誤削除防止（オプション）
- **パブリックアクセス完全ブロック**: 外部からのアクセス遮断

### コスト最適化
- **自動ライフサイクル管理**: Standard → IA → Glacier → Deep Archive
- **古いバージョン自動削除**: 長期保存要件に応じた自動削除
- **未完了アップロード削除**: ストレージコスト削減

### 監視・通知
- **CloudWatch監視**: バケットサイズ・アクセス頻度監視
- **S3イベント通知**: 重要ログファイル追加時の即座通知
- **セキュリティアラート**: 異常なアクセス検出時の管理者通知

## 使用方法

```hcl
module "audit_s3_bucket" {
  source = "../../modules/audit-s3"

  # 基本設定
  bucket_name = "homebiyori-prod-audit-logs"
  environment = "prod"

  # セキュリティ設定
  enable_mfa_delete = false  # 本番環境では true 推奨
  kms_key_id       = null   # 新規KMSキー作成

  # ライフサイクル設定（コンプライアンス要件に応じて調整）
  transition_to_ia_days          = 30    # 30日後にIA移行
  transition_to_glacier_days     = 90    # 90日後にGlacier移行  
  transition_to_deep_archive_days = 365   # 1年後にDeep Archive移行
  noncurrent_version_expiration_days = 2555  # 7年間保存（監査要件）

  # 通知設定
  enable_notifications          = true
  security_analysis_lambda_arn  = aws_lambda_function.security_analyzer.arn
  security_alert_topic_arn      = aws_sns_topic.security_alerts.arn

  # 監視設定
  enable_cloudwatch_monitoring = true
  bucket_size_alarm_threshold  = 107374182400  # 100GB
  alarm_sns_topic_arns        = [aws_sns_topic.admin_alerts.arn]

  # タグ
  common_tags = {
    Project     = "homebiyori"
    Environment = "prod"
    Purpose     = "audit-logs"
    Compliance  = "SOC2-ISO27001"
  }
}
```

## ライフサイクル管理詳細

### CloudTrailログ（重要度：高）
```
Standard (0-30日) → Standard-IA (30-90日) → Glacier (90-365日) → Deep Archive (365日以降)
```

### アクセスログ（重要度：中）
```
Standard (0-30日) → Standard-IA (30-90日) → 削除
```

### 古いバージョン
```
Standard → Standard-IA → Glacier → 7年後削除
```

## セキュリティベストプラクティス

### 1. アクセス制御
```hcl
# CloudTrailサービスのみアクセス許可
# MFA必須の管理者アクセス設定
# クロスアカウントアクセスの明示的拒否
```

### 2. 監査証跡
```hcl
# バケット自体のアクセスログ記録
# CloudTrailによるAPI操作記録
# VPC Flow Logsでネットワークアクセス監査
```

### 3. データ保護
```hcl
# KMS暗号化による保存時暗号化
# SSL/TLS必須による転送時暗号化
# バージョニングによる改ざん検出
```

## コンプライアンス対応

### SOC 2 Type II
- ログの完全性保証（バージョニング + KMS）
- アクセス制御の厳格化（IAM + MFA）
- 監査証跡の長期保存（7年間）

### ISO 27001
- 情報セキュリティ管理体制の証跡
- インシデント対応ログの保管
- 定期的なアクセスレビュー記録

### GDPR
- 個人データ処理ログの保管
- データ主体の権利行使記録
- データ保護影響評価の証跡

## 運用・保守

### 日次チェック項目
- [ ] CloudWatch アラームの確認
- [ ] 新規ログファイルの取り込み状況
- [ ] 異常なアクセスパターンの検出

### 月次チェック項目
- [ ] ストレージコストの確認
- [ ] ライフサイクルルールの効果測定
- [ ] KMSキー使用状況の確認

### 年次チェック項目
- [ ] 長期保存要件の見直し
- [ ] コンプライアンス要件の変更対応
- [ ] セキュリティ設定の全体見直し

## トラブルシューティング

### よくある問題と解決方法

1. **CloudTrailログが保存されない**
   - バケットポリシーでCloudTrailサービスの権限確認
   - KMSキーポリシーの暗号化権限確認

2. **ライフサイクルルールが動作しない**
   - オブジェクトのプレフィックス設定確認
   - 移行日数の設定値確認

3. **通知が届かない**
   - Lambda実行権限の確認
   - SNSトピックポリシーの確認

### 緊急時対応手順

1. **セキュリティインシデント発生時**
   ```bash
   # 緊急アクセス停止
   aws s3api put-bucket-policy --bucket BUCKET_NAME --policy file://emergency-deny-policy.json
   
   # ログファイルの即座バックアップ
   aws s3 sync s3://BUCKET_NAME s3://emergency-backup-bucket/
   ```

2. **データ復旧が必要な場合**
   ```bash
   # バージョン履歴からの復旧
   aws s3api list-object-versions --bucket BUCKET_NAME
   aws s3api get-object --bucket BUCKET_NAME --key KEY --version-id VERSION_ID
   ```

## 料金見積もり例

### 月間100GB のCloudTrailログの場合

| ストレージクラス | 期間 | 月額料金（概算） |
|------------------|------|-------------------|
| Standard | 0-30日 | $2.30 |
| Standard-IA | 30-90日 | $1.25 |
| Glacier | 90-365日 | $0.40 |
| Deep Archive | 365日以降 | $0.10 |

**合計月額**: 約 $4.05 + KMS料金($1.00) + CloudWatch料金($0.50) = **約 $5.55/月**

## 依存関係

### 前提条件
- AWS Account with appropriate IAM permissions
- KMS service enabled in the target region
- SNS topics for notifications (optional)
- Lambda functions for security analysis (optional)

### 推奨併用モジュール
- `../cloudtrail`: CloudTrail設定
- `../sns`: アラート通知
- `../lambda`: ログ分析・処理

## バージョン履歴

- v1.0.0: 基本機能実装（暗号化、ライフサイクル、通知）
- v1.1.0: MFA削除保護対応
- v1.2.0: CloudWatch監視機能追加
- v1.3.0: コンプライアンス対応強化
# Homebiyori監査ログ環境（Audit Stack）

本環境はHomebiyoriプロジェクトの包括的な監査ログ基盤を提供します。CloudTrailとS3を組み合わせて、セキュリティ監査・コンプライアンス対応・インシデント分析に必要な全てのログを長期保存します。

## 🔍 環境概要

### 構成コンポーネント
- **CloudTrail**: 全AWSアカウントAPIアクセス記録
- **S3バケット**: 監査ログ専用長期保存ストレージ
- **KMS暗号化**: 監査データの完全暗号化保護
- **CloudWatch監視**: リアルタイム監視・アラート
- **SNS通知**: セキュリティインシデント即座通知

### 監査対象範囲
```
📊 管理イベント: IAM操作、EC2起動停止、セキュリティグループ変更
📊 データイベント: DynamoDB読み書き、Lambda実行、S3アクセス
📊 セキュリティイベント: 権限エラー、不正アクセス試行
📊 システムイベント: 設定変更、リソース作成・削除
```

## 🚀 デプロイ手順

### 1. 前提条件確認
```bash
# Terraformバージョン確認
terraform version  # >= 1.0

# AWS認証確認
aws sts get-caller-identity

# 必要権限の確認
aws iam get-account-authorization-details --max-items 1
```

### 2. 初期化とデプロイ
```bash
cd infrastructure/environments/prod/audit

# Terraform初期化
terraform init

# プラン確認（リソース作成内容確認）
terraform plan -var-file="terraform.tfvars"

# デプロイ実行
terraform apply -var-file="terraform.tfvars"
```

### 3. デプロイ完了確認
```bash
# CloudTrail作成確認
aws cloudtrail describe-trails --region ap-northeast-1

# S3バケット作成確認
aws s3 ls | grep audit

# 監査ログ記録開始確認（5-10分後）
aws logs describe-log-groups --log-group-name-prefix "/aws/cloudtrail/"
```

## 📋 設定項目詳細

### セキュリティ設定
```hcl
# MFA削除保護（本番環境推奨）
enable_mfa_delete = true  # rootユーザー + MFA必須

# KMS暗号化
# 自動作成KMSキーによる完全暗号化
# キーローテーション有効化済み
```

### ライフサイクル管理
```hcl
# CloudTrailログ自動階層化
Standard (0-30日) → Standard-IA (30-90日) 
→ Glacier (90-365日) → Deep Archive (365日以降)

# 古いバージョン管理
7年間保存 → 自動削除（コンプライアンス対応）
```

### 監視・アラート
```hcl
# CloudWatch監視項目
- バケットサイズ監視（100GB超でアラート）
- セキュリティイベント検出（不正アクセス試行）
- API呼び出し異常パターン検出

# SNS通知先
- セキュリティ管理者アラート
- インシデント対応チーム通知
```

## 🔒 セキュリティ機能

### データ保護
- **保存時暗号化**: KMS Customer Managed Key
- **転送時暗号化**: SSL/TLS強制
- **アクセス制御**: IAM + バケットポリシー
- **改ざん検出**: S3バージョニング + CloudTrail整合性検証

### コンプライアンス対応
- **SOC 2**: ログ完全性・アクセス制御・長期保存
- **ISO 27001**: セキュリティ管理証跡・インシデント記録
- **GDPR**: 個人データ処理ログ・権利行使記録

### アクセス監査
- **API操作記録**: 全AWS操作の完全トレース
- **ユーザー行動分析**: 異常なアクセスパターン検出
- **権限変更追跡**: IAMポリシー・ロール変更履歴

## 📊 監視ダッシュボード

### CloudWatchダッシュボード内容
1. **ストレージメトリクス**
   - 監査ログバケットサイズ推移
   - オブジェクト数増加傾向
   - ストレージクラス別分布

2. **セキュリティメトリクス**
   - 認証エラー発生数
   - 権限拒否パターン分析
   - 異常APIアクセス検出

3. **運用メトリクス**
   - ログ取り込み状況
   - CloudTrail健全性
   - コスト効率分析

### アクセス方法
```bash
# ダッシュボードURL（デプロイ後に表示される）
https://ap-northeast-1.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#dashboards:name=homebiyori-prod-security-audit
```

## 💰 コスト最適化

### 月額料金見積もり（100GB/月の場合）

| サービス | 料金 | 説明 |
|----------|------|------|
| S3 Standard (0-30日) | $2.30 | アクティブログ |
| S3 Standard-IA (30-90日) | $1.25 | 中期保存 |
| S3 Glacier (90-365日) | $0.40 | 長期保存 |
| S3 Deep Archive (365日以降) | $0.10 | 最長期保存 |
| KMS暗号化 | $1.00 | 月間キー使用料 |
| CloudWatch Logs | $0.50 | ログ取り込み・保存 |
| CloudTrail データイベント | $0.10 | 100,000イベントあたり |
| **合計** | **~$5.55/月** | データイベント除く |

### コスト削減施策
- 不要なデータイベント除外設定
- ライフサイクル自動階層化
- 古いログの適切な削除設定

## 🔧 運用・保守

### 日次チェック項目
- [ ] セキュリティアラートの確認
- [ ] 新規ログファイル取り込み状況
- [ ] CloudWatch異常値検出

### 週次チェック項目
- [ ] ダッシュボードトレンド分析
- [ ] ストレージ使用量確認
- [ ] コスト効率レビュー

### 月次チェック項目
- [ ] セキュリティインシデント総括
- [ ] コンプライアンス要件適合確認
- [ ] 長期保存データ管理状況確認

### 緊急時対応

#### セキュリティインシデント発生時
```bash
# 1. 緊急アクセス停止
aws s3api put-bucket-policy --bucket homebiyori-prod-audit-logs \
  --policy file://emergency-deny-policy.json

# 2. インシデント期間のログ即座確保
aws s3 sync s3://homebiyori-prod-audit-logs/cloudtrail-logs/ \
  ./incident-analysis/ --exclude "*" --include "*2024-08-18*"

# 3. CloudTrail詳細確認
aws cloudtrail lookup-events --start-time 2024-08-18T00:00:00Z \
  --end-time 2024-08-18T23:59:59Z --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRole
```

## 🎯 カスタマイズ可能項目

### terraform.tfvarsでの設定変更例
```hcl
# セキュリティレベル最高設定
enable_mfa_delete = true
enable_cloudtrail_insights = true
enable_event_data_store = true

# 長期保存要件調整
noncurrent_version_expiration_days = 3650  # 10年保存

# 監視強化
bucket_size_alarm_threshold = 53687091200  # 50GBでアラート
```

### 追加監査対象設定
```hcl
# 特定サービスのみ監査
lambda_functions_to_audit = [
  "arn:aws:lambda:ap-northeast-1:*:function:homebiyori-chat-service",
  "arn:aws:lambda:ap-northeast-1:*:function:homebiyori-user-service"
]

# 特定DynamoDBテーブル監査
dynamodb_tables_to_audit = [
  "arn:aws:dynamodb:ap-northeast-1:*:table/prod-homebiyori-core",
  "arn:aws:dynamodb:ap-northeast-1:*:table/prod-homebiyori-chats"
]
```

## 🔄 アップグレード・変更

### 新機能追加時
```bash
# 設定変更
vim terraform.tfvars

# 変更プレビュー
terraform plan -var-file="terraform.tfvars"

# 適用（ダウンタイムなし）
terraform apply -var-file="terraform.tfvars"
```

### モジュール更新時
```bash
# モジュール最新化
terraform get -update

# プラン確認
terraform plan

# 適用
terraform apply
```

## 📞 トラブルシューティング

### よくある問題と解決方法

1. **CloudTrailログが記録されない**
   - S3バケットポリシー確認
   - CloudTrailサービスロール権限確認
   - KMS暗号化キー権限確認

2. **CloudWatch Logsにデータが流れない**
   - CloudTrail設定でLogs統合有効確認
   - IAMロール権限確認
   - ロググループ存在確認

3. **SNSアラートが届かない**
   - SNSトピック権限確認
   - サブスクリプション設定確認
   - CloudWatch Alarmしきい値確認

### ログ確認方法
```bash
# CloudTrail動作確認
aws cloudtrail get-trail-status --name homebiyori-prod-audit-trail

# 最新ログファイル確認
aws s3 ls s3://homebiyori-prod-audit-logs/cloudtrail-logs/ --recursive | tail -5

# CloudWatch Logs確認
aws logs describe-log-streams --log-group-name /aws/cloudtrail/homebiyori-prod-audit-trail
```

## 📈 次のステップ

### Phase 2 拡張計画
- [ ] VPC Flow Logs統合
- [ ] AWS Config Rule連携
- [ ] GuardDuty脅威検出統合
- [ ] Security Hub中央監視

### Phase 3 高度化
- [ ] ElasticSearch/OpenSearchによるログ分析
- [ ] Machine Learning異常検知
- [ ] 自動化されたインシデント対応
- [ ] 法的保持要件自動管理

---

**🚨 重要**: 本監査環境はセキュリティとコンプライアンスの要となります。設定変更時は必ず事前テスト・レビューを実施し、本番環境への影響を最小限に抑えてください。
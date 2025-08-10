# Terraform DynamoDB実装分析

## 調査日時
2025年8月10日

## 現在の状況

### 存在するファイル
- `terraform_variables.tf`: DynamoDBテーブル名変数定義のみ
- `MANUAL_SETUP_GUIDE.md`: infrastructure構造への言及あり

### 存在しないファイル
- `infrastructure/environments/prod/datastore/*.tf`
- `aws_dynamodb_table`リソース定義ファイル

## DynamoDB Terraformにおけるattribute定義

### 定義が必要
- プライマリキー（PK, SK）
- GSI/LSIキー

### 定義が不要
- `interaction_mode`
- `nickname`
- `ai_character`
- その他通常フィールド（実行時動的追加）

## ユーザー質問への回答
「DynamoDBのattributeとかでテーブル内の項目も指定することになるのではないの？」

→ プライマリキーとGSI用のattributeのみ必要。`interaction_mode`は実行時追加のため定義不要。
→ ただし、現在はTerraformリソース定義ファイル自体が存在していない状況。

## 次のステップ
infrastructure構造の構築が必要
# 開発環境構築手順書

## 概要
ほめびよりプロジェクトのローカル開発環境構築手順を記載します。

## 前提条件

### 必要なソフトウェア
- Python (v3.9以上推奨)
- Node.js (v18以上推奨)
- npm または yarn
- Git

### 開発環境確認
```bash
python --version  # v3.9以上であることを確認
node --version    # v18以上であることを確認
npm --version     # 最新版推奨
git --version     # 最新版推奨
```

## プロジェクト構成

```
homebiyori/
├── backend/            # バックエンド (Python, FastAPI)
├── demo/               # フロントエンドデモ (Next.js)
├── infrastructure/     # インフラ定義 (Terraform)
├── image/              # 画像アセット
├── tests/              # テストコード
├── CLAUDE.md           # Claude Code向け指示書
├── DEV_SETUP.md        # 本ファイル
└── .kiro/specs/        # 仕様書
```

## 手順1: フロントエンド(Next.js)のセットアップ

### Next.jsプロジェクト作成
*このプロジェクトは既に`demo`ディレクトリに作成済みです。*
もし再作成が必要な場合は、以下のコマンドをプロジェクトルートで実行してください。
```bash
# 既存のdemoディレクトリを削除してから実行
npx create-next-app@latest demo --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### 依存関係インストール
```bash
cd demo
npm install
```

### 開発サーバー起動確認
```bash
npm run dev
```
ブラウザで http://localhost:3000 にアクセスしてNext.jsの初期画面が表示されることを確認します。

## 手順2: バックエンド(Python)のセットアップ

### 1. 仮想環境の作成
プロジェクトのルートディレクトリで以下のコマンドを実行し、仮想環境を作成します。
```bash
python -m venv .venv
```

### 2. 仮想環境のアクティベート
開発作業を行う前に、必ず仮想環境をアクティベートしてください。

**Windows (コマンドプロンプト / PowerShell):**
```bash
.venv\Scripts\activate
```

**macOS / Linux (bash / zsh):**
```bash
source .venv/bin/activate
```
アクティベートに成功すると、ターミナルのプロンプトの先頭に `(.venv)` と表示されます。

### 3. 依存関係のインストール
バックエンドサービスの開発に必要なPythonライブラリをインストールします。
```bash
# 開発用の共通ライブラリをインストール
pip install -r backend/requirements-dev.txt

# 各サービスのライブラリをインストール (例: user-service)
pip install -r backend/services/user-service/requirements.txt
```
*(注: 他のサービス (`chat-service`, `health-check`など) も同様にインストールが必要になる場合があります)*


## 手順3: Terraformバックエンドインフラストラクチャ構築

### 概要
Terraformの状態管理とロック制御のため、以下のAWSリソースを手動で作成する必要があります：
- **S3バケット**: Terraformステートファイル（`.tfstate`）の保存
- **DynamoDBテーブル**: 並行実行時の排他制御（ロック機能）

### 前提条件
- AWS CLIがインストール・設定済み（`aws configure`完了）
- 適切なAWS権限（S3、DynamoDB作成権限）
- プロジェクトで使用するAWSリージョンの決定（推奨: `ap-northeast-1`）

### 手順1: 環境変数設定
作業用の環境変数を設定します：
```bash
# プロジェクト固有の設定
export PROJECT_NAME="homebiyori"
export ENVIRONMENT="prod"  # または "dev", "staging"
export AWS_REGION="ap-northeast-1"  # 東京リージョン
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# バケット名とテーブル名（全世界で一意である必要があります）
export TF_STATE_BUCKET="${ENVIRONMENT}-${PROJECT_NAME}-terraform-state"
export TF_LOCK_TABLE="${ENVIRONMENT}-${PROJECT_NAME}-terraform-locks"
```

### 手順2: S3バケット作成（Terraformステート管理用）
```bash
# S3バケット作成
aws s3api create-bucket \
  --bucket "${TF_STATE_BUCKET}" \
  --region "${AWS_REGION}" \
  --create-bucket-configuration LocationConstraint="${AWS_REGION}"

# バージョニング有効化（状態の履歴管理）
aws s3api put-bucket-versioning \
  --bucket "${TF_STATE_BUCKET}" \
  --versioning-configuration Status=Enabled

# サーバーサイド暗号化有効化（セキュリティ強化）
aws s3api put-bucket-encryption \
  --bucket "${TF_STATE_BUCKET}" \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'

# パブリックアクセスブロック（セキュリティ強化）
aws s3api put-public-access-block \
  --bucket "${TF_STATE_BUCKET}" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 手順3: DynamoDBテーブル作成（排他制御用）
```bash
# DynamoDBテーブル作成
aws dynamodb create-table \
  --table-name "${TF_LOCK_TABLE}" \
  --attribute-definitions \
    AttributeName=LockID,AttributeType=S \
  --key-schema \
    AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "${AWS_REGION}"

# テーブル作成完了待機
aws dynamodb wait table-exists \
  --table-name "${TF_LOCK_TABLE}" \
  --region "${AWS_REGION}"
```

### 手順4: 作成確認
```bash
# S3バケット確認
echo "S3バケット: ${TF_STATE_BUCKET}"
aws s3 ls "s3://${TF_STATE_BUCKET}" 2>/dev/null && echo "✅ S3バケット作成済み" || echo "❌ S3バケット未作成"

# DynamoDBテーブル確認
echo "DynamoDBテーブル: ${TF_LOCK_TABLE}"
aws dynamodb describe-table \
  --table-name "${TF_LOCK_TABLE}" \
  --region "${AWS_REGION}" \
  --query "Table.TableStatus" \
  --output text 2>/dev/null && echo "✅ DynamoDBテーブル作成済み" || echo "❌ DynamoDBテーブル未作成"
```

### 手順5: Terraform設定ファイル更新
作成したリソース情報を各Terraformディレクトリの`providers.tf`に設定：

```hcl
terraform {
  backend "s3" {
    bucket         = "homebiyori-terraform-state-{YOUR_ACCOUNT_ID}-ap-northeast-1"
    key            = "terraform/environments/prod/{LAYER_NAME}/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "homebiyori-terraform-locks"
    encrypt        = true
  }
}
```

### 【重要】セキュリティベストプラクティス

#### S3バケットポリシー（推奨）
IAMユーザー/ロールのみアクセス許可：
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyDirectPublicAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::homebiyori-terraform-state-*",
        "arn:aws:s3:::homebiyori-terraform-state-*/*"
      ],
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalServiceName": [
            "terraform.io"
          ]
        }
      }
    }
  ]
}
```

#### IAMポリシー例（最小権限）
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::homebiyori-terraform-state-*",
        "arn:aws:s3:::homebiyori-terraform-state-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-northeast-1:*:table/homebiyori-terraform-locks"
    }
  ]
}
```

### トラブルシューティング

#### 一般的なエラーと対処法

**S3バケット名重複エラー:**
```bash
# バケット名にタイムスタンプを追加
export TF_STATE_BUCKET="${PROJECT_NAME}-terraform-state-${AWS_ACCOUNT_ID}-$(date +%Y%m%d)"
```

**DynamoDB作成権限エラー:**
```bash
# 現在のユーザー権限確認
aws iam get-user
aws iam list-attached-user-policies --user-name YOUR_USERNAME
```

**リージョン指定エラー:**
```bash
# 利用可能リージョン確認
aws ec2 describe-regions --query "Regions[].RegionName" --output table
```

### リソース削除手順（注意）
**⚠️ 本番環境では実行しないでください**

開発環境でのクリーンアップ時のみ：
```bash
# DynamoDBテーブル削除
aws dynamodb delete-table --table-name "${TF_LOCK_TABLE}" --region "${AWS_REGION}"

# S3バケット内容削除後、バケット削除
aws s3 rm "s3://${TF_STATE_BUCKET}" --recursive
aws s3api delete-bucket --bucket "${TF_STATE_BUCKET}" --region "${AWS_REGION}"
```

## 手順4: UIプロトタイプの確認
フロントエンドの`demo`ディレクトリには、UIのプロトタイプが実装されています。
詳細は`demo/src/app/page.tsx`や`demo/src/components/`以下のファイルを確認してください。

## 現在の課題と今後の改善予定

### 🚨 優先対応が必要な課題
- [ ] **木のUI品質向上** - より美しく自然な木の表現への改善（高優先度）
  - 現在SimplifiedCanvasTreeを使用中だが、デザイン品質が不十分
  - フラクタルアルゴリズムによる自然な成長パターンの実装
  - アーティスティックな色彩とテクスチャの向上
- [ ] Canvas描画パフォーマンス最適化
- [ ] 実のクリック判定精度向上

### 📋 今後追加予定
- [ ] ローカルストレージでの状態永続化
- [ ] 日付管理とカレンダー機能
- [ ] 褒めメッセージのバリエーション拡充
- [ ] 年輪成長アニメーション
- [ ] 実の成長過程アニメーション

---

**更新履歴**
- 2025-07-23: 初版作成、Next.jsプロジェクト初期化手順追加
- 2025-07-23: 基本ディレクトリ構造、木の成長UIプロトタイプ実装完了
- 2025-07-23: Framer Motion導入、インタラクション演出実装完了
- 2025-07-23: 木のUIブラッシュアップ、時間帯・季節演出追加完了
- 2025-07-23: プロフェッショナルUIシステム実装、デザイン品質大幅向上
- 2025-07-23: Canvas による美しい木のUI実装、アーティスティック品質実現
- 2025-07-23: Canvas表示問題修正、SimplifiedCanvasTreeへの切り替え
- 2025-07-23: 木のUI品質向上が優先課題として明確化、開発ステータス更新
- 2025-08-02: Pythonバックエンドのセットアップ手順を追記。プロジェクト構成を現状に合わせて更新。

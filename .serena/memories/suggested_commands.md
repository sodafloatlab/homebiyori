# 推奨コマンド集（Windows環境対応）

## 開発前準備コマンド

### Python仮想環境（必須）
```bash
# 仮想環境作成
python -m venv .venv

# 仮想環境アクティベート（Windows）
.venv\Scripts\activate
# または PowerShell の場合:
.venv\Scripts\Activate.ps1

# 仮想環境デアクティベート
deactivate
```

### 依存関係インストール
```bash
# テスト用ライブラリ（開発者必須）
pip install -r tests/requirements-dev.txt

# 共通ライブラリ（Lambda Layer）
pip install -r backend/layers/common/requirements.txt

# 個別サービス（例：user_service）
pip install -r backend/services/user_service/requirements.txt
```

## バックエンド開発コマンド

### テスト実行
```bash
# 全テスト実行
pytest tests/

# 個別サービステスト
pytest tests/backend/services/health_check/ -v
pytest tests/backend/services/user_service/ -v

# カバレッジ付きテスト
python -m pytest tests/ --cov=backend

# 特定テストファイル実行
python -m pytest tests/backend/services/user_service/test_database.py -v
```

### コード品質チェック
```bash
# Pythonコードリント
ruff check backend/

# Pythonコードフォーマット
ruff format backend/

# 型チェック
mypy backend/
```

### ローカル開発・デバッグ
```bash
# 個別サービス開発時の作業ディレクトリ移動
cd backend/services/user_service

# そのディレクトリからテスト実行
python -m pytest ../../../tests/backend/services/user_service/ -v
```

## フロントエンド開発コマンド

### Next.js 開発サーバー
```bash
cd demo

# 開発サーバー起動（Turbopack使用）
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm run start

# ESLint実行
npm run lint
```

### TypeScript
```bash
# 型チェック（フロントエンド）
cd demo
npx tsc --noEmit
```

## インフラストラクチャ（Terraform）

### デプロイ順序（重要）
```bash
# 1. データストア（DynamoDB等）
cd infrastructure/environments/prod/datastore
terraform init && terraform plan && terraform apply

# 2. バックエンド（Lambda、API Gateway等）
cd ../backend  
terraform init && terraform plan && terraform apply

# 3. フロントエンド（S3、CloudFront等）
cd ../frontend
terraform init && terraform plan && terraform apply
```

### インフラ削除（逆順）
```bash
cd infrastructure/environments/prod/frontend && terraform destroy
cd ../backend && terraform destroy  
cd ../datastore && terraform destroy
```

## Git操作（Windows対応）

### 基本的なGitコマンド
```bash
# 現在の状態確認
git status

# ファイル検索（Windows）
dir /s /b *.py        # Pythonファイル検索
findstr /s /i "健康" *.py   # 文字列検索

# Unix系コマンドの代替（Windows）
ls -> dir
grep -> findstr
find -> dir /s
```

## 実行優先順位（タスク完了後）

### タスク完了時の必須実行順序
```bash
# 1. コード品質チェック（必須）
ruff check backend/
ruff format backend/
mypy backend/

# 2. テスト実行（必須）
pytest tests/ --cov=backend

# 3. フロントエンドチェック（フロントエンド変更時）
cd demo
npm run lint
npx tsc --noEmit

# 4. 統合テスト（API変更時）
pytest tests/integration/ -v
```

## 開発環境確認コマンド
```bash
# Python環境確認
python --version          # v3.9以上
pip --version             # 最新版推奨

# Node.js環境確認
node --version            # v18以上  
npm --version             # 最新版推奨

# Git確認
git --version             # 最新版推奨

# 仮想環境確認
python -c "import sys; print(sys.prefix)"  # .venv パスが表示されるか確認
```
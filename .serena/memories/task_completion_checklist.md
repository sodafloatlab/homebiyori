# タスク完了時チェックリスト

## 必須実行項目（すべてのタスク）

### 1. コード品質チェック（必須）
```bash
# Python コード（バックエンド変更時）
ruff check backend/          # リンターチェック
ruff format backend/         # コードフォーマット
mypy backend/               # 型チェック

# TypeScript コード（フロントエンド変更時）
cd demo
npm run lint                # ESLint実行
npx tsc --noEmit           # 型チェック（ビルドなし）
```

### 2. テスト実行（必須）
```bash
# 単体テスト（変更対象サービス）
pytest tests/backend/services/{service_name}/ -v

# 全体テスト（重要な変更の場合）
pytest tests/ --cov=backend

# 統合テスト（API変更時）
pytest tests/integration/ -v
```

### 3. 進捗管理更新（必須）
- `tasks.md` の該当タスクを `- [x]` に更新
- 完了日時を記録: `(完了: YYYY-MM-DD)`
- 実装詳細・技術的決定事項を記録
- 次のタスクの前提条件確認

## 変更種別別チェック項目

### バックエンド（Lambda）変更時
```bash
# 1. 個別サービステスト
cd backend/services/{service_name}
python -m pytest ../../../tests/backend/services/{service_name}/ -v

# 2. 依存関係確認
pip install -r requirements.txt  # サービス固有
pip install -r ../../layers/common/requirements.txt  # 共通

# 3. ハンドラー動作確認
# main.py + handler.py の連携テスト確認
```

### API エンドポイント変更時
```bash
# 1. OpenAPI仕様確認（FastAPI自動生成）
# http://localhost:8000/docs で確認

# 2. CORS設定確認
# API Gateway設定との整合性確認

# 3. 認証動作確認
# Cognitoトークン検証が正しく動作するか確認
```

### データベース（DynamoDB）変更時
```bash
# 1. モデルテスト
pytest tests/backend/services/{service_name}/test_models.py -v

# 2. データベース操作テスト
pytest tests/backend/services/{service_name}/test_database.py -v

# 3. データ整合性確認
# 既存データとの互換性確認
```

### フロントエンド変更時
```bash
cd demo

# 1. ビルド確認
npm run build

# 2. 開発サーバー動作確認
npm run dev
# http://localhost:3000 で動作確認

# 3. レスポンシブ確認
# モバイル・デスクトップ両方での表示確認
```

### インフラ（Terraform）変更時
```bash
# 1. プラン確認
terraform plan

# 2. バリデーション
terraform validate

# 3. フォーマット
terraform fmt

# 4. セキュリティ確認
# IAM権限、セキュリティグループ設定の最小権限確認
```

## 品質保証チェック項目

### セキュリティ
- [ ] 機密情報がログに出力されていないか
- [ ] 入力検証が適切に行われているか
- [ ] エラーメッセージで内部情報が漏洩していないか
- [ ] 認証・認可が正しく実装されているか

### パフォーマンス
- [ ] API応答時間が要件を満たしているか（< 1秒）
- [ ] メモリ使用量が適切か（Lambda: 128MB〜512MB）
- [ ] 不要なDBクエリが発生していないか

### 可用性
- [ ] エラーハンドリングが適切か
- [ ] リトライ機構が必要な箇所に実装されているか
- [ ] ログ出力が運用監視に適しているか

## ドキュメント更新

### 変更時に更新すべきファイル
- `CLAUDE.md`: 重要な仕様変更時
- `tasks.md`: タスク完了・進捗更新（必須）
- `design.md`: アーキテクチャ変更時
- `requirements.md`: 機能要件変更時

### コードドキュメント
- 関数・クラスのdocstring更新
- README（該当サービスにある場合）
- API仕様（OpenAPI）の妥当性確認

## 最終確認項目

### Git コミット前
```bash
# 1. ステージング確認
git status
git diff --cached

# 2. コミットメッセージ規約確認
# feat/fix/docs等の適切なプレフィックス使用

# 3. 不要ファイル除外確認
# .gitignore が適切に設定されているか
```

### デプロイ前（本番反映時）
- [ ] ステージング環境での動作確認完了
- [ ] ロールバック手順の確認
- [ ] 監視アラート設定の確認
- [ ] 利用者への影響評価完了

## エラー対処

### よくある問題と対処法
```bash
# Python環境問題
python -c "import sys; print(sys.prefix)"  # 仮想環境確認
.venv\Scripts\activate                      # 仮想環境再アクティベート

# 依存関係問題
pip install --upgrade pip                   # pip更新
pip install -r requirements.txt --force-reinstall  # 再インストール

# テスト失敗時
pytest tests/ -v --tb=short                # 詳細エラー表示
pytest tests/ --lf                         # 前回失敗したテストのみ実行
```
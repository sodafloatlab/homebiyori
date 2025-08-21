# Infrastructure ディレクトリ制約ルール

## 重要制約

**infrastructureディレクトリはSerenaツールの対象外である**

### 理由
- Serenaツールの`list_dir`、`find_file`等はinfrastructureディレクトリを認識しない
- infrastructure配下のTerraformファイル（.tf）は検索・読み込み対象外
- Terraformインフラ設定の確認は標準Readツールで直接パス指定が必要

### 対応方針
1. **インフラ確認時**: 必ず標準Readツールで直接ファイルパス指定
2. **事前確認**: infrastructureディレクトリの存在と構成を標準toolsで確認
3. **認証・API Gateway確認**: infrastructure/environments/prod/backend/main.tf等を直接読み込み

### 確認すべきファイル
- `infrastructure/environments/prod/backend/main.tf`: Lambda + API Gateway + Cognito統合
- `infrastructure/environments/prod/datastore/main.tf`: DynamoDB等データストア
- `infrastructure/environments/prod/frontend/main.tf`: フロントエンド関連リソース
- `infrastructure/modules/`: 再利用可能モジュール定義

### 注意点
- Serenaツールでの検索結果で「インフラが未実装」と誤判断しない
- 必ずinfrastructureディレクトリの直接確認を行う
- Terraformモジュール構成を理解してから対応方針を決定する
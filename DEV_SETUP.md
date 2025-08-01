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


## 手順3: UIプロトタイプの確認
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

# フロントエンド設計書

## ディレクトリ構成

```
src/
├── app/                          # Next.js App Router
│   ├── favicon.ico              # ファビコン
│   ├── globals.css              # グローバルスタイル
│   ├── layout.tsx               # ルートレイアウト
│   ├── page.tsx                 # ホームページ
│   └── test/                    # テストページ
│       └── page.tsx             # API統合テストページ
├── components/                   # UIコンポーネント
│   ├── ui/                      # 基本UIコンポーネント
│   │   ├── AiIcon.tsx           # AIキャラクターアイコン
│   │   ├── Button.tsx           # 再利用可能ボタン
│   │   ├── ConfirmationDialog.tsx # 確認ダイアログ
│   │   ├── LoadingSpinner.tsx   # ローディング表示
│   │   ├── ProgressBar.tsx      # プログレスバー
│   │   ├── Toast.tsx            # トースト通知
│   │   ├── TopPageWatercolorTree.tsx # トップページ専用木
│   │   ├── TouchTarget.tsx      # タッチ対応ボタン
│   │   ├── Typography.tsx       # タイポグラフィー統一
│   │   ├── UserMenu.tsx         # ユーザーメニュー
│   │   ├── WarningButton.tsx    # 警告ボタン
│   │   └── WatercolorTree.tsx   # 木の描画コンポーネント
│   ├── features/                # 機能別コンポーネント
│   │   ├── MainApp.tsx         # メインアプリケーション
│   │   ├── TopPage.tsx         # トップページ
│   │   ├── auth/               # 認証機能
│   │   │   └── AuthScreen.tsx
│   │   ├── character/          # キャラクター選択
│   │   │   └── CharacterSelection.tsx
│   │   ├── chat/               # チャット機能
│   │   │   └── ChatScreen.tsx  # 1:1チャット
│   │   ├── tree/               # 木の表示・管理
│   │   │   └── TreeView.tsx
│   │   ├── maintenance/        # メンテナンス機能
│   │   │   └── MaintenanceScreen.tsx
│   │   ├── account/           # アカウント管理
│   │   │   ├── AccountSettingsPage.tsx
│   │   │   ├── AccountDeletionConfirmPage.tsx
│   │   │   ├── AccountDeletionProgressPage.tsx
│   │   │   ├── AccountDeletionCompletePage.tsx
│   │   │   └── SubscriptionCancelPage.tsx
│   │   └── static/             # 静的ページ
│   │       ├── CommercialTransactionPage.tsx
│   │       ├── ContactFormPage.tsx
│   │       ├── FAQPage.tsx
│   │       ├── PrivacyPolicyPage.tsx
│   │       └── TermsOfServicePage.tsx
│   ├── layout/                 # レイアウト関連
│   │   ├── Footer.tsx          # フッター
│   │   ├── NavigationHeader.tsx # ナビゲーションヘッダー
│   │   ├── PremiumLayout.tsx   # プレミアム用レイアウト
│   │   ├── ResponsiveContainer.tsx # レスポンシブコンテナ
│   │   └── StaticPageLayout.tsx # 静的ページレイアウト
│   ├── network/                # ネットワーク監視
│   │   └── NetworkStatus.tsx   # ネットワーク状態表示
│   └── error/                  # エラーハンドリング
│       └── ErrorBoundary.tsx   # エラーバウンダリー
├── lib/                        # ユーティリティ・ヘルパー
│   ├── constants.ts            # 定数定義
│   ├── utils.ts                # ユーティリティ関数
│   ├── hooks.ts                # カスタムフック
│   ├── auth.ts                 # 認証ヘルパー
│   ├── api.ts                  # APIクライアント統合
│   ├── api/                    # API関連
│   │   ├── chatService.ts      # チャットAPI
│   │   ├── contact.ts          # お問い合わせAPI
│   │   └── treeService.ts      # 木の成長API
│   ├── services/               # ビジネスロジック
│   │   ├── index.ts            # サービス統合
│   │   ├── AccountDeletionService.ts # アカウント削除
│   │   ├── chatService.ts      # チャットサービス
│   │   ├── notificationService.ts # 通知サービス
│   │   ├── treeService.ts      # 木の成長サービス
│   │   └── userService.ts      # ユーザーサービス
│   ├── network/                # ネットワーク監視
│   │   └── networkMonitor.ts   # ネットワークモニター
│   └── test/                   # テストユーティリティ
│       └── apiTest.ts          # API統合テスト
├── stores/                     # 状態管理（Zustand）
│   ├── authStore.ts           # 認証状態
│   ├── chatStore.ts           # チャット状態
│   ├── treeStore.ts           # 木の成長状態
│   ├── notificationStore.ts   # 通知状態
│   └── maintenanceStore.ts    # メンテナンス状態
└── types/                      # TypeScript型定義
    ├── index.ts               # 型定義統合
    └── api.ts                 # API関連型定義
```

## 技術スタック

### 基本フレームワーク
- **Next.js 14** (App Router)
- **TypeScript** 
- **Tailwind CSS**
- **React Hook Form**
- **Framer Motion** (アニメーション)

### 状態管理・データ取得
- **Zustand** (グローバル状態管理)
- **Axios** (HTTPクライアント)
- **AWS Amplify Auth** (認証クライアント)

### バックエンド連携
- **API Gateway** 経由でLambda関数群と接続
- **JWT認証** (Cognito User Pool)
- **リアルタイム通知** (WebSocketまたはポーリング)

## 主要機能設計

### 認証システム
- **Google OAuth** によるソーシャルログイン
- **JWT自動更新** 機能
- **認証状態** のZustand管理
- **認証ガード** コンポーネント

### チャット機能
- **LangChain統合** バックエンドとの通信
- **3つのAIキャラクター** 対応（たまさん・まどか姉さん・ヒデじい）
- **リアルタイム会話** 履歴管理
- **InteractionMode** 対応（ライト・スタンダード・ディープ）
- **文字数制限** (2000文字)

### 木の成長システム
- **Framer Motion** による木の描画・アニメーション
- **ほめの実** 表示・管理（6段階成長対応）
- **成長進捗** の可視化
- **キャラクター別テーマカラー** 対応
- **TopPageWatercolorTree** トップページ専用表示

### ネットワーク監視
- **リアルタイム接続** 状態監視
- **ネットワーク状態** 表示コンポーネント
- **オフライン検知** 機能
- **接続復旧** 自動検知

### メンテナンス機能（ハイブリッド検知システム）
- **Primary Detection**: API Interceptor経由のリアルタイム検知
  - 全API呼び出し時に自動的にメンテナンス状態を検知
  - レスポンスヘッダー・データの即座チェック
  - ユーザー操作と同時のメンテナンス状態反映
- **Secondary Detection**: 定期ヘルスチェック（補助）
  - 30秒間隔での `/api/health` エンドポイント監視
  - API非活用時のメンテナンス状態変化検知
  - 自動更新機能（手動切り替え可能）
- **統一検知システム**:
  - **Priority 1**: HTTP 503 Service Unavailable（最高優先度）
  - **Priority 2**: Response Headers (`x-maintenance-mode`等)（中優先度）
  - **Priority 3**: API Response Data (`maintenance_status`)（低優先度）
- **UI表示機能**:
  - **フルスクリーン** およびモーダル表示対応
  - **復旧予定時刻** および影響範囲表示  
  - **メンテナンスストア** との完全統合
  - **レスポンシブデザイン** 対応

### アカウント管理
- **プロフィール設定** 管理
- **アカウント削除** 3段階フロー
- **サブスクリプション** キャンセル機能
- **削除進行状況** 表示
- **完了画面** 表示

### 静的ページ機能
- **利用規約** ページ
- **プライバシーポリシー** ページ
- **FAQ** ページ（検索・フィルタ機能付き）
- **お問い合わせ** フォーム
- **特定商取引法** 表記
- **ResponsiveContainer** レイアウト統一

### 開発・テスト支援
- **API統合テスト** ページ（/test）
- **エラーバウンダリー** 統合
- **ネットワーク状態** 詳細表示

## レスポンシブデザイン

### ブレークポイント戦略
- **モバイルファースト** 設計
- **sm**: 640px (スマートフォン)
- **md**: 768px (タブレット)
- **lg**: 1024px (デスクトップ)

### タッチ対応
- **TouchTarget** コンポーネントによる統一
- **44px以上** のタップエリア確保
- **スワイプ・ジェスチャー** 対応

## セキュリティ設計

### 認証・認可
- **JWT検証** (API Gateway Layer)
- **クライアント側** 認証状態管理
- **自動ログアウト** (トークン期限切れ)

### データ保護
- **機密情報** のローカル保存回避
- **HTTPS通信** 必須
- **XSS対策** (DOMPurify)
- **CSRF対策** (SameSite Cookie)

## パフォーマンス最適化

### コード分割
- **ページ別** 動的インポート
- **機能別** コンポーネント分割
- **Lazy Loading** 対応

### キャッシュ戦略
- **API応答** クライアントサイドキャッシュ
- **静的アセット** CDN活用
- **画像最適化** (Next.js Image)

### SEO対応
- **SSG/ISR** モード活用
- **メタタグ** 動的生成
- **構造化データ** 対応

## 開発・テスト戦略

### テスト構成
- **Jest + React Testing Library** (単体テスト)
- **Playwright** (E2Eテスト)
- **Chromatic** (視覚回帰テスト)

### 開発環境
- **TypeScript** 厳格モード
- **ESLint + Prettier** コード品質管理
- **Husky + lint-staged** プリコミットフック
- **API統合テスト** (/test ページ)
- **エラーバウンダリー** 統合
- **ネットワーク監視** 機能
- **ハイブリッドメンテナンス検知** システム統合

## メンテナンス検知アーキテクチャ設計

### システム構成
```
User API Request → API Interceptor (Primary Detection) → MaintenanceStore
                                ↓
                      Immediate UI Response
                                
Health Check Timer → /api/health → API Interceptor → MaintenanceStore (Secondary)
    (30秒間隔)                           ↓
                              Backup Coverage
```

### 検知優先度システム
1. **HTTP 503 Service Unavailable** - バックエンドミドルウェア直接応答
2. **Response Headers** - `x-maintenance-mode: true` 等のカスタムヘッダー
3. **API Response Data** - `maintenance_status.is_maintenance_mode: true`

### アーキテクチャ利点
- **高レスポンシブ性**: ユーザー操作と同時にメンテナンス検知
- **冗長性確保**: 定期チェックでAPI非使用時もカバー
- **統一処理**: MaintenanceStore統一ハンドラーで状態管理
- **重複回避**: Primary/Secondary Detection区別によるログ重複防止
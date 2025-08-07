# フロントエンド設計書

## ディレクトリ構成

```
src/
├── app/                          # Next.js App Router
│   ├── globals.css              # グローバルスタイル
│   ├── layout.tsx               # ルートレイアウト
│   └── page.tsx                 # ホームページ
├── components/                   # UIコンポーネント
│   ├── ui/                      # 基本UIコンポーネント
│   │   ├── Button.tsx           # 再利用可能ボタン
│   │   ├── TouchTarget.tsx      # タッチ対応ボタン
│   │   ├── Typography.tsx       # タイポグラフィー統一
│   │   ├── UserMenu.tsx         # ユーザーメニュー
│   │   ├── LoadingSpinner.tsx   # ローディング表示
│   │   ├── Toast.tsx            # トースト通知
│   │   ├── WatercolorTree.tsx   # 木の描画コンポーネント
│   │   └── TopPageWatercolorTree.tsx # トップページ専用木
│   ├── features/                # 機能別コンポーネント
│   │   ├── auth/               # 認証機能
│   │   │   └── AuthScreen.tsx
│   │   ├── chat/               # チャット機能
│   │   │   ├── ChatHeader.tsx  # 共有チャットヘッダー
│   │   │   ├── ChatScreen.tsx  # 1:1チャット
│   │   │   └── TreeGrowthStatus.tsx # 木の成長状況
│   │   ├── character/          # キャラクター選択
│   │   │   └── CharacterSelection.tsx
│   │   ├── tree/               # 木の表示・管理
│   │   │   └── TreeView.tsx
│   │   ├── subscription/       # サブスクリプション
│   │   │   ├── PremiumLandingPage.tsx
│   │   │   └── SubscriptionCancelPage.tsx
│   │   ├── maintenance/        # メンテナンス機能
│   │   │   └── MaintenanceScreen.tsx
│   │   ├── notifications/      # 通知機能
│   │   │   ├── NotificationList.tsx
│   │   │   ├── NotificationItem.tsx
│   │   │   └── NotificationBadge.tsx
│   │   ├── admin/              # 管理機能（管理者のみ）
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminNotificationManager.tsx
│   │   │   └── MaintenanceControl.tsx
│   │   ├── static/             # 静的ページ
│   │   │   ├── TermsOfServicePage.tsx
│   │   │   ├── PrivacyPolicyPage.tsx
│   │   │   ├── ContactFormPage.tsx
│   │   │   ├── CommercialTransactionPage.tsx
│   │   │   └── FAQPage.tsx
│   │   ├── MainApp.tsx         # メインアプリケーション
│   │   └── TopPage.tsx         # トップページ
│   └── layout/                 # レイアウト関連
│       ├── NavigationHeader.tsx # ナビゲーションヘッダー
│       ├── Footer.tsx          # フッター
│       ├── PremiumLayout.tsx   # プレミアム用レイアウト
│       ├── ResponsiveContainer.tsx # レスポンシブコンテナ
│       └── StaticPageLayout.tsx # 静的ページレイアウト
├── lib/                        # ユーティリティ・ヘルパー
│   ├── constants.ts            # 定数定義
│   ├── utils.ts                # ユーティリティ関数
│   ├── hooks.ts                # カスタムフック
│   ├── api.ts                  # APIクライアント統合
│   ├── storage.ts              # ローカルストレージ管理
│   └── validators.ts           # 入力バリデーション
├── stores/                     # 状態管理（Zustand）
│   ├── authStore.ts           # 認証状態
│   ├── chatStore.ts           # チャット状態
│   ├── treeStore.ts           # 木の成長状態
│   ├── notificationStore.ts   # 通知状態
│   ├── maintenanceStore.ts    # メンテナンス状態
│   └── subscriptionStore.ts   # サブスクリプション状態
├── types/                      # TypeScript型定義
│   ├── index.ts               # 型定義統合
│   ├── api.ts                 # API関連型定義
│   ├── chat.ts                # チャット関連型定義
│   ├── tree.ts                # 木の成長関連型定義
│   └── notification.ts        # 通知関連型定義
└── styles/                     # スタイル関連
    └── globals.css             # グローバルCSS
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
- **3つのAIキャラクター** 対応
- **リアルタイム会話** 履歴管理
- **文字数制限** (2000文字)

### 木の成長システム
- **Canvas API** による木の描画
- **実の表示・管理** 
- **成長進捗** の可視化
- **キャラクター別テーマカラー** 対応

### 通知システム
- **アプリ内通知** 一覧・バッジ表示
- **未読数管理**
- **通知タイプ別** アイコン・色分け
- **既読・未読** 状態管理

### メンテナンス機能
- **API応答監視** による自動検知
- **メンテナンス画面** 自動表示
- **グローバル状態制御**
- **復旧予定時刻** 表示

### サブスクリプション機能
- **Stripe Checkout** 連携
- **プラン切り替え**
- **請求履歴** 表示
- **解約・再開** 機能

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
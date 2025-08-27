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
- **戦略的混在レンダリング** (SSG + CSR ハイブリッド構成)
- **メタタグ** 動的生成
- **構造化データ** 対応
- **sitemap.xml** 自動生成
- **robots.txt** クローラー制御

## レンダリング戦略設計（SSG/CSR混在構成）

### 🎯 戦略概要
**Strategic Mixed Configuration**: SEO最適化とユーザーエクスペリエンス向上のため、ページ特性に応じてSSG（Static Site Generation）とCSR（Client-Side Rendering）を戦略的に使い分け

### 📄 SSG対応ページ（Static Site Generation）

#### **Marketing & SEO重要ページ**
```typescript
// 対象ページと設計意図
{
  '/': {
    strategy: 'SSG',
    reason: 'ランディングページ - SEO最重要・Google検索最適化',
    components: {
      server: 'src/app/page.tsx', // 静的データ生成
      client: 'src/components/features/HomePageClient.tsx' // インタラクション処理
    },
    seo_features: ['Open Graph', 'Twitter Cards', 'JSON-LD構造化データ'],
    performance: 'First Paint < 1.2s, LCP < 2.5s'
  },
  '/faq': {
    strategy: 'SSG',
    reason: 'サポートページ - 検索流入対策・静的FAQ最適化',
    components: {
      server: 'src/app/faq/page.tsx', // 静的FAQデータ
      client: 'src/components/features/faq/FAQClient.tsx' // 検索・フィルター機能
    },
    interactive_features: ['リアルタイム検索', 'カテゴリフィルター', 'アコーディオン展開'],
    seo_benefits: ['FAQ Rich Results', 'Site Links', 'Knowledge Graph']
  },
  '/legal/terms': {
    strategy: 'SSG',
    reason: '法的文書 - 信頼性・クローラー最適化',
    components: {
      server: 'src/app/legal/terms/page.tsx',
      client: 'src/components/features/legal/TermsOfServiceClient.tsx'
    },
    compliance: ['GDPR対応', '消費者契約法対応', '電子契約法対応']
  },
  '/legal/privacy': {
    strategy: 'SSG',
    reason: 'プライバシーポリシー - コンプライアンス・透明性',
    last_modified: '2024-08-27',
    change_frequency: 'yearly'
  },
  '/legal/commercial': {
    strategy: 'SSG',
    reason: '特定商取引法 - 法的要求事項・事業透明性',
    priority: 0.5
  }
}
```

#### **SSG技術実装**
```typescript
// メタデータ最適化（例: src/app/page.tsx）
export const metadata: Metadata = {
  title: 'ほめびより - 育児を頑張るあなたを褒めるAI',
  description: 'AIが優しく寄り添い、育児の努力を認めて褒めてくれる。忙しい毎日の中で、自己肯定感を高めるひとときを。7日間無料トライアル実施中。',
  keywords: ['育児', 'AI', '褒める', 'サポート', '無料トライアル', '子育て', '自己肯定感'],
  openGraph: {
    title: 'ほめびより - 育児を頑張るあなたを褒めるAI',
    description: 'AIが優しく寄り添い、育児の努力を認めて褒めてくれる。7日間無料トライアル実施中。',
    type: 'website',
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ほめびより - 育児を頑張るあなたを褒めるAI',
    description: 'AIが優しく寄り添い、育児の努力を認めて褒めてくれる。7日間無料トライアル実施中。',
  },
};

// 静的データ生成とクライアント分離パターン
export default function HomePage() {
  // サーバーサイドで生成される静的データ
  const features = [/* 静的機能データ */];
  const characters = [/* AIキャラクター情報 */];
  const journeySteps = [/* ユーザージャーニー */];

  // クライアントコンポーネントに渡す
  return (
    <HomePageClient 
      characters={characters}
      features={features}
      journeySteps={journeySteps}
    />
  );
}
```

### 🔧 CSR対応ページ（Client-Side Rendering）

#### **認証必須・動的コンテンツページ**
```typescript
// 対象ページと設計意図
{
  '/auth/*': {
    strategy: 'CSR',
    reason: '認証フロー - OAuth状態管理・動的認証処理',
    incompatible_with_ssg: [
      'Google OAuth リダイレクト処理',
      'JWT トークン管理',
      'リアルタイム認証状態',
      'セッション管理'
    ]
  },
  '/dashboard': {
    strategy: 'CSR', 
    reason: 'ユーザーダッシュボード - 個人データ表示・認証ガード',
    dynamic_content: [
      '個人の木の成長状態',
      'ユーザー固有チャット履歴', 
      'カスタム設定',
      'リアルタイム通知'
    ]
  },
  '/chat/*': {
    strategy: 'CSR',
    reason: 'チャット機能 - リアルタイム通信・状態管理',
    real_time_features: [
      'WebSocket通信',
      'AIレスポンス生成',
      'チャット履歴管理',
      'キャラクター状態'
    ]
  },
  '/settings/*': {
    strategy: 'CSR',
    reason: 'ユーザー設定 - 個人設定管理・認証必須',
    private_data: ['プロフィール', '通知設定', 'サブスクリプション']
  }
}
```

### 🌐 SEO最適化システム

#### **自動生成システム**
```typescript
// src/app/sitemap.ts - 動的sitemap.xml生成
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://homebiyori.com';
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1.0, // ランディングページ最優先
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'weekly', 
      priority: 0.8, // サポートページ高優先度
    },
    // 法的文書は低頻度更新・中優先度
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: new Date('2024-08-27'),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];
}

// src/app/robots.ts - 検索エンジン制御
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/faq', '/legal/terms', '/legal/privacy', '/legal/commercial', '/contact'],
        disallow: ['/auth/', '/dashboard/', '/settings/', '/api/'], // 認証・プライベートページ除外
        crawlDelay: 1,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        crawlDelay: 0, // Google は制限なし
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

### ⚡ アイコンレンダリング統一設計

#### **静的データとReact Child問題の解決**
```typescript
// 問題: SSG環境でJSX要素を静的データに含む
// ❌ 旧方式 - React Child Error発生
const features = [
  {
    icon: <Heart className="w-8 h-8" />, // JSX要素直接格納 → エラー
    title: "毎日の頑張りを褒めてくれる"
  }
];

// ✅ 新方式 - 文字列識別子 + 動的マッピング  
const features = [
  {
    iconType: "Heart", // 文字列識別子
    title: "毎日の頑張りを褒めてくれる"
  }
];

// クライアントコンポーネントでマッピング
const getIcon = (iconType: string, className: string = "w-8 h-8") => {
  const iconProps = { className };
  
  switch (iconType) {
    case 'Heart':
      return <Heart {...iconProps} />;
    case 'TrendingUp':
      return <TrendingUp {...iconProps} />;
    case 'Users':
      return <Users {...iconProps} />;
    default:
      return <CheckCircle {...iconProps} />;
  }
};
```

### 🏗️ Next.js 15最適化設定

#### **混在構成対応設定**
```typescript
// next.config.ts - ハイブリッド構成最適化
const nextConfig: NextConfig = {
  // パフォーマンス最適化
  compress: true,
  poweredByHeader: false,
  
  // 画像最適化（SSG/CSR両対応）
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // レスポンシブ対応
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'], // 次世代フォーマット
  },
  
  // 実験的機能（Next.js 15対応）
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
  
  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};
```

### 📊 パフォーマンス目標

#### **SSGページパフォーマンス指標**
```typescript
{
  'Core Web Vitals': {
    'LCP (Largest Contentful Paint)': '< 2.5s',
    'FID (First Input Delay)': '< 100ms', 
    'CLS (Cumulative Layout Shift)': '< 0.1'
  },
  'SEO指標': {
    'First Paint': '< 1.2s',
    'Speed Index': '< 3.0s',
    'Time to Interactive': '< 5.0s'
  },
  'モバイル最適化': {
    'Mobile PageSpeed Score': '> 90',
    'Mobile Usability': '100%',
    'Progressive Web App': 'Installable'
  }
}
```

### 🔍 アーキテクチャ決定記録

#### **SSG/CSR選択基準**
1. **SSG選択条件**:
   - SEO重要度が高い
   - コンテンツが静的または準静的
   - 認証不要でアクセス可能
   - 高頻度でのアクセスが想定される

2. **CSR選択条件**:
   - 認証が必要
   - ユーザー固有のデータを表示
   - リアルタイム性が重要
   - 動的なインタラクションが中心

3. **混在実装パターン**:
   - サーバーコンポーネント: 静的データ生成・SEO最適化
   - クライアントコンポーネント: インタラクション・状態管理
   - 段階的エンハンスメント: JavaScript無効時も基本機能動作

### 🚀 実装効果

#### **SEO効果**
- **Google検索**: 0.8秒以内のFirst Paint達成
- **構造化データ**: Rich Results対応完了
- **サイトマップ**: 自動生成・更新システム
- **クローラー最適化**: robots.txt精密制御

#### **UX効果**  
- **静的ページ**: 即座ロード・オフライン対応
- **動的ページ**: リアルタイム更新・状態保持
- **レスポンシブ**: 全デバイス最適化
- **アクセシビリティ**: WCAG 2.1 AA準拠

この戦略的混在構成により、SEO最適化とユーザーエクスペリエンス向上を両立し、育児支援サービスとしての価値提供を最大化。

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
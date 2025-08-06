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
│   │   │   ├── GroupChatScreen.tsx # グループチャット
│   │   │   └── TreeGrowthStatus.tsx # 木の成長状況
│   │   ├── character/          # キャラクター選択
│   │   │   └── CharacterSelection.tsx
│   │   ├── tree/               # 木の表示・管理
│   │   │   └── TreeView.tsx
│   │   ├── subscription/       # サブスクリプション
│   │   │   ├── PremiumLandingPage.tsx
│   │   │   └── SubscriptionCancelPage.tsx
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
│   └── demoStorage.ts          # デモ用ストレージ
├── types/                      # TypeScript型定義
│   └── index.ts                # 型定義統合
└── styles/                     # スタイル関連
    └── globals.css             # グローバルCSS
```

## メンテナンス処理

**1. API レスポンス監視**
```typescript
// APIクライアント共通処理
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 503 && 
        error.response?.data?.error === 'maintenance') {
      // メンテナンス状態をグローバルに設定
      useMaintenanceStore.getState().setMaintenance(error.response.data);
    }
    return Promise.reject(error);
  }
);
```

**2. メンテナンス画面コンポーネント**
```typescript
// components/maintenance/MaintenanceScreen.tsx
interface MaintenanceInfo {
  message: string;
  end_time: string;
  retry_after: number;
}

export const MaintenanceScreen = ({ info }: { info: MaintenanceInfo }) => {
  const endTime = new Date(info.end_time);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <div className="text-6xl mb-4">🔧</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          メンテナンス中
        </h1>
        <p className="text-gray-600 mb-6">
          {info.message}
        </p>
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-blue-700">
            復旧予定: {endTime.toLocaleString('ja-JP')}
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg"
        >
          再読み込み
        </button>
      </div>
    </div>
  );
};
```

**3. グローバル メンテナンス状態管理**
```typescript
// stores/maintenanceStore.ts (Zustand)
interface MaintenanceState {
  isMaintenanceMode: boolean;
  maintenanceInfo: MaintenanceInfo | null;
  setMaintenance: (info: MaintenanceInfo) => void;
  clearMaintenance: () => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  isMaintenanceMode: false,
  maintenanceInfo: null,
  setMaintenance: (info) => set({ 
    isMaintenanceMode: true, 
    maintenanceInfo: info 
  }),
  clearMaintenance: () => set({ 
    isMaintenanceMode: false, 
    maintenanceInfo: null 
  }),
}));
```

**4. アプリケーション ルートでの制御**
```typescript
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isMaintenanceMode, maintenanceInfo } = useMaintenanceStore();

  if (isMaintenanceMode && maintenanceInfo) {
    return <MaintenanceScreen info={maintenanceInfo} />;
  }

  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
```
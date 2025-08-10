# UI設計書 - アカウント削除機能

## 概要
アカウント削除機能のUI/UX設計とコンポーネント仕様を定義します。
サブスクリプションキャンセルとは独立した安全な削除フローを提供し、誤操作防止と透明性を重視した設計です。

---

## 画面構成

### 1. AccountSettingsPage（アカウント設定画面）

#### 機能概要
- ユーザープロフィール表示・編集
- サブスクリプション状況表示
- アカウント削除へのエントリーポイント

#### UI要素
```typescript
interface AccountSettingsPageProps {
  userProfile: UserProfile;
  subscriptionStatus: SubscriptionStatus;
  onProfileUpdate: (profile: UserProfileUpdate) => void;
  onAccountDeletion: () => void;
}
```

#### レイアウト構成
```
┌─────────────────────────────────────────┐
│ 🔙 アカウント設定                        │
├─────────────────────────────────────────┤
│ 👤 プロフィール情報                      │
│   ┌─────────────────────────────────────┐ │
│   │ ニックネーム: [ほめママ____]       │ │
│   │ AIキャラクター: たまさん ▼        │ │
│   │ 褒めレベル: ノーマル ▼            │ │
│   │          [更新] [キャンセル]        │ │
│   └─────────────────────────────────────┘ │
│                                         │
│ 💳 サブスクリプション                   │
│   ┌─────────────────────────────────────┐ │
│   │ 現在のプラン: 月額プラン            │ │
│   │ 次回更新: 2024-09-10               │ │
│   │ 状況: アクティブ                   │ │
│   │          [プラン変更] [解約]        │ │
│   └─────────────────────────────────────┘ │
│                                         │
│ ⚠️ 危険な操作                            │
│   ┌─────────────────────────────────────┐ │
│   │ 🗑️ アカウントを削除                │ │
│   │ この操作により、すべてのデータが    │ │
│   │ 完全に削除されます                  │ │
│   │          [アカウントを削除]         │ │
│   └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### スタイル仕様
- **危険エリア**: `border: 2px solid #ef4444`（赤色）
- **削除ボタン**: `bg-red-600 hover:bg-red-700`
- **警告アイコン**: `⚠️` Lucide `AlertTriangle`
- **レスポンシブ**: モバイル優先（最小幅320px対応）

---

### 2. AccountDeletionConfirmPage（削除確認画面）

#### 機能概要
- 3段階確認プロセス（Step 1→2→3）
- サブスクリプション状態確認
- 削除データ一覧表示
- 削除タイプ選択

#### UI要素
```typescript
interface AccountDeletionConfirmPageProps {
  accountStatus: AccountStatus;
  currentStep: 1 | 2 | 3;
  onBack: () => void;
  onNext: () => void;
  onConfirm: (deletionRequest: DeletionRequest) => void;
}
```

#### Step 1: 現状確認
```
┌─────────────────────────────────────────┐
│ 🔙 アカウント削除の確認                  │
├─────────────────────────────────────────┤
│ ステップ 1/3: 現在の状況確認             │
│                                         │
│ 📊 アカウント情報                       │
│   ┌─────────────────────────────────────┐ │
│   │ 作成日: 2024年5月15日               │ │
│   │ ニックネーム: ほめママ              │ │
│   │ 利用期間: 約3ヶ月                  │ │
│   └─────────────────────────────────────┘ │
│                                         │
│ 💳 サブスクリプション                   │
│   ┌─────────────────────────────────────┐ │
│   │ プラン: 月額プラン（¥980）          │ │
│   │ 状態: アクティブ                   │ │
│   │ 次回課金: 2024年9月10日             │ │
│   │ 解約予定: なし                     │ │
│   └─────────────────────────────────────┘ │
│                                         │
│ 📈 データ概要                           │
│   ┌─────────────────────────────────────┐ │
│   │ チャット数: 150件                  │ │
│   │ ほめの実: 12個                     │ │
│   │ 木の成長: レベル5                  │ │
│   │ データサイズ: 約2.3MB               │ │
│   └─────────────────────────────────────┘ │
│                                         │
│              [戻る] [次へ]              │
└─────────────────────────────────────────┘
```

#### Step 2: 削除内容確認
```
┌─────────────────────────────────────────┐
│ ステップ 2/3: 削除内容の確認             │
│                                         │
│ 🎯 削除タイプを選択してください          │
│                                         │
│ ○ アカウントのみ削除                    │
│   チャット履歴・プロフィールを削除      │
│   サブスクリプションは継続              │
│                                         │
│ ○ サブスクリプションのみ解約            │
│   月額課金を停止                       │
│   アカウント・データは保持              │
│                                         │
│ ● アカウント＋サブスクリプション削除    │
│   すべてのデータと課金を完全停止        │
│                                         │
│ 🗑️ 削除されるデータ                     │
│   ┌─────────────────────────────────────┐ │
│   │ ✓ チャット履歴（150件）             │ │
│   │ ✓ ほめの実データ（12個）            │ │
│   │ ✓ 木の成長記録（レベル5）           │ │
│   │ ✓ ユーザープロフィール              │ │
│   │ ✓ AI設定情報                       │ │
│   └─────────────────────────────────────┘ │
│                                         │
│ ⚠️ この操作は元に戻せません               │
│                                         │
│              [戻る] [次へ]              │
└─────────────────────────────────────────┘
```

#### Step 3: 最終確認
```
┌─────────────────────────────────────────┐
│ ステップ 3/3: 最終確認                  │
│                                         │
│ 🔍 削除理由（任意）                     │
│ ┌─────────────────────────────────────┐   │
│ │ サービスが不要になった           ▼ │   │
│ └─────────────────────────────────────┘   │
│                                         │
│ 💬 フィードバック（任意）               │
│ ┌─────────────────────────────────────┐   │
│ │ サービス改善のご意見をお聞かせくだ... │   │
│ │                                   │   │
│ │                                   │   │
│ └─────────────────────────────────────┘   │
│                                         │
│ ✋ 確認のため「削除」と入力してください    │
│ ┌─────────────────────────────────────┐   │
│ │ [_____________________]             │   │
│ └─────────────────────────────────────┘   │
│                                         │
│ □ 上記内容を理解し、削除に同意します     │
│                                         │
│        [戻る] [削除を実行する]          │
└─────────────────────────────────────────┘
```

---

### 3. AccountDeletionProgressPage（削除進行状況画面）

#### 機能概要
- 削除処理の進行状況をリアルタイム表示
- 各ステップの完了状況を視覚化
- 推定完了時間表示

#### UI要素
```typescript
interface AccountDeletionProgressPageProps {
  processId: string;
  actionsPerformed: DeletionAction[];
  estimatedCompletion: string;
  onStatusCheck: () => void;
}
```

#### レイアウト
```
┌─────────────────────────────────────────┐
│ 🔄 アカウント削除処理中                 │
├─────────────────────────────────────────┤
│ 処理ID: proc_a1b2c3d4                   │
│ 推定完了: 2024-08-10 01:50:00           │
│                                         │
│ ████████████████░░░░  75%              │
│                                         │
│ 📋 処理状況                             │
│   ┌─────────────────────────────────────┐ │
│   │ ✅ サブスクリプション解約            │ │
│   │    完了: 01:45:32                   │ │
│   │                                     │ │
│   │ ⏳ データベースデータ削除            │ │
│   │    進行中... (推定完了: 01:48:00)   │ │
│   │                                     │ │
│   │ ⏳ Cognitoアカウント削除             │ │
│   │    待機中... (推定完了: 01:50:00)   │ │
│   └─────────────────────────────────────┘ │
│                                         │
│ ⚠️ この画面を閉じないでください           │
│   処理完了まで少々お待ちください         │
│                                         │
│              [状況を更新]               │
└─────────────────────────────────────────┘
```

#### 自動更新機能
- 5秒間隔で状況自動更新
- プログレスバーアニメーション
- 完了時自動遷移

---

### 4. AccountDeletionCompletePage（削除完了画面）

#### 機能概要
- 削除処理完了通知
- サポート連絡先表示
- 自動ログアウト実行

#### UI要素
```typescript
interface AccountDeletionCompletePageProps {
  completionTime: string;
  supportContact: string;
  onClose: () => void;
}
```

#### レイアウト
```
┌─────────────────────────────────────────┐
│ ✅ アカウント削除が完了しました           │
├─────────────────────────────────────────┤
│                                         │
│          🎊 お疲れ様でした 🎊           │
│                                         │
│ 📅 完了日時: 2024-08-10 01:50:23        │
│                                         │
│ ✅ 処理完了項目:                        │
│   • サブスクリプション解約               │
│   • チャット履歴・プロフィール削除       │
│   • アカウント情報削除                  │
│                                         │
│ 📞 サポートが必要な場合:                │
│   support@homebiyori.com               │
│                                         │
│ 🙏 Homebiyoriをご利用いただき            │
│    ありがとうございました                │
│                                         │
│ ⏰ 5秒後に自動ログアウトします...         │
│                                         │
│               [今すぐ終了]              │
└─────────────────────────────────────────┘
```

---

## 状態管理（Zustand Store）

```typescript
interface AccountDeletionStore {
  // 状態
  currentStep: 'settings' | 'confirm' | 'progress' | 'complete';
  confirmStep: 1 | 2 | 3;
  accountStatus: AccountStatus | null;
  deletionRequest: DeletionRequest | null;
  processId: string | null;
  loading: boolean;
  error: string | null;
  
  // アクション
  fetchAccountStatus: () => Promise<void>;
  setConfirmStep: (step: 1 | 2 | 3) => void;
  requestDeletion: (request: DeletionRequest) => Promise<void>;
  confirmDeletion: (confirmation: DeletionConfirmation) => Promise<void>;
  checkDeletionProgress: (processId: string) => Promise<void>;
  resetDeletionFlow: () => void;
}
```

## API統合サービス

```typescript
class AccountDeletionService {
  private apiClient: APIClient;
  
  async getAccountStatus(): Promise<AccountStatus> {
    return this.apiClient.get('/users/account-status');
  }
  
  async requestAccountDeletion(request: DeletionRequest): Promise<DeletionResponse> {
    return this.apiClient.post('/users/request-deletion', request);
  }
  
  async confirmAccountDeletion(confirmation: DeletionConfirmation): Promise<DeletionProgressResponse> {
    return this.apiClient.post('/users/confirm-deletion', confirmation);
  }
}
```

## コンポーネント設計

### 共通UI要素

#### DangerButton（危険操作ボタン）
```typescript
interface DangerButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}
```

#### ProgressBar（プログレスバー）
```typescript
interface ProgressBarProps {
  progress: number; // 0-100
  animated?: boolean;
  color?: 'blue' | 'green' | 'red';
  size?: 'sm' | 'md' | 'lg';
}
```

#### ConfirmationDialog（確認ダイアログ）
```typescript
interface ConfirmationDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}
```

## セキュリティ・アクセシビリティ考慮事項

### セキュリティ
- すべての削除操作でJWT認証必須
- CSRF対策（SameSite Cookie + トークン）
- 削除確認の二段階認証
- セッション無効化処理
- ログアウト後のローカルストレージクリア

### アクセシビリティ
- **スクリーンリーダー対応**: 適切なaria-label設定
- **キーボードナビゲーション**: Tab順序・Enterキー対応
- **色覚サポート**: 色に依存しない警告表示（アイコン併用）
- **コントラスト**: WCAG 2.1 AA準拠（4.5:1以上）
- **フォーカス**: 明確な視覚的フィードバック

### レスポンシブ対応
- **ブレークポイント**: 320px（モバイル）、768px（タブレット）、1024px（デスクトップ）
- **タッチ対応**: 44px以上のタップターゲット
- **テキストサイズ**: 最小16px（読みやすさ確保）
- **余白調整**: 画面サイズに応じた適切な spacing
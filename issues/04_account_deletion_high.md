# [FEATURE] アカウント削除3段階フローの完成

## 概要
requirements.md 4.3節 アカウント削除機能の詳細段階的プロセス実装
透明性確保・選択の自由・段階的プロセス・心理的配慮を重視した安全な削除フロー

## 要件詳細
### UX設計原則
- **透明性確保**: ユーザーが十分な情報に基づいて決定できる
- **選択の自由**: サブスクリプションとアカウント削除を分離して選択可能
- **段階的プロセス**: 誤操作防止のための段階的確認
- **心理的配慮**: 進捗表示で手続きの負担を軽減

## デモコンポーネント活用
✅ **利用可能**: 基本的な削除関連コンポーネント実装済み
- `frontend/src/components/features/account/AccountDeletionConfirmPage.tsx`
- `frontend/src/components/features/account/AccountDeletionProgressPage.tsx`  
- `frontend/src/components/features/account/AccountDeletionCompletePage.tsx`
- `frontend/src/components/features/account/AccountSettingsPage.tsx`

## 実装範囲

### 第1段階：サブスクリプション状態確認と選択
- [ ] 現在のサブスクリプション状態表示
- [ ] 選択肢提供:
  - 「サブスクリプションをキャンセルしてアカウントを削除」
  - 「サブスクリプションのみキャンセル（アカウントは残す）」
  - 「アカウントのみ削除（サブスクリプションは別途解約が必要）」
- [ ] サブスクリプションがない場合の処理
- [ ] 進捗インジケーター（1/3）

### 第2段階：削除内容の詳細説明
- [ ] 進捗インジケーター（2/3）
- [ ] 削除されるデータの詳細説明:
  - チャット履歴
  - 木の成長データ
  - ユーザープロフィール
  - AI設定情報
- [ ] 「この操作は元に戻せません」警告表示
- [ ] 削除データ一覧の詳細表示

### 第3段階：最終確認と実行
- [ ] 進捗インジケーター（3/3）
- [ ] 最終確認画面
- [ ] 「削除」と入力することを要求（誤操作防止）
- [ ] 削除処理の順次実行:
  - サブスクリプション解約（選択された場合）
  - DynamoDBからのユーザーデータ完全削除
  - Amazon Cognitoからのユーザーアカウント削除
- [ ] 削除完了画面表示
- [ ] 自動ログアウト処理

## エラーハンドリング
- [ ] サブスクリプション解約エラー処理
- [ ] データ削除エラー処理  
- [ ] 削除処理タイムアウト処理
- [ ] 各段階での適切なエラーメッセージ表示

## 法的・コンプライアンス要件
- [ ] 30日以内のバックアップ完全削除
- [ ] 法的要請時の最低限データ保持対応
- [ ] ユーザーへの通知機能

## UI/UX仕様
```tsx
// 進捗インジケーター
<div className="progress-indicator">
  <div className="step active">1. 現状確認</div>
  <div className="step">2. 削除内容確認</div>
  <div className="step">3. 最終確認</div>
</div>

// 削除確認入力
<div className="deletion-confirmation">
  <label>確認のため「削除」と入力してください</label>
  <input 
    type="text" 
    value={confirmText}
    onChange={(e) => setConfirmText(e.target.value)}
    placeholder="削除"
  />
  <button 
    disabled={confirmText !== '削除'}
    onClick={handleDeletion}
  >
    削除を実行する
  </button>
</div>
```

## 受入基準
- [ ] 3段階のプログレスインジケーター表示
- [ ] サブスクリプション状態に応じた適切な選択肢表示
- [ ] 削除データの詳細一覧表示
- [ ] 「削除」文字入力による誤操作防止機能
- [ ] 段階的な確認プロセスの完全動作
- [ ] 適切なエラーハンドリング
- [ ] 削除完了後の自動ログアウト
- [ ] レスポンシブデザイン対応
- [ ] アクセシビリティ対応

## API連携
- [ ] サブスクリプション状態取得API
- [ ] アカウント削除実行API
- [ ] 削除進捗確認API
- [ ] エラー状態通知API

## セキュリティ考慮
- [ ] JWT認証必須
- [ ] CSRF対策
- [ ] セッション無効化処理
- [ ] ローカルストレージクリア

## 工数見積もり
**2-3日**
- UI実装・改善: 1日
- API統合: 1日
- エラーハンドリング・テスト: 0.5-1日

## 優先度
📋 **High** - 高優先度

## ラベル
`feature`, `frontend`, `backend`, `security`, `priority-high`
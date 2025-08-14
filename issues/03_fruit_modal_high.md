# [FEATURE] ほめの実インタラクション詳細モーダル

## 概要
requirements.md 2.2節 ほめの実タップ時の詳細情報表示機能
木に実った「ほめの実」をタップした時の詳細モーダル表示

## 要件詳細
- 実タップ時のモーダル表示
- 実の色（AIキャラクターテーマカラー）表示
- 関連するAIキャラクター情報
- 会話時のユーザー文言とAI回答表示
- 日付・時刻情報表示

## 現在の実装状況
✅ **基本機能**: 木の成長システムと実の表示は実装済み
❌ **未実装**: 実タップ時の詳細モーダル表示

## 実装範囲

### フロントエンド
- [ ] 実タップイベントハンドラー実装
- [ ] 詳細モーダルコンポーネント作成
- [ ] モーダル内レイアウト設計
- [ ] 実の詳細情報表示
- [ ] AIキャラクター情報表示
- [ ] 関連会話内容表示
- [ ] 日時情報表示
- [ ] モーダル閉じる機能

### バックエンド連携
- [ ] 実の詳細情報取得API
- [ ] 関連チャット履歴取得API
- [ ] 実メタデータ取得機能

## UI/UX設計

### モーダル構成
```tsx
// FruitDetailModal.tsx
<div className="fruit-modal-overlay">
  <div className="fruit-modal-content">
    <div className="fruit-header">
      <div className="fruit-icon" style={{color: fruit.themeColor}}>
        🍎 {/* AIキャラクターのテーマカラー */}
      </div>
      <div className="fruit-info">
        <h3>{aiCharacterName}からの褒め実</h3>
        <p className="fruit-date">{formatDate(fruit.createdAt)}</p>
      </div>
      <button className="close-button" onClick={onClose}>×</button>
    </div>
    
    <div className="fruit-content">
      <div className="user-message">
        <h4>あなたのメッセージ</h4>
        <p>{fruit.userMessage}</p>
      </div>
      
      <div className="ai-response">
        <h4>{aiCharacterName}からの返答</h4>
        <p>{fruit.aiResponse}</p>
      </div>
      
      <div className="emotion-info">
        <span className="emotion-badge">{fruit.emotion}</span>
      </div>
    </div>
  </div>
</div>
```

### テーマカラー対応
- **たまさん**: ピンク系 (`rose-500`)
- **まどか姉さん**: 青系 (`sky-500`)  
- **ヒデじい**: オレンジ系 (`amber-500`)

## データ構造
```typescript
interface FruitDetail {
  id: string;
  userMessage: string;
  aiResponse: string;
  aiRole: 'mittyan' | 'madokasan' | 'hideji';
  createdAt: string;
  emotion: string;
  themeColor: string;
}
```

## 受入基準
- [ ] 実をタップするとモーダルが開く
- [ ] AIキャラクター情報が正しく表示される
- [ ] 関連する会話内容が表示される
- [ ] 作成日時が日本語形式で表示される
- [ ] テーマカラーが正しく適用される
- [ ] モバイルでのタッチ操作に対応
- [ ] モーダル外クリックで閉じる
- [ ] ESCキーで閉じる
- [ ] アクセシビリティ対応

## インタラクション詳細
1. ユーザーが木の実をタップ
2. 実の詳細情報をAPIから取得
3. モーダルが滑らかにフェードイン
4. 実の色とAIキャラクター情報表示
5. 関連する会話内容表示
6. ユーザーがモーダルを閉じる

## 工数見積もり
**1-2日**
- モーダルコンポーネント実装: 0.5日
- API連携: 0.5日
- UI調整・テスト: 0.5-1日

## 優先度
📋 **High** - 高優先度

## ラベル
`feature`, `frontend`, `ui/ux`, `tree-growth`, `priority-high`
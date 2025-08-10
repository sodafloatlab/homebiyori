# メンテナンス検知アーキテクチャ技術仕様書

## 概要

Homebiyoriフロントエンドアプリケーションにおける**ハイブリッドメンテナンス検知システム**の技術仕様書です。バックエンドミドルウェアと完全に統合されたリアルタイムメンテナンス検知を実現します。

## アーキテクチャ設計

### システム構成図

```
┌─────────────────┐    ┌───────────────────────────────────────┐    ┌─────────────────┐
│   User Action   │───▶│        API Interceptor                │───▶│ MaintenanceStore│
│                 │    │    (Primary Detection)                │    │                 │
│ - API Call      │    │                                       │    │ - State Manager │
│ - UI Interaction│    │ 1. checkMaintenanceInResponse()       │    │ - UI Controller │
└─────────────────┘    │ 2. handleMaintenanceMode()            │    │ - Event Handler │
                       └───────────────────────────────────────┘    └─────────────────┘
                                        ▲                                      ▲
                                        │                                      │
┌─────────────────┐    ┌───────────────────────────────────────┐              │
│  Health Check   │───▶│        /api/health                    │──────────────┘
│   Timer         │    │    (Secondary Detection)              │
│                 │    │                                       │
│ - 30秒間隔      │    │ - API Interceptor経由                │
│ - 自動実行      │    │ - バックアップ検知                   │
└─────────────────┘    └───────────────────────────────────────┘
```

### 検知システムの階層

#### Primary Detection (主検知システム)
- **対象**: 全API呼び出し
- **タイミング**: ユーザー操作と同時
- **検知方法**: 
  1. Response Interceptorによる自動チェック
  2. レスポンスヘッダー・データの即座解析
- **利点**: リアルタイム性、即応性

#### Secondary Detection (補助検知システム)  
- **対象**: /api/health エンドポイント
- **タイミング**: 30秒間隔の定期実行
- **検知方法**: 
  1. ヘルスチェックAPI呼び出し
  2. API Interceptorを経由して統一処理
- **利点**: API非使用時のカバレッジ、冗長性

## 実装仕様

### API Interceptor (frontend/src/lib/api.ts)

#### Response Interceptor 拡張

```typescript
// Response interceptor - すべてのレスポンスでメンテナンス検知
this.client.interceptors.response.use(
  (response) => {
    // Primary Detection: 全レスポンスでメンテナンス状態チェック
    this.checkMaintenanceInResponse(response);
    return response;
  },
  async (error) => {
    // 503エラーもメンテナンス検知対象として処理
    if (error.response?.status === 503) {
      this.handleMaintenanceMode(error.response);
    }
    return Promise.reject(error);
  }
);
```

#### メンテナンス検知ロジック

```typescript
private checkMaintenanceInResponse(response: AxiosResponse) {
  // レスポンスヘッダーまたはデータでメンテナンス状態をチェック
  const isMaintenanceMode = 
    response.headers?.['x-maintenance-mode'] === 'true' ||
    response.data?.maintenance_status?.is_maintenance_mode === true;

  if (isMaintenanceMode) {
    this.handleMaintenanceMode(response);
  }
}
```

### MaintenanceStore (frontend/src/stores/maintenanceStore.ts)

#### 統一ハンドラーシステム

```typescript
handleMaintenanceResponse: (response: any) => {
  // 統一ハンドラー: すべてのメンテナンス検知方法に対応
  let maintenanceData = null;
  let isMaintenanceDetected = false;

  // Detection Priority 1: HTTP 503 Service Unavailable（最高優先度）
  if (response.status === 503) {
    isMaintenanceDetected = true;
    maintenanceData = response.data || defaultMaintenanceData;
  }
  // Detection Priority 2: Response Headers（中優先度）
  else if (response.headers?.['x-maintenance-mode'] === 'true') {
    isMaintenanceDetected = true;
    maintenanceData = extractFromHeaders(response.headers);
  }
  // Detection Priority 3: API Response Data（低優先度）
  else if (response.status === 200 && response.data?.maintenance_status?.is_maintenance_mode) {
    isMaintenanceDetected = true;
    maintenanceData = response.data.maintenance_status;
  }

  // メンテナンス状態の統一処理
  processMaintenanceState(isMaintenanceDetected, maintenanceData);
}
```

## 検知優先度システム

### Priority 1: HTTP 503 Service Unavailable
- **検知方法**: HTTPステータスコード
- **発生源**: バックエンドミドルウェア直接応答
- **信頼度**: ★★★ (最高)
- **用途**: 緊急メンテナンス、システム障害時

### Priority 2: Response Headers  
- **検知方法**: `x-maintenance-mode: true` 等のカスタムヘッダー
- **発生源**: バックエンドミドルウェア設定
- **信頼度**: ★★☆ (中)
- **用途**: 計画メンテナンス、部分機能停止時

### Priority 3: API Response Data
- **検知方法**: `maintenance_status.is_maintenance_mode: true`
- **発生源**: 個別APIエンドポイント
- **信頼度**: ★☆☆ (低)
- **用途**: 機能別メンテナンス、段階的停止時

## ログシステム

### Primary Detection ログ

```typescript
console.log('🔧 Primary Maintenance Detection via API Interceptor:', {
  endpoint: response.config?.url,
  status: response.status,
  method: 'API_INTERCEPTOR'
});
```

### Secondary Detection ログ

```typescript
console.log('🔍 Secondary Maintenance Detection via Health Check:', {
  endpoint: '/api/health',
  status: response.status,
  method: 'HEALTH_CHECK'
});
```

### 状態変化ログ

```typescript
// メンテナンス開始
console.log('🚨 Entering Maintenance Mode');

// メンテナンス終了  
console.log('✅ Exiting Maintenance Mode - System Restored');
```

## パフォーマンス最適化

### 重複検知防止
- Primary DetectionとSecondary Detectionの区別
- 同一レスポンスでの重複ハンドラー実行回避
- 状態変化時のみUI更新実行

### メモリ効率化
- Dynamic Importによる依存関係の遅延読み込み
- MaintenanceStore状態の適切なクリーンアップ
- インターバルタイマーの確実な破棄

## セキュリティ考慮事項

### 情報漏洩防止
- メンテナンス理由の詳細情報制限
- システム内部状態の露出回避
- ログレベルの本番環境制御

### DoS攻撃対策
- ヘルスチェック頻度の適切な制限
- API呼び出し回数の監視
- 異常検知時の自動停止機能

## 運用監視

### メトリクス収集
- メンテナンス検知回数
- 検知方法別統計
- レスポンス時間監視
- ユーザー影響範囲測定

### アラート設定
- メンテナンス状態の異常継続
- 検知システムの動作不良
- API応答時間の異常値検知

## 今後の拡張計画

### Phase 2: 高度化機能
- WebSocket経由のリアルタイム通知
- 段階的メンテナンス対応
- サービス別メンテナンス状態管理

### Phase 3: インテリジェント化
- 機械学習による予測メンテナンス
- ユーザー行動分析連携
- 自動復旧システム統合

## 関連ドキュメント

- [フロントエンド設計書](./design_frontend.md)
- [API設計書](./design_api.md)
- [インフラストラクチャ設計](../../../terraform/README.md)
- [バックエンド実装ガイド](../../../backend/README.md)

---

**最終更新**: 2025-08-10  
**バージョン**: 1.0  
**ステータス**: 実装完了
/**
 * 統一サービス層エクスポート
 * 最適化された最終アーキテクチャ
 */

// ============================================
// 統一API Service Layer
// ============================================

// API Service Manager (メインエントリーポイント)
export { 
  APIServiceManager,
  apiServices,
  chatAPI,
  treeAPI,
  useAPIServices
} from './api/APIServiceManager';

// 個別APIサービス
export { ChatAPIService } from './api/ChatAPIService';
export { TreeAPIService } from './api/TreeAPIService';

// Chat API 型定義
export type {
  SendMessageRequest,
  SendMessageResponse,
  ChatHistoryResponse,
  AISettingsRequest,
  GroupChatRequest
} from './api/ChatAPIService';

// Tree API 型定義
export type {
  TreeStatus,
  FruitInfo,
  CreateFruitRequest
} from './api/TreeAPIService';

// ============================================
// 専用サービス
// ============================================

export { default as UserService } from './userService';
export { default as NotificationService } from './notificationService';
export { IntegratedAccountService } from './IntegratedAccountService'; // ✅ 統合済み
export { SystemHealthService } from './SystemHealthService'; // ✅ 新規追加
export { billingService } from './BillingService';

// ============================================
// 統一サービスエイリアス (シンプル化)
// ============================================

// apiServicesは既にメインエクスポートブロック（L13）でエクスポート済み
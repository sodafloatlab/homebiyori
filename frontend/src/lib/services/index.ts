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
  ChatStatsResponse,
  AISettingsRequest,
  GroupChatRequest,
  AIResponseSampleRequest,
  AIResponseSampleResponse
} from './api/ChatAPIService';

// Tree API 型定義
export type {
  TreeStatus,
  FruitInfo,
  TreeStatsResponse,
  FruitsListResponse,
  CreateFruitRequest,
  UpdateTreeRequest,
  TreeThemeRequest,
  FruitFilterRequest
} from './api/TreeAPIService';

// ============================================
// 専用サービス
// ============================================

export { default as UserService } from './userService';
export { default as NotificationService } from './notificationService';
export { accountSettingsService } from './AccountSettingsService';
export { billingService } from './BillingService';

// ============================================
// 統一サービスエイリアス (最終形)
// ============================================

// Chat Service統一エイリアス（遅延初期化）
export const getChatService = () => {
  const { apiServices } = require('./api/APIServiceManager');
  return apiServices.chat;
};

// Tree Service統一エイリアス（遅延初期化）
export const getTreeService = () => {
  const { apiServices } = require('./api/APIServiceManager');
  return apiServices.tree;
};

// 後方互換性のためのエイリアス（Getter形式）
export const ChatService = getChatService;
export const TreeService = getTreeService;
// ========================================
// API Integration Types
// ========================================

import { AICharacter, PraiseLevel, UserProfile, TreeStatus, Fruit } from './index';

// ========================================
// API 共通レスポンス型
// ========================================

export interface APIResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  status: 'success' | 'error';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// ========================================
// 認証API型定義
// ========================================

export interface LoginRequest {
  access_token: string;
  provider: 'google';
}

export interface LoginResponse {
  user_id: string;
  profile: UserProfile;
  access_token: string;
  refresh_token: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

// ========================================
// ユーザーAPI型定義
// ========================================

export interface CreateUserProfileRequest {
  nickname?: string;
  ai_character?: AICharacter;
  praise_level?: PraiseLevel;
}

export interface UpdateUserProfileRequest {
  nickname?: string;
  onboarding_completed?: boolean;
}

export interface UpdateAIPreferencesRequest {
  ai_character?: AICharacter;
  praise_level?: PraiseLevel;
  interaction_mode?: 'praise' | 'listen';
}

// ========================================
// チャットAPI型定義
// ========================================

export interface ChatRequest {
  message: string;
  ai_character?: AICharacter;
  praise_level?: PraiseLevel;
  context_length?: number;
}

export interface ChatResponse {
  response: string;
  emotion: string;
  character_used: AICharacter;
  praise_level_used: PraiseLevel;
  context_tokens_used: number;
  response_tokens: number;
}

export interface ChatHistoryItem {
  chat_id: string;
  user_message: string;
  ai_response: string;
  ai_character: AICharacter;
  emotion: string;
  timestamp: string;
  praise_level: PraiseLevel;
}

export interface GetChatHistoryRequest {
  limit?: number;
  start_key?: string;
}

export interface GetChatHistoryResponse {
  chats: ChatHistoryItem[];
  last_evaluated_key?: string;
  total_count: number;
}

// ========================================
// 木の成長API型定義
// ========================================

export interface GetTreeStatusResponse {
  tree: TreeStatus;
  total_fruits: number;
  recent_activity: Fruit[];
}

export interface AddFruitRequest {
  user_message: string;
  ai_response: string;
  ai_character: AICharacter;
  emotion: string;
}

export interface AddFruitResponse {
  fruit_id: string;
  tree_updated: boolean;
  new_level?: number;
  experience_gained: number;
}

export interface GetFruitsRequest {
  limit?: number;
  start_key?: string;
  ai_character?: AICharacter;
}

export interface GetFruitsResponse {
  fruits: Fruit[];
  last_evaluated_key?: string;
  total_count: number;
}

// ========================================
// 通知API型定義
// ========================================

export interface NotificationItem {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'achievement' | 'reminder' | 'maintenance';
  is_read: boolean;
  created_at: string;
  expires_at?: string;
}

export interface GetNotificationsRequest {
  limit?: number;
  start_key?: string;
  unread_only?: boolean;
}

export interface GetNotificationsResponse {
  notifications: NotificationItem[];
  last_evaluated_key?: string;
  unread_count: number;
  total_count: number;
}

export interface MarkNotificationReadRequest {
  notification_id: string;
}

// ========================================
// サブスクリプションAPI型定義
// ========================================

export interface SubscriptionStatus {
  subscription_id: string;
  user_id: string;
  plan_type: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GetSubscriptionResponse {
  subscription: SubscriptionStatus;
  billing_history: BillingHistoryItem[];
}

export interface BillingHistoryItem {
  invoice_id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  billing_date: string;
  description: string;
}

export interface CreateCheckoutSessionRequest {
  plan_type: 'premium';
  success_url: string;
  cancel_url: string;
}

export interface CreateCheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

export interface CancelSubscriptionRequest {
  reason?: string;
  feedback?: string;
}

// ========================================
// メンテナンスAPI型定義
// ========================================

export interface MaintenanceStatus {
  is_maintenance_mode: boolean;
  maintenance_message?: string;
  estimated_recovery_time?: string;
  affected_services?: string[];
  scheduled_maintenance?: ScheduledMaintenance[];
}

export interface ScheduledMaintenance {
  maintenance_id: string;
  title: string;
  description: string;
  scheduled_start: string;
  estimated_duration: number; // minutes
  affected_services: string[];
}

// ========================================
// エラーレスポンス型定義
// ========================================

export interface APIError {
  error_code: string;
  error_message: string;
  details?: Record<string, any>;
  request_id?: string;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationErrorResponse extends APIError {
  validation_errors: ValidationError[];
}

// ========================================
// API Client 設定型
// ========================================

export interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
}

export interface RequestConfig {
  requiresAuth?: boolean;
  timeout?: number;
  retries?: number;
  skipErrorHandling?: boolean;
  params?: Record<string, any>;
}
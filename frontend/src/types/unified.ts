/**
 * 統一型定義システム
 * フロントエンド全体で使用する型の一元管理
 */

// ============================================
// Core Character Types (統一キャラクター型)
// ============================================

/**
 * 統一AIキャラクター型
 * バックエンドとフロントエンドで共通使用
 */
export type AICharacterUnified = 'mittyan' | 'madokasan' | 'hideji';

/**
 * レガシー型エイリアス（後方互換性）
 */
export type AiRole = AICharacterUnified;
export type AICharacter = AICharacterUnified;

// ============================================
// Interaction Types (統一インタラクション型)
// ============================================

/**
 * インタラクションモード統一型
 */
export type InteractionModeUnified = 'praise' | 'listen';

/**
 * レガシー型エイリアス
 */
export type MoodType = InteractionModeUnified;

/**
 * 褒めレベル統一型
 */
export type PraiseLevelUnified = 'light' | 'normal' | 'deep';

/**
 * レガシー型エイリアス
 */
export type PraiseLevel = PraiseLevelUnified;

// ============================================
// Tree Types (統一木成長型)
// ============================================

/**
 * 木の成長段階統一型（0-6の7段階）
 */
export type TreeStageUnified = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * レガシー型エイリアス
 */
export type TreeStage = TreeStageUnified;

/**
 * 感情タイプ統一型
 */
export type EmotionTypeUnified = '嬉しい' | '悲しい' | '困った' | '疲れた' | '愛情' | '不安';

/**
 * レガシー型エイリアス
 */
export type EmotionType = EmotionTypeUnified;

// ============================================
// App Navigation Types (統一ナビゲーション型)
// ============================================

/**
 * アプリ画面統一型
 */
export type AppScreenUnified = 
  | 'landing' 
  | 'auth' 
  | 'user-onboarding'
  | 'character-selection' 
  | 'chat' 
  | 'tree' 
  | 'group-chat' 
  | 'notifications' 
  | 'premium' 
  | 'subscription-cancel' 
  | 'terms-of-service' 
  | 'privacy-policy' 
  | 'commercial-transaction' 
  | 'contact' 
  | 'faq'
  | 'dashboard'
  | 'billing'
  | 'account-settings';

/**
 * レガシー型エイリアス
 */
export type AppScreen = AppScreenUnified;

// ============================================
// User & Plan Types (統一ユーザー・プラン型)
// ============================================

/**
 * ユーザープラン統一型
 */
export type UserPlanUnified = 'free' | 'trial' | 'premium';

/**
 * レガシー型エイリアス
 */
export type UserPlan = UserPlanUnified;

/**
 * チャットモード統一型
 */
export type ChatModeUnified = 'normal' | 'deep';

/**
 * レガシー型エイリアス
 */
export type ChatMode = ChatModeUnified;

// ============================================
// Common Interface Types
// ============================================

/**
 * 基本APIレスポンス型
 */
export interface APIResponseUnified<T = any> {
  data?: T;
  message?: string;
  error?: string;
  status: 'success' | 'error';
}

/**
 * 認証ユーザー統一型
 */
export interface AuthUserUnified {
  userId: string;
  email?: string;
  nickname?: string;
  accessToken: string;
  refreshToken?: string;
}

/**
 * ユーザープロフィール統一型
 */
export interface UserProfileUnified {
  user_id: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  plan: UserPlanUnified;
  created_at: string;
  last_login: string;
}

/**
 * チャットメッセージ統一型
 */
export interface ChatMessageUnified {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: number;
  aiRole?: AICharacterUnified;
  mood?: InteractionModeUnified;
  emotion?: EmotionTypeUnified;
  systemType?: 'join' | 'leave' | 'mode-change' | 'info';
}

/**
 * キャラクター情報統一型
 */
export interface CharacterInfoUnified {
  name: string;
  image: string;
  color: 'rose' | 'sky' | 'amber';
  bgColor: string;
  textColor: string;
  gradientColor: string;
}

// ============================================
// 最終型エイリアス
// ============================================

/**
 * 最終統一型エイリアス
 * 全アプリケーションで使用する標準型
 */
export type APIResponse<T = any> = APIResponseUnified<T>;
export type AuthUser = AuthUserUnified;
export type UserProfile = UserProfileUnified;
export type ChatMessage = ChatMessageUnified;
export type CharacterInfo = CharacterInfoUnified;

// ============================================
// Type Guards (型ガード関数)
// ============================================

export const isAICharacter = (value: any): value is AICharacterUnified => {
  return typeof value === 'string' && ['mittyan', 'madokasan', 'hideji'].includes(value);
};

export const isInteractionMode = (value: any): value is InteractionModeUnified => {
  return typeof value === 'string' && ['praise', 'listen'].includes(value);
};

export const isPraiseLevel = (value: any): value is PraiseLevelUnified => {
  return typeof value === 'string' && ['light', 'normal', 'deep'].includes(value);
};

export const isTreeStage = (value: any): value is TreeStageUnified => {
  return typeof value === 'number' && value >= 0 && value <= 6;
};

export const isUserPlan = (value: any): value is UserPlanUnified => {
  return typeof value === 'string' && ['free', 'trial', 'premium'].includes(value);
};
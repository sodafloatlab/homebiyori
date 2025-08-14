/**
 * アプリケーション定数定義
 */

// API関連
export const API_ENDPOINTS = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '',
  HEALTH_CHECK: '/api/health',
  AUTH: '/api/auth',
  CHAT: '/api/chat',
  USER: '/api/user',
  TREE: '/api/tree',
  SUBSCRIPTION: '/api/subscription',
  NOTIFICATION: '/api/notification',
} as const;

// AIキャラクター定義
export const AI_CHARACTERS = {
  MITTYAN: 'mittyan',
  MADOKASAN: 'madokasan', 
  HIDEJI: 'hideji',
} as const;

export const AI_CHARACTER_NAMES = {
  [AI_CHARACTERS.MITTYAN]: 'みっちゃん',
  [AI_CHARACTERS.MADOKASAN]: 'まどかさん',
  [AI_CHARACTERS.HIDEJI]: 'ヒデじい',
} as const;

// 木の成長段階
export const TREE_STAGES = {
  SEED: 0,
  SPROUT: 1,
  SAPLING: 2,
  YOUNG: 3,
  MATURE: 4,
  GIANT: 5,
} as const;

export const TREE_STAGE_NAMES = {
  [TREE_STAGES.SEED]: '種',
  [TREE_STAGES.SPROUT]: '芽',
  [TREE_STAGES.SAPLING]: '苗',
  [TREE_STAGES.YOUNG]: '若木',
  [TREE_STAGES.MATURE]: '成木',
  [TREE_STAGES.GIANT]: '大木',
} as const;

// UI制限
export const UI_LIMITS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_NICKNAME_LENGTH: 20,
  MIN_TOUCH_TARGET: 44, // px
} as const;

// ローカルストレージキー
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'homebiyori_auth_token',
  USER_PREFERENCES: 'homebiyori_user_prefs',
  LAST_CHARACTER: 'homebiyori_last_character',
} as const;

// 通知タイプ
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
} as const;

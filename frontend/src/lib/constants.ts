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

// 型エイリアス（互換性のため）
export type AICharacterType = keyof typeof AI_CHARACTERS;
export const AI_CHARACTER_TYPES = AI_CHARACTERS;

// インタラクションモード
export const INTERACTION_MODES = {
  PRAISE: 'praise',
  LISTEN: 'listen',
} as const;

export type InteractionMode = typeof INTERACTION_MODES[keyof typeof INTERACTION_MODES];

// 褒めレベル
export const PRAISE_LEVELS = {
  LIGHT: 'light',
  NORMAL: 'normal', 
  DEEP: 'deep',
} as const;

export type PraiseLevel = typeof PRAISE_LEVELS[keyof typeof PRAISE_LEVELS];

// 木の成長段階（7段階: 0-6）
export const TREE_STAGES = {
  SOIL: 0,        // 土だけ
  SPROUT: 1,      // 芽
  SAPLING: 2,     // 苗
  YOUNG: 3,       // 若木
  MATURE: 4,      // 成木
  GIANT: 5,       // 大木
  ANCIENT: 6,     // 古木
} as const;

export const TREE_STAGE_NAMES = {
  [TREE_STAGES.SOIL]: '土',
  [TREE_STAGES.SPROUT]: '芽',
  [TREE_STAGES.SAPLING]: '苗',
  [TREE_STAGES.YOUNG]: '若木',
  [TREE_STAGES.MATURE]: '成木',
  [TREE_STAGES.GIANT]: '大木',
  [TREE_STAGES.ANCIENT]: '古木',
} as const;

// UI制限
export const UI_LIMITS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_NICKNAME_LENGTH: 20,
  MIN_TOUCH_TARGET: 44, // px
} as const;

// UI設定（レガシー互換）
export const UI_CONFIG = UI_LIMITS;

// ローカルストレージキー
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'homebiyori_auth_token',
  USER_PREFERENCES: 'homebiyori_user_prefs',
  LAST_CHARACTER: 'homebiyori_last_character',
  USER_PROFILE: 'homebiyori_user_profile',
  CHAT_DRAFT: 'homebiyori_chat_draft',
  THEME_PREFERENCE: 'homebiyori_theme_preference',
} as const;

// 通知タイプ
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
} as const;

// API設定（既存のapi.tsから移行）
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  TIMEOUT: 30000,
} as const;

// キャラクターテーマカラー
export const CHARACTER_THEME_COLORS = {
  rose: {
    bg: 'bg-rose-100',
    text: 'text-rose-700', 
    border: 'border-rose-300',
    accent: 'bg-rose-500'
  },
  sky: {
    bg: 'bg-sky-100',
    text: 'text-sky-700',
    border: 'border-sky-300', 
    accent: 'bg-sky-500'
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    accent: 'bg-amber-500'
  }
} as const;

// 木の成長閾値
export const TREE_GROWTH_THRESHOLDS = {
  STAGE_1: 100,
  STAGE_2: 500,
  STAGE_3: 1500,
  STAGE_4: 3000,
  STAGE_5: 5000,
} as const;

// バリデーションルール
export const VALIDATION_RULES = {
  NICKNAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\s\-_]+$/,
  },
  CHAT_MESSAGE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 2000,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
} as const;

// 感情定数（統一版）
export const EMOTIONS = [
  { emoji: '😊', label: '嬉しい' },
  { emoji: '😢', label: '悲しい' },
  { emoji: '😴', label: '疲れた' },
  { emoji: '😰', label: '困った' },
  { emoji: '🥰', label: '愛情' },
  { emoji: '😵', label: '不安' }
] as const;

// AIキャラクター別挨拶メッセージ（統一版）
export const AI_GREETINGS = {
  mittyan: {
    praise: 'こんにちは。今日はどんな一日でしたか？頑張ったこと、聞かせてください。',
    listen: 'こんにちは。今日はどんな気持ちですか？何でもお話しください。'
  },
  madokasan: {
    praise: 'お疲れさまです！今日はどんなことを頑張りましたか？',
    listen: 'お疲れさまです！今日はどんなことがありましたか？'
  },
  hideji: {
    praise: 'ほほう、今日も一日お疲れじゃったな。どんなことがあったのじゃ？',
    listen: 'ふむ、今日はどんな心持ちじゃな？話を聞かせてもらおうか。'
  }
} as const;

// ============================================
// バックエンド互換定数 (Backend Compatible Enums)
// ============================================

// 重複定義削除済み - 上部の定義を使用

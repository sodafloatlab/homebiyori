import { AiRole, CharacterInfo } from '@/types';

// ========================================
// AI Character Constants
// ========================================

export const AI_CHARACTERS: Record<AiRole, CharacterInfo> = {
  mittyan: {
    name: 'たまさん',
    image: '/images/icons/mittyan.png',
    color: 'rose'
  },
  madokasan: {
    name: 'まどか姉さん',
    image: '/images/icons/madokasan.png',
    color: 'sky'
  },
  hideji: {
    name: 'ヒデじい',
    image: '/images/icons/hideji.png',
    color: 'amber'
  }
};

// ========================================
// Tree Growth Constants
// ========================================

export const TREE_GROWTH_THRESHOLDS = {
  STAGE_1: 20,    // 芽
  STAGE_2: 50,    // 小さな苗
  STAGE_3: 100,   // 若木
  STAGE_4: 180,   // 中木
  STAGE_5: 300,   // 大木
  STAGE_6: Infinity // 完全成長
} as const;

// ========================================
// Theme Colors
// ========================================

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

// ========================================
// Emotion Constants
// ========================================

export const EMOTIONS = [
  { emoji: '😊', label: '嬉しい' },
  { emoji: '😢', label: '悲しい' },
  { emoji: '😴', label: '疲れた' },
  { emoji: '😰', label: '困った' },
  { emoji: '👍', label: 'いいね' }
] as const;

// ========================================
// AI Greetings
// ========================================

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
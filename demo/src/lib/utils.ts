import { TREE_GROWTH_THRESHOLDS, CHARACTER_THEME_COLORS } from './constants';
import { AiRole, CharacterInfo } from '@/types';

// ========================================
// Tree Growth Utilities
// ========================================

/**
 * 文字数から木の成長段階を計算（6段階）
 */
export const calculateTreeStage = (characters: number): number => {
  if (characters < TREE_GROWTH_THRESHOLDS.STAGE_1) return 1;
  if (characters < TREE_GROWTH_THRESHOLDS.STAGE_2) return 2;
  if (characters < TREE_GROWTH_THRESHOLDS.STAGE_3) return 3;
  if (characters < TREE_GROWTH_THRESHOLDS.STAGE_4) return 4;
  if (characters < TREE_GROWTH_THRESHOLDS.STAGE_5) return 5;
  return 6;
};

// ========================================
// Character Utilities
// ========================================

/**
 * AIロールに基づいてテーマカラーを取得
 */
export const getCharacterThemeColor = (aiRole?: AiRole, type: 'bg' | 'text' | 'border' | 'accent' = 'text') => {
  if (!aiRole) return '';
  
  const colorMap = {
    mittyan: 'rose',
    madokasan: 'sky', 
    hideji: 'amber'
  } as const;
  
  const color = colorMap[aiRole];
  return CHARACTER_THEME_COLORS[color][type];
};

/**
 * キャラクター情報を取得
 */
export const getCharacterInfo = (aiRole: AiRole): CharacterInfo => {
  const characterMap = {
    mittyan: {
      name: 'たまさん',
      image: '/images/icons/mittyan.png',
      color: 'rose' as const
    },
    madokasan: {
      name: 'まどか姉さん',
      image: '/images/icons/madokasan.png',
      color: 'sky' as const
    },
    hideji: {
      name: 'ヒデじい',
      image: '/images/icons/hideji.png',
      color: 'amber' as const
    }
  };
  
  return characterMap[aiRole];
};

// ========================================
// Message Utilities
// ========================================

/**
 * ユニークなメッセージIDを生成
 * SSR環境では予測可能なIDを生成し、クライアントで再生成される
 */
let messageIdCounter = 0;

export const generateMessageId = (prefix: string = 'msg'): string => {
  if (typeof window === 'undefined') {
    // SSR環境では予測可能なIDを生成
    return `${prefix}-ssr-${++messageIdCounter}`;
  }
  
  // クライアントサイドではランダム要素を含むIDを生成
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * タイムスタンプを日本語の時刻表記に変換
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// ========================================
// Validation Utilities
// ========================================

/**
 * AiRoleの配列が変更されたかチェック
 */
export const hasAiRolesChanged = (prev: AiRole[], current: AiRole[]): boolean => {
  if (prev.length !== current.length) return true;
  return prev.sort().join(',') !== current.sort().join(',');
};

/**
 * 空文字列またはnullをチェック
 */
export const isEmpty = (value: string | null | undefined): boolean => {
  return !value || value.trim().length === 0;
};

// ========================================
// CSS Class Utilities
// ========================================

/**
 * 条件に応じてCSSクラスを結合
 */
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};
import { TREE_GROWTH_THRESHOLDS, CHARACTER_THEME_COLORS, VALIDATION_RULES } from './constants';
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

/**
 * 次の成長段階までの進捗を計算（0-1の値）
 */
export const calculateProgressToNextStage = (characters: number): number => {
  const currentStage = calculateTreeStage(characters);
  const thresholds = Object.values(TREE_GROWTH_THRESHOLDS);
  
  if (currentStage >= 6) return 1; // 最大成長
  
  const currentThreshold = currentStage === 1 ? 0 : thresholds[currentStage - 2];
  const nextThreshold = thresholds[currentStage - 1];
  
  return (characters - currentThreshold) / (nextThreshold - currentThreshold);
};

// ========================================
// Character Utilities
// ========================================

/**
 * AIロールに基づいてテーマカラーを取得
 */
export const getCharacterThemeColor = (
  aiRole?: AiRole, 
  type: keyof typeof CHARACTER_THEME_COLORS.rose = 'text'
) => {
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
      name: 'みっちゃん',
      image: '/images/icons/mittyan.png',
      color: 'rose' as const
    },
    madokasan: {
      name: 'まどかさん',
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

/**
 * タイムスタンプを相対時間に変換（例：「2時間前」）
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  return `${days}日前`;
};

/**
 * ISO文字列を日本語の日付表記に変換
 */
export const formatDateJST = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// ========================================
// Validation Utilities
// ========================================

/**
 * ニックネームの妥当性を検証
 */
export const validateNickname = (nickname: string): { isValid: boolean; error?: string } => {
  if (!nickname || nickname.trim().length === 0) {
    return { isValid: false, error: 'ニックネームを入力してください' };
  }

  const trimmed = nickname.trim();
  
  if (trimmed.length < VALIDATION_RULES.NICKNAME.MIN_LENGTH) {
    return { isValid: false, error: 'ニックネームは1文字以上で入力してください' };
  }
  
  if (trimmed.length > VALIDATION_RULES.NICKNAME.MAX_LENGTH) {
    return { isValid: false, error: 'ニックネームは20文字以下で入力してください' };
  }
  
  if (!VALIDATION_RULES.NICKNAME.PATTERN.test(trimmed)) {
    return { isValid: false, error: '使用できない文字が含まれています' };
  }
  
  return { isValid: true };
};

/**
 * チャットメッセージの妥当性を検証
 */
export const validateChatMessage = (message: string): { isValid: boolean; error?: string } => {
  if (!message || message.trim().length === 0) {
    return { isValid: false, error: 'メッセージを入力してください' };
  }

  const trimmed = message.trim();
  
  if (trimmed.length < VALIDATION_RULES.CHAT_MESSAGE.MIN_LENGTH) {
    return { isValid: false, error: 'メッセージを入力してください' };
  }
  
  if (trimmed.length > VALIDATION_RULES.CHAT_MESSAGE.MAX_LENGTH) {
    return { isValid: false, error: 'メッセージは2000文字以下で入力してください' };
  }
  
  return { isValid: true };
};

/**
 * メールアドレスの妥当性を検証
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'メールアドレスを入力してください' };
  }
  
  if (!VALIDATION_RULES.EMAIL.PATTERN.test(email.trim())) {
    return { isValid: false, error: '有効なメールアドレスを入力してください' };
  }
  
  return { isValid: true };
};

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

/**
 * Tailwind CSS クラスをマージ（重複削除）
 */
export const mergeTailwindClasses = (...classes: string[]): string => {
  const classMap = new Map();
  
  classes.join(' ').split(' ').forEach(cls => {
    if (cls) {
      const prefix = cls.split('-')[0];
      classMap.set(prefix, cls);
    }
  });
  
  return Array.from(classMap.values()).join(' ');
};

// ========================================
// Storage Utilities
// ========================================

/**
 * ローカルストレージへの安全な書き込み
 */
export const setLocalStorage = (key: string, value: any): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
    return false;
  }
};

/**
 * ローカルストレージからの安全な読み込み
 */
export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    if (typeof window === 'undefined') return defaultValue;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Failed to read from localStorage:', error);
    return defaultValue;
  }
};

/**
 * ローカルストレージからの安全な削除
 */
export const removeLocalStorage = (key: string): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn('Failed to remove from localStorage:', error);
    return false;
  }
};

// ========================================
// Error Handling Utilities
// ========================================

/**
 * エラーオブジェクトを安全にメッセージ文字列に変換
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return '予期しないエラーが発生しました';
};

/**
 * API エラーレスポンスから適切なエラーメッセージを抽出
 */
export const extractApiErrorMessage = (error: any): string => {
  if (error?.response?.data?.error_message) {
    return error.response.data.error_message;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return '通信エラーが発生しました。しばらく時間をおいてから再度お試しください。';
};

// ========================================
// Debounce Utility
// ========================================

/**
 * デバウンス機能（連続実行を防ぐ）
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
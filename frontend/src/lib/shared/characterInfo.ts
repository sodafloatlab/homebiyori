/**
 * 共通キャラクター情報定義
 * 全てのコンポーネントで統一して使用する
 */

import { AiRole } from '@/types';

export interface CharacterInfo {
  name: string;
  image: string;
  color: 'rose' | 'sky' | 'amber';
  bgColor: string;
  textColor: string;
  gradientColor: string;
}

/**
 * AIキャラクター情報の統一定義
 */
export const AI_CHARACTER_INFO: Record<AiRole, CharacterInfo> = {
  mittyan: {
    name: 'みっちゃん',
    image: '/images/icons/mittyan.png',
    color: 'rose',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    gradientColor: 'from-rose-400 to-pink-500'
  },
  madokasan: {
    name: 'まどかさん',
    image: '/images/icons/madokasan.png',
    color: 'sky',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    gradientColor: 'from-sky-400 to-blue-500'
  },
  hideji: {
    name: 'ヒデじい',
    image: '/images/icons/hideji.png',
    color: 'amber',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    gradientColor: 'from-amber-400 to-yellow-500'
  }
} as const;

/**
 * キャラクター情報を取得
 */
export const getCharacterInfo = (aiRole: AiRole): CharacterInfo => {
  return AI_CHARACTER_INFO[aiRole];
};

/**
 * キャラクター名一覧を取得
 */
export const getCharacterNames = (): Record<AiRole, string> => {
  return {
    mittyan: AI_CHARACTER_INFO.mittyan.name,
    madokasan: AI_CHARACTER_INFO.madokasan.name,
    hideji: AI_CHARACTER_INFO.hideji.name
  };
};
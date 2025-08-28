'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import Image from 'next/image';
import TouchTarget from '@/components/ui/TouchTarget';
import { AI_CHARACTERS, INTERACTION_MODES, PRAISE_LEVELS } from '@/lib/constants';
import type { AICharacterType, InteractionMode, PraiseLevel } from '@/lib/constants';

interface ChatHeaderProps {
  // 1:1チャット用プロパティ
  selectedAiCharacter?: AICharacterType;
  
  // グループチャット用プロパティ
  activeAIs?: AICharacterType[];
  
  // 共通プロパティ
  currentInteractionMode: InteractionMode;
  currentPraiseLevel: PraiseLevel;
  isGroupChat: boolean;
  
  // イベントハンドラー
  onInteractionModeChange: (mode: InteractionMode) => void;
  onPraiseLevelChange: (level: PraiseLevel) => void;
}

const ChatHeader = ({
  selectedAiCharacter,
  activeAIs = [],
  currentInteractionMode,
  currentPraiseLevel,
  isGroupChat,
  onInteractionModeChange,
  onPraiseLevelChange
}: ChatHeaderProps) => {
  
  const getCharacterInfo = (character: AICharacterType) => {
    switch (character) {
      case 'mittyan':
        return {
          name: 'みっちゃん',
          image: '/images/characters/mittyan.png',
          themeColor: 'rose'
        };
      case 'madokasan':
        return {
          name: 'まどかさん',
          image: '/images/characters/madokasan.png',
          themeColor: 'sky'
        };
      case 'hideji':
        return {
          name: 'ヒデじい',
          image: '/images/characters/hideji.png',
          themeColor: 'amber'
        };
      default:
        return {
          name: 'AI',
          image: '/images/characters/default.png',
          themeColor: 'emerald'
        };
    }
  };

  const getThemeColor = (character: AICharacterType, type: 'bg' | 'text' = 'text') => {
    const info = getCharacterInfo(character);
    if (type === 'bg') {
      switch (info.themeColor) {
        case 'rose': return 'bg-gradient-to-r from-rose-500 to-pink-500';
        case 'sky': return 'bg-gradient-to-r from-sky-500 to-blue-500';
        case 'amber': return 'bg-gradient-to-r from-amber-500 to-orange-500';
        default: return 'bg-gradient-to-r from-emerald-500 to-green-500';
      }
    } else {
      switch (info.themeColor) {
        case 'rose': return 'text-white';
        case 'sky': return 'text-white';
        case 'amber': return 'text-white';
        default: return 'text-white';
      }
    }
  };

  const renderInteractionModeToggle = () => (
    <TouchTarget
      onClick={() => onInteractionModeChange(
        currentInteractionMode === INTERACTION_MODES.PRAISE 
          ? INTERACTION_MODES.LISTEN 
          : INTERACTION_MODES.PRAISE
      )}
      className={`px-3 py-2 rounded-lg transition-all ${
        currentInteractionMode === INTERACTION_MODES.PRAISE 
          ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md' 
          : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'
      }`}
    >
      <div className="flex items-center space-x-1">
        <span>{currentInteractionMode === INTERACTION_MODES.PRAISE ? '👏' : '👂'}</span>
        <span className="text-xs font-medium">
          {currentInteractionMode === INTERACTION_MODES.PRAISE ? 'ほめほめ' : '聞いて'}
        </span>
      </div>
    </TouchTarget>
  );

  const renderPraiseLevelToggle = () => (
    <TouchTarget
      onClick={() => {
        const levels = [PRAISE_LEVELS.LIGHT, PRAISE_LEVELS.NORMAL, PRAISE_LEVELS.DEEP];
        const currentIndex = levels.indexOf(currentPraiseLevel);
        const nextIndex = (currentIndex + 1) % levels.length;
        onPraiseLevelChange(levels[nextIndex]);
      }}
      className={`px-3 py-2 rounded-lg transition-all ${
        currentPraiseLevel === PRAISE_LEVELS.DEEP 
          ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md' 
          : 'bg-gray-600 hover:bg-gray-700 text-white shadow-md'
      }`}
    >
      <div className="flex items-center space-x-1">
        <Zap className="w-3 h-3" />
        <span className="text-xs font-medium">
          {currentPraiseLevel === PRAISE_LEVELS.DEEP ? 'ディープ' : 
           currentPraiseLevel === PRAISE_LEVELS.NORMAL ? 'ノーマル' : 'ライト'}
        </span>
      </div>
    </TouchTarget>
  );

  if (isGroupChat) {
    return (
      <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex -space-x-2">
            {activeAIs.slice(0, 3).map((aiCharacter) => {
              const characterInfo = getCharacterInfo(aiCharacter);
              return (
                <div key={aiCharacter} className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                  <Image
                    src={characterInfo.image}
                    alt={characterInfo.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              );
            })}
          </div>
          <div>
            <h3 className="font-bold text-white">
              グループチャット ({activeAIs.length}人参加中)
            </h3>
            <p className="text-sm text-white/75">
              {currentInteractionMode === INTERACTION_MODES.PRAISE ? 'ほめほめモード' : '聞いてモード'}
              {currentPraiseLevel === PRAISE_LEVELS.DEEP && 
                <span className="ml-2 text-xs bg-yellow-400 text-yellow-800 px-2 py-1 rounded-full">ディープ</span>}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {renderInteractionModeToggle()}
          {renderPraiseLevelToggle()}
        </div>
      </div>
    );
  }

  if (!selectedAiCharacter) return null;
  
  const characterInfo = getCharacterInfo(selectedAiCharacter);
  
  return (
    <div className={`${getThemeColor(selectedAiCharacter, 'bg')} p-4 flex items-center justify-between`}>
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20">
          <Image
            src={characterInfo.image}
            alt={characterInfo.name}
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className={`font-bold ${getThemeColor(selectedAiCharacter)}`}>
            {characterInfo.name}
          </h3>
          <p className={`text-sm opacity-75 ${getThemeColor(selectedAiCharacter)}`}>
            {currentInteractionMode === INTERACTION_MODES.PRAISE ? 'ほめほめモード' : '聞いてモード'}
            {currentPraiseLevel === PRAISE_LEVELS.DEEP && 
              <span className="ml-2 text-xs bg-yellow-400 text-yellow-800 px-2 py-1 rounded-full">ディープ</span>}
          </p>
        </div>
      </div>
      <div className="flex space-x-2">
        {renderInteractionModeToggle()}
        {renderPraiseLevelToggle()}
      </div>
    </div>
  );
};

export default ChatHeader;
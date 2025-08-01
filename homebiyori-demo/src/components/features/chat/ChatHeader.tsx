'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import Image from 'next/image';
import TouchTarget from '@/components/ui/TouchTarget';
import { AiRole, MoodType, ChatMode, UserPlan } from '@/types';
import { AI_CHARACTERS } from '@/lib/constants';
import { getCharacterThemeColor } from '@/lib/utils';

interface ChatHeaderProps {
  // 1:1チャット用プロパティ
  selectedAiRole?: AiRole;
  
  // グループチャット用プロパティ
  activeAIs?: AiRole[];
  
  // 共通プロパティ
  currentMood: MoodType;
  chatMode: ChatMode;
  userPlan: UserPlan;
  isGroupChat: boolean;
  
  // イベントハンドラー
  onChatModeChange: (mode: ChatMode) => void;
  onMoodChange: (mood: MoodType) => void;
}

const ChatHeader = ({
  selectedAiRole,
  activeAIs = [],
  currentMood,
  chatMode,
  userPlan,
  isGroupChat,
  onChatModeChange,
  onMoodChange
}: ChatHeaderProps) => {
  const renderMoodToggle = () => (
    <TouchTarget
      onClick={() => onMoodChange(currentMood === 'praise' ? 'listen' : 'praise')}
      className={`px-3 py-2 rounded-lg transition-all ${
        currentMood === 'praise' 
          ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md' 
          : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'
      }`}
    >
      <div className="flex items-center space-x-1">
        <span>{currentMood === 'praise' ? '👏' : '👂'}</span>
        <span className="text-xs font-medium">
          {currentMood === 'praise' ? 'ほめほめ' : '聞いて'}
        </span>
      </div>
    </TouchTarget>
  );

  const renderDeepModeToggle = () => (
    <TouchTarget
      onClick={() => onChatModeChange(chatMode === 'normal' ? 'deep' : 'normal')}
      className={`px-3 py-2 rounded-lg transition-all ${
        chatMode === 'deep' 
          ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md' 
          : 'bg-gray-600 hover:bg-gray-700 text-white shadow-md'
      }`}
    >
      <div className="flex items-center space-x-1">
        <Zap className="w-3 h-3" />
        <span className="text-xs font-medium">
          {chatMode === 'deep' ? 'ディープ' : 'ノーマル'}
        </span>
      </div>
    </TouchTarget>
  );


  if (isGroupChat) {
    return (
      <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex -space-x-2">
            {activeAIs.slice(0, 3).map((aiRole) => (
              <div key={aiRole} className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                <Image
                  src={AI_CHARACTERS[aiRole].image}
                  alt={AI_CHARACTERS[aiRole].name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          <div>
            <h3 className="font-bold text-white">
              グループチャット ({activeAIs.length}人参加中)
            </h3>
            <p className="text-sm text-white/75">
              {currentMood === 'praise' ? 'ほめほめモード' : '聞いてモード'}
              {chatMode === 'deep' && <span className="ml-2 text-xs bg-yellow-400 text-yellow-800 px-2 py-1 rounded-full">ディープ</span>}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {renderMoodToggle()}
          {userPlan === 'premium' && renderDeepModeToggle()}
        </div>
      </div>
    );
  }

  if (!selectedAiRole) return null;
  
  const character = AI_CHARACTERS[selectedAiRole];
  
  return (
    <div className={`${getCharacterThemeColor(selectedAiRole, 'bg')} p-4 flex items-center justify-between`}>
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20">
          <Image
            src={character.image}
            alt={character.name}
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className={`font-bold ${getCharacterThemeColor(selectedAiRole)}`}>{character.name}</h3>
          <p className={`text-sm opacity-75 ${getCharacterThemeColor(selectedAiRole)}`}>
            {currentMood === 'praise' ? 'ほめほめモード' : '聞いてモード'}
            {chatMode === 'deep' && <span className="ml-2 text-xs bg-yellow-400 text-yellow-800 px-2 py-1 rounded-full">ディープ</span>}
          </p>
        </div>
      </div>
      <div className="flex space-x-2">
        {renderMoodToggle()}
        {userPlan === 'premium' && renderDeepModeToggle()}
      </div>
    </div>
  );
};

export default ChatHeader;
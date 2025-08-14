import { useState, useEffect, useRef } from 'react';
import { ChatMessage, AiRole, MoodType, ChatMode } from '@/types';
import { calculateTreeStage, generateMessageId } from './utils';
import { AI_GREETINGS } from './constants';

// ========================================
// Chat Hooks
// ========================================

/**
 * チャット機能の共通ロジック
 */
export const useChat = (
  globalMessages: ChatMessage[],
  onAddGlobalMessage: (message: ChatMessage) => void,
  totalCharacters: number
) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初期化
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // グローバルメッセージと同期
  useEffect(() => {
    setMessages(globalMessages);
  }, [globalMessages]);

  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 木の成長段階計算
  const currentTreeStage = calculateTreeStage(totalCharacters);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return {
    messages,
    inputText,
    setInputText,
    isTyping,
    setIsTyping,
    isMounted,
    messagesEndRef,
    currentTreeStage,
    scrollToBottom,
    addMessage: onAddGlobalMessage
  };
};

/**
 * AIキャラクター参加状態の管理
 */
export const useAiParticipants = (
  initialAIs: AiRole[],
  globalMessages: ChatMessage[],
  onAddGlobalMessage: (message: ChatMessage) => void
) => {
  const [activeAIs, setActiveAIs] = useState<AiRole[]>(initialAIs);
  const [lastActiveAIs, setLastActiveAIs] = useState<AiRole[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  // 初期化
  useEffect(() => {
    if (!hasInitialized && globalMessages.length > 0) {
      setLastActiveAIs(activeAIs);
      setHasInitialized(true);
    }
  }, [activeAIs, globalMessages.length, hasInitialized]);

  // 参加者変更の検出と通知
  useEffect(() => {
    if (!hasInitialized) return;

    const added = activeAIs.filter(ai => !lastActiveAIs.includes(ai));
    const removed = lastActiveAIs.filter(ai => !activeAIs.includes(ai));

    // 参加通知
    added.forEach(ai => {
      const character = {
        mittyan: 'たまさん',
        madokasan: 'まどか姉さん', 
        hideji: 'ヒデじい'
      }[ai];

      const joinMessage: ChatMessage = {
        id: generateMessageId('join'),
        text: `${character}が参加しました`,
        sender: 'system',
        timestamp: Date.now(),
        systemType: 'join',
        aiRole: ai
      };
      onAddGlobalMessage(joinMessage);
    });

    // 退出通知
    removed.forEach(ai => {
      const character = {
        mittyan: 'たまさん',
        madoka: 'まどか姉さん',
        hideji: 'ヒデじい'
      }[ai];

      const leaveMessage: ChatMessage = {
        id: generateMessageId('leave'),
        text: `${character}が退出しました`,
        sender: 'system',
        timestamp: Date.now(),
        systemType: 'leave',
        aiRole: ai
      };
      onAddGlobalMessage(leaveMessage);
    });

    setLastActiveAIs(activeAIs);
  }, [activeAIs, lastActiveAIs, hasInitialized, onAddGlobalMessage]);

  return {
    activeAIs,
    setActiveAIs
  };
};

/**
 * チャットモード変更の検出
 */
export const useChatModeChange = (
  chatMode: ChatMode,
  onAddGlobalMessage: (message: ChatMessage) => void
) => {
  const [lastChatMode, setLastChatMode] = useState<ChatMode>(chatMode);

  useEffect(() => {
    if (lastChatMode !== chatMode) {
      const modeNames = {
        normal: 'ノーマルモード',
        deep: 'ディープモード'
      };

      const modeChangeMessage: ChatMessage = {
        id: generateMessageId('mode-change'),
        text: `${modeNames[chatMode]}に切り替わりました`,
        sender: 'system',
        timestamp: Date.now(),
        systemType: 'mode-change'
      };
      onAddGlobalMessage(modeChangeMessage);
      setLastChatMode(chatMode);
    }
  }, [chatMode, lastChatMode, onAddGlobalMessage]);
};

/**
 * 初期挨拶メッセージの管理
 */
export const useInitialGreeting = (
  aiRole: AiRole | null,
  mood: MoodType,
  screen: 'chat' | 'group-chat',
  globalMessages: ChatMessage[],
  onAddGlobalMessage: (message: ChatMessage) => void
) => {
  useEffect(() => {
    if (globalMessages.length === 0 && aiRole) {
      if (screen === 'chat') {
        const greeting: ChatMessage = {
          id: generateMessageId('greeting-chat'),
          text: AI_GREETINGS[aiRole][mood],
          sender: 'ai',
          timestamp: Date.now(),
          aiRole,
          mood
        };
        onAddGlobalMessage(greeting);
      } else if (screen === 'group-chat') {
        const greeting: ChatMessage = {
          id: generateMessageId('greeting-group'),
          text: 'みなさん、こんにちは！グループチャットにようこそ。今日はどんなことがありましたか？',
          sender: 'ai',
          timestamp: Date.now(),
          aiRole: 'madokasan',
          mood
        };
        onAddGlobalMessage(greeting);
      }
    }
  }, [aiRole, mood, screen, globalMessages.length, onAddGlobalMessage]);
};
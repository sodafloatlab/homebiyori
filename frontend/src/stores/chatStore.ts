import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ChatMessage, ChatHistory, AiRole, MoodType, ChatMode, AICharacter, PraiseLevel } from '@/types';
import { STORAGE_KEYS, UI_CONFIG } from '@/lib/constants';
import { generateMessageId } from '@/lib/utils';

interface ChatState {
  // チャット状態
  messages: ChatMessage[];
  history: ChatHistory[];
  selectedAiRole: AiRole | null;
  currentMood: MoodType;
  chatMode: ChatMode;
  isLoading: boolean;
  error: string | null;

  // AI設定
  aiCharacter: AICharacter | null;
  praiseLevel: PraiseLevel;

  // UI状態
  isTyping: boolean;
  typingMessage: string;
  currentScreen: 'chat' | 'group-chat' | null;

  // Actions
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setHistory: (history: ChatHistory[]) => void;
  addToHistory: (item: ChatHistory) => void;
  setSelectedAiRole: (role: AiRole | null) => void;
  setCurrentMood: (mood: MoodType) => void;
  setChatMode: (mode: ChatMode) => void;
  setAiCharacter: (character: AICharacter) => void;
  setPraiseLevel: (level: PraiseLevel) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTyping: (isTyping: boolean, message?: string) => void;
  setCurrentScreen: (screen: 'chat' | 'group-chat' | null) => void;

  // Chat Actions
  sendMessage: (content: string) => Promise<void>;
  addSystemMessage: (content: string, systemType?: ChatMessage['systemType']) => void;
  clearMessages: () => void;
  clearHistory: () => void;
  clearError: () => void;

  // Mode switching
  switchToSingleChat: () => void;
  switchToGroupChat: () => void;

  // Context management
  getRecentContext: (limit?: number) => ChatHistory[];
  getTotalCharacters: () => number;
}

const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial State
      messages: [],
      history: [],
      selectedAiRole: null,
      currentMood: 'praise',
      chatMode: 'normal',
      isLoading: false,
      error: null,
      aiCharacter: null,
      praiseLevel: 'normal',
      isTyping: false,
      typingMessage: '',
      currentScreen: null,

      // Basic Setters
      setMessages: (messages) => set({ messages }),
      addMessage: (message) => {
        const currentMessages = get().messages;
        const updatedMessages = [...currentMessages, message];
        
        // 最大表示メッセージ数を超える場合は古いものから削除
        if (updatedMessages.length > UI_CONFIG.CHAT.MAX_VISIBLE_MESSAGES) {
          updatedMessages.splice(0, updatedMessages.length - UI_CONFIG.CHAT.MAX_VISIBLE_MESSAGES);
        }
        
        set({ messages: updatedMessages });
      },
      setHistory: (history) => set({ history }),
      addToHistory: (item) => {
        const currentHistory = get().history;
        const updatedHistory = [...currentHistory, item];
        
        // 最新50件まで保持（demoと同じ制限）
        if (updatedHistory.length > 50) {
          updatedHistory.splice(0, updatedHistory.length - 50);
        }
        
        set({ history: updatedHistory });
      },
      setSelectedAiRole: (selectedAiRole) => set({ selectedAiRole }),
      setCurrentMood: (currentMood) => set({ currentMood }),
      setChatMode: (chatMode) => set({ chatMode }),
      setAiCharacter: (aiCharacter) => set({ aiCharacter }),
      setPraiseLevel: (praiseLevel) => set({ praiseLevel }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setTyping: (isTyping, typingMessage = '') => set({ isTyping, typingMessage }),
      setCurrentScreen: (currentScreen) => set({ currentScreen }),

      // Chat Actions
      sendMessage: async (content: string) => {
        const { 
          selectedAiRole, 
          currentMood, 
          chatMode, 
          addMessage, 
          addToHistory, 
          setLoading, 
          setError, 
          setTyping 
        } = get();

        if (!selectedAiRole) {
          setError('AIキャラクターが選択されていません');
          return;
        }

        try {
          setLoading(true);
          setError(null);

          // ユーザーメッセージを追加
          const userMessage: ChatMessage = {
            id: generateMessageId('user'),
            text: content,
            sender: 'user',
            timestamp: Date.now()
          };
          addMessage(userMessage);

          // タイピング状態表示
          setTyping(true, 'AIが考えています...');

          // TODO: API統合時に実際のチャットAPI呼び出し
          // const response = await apiClient.post('/chat', {
          //   message: content,
          //   ai_character: selectedAiRole,
          //   praise_level: chatMode === 'deep' ? 'deep' : 'normal',
          //   context_length: 10
          // });

          // 現在はダミー応答
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機

          const dummyResponse = `こんにちは！${content}について素晴らしいですね。毎日の努力を続けているあなたを心から応援しています。`;
          const emotion = 'happy';

          // AI応答メッセージを追加
          const aiMessage: ChatMessage = {
            id: generateMessageId('ai'),
            text: dummyResponse,
            sender: 'ai',
            timestamp: Date.now(),
            aiRole: selectedAiRole,
            mood: currentMood,
            emotion
          };
          addMessage(aiMessage);

          // チャット履歴に追加
          const historyItem: ChatHistory = {
            id: generateMessageId('history'),
            userMessage: content,
            aiResponse: dummyResponse,
            aiRole: selectedAiRole,
            timestamp: Date.now(),
            mode: chatMode
          };
          addToHistory(historyItem);

        } catch (error) {
          setError('メッセージの送信に失敗しました。しばらく時間をおいてから再度お試しください。');
          console.error('Chat error:', error);
        } finally {
          setLoading(false);
          setTyping(false);
        }
      },

      addSystemMessage: (content, systemType = 'info') => {
        const systemMessage: ChatMessage = {
          id: generateMessageId('system'),
          text: content,
          sender: 'system',
          timestamp: Date.now(),
          systemType
        };
        get().addMessage(systemMessage);
      },

      clearMessages: () => set({ messages: [] }),
      clearHistory: () => set({ history: [] }),
      clearError: () => set({ error: null }),

      // Mode switching
      switchToSingleChat: () => {
        const { currentScreen, addSystemMessage } = get();
        if (currentScreen === 'group-chat') {
          addSystemMessage('1:1チャットに切り替わりました', 'mode-change');
        }
        set({ currentScreen: 'chat' });
      },

      switchToGroupChat: () => {
        const { currentScreen, addSystemMessage } = get();
        if (currentScreen === 'chat') {
          addSystemMessage('グループチャットに切り替わりました', 'mode-change');
        }
        set({ currentScreen: 'group-chat' });
      },

      // Context management
      getRecentContext: (limit = 10) => {
        const { history } = get();
        return history.slice(-limit);
      },

      getTotalCharacters: () => {
        const { history } = get();
        return history.reduce((total, item) => {
          return total + item.userMessage.length + item.aiResponse.length;
        }, 0);
      }
    }),
    {
      name: STORAGE_KEYS.CHAT_DRAFT,
      storage: createJSONStorage(() => localStorage),
      // メッセージは永続化しない（セキュリティとプライバシー）
      partialize: (state) => ({
        selectedAiRole: state.selectedAiRole,
        currentMood: state.currentMood,
        chatMode: state.chatMode,
        aiCharacter: state.aiCharacter,
        praiseLevel: state.praiseLevel
      })
    }
  )
);

export default useChatStore;
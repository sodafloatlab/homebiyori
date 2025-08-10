/**
 * ChatStore のテスト（モック実装）
 */

// UI設定モック
const MOCK_UI_CONFIG = {
  CHAT: {
    MAX_VISIBLE_MESSAGES: 50,
    TYPING_DELAY: 1000,
    MESSAGE_FADE_TIMEOUT: 5000
  }
};

// メッセージID生成モック
const generateMessageId = (prefix = 'msg') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// モック ChatStore 実装
const createChatStore = () => {
  let state = {
    // チャット状態
    messages: [],
    history: [],
    selectedAiRole: null,
    currentMood: 'praise',
    chatMode: 'normal',
    isLoading: false,
    error: null,

    // AI設定
    aiCharacter: null,
    praiseLevel: 'normal',

    // UI状態
    isTyping: false,
    typingMessage: '',
    currentScreen: null
  };

  const setState = (partial) => {
    state = { ...state, ...partial };
  };

  const getState = () => state;

  return {
    getState,
    setState,
    subscribe: jest.fn(),

    // Basic Setters
    setMessages: (messages) => setState({ messages }),
    
    addMessage: (message) => {
      const currentMessages = [...state.messages];
      const updatedMessages = [...currentMessages, message];
      
      // 最大表示メッセージ数を超える場合は古いものから削除
      if (updatedMessages.length > MOCK_UI_CONFIG.CHAT.MAX_VISIBLE_MESSAGES) {
        updatedMessages.splice(0, updatedMessages.length - MOCK_UI_CONFIG.CHAT.MAX_VISIBLE_MESSAGES);
      }
      
      setState({ messages: updatedMessages });
    },

    setHistory: (history) => setState({ history }),
    
    addToHistory: (item) => {
      const currentHistory = [...state.history];
      const updatedHistory = [...currentHistory, item];
      
      // 最新50件まで保持
      if (updatedHistory.length > 50) {
        updatedHistory.splice(0, updatedHistory.length - 50);
      }
      
      setState({ history: updatedHistory });
    },

    setSelectedAiRole: (selectedAiRole) => setState({ selectedAiRole }),
    setCurrentMood: (currentMood) => setState({ currentMood }),
    setChatMode: (chatMode) => setState({ chatMode }),
    setAiCharacter: (aiCharacter) => setState({ aiCharacter }),
    setPraiseLevel: (praiseLevel) => setState({ praiseLevel }),
    setLoading: (isLoading) => setState({ isLoading }),
    setError: (error) => setState({ error }),
    setTyping: (isTyping, typingMessage = '') => setState({ isTyping, typingMessage }),
    setCurrentScreen: (currentScreen) => setState({ currentScreen }),

    // Chat Actions
    sendMessage: async (content) => {
      if (!state.selectedAiRole) {
        setState({ error: 'AIキャラクターが選択されていません' });
        return;
      }

      try {
        setState({ isLoading: true, error: null });

        // ユーザーメッセージを追加
        const userMessage = {
          id: generateMessageId('user'),
          text: content,
          sender: 'user',
          timestamp: Date.now()
        };
        
        const currentMessages = [...state.messages, userMessage];
        setState({ messages: currentMessages });

        // タイピング状態表示
        setState({ isTyping: true, typingMessage: 'AIが考えています...' });

        // ダミー応答（非同期処理をシミュレート）
        await new Promise(resolve => setTimeout(resolve, 100));

        const dummyResponse = `こんにちは！${content}について素晴らしいですね。毎日の努力を続けているあなたを心から応援しています。`;
        const emotion = 'happy';

        // AI応答メッセージを追加
        const aiMessage = {
          id: generateMessageId('ai'),
          text: dummyResponse,
          sender: 'ai',
          timestamp: Date.now(),
          aiRole: state.selectedAiRole,
          mood: state.currentMood,
          emotion
        };
        
        const updatedMessages = [...currentMessages, aiMessage];
        setState({ messages: updatedMessages });

        // チャット履歴に追加
        const historyItem = {
          id: generateMessageId('history'),
          userMessage: content,
          aiResponse: dummyResponse,
          aiRole: state.selectedAiRole,
          timestamp: Date.now(),
          mode: state.chatMode
        };
        
        const currentHistory = [...state.history, historyItem];
        setState({ history: currentHistory });

      } catch (error) {
        setState({ error: 'メッセージの送信に失敗しました。しばらく時間をおいてから再度お試しください。' });
        console.error('Chat error:', error);
      } finally {
        setState({ isLoading: false, isTyping: false });
      }
    },

    addSystemMessage: (content, systemType = 'info') => {
      const systemMessage = {
        id: generateMessageId('system'),
        text: content,
        sender: 'system',
        timestamp: Date.now(),
        systemType
      };
      const currentMessages = [...state.messages, systemMessage];
      setState({ messages: currentMessages });
    },

    clearMessages: () => setState({ messages: [] }),
    clearHistory: () => setState({ history: [] }),
    clearError: () => setState({ error: null }),

    // Mode switching
    switchToSingleChat: () => {
      if (state.currentScreen === 'group-chat') {
        // システムメッセージを追加
        const systemMessage = {
          id: generateMessageId('system'),
          text: '1:1チャットに切り替わりました',
          sender: 'system',
          timestamp: Date.now(),
          systemType: 'mode-change'
        };
        const currentMessages = [...state.messages, systemMessage];
        setState({ messages: currentMessages, currentScreen: 'chat' });
      } else {
        setState({ currentScreen: 'chat' });
      }
    },

    switchToGroupChat: () => {
      if (state.currentScreen === 'chat') {
        // システムメッセージを追加
        const systemMessage = {
          id: generateMessageId('system'),
          text: 'グループチャットに切り替わりました',
          sender: 'system',
          timestamp: Date.now(),
          systemType: 'mode-change'
        };
        const currentMessages = [...state.messages, systemMessage];
        setState({ messages: currentMessages, currentScreen: 'group-chat' });
      } else {
        setState({ currentScreen: 'group-chat' });
      }
    },

    // Context management
    getRecentContext: (limit = 10) => {
      return state.history.slice(-limit);
    },

    getTotalCharacters: () => {
      return state.history.reduce((total, item) => {
        return total + item.userMessage.length + item.aiResponse.length;
      }, 0);
    }
  };
};

describe('ChatStore', () => {
  let chatStore;

  beforeEach(() => {
    chatStore = createChatStore();
  });

  describe('初期状態', () => {
    test('正しい初期値が設定されていること', () => {
      const state = chatStore.getState();
      expect(state.messages).toEqual([]);
      expect(state.history).toEqual([]);
      expect(state.selectedAiRole).toBeNull();
      expect(state.currentMood).toBe('praise');
      expect(state.chatMode).toBe('normal');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.aiCharacter).toBeNull();
      expect(state.praiseLevel).toBe('normal');
      expect(state.isTyping).toBe(false);
      expect(state.typingMessage).toBe('');
      expect(state.currentScreen).toBeNull();
    });
  });

  describe('メッセージ管理', () => {
    test('addMessage でメッセージが追加されること', () => {
      const message = {
        id: 'msg1',
        text: 'テストメッセージ',
        sender: 'user',
        timestamp: Date.now()
      };

      chatStore.addMessage(message);
      const state = chatStore.getState();
      
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toBe(message);
    });

    test('メッセージ数が上限を超えた場合に古いメッセージが削除されること', () => {
      // 上限を超えるメッセージを追加
      for (let i = 0; i < MOCK_UI_CONFIG.CHAT.MAX_VISIBLE_MESSAGES + 5; i++) {
        chatStore.addMessage({
          id: `msg${i}`,
          text: `メッセージ${i}`,
          sender: 'user',
          timestamp: Date.now()
        });
      }

      const state = chatStore.getState();
      expect(state.messages).toHaveLength(MOCK_UI_CONFIG.CHAT.MAX_VISIBLE_MESSAGES);
      expect(state.messages[0].id).toBe('msg5'); // 古いメッセージが削除されている
    });

    test('clearMessages でメッセージがクリアされること', () => {
      chatStore.addMessage({
        id: 'msg1',
        text: 'テストメッセージ',
        sender: 'user',
        timestamp: Date.now()
      });

      chatStore.clearMessages();
      const state = chatStore.getState();
      
      expect(state.messages).toEqual([]);
    });
  });

  describe('チャット履歴管理', () => {
    test('addToHistory で履歴が追加されること', () => {
      const historyItem = {
        id: 'history1',
        userMessage: 'ユーザーメッセージ',
        aiResponse: 'AI応答',
        aiRole: 'tama',
        timestamp: Date.now(),
        mode: 'normal'
      };

      chatStore.addToHistory(historyItem);
      const state = chatStore.getState();
      
      expect(state.history).toHaveLength(1);
      expect(state.history[0]).toBe(historyItem);
    });

    test('履歴が50件を超えた場合に古い履歴が削除されること', () => {
      // 50件を超える履歴を追加
      for (let i = 0; i < 55; i++) {
        chatStore.addToHistory({
          id: `history${i}`,
          userMessage: `ユーザーメッセージ${i}`,
          aiResponse: `AI応答${i}`,
          aiRole: 'tama',
          timestamp: Date.now(),
          mode: 'normal'
        });
      }

      const state = chatStore.getState();
      expect(state.history).toHaveLength(50);
      expect(state.history[0].id).toBe('history5'); // 古い履歴が削除されている
    });
  });

  describe('AI設定', () => {
    test('setSelectedAiRole でAIロールが設定されること', () => {
      chatStore.setSelectedAiRole('tama');
      const state = chatStore.getState();
      expect(state.selectedAiRole).toBe('tama');
    });

    test('setCurrentMood で気分が設定されること', () => {
      chatStore.setCurrentMood('listen');
      const state = chatStore.getState();
      expect(state.currentMood).toBe('listen');
    });

    test('setChatMode でチャットモードが設定されること', () => {
      chatStore.setChatMode('deep');
      const state = chatStore.getState();
      expect(state.chatMode).toBe('deep');
    });
  });

  describe('sendMessage', () => {
    test('AIキャラクターが選択されていない場合エラーが設定されること', async () => {
      await chatStore.sendMessage('テストメッセージ');
      const state = chatStore.getState();
      expect(state.error).toBe('AIキャラクターが選択されていません');
    });

    test('正常なメッセージ送信でユーザーメッセージとAI応答が追加されること', async () => {
      chatStore.setSelectedAiRole('tama');
      
      await chatStore.sendMessage('こんにちは');
      const state = chatStore.getState();
      
      expect(state.messages).toHaveLength(2); // ユーザー + AI
      expect(state.messages[0].sender).toBe('user');
      expect(state.messages[0].text).toBe('こんにちは');
      expect(state.messages[1].sender).toBe('ai');
      expect(state.history).toHaveLength(1);
      expect(state.isLoading).toBe(false);
      expect(state.isTyping).toBe(false);
    });
  });

  describe('システムメッセージ', () => {
    test('addSystemMessage でシステムメッセージが追加されること', () => {
      chatStore.addSystemMessage('システムメッセージ', 'info');
      const state = chatStore.getState();
      
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].sender).toBe('system');
      expect(state.messages[0].text).toBe('システムメッセージ');
      expect(state.messages[0].systemType).toBe('info');
    });
  });

  describe('モード切替', () => {
    test('switchToSingleChat で1:1チャットに切り替わること', () => {
      chatStore.setCurrentScreen('group-chat');
      chatStore.switchToSingleChat();
      
      const state = chatStore.getState();
      expect(state.currentScreen).toBe('chat');
      expect(state.messages).toHaveLength(1); // システムメッセージが追加される
      expect(state.messages[0].text).toBe('1:1チャットに切り替わりました');
    });

    test('switchToGroupChat でグループチャットに切り替わること', () => {
      chatStore.setCurrentScreen('chat');
      chatStore.switchToGroupChat();
      
      const state = chatStore.getState();
      expect(state.currentScreen).toBe('group-chat');
      expect(state.messages).toHaveLength(1); // システムメッセージが追加される
      expect(state.messages[0].text).toBe('グループチャットに切り替わりました');
    });
  });

  describe('コンテキスト管理', () => {
    test('getRecentContext で最新の履歴を取得できること', () => {
      // 複数の履歴を追加
      for (let i = 0; i < 15; i++) {
        chatStore.addToHistory({
          id: `history${i}`,
          userMessage: `メッセージ${i}`,
          aiResponse: `応答${i}`,
          aiRole: 'tama',
          timestamp: Date.now(),
          mode: 'normal'
        });
      }

      const recentContext = chatStore.getRecentContext(10);
      expect(recentContext).toHaveLength(10);
      expect(recentContext[0].id).toBe('history5'); // 最新10件
    });

    test('getTotalCharacters で総文字数を計算できること', () => {
      chatStore.addToHistory({
        id: 'history1',
        userMessage: 'あいうえお', // 5文字
        aiResponse: 'かきくけこ', // 5文字
        aiRole: 'tama',
        timestamp: Date.now(),
        mode: 'normal'
      });

      const totalChars = chatStore.getTotalCharacters();
      expect(totalChars).toBe(10);
    });
  });

  describe('エラー管理', () => {
    test('setError でエラーが設定されること', () => {
      chatStore.setError('テストエラー');
      const state = chatStore.getState();
      expect(state.error).toBe('テストエラー');
    });

    test('clearError でエラーがクリアされること', () => {
      chatStore.setError('テストエラー');
      chatStore.clearError();
      const state = chatStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('タイピング状態', () => {
    test('setTyping でタイピング状態が設定されること', () => {
      chatStore.setTyping(true, 'AIが考えています...');
      const state = chatStore.getState();
      expect(state.isTyping).toBe(true);
      expect(state.typingMessage).toBe('AIが考えています...');
    });
  });
});
/**
 * Chat API Hook
 * チャット関連API操作の統一Hook
 */

import { useState, useCallback } from 'react';
import { chatAPI } from '@/lib/services/api/APIServiceManager';
import type { 
  SendMessageRequest, 
  SendMessageResponse,
  ChatMessage,
  AISettingsRequest,
  ChatStatsResponse 
} from '@/lib/services/api/ChatAPIService';
import { useErrorHandler } from '../utils/useErrorHandler';
import { useAsyncOperation } from '../utils/useAsyncOperation';

export interface UseChatAPIReturn {
  // State
  isLoading: boolean;
  error: string | null;
  
  // Chat Operations
  sendMessage: (request: SendMessageRequest) => Promise<SendMessageResponse | null>;
  getChatHistory: (limit?: number, cursor?: string) => Promise<ChatMessage[]>;
  clearChatHistory: () => Promise<boolean>;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  
  // AI Settings
  updateAISettings: (settings: AISettingsRequest) => Promise<boolean>;
  
  // Group Chat
  startGroupChat: () => Promise<string | null>;
  sendGroupMessage: (message: string, conversationId: string) => Promise<SendMessageResponse | null>;
  
  // Stats & Analytics
  getChatStats: () => Promise<ChatStatsResponse | null>;
  
  // Utility
  clearError: () => void;
  resetState: () => void;
}

export const useChatAPI = (): UseChatAPIReturn => {
  const [error, setError] = useState<string | null>(null);
  const { handleError } = useErrorHandler();
  const { execute, isLoading } = useAsyncOperation();

  // ============================================
  // Chat Operations
  // ============================================

  const sendMessage = useCallback(async (request: SendMessageRequest): Promise<SendMessageResponse | null> => {
    return execute(
      async () => {
        const response = await chatAPI().sendMessage(request);
        setError(null);
        return response;
      },
      (error) => {
        const errorMessage = handleError(error, 'メッセージの送信に失敗しました');
        setError(errorMessage);
        return null;
      }
    );
  }, [execute, handleError]);

  const getChatHistory = useCallback(async (limit = 50, cursor?: string): Promise<ChatMessage[]> => {
    return execute(
      async () => {
        const response = await chatAPI().getChatHistory({ limit, cursor });
        setError(null);
        return response.data;
      },
      (error) => {
        const errorMessage = handleError(error, 'チャット履歴の取得に失敗しました');
        setError(errorMessage);
        return [];
      }
    );
  }, [execute, handleError]);

  const clearChatHistory = useCallback(async (): Promise<boolean> => {
    return execute(
      async () => {
        await chatAPI().clearChatHistory();
        setError(null);
        return true;
      },
      (error) => {
        const errorMessage = handleError(error, 'チャット履歴のクリアに失敗しました');
        setError(errorMessage);
        return false;
      }
    );
  }, [execute, handleError]);

  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    return execute(
      async () => {
        await chatAPI().deleteConversation(conversationId);
        setError(null);
        return true;
      },
      (error) => {
        const errorMessage = handleError(error, '会話の削除に失敗しました');
        setError(errorMessage);
        return false;
      }
    );
  }, [execute, handleError]);

  // ============================================
  // AI Settings
  // ============================================

  const updateAISettings = useCallback(async (settings: AISettingsRequest): Promise<boolean> => {
    return execute(
      async () => {
        await chatAPI().updateAISettings(settings);
        setError(null);
        return true;
      },
      (error) => {
        const errorMessage = handleError(error, 'AI設定の更新に失敗しました');
        setError(errorMessage);
        return false;
      }
    );
  }, [execute, handleError]);

  // ============================================
  // Group Chat
  // ============================================

  const startGroupChat = useCallback(async (): Promise<string | null> => {
    return execute(
      async () => {
        const response = await chatAPI().startGroupChat();
        setError(null);
        return response.conversation_id;
      },
      (error) => {
        const errorMessage = handleError(error, 'グループチャットの開始に失敗しました');
        setError(errorMessage);
        return null;
      }
    );
  }, [execute, handleError]);

  const sendGroupMessage = useCallback(async (
    message: string, 
    conversationId: string
  ): Promise<SendMessageResponse | null> => {
    return execute(
      async () => {
        const response = await chatAPI().sendGroupMessage({ message, conversation_id: conversationId });
        setError(null);
        return response;
      },
      (error) => {
        const errorMessage = handleError(error, 'グループメッセージの送信に失敗しました');
        setError(errorMessage);
        return null;
      }
    );
  }, [execute, handleError]);

  // ============================================
  // Stats & Analytics
  // ============================================

  const getChatStats = useCallback(async (): Promise<ChatStatsResponse | null> => {
    return execute(
      async () => {
        const response = await chatAPI().getChatStats();
        setError(null);
        return response;
      },
      (error) => {
        const errorMessage = handleError(error, 'チャット統計の取得に失敗しました');
        setError(errorMessage);
        return null;
      }
    );
  }, [execute, handleError]);

  // ============================================
  // Utility
  // ============================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetState = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    
    // Chat Operations
    sendMessage,
    getChatHistory,
    clearChatHistory,
    deleteConversation,
    
    // AI Settings
    updateAISettings,
    
    // Group Chat
    startGroupChat,
    sendGroupMessage,
    
    // Stats & Analytics
    getChatStats,
    
    // Utility
    clearError,
    resetState
  };
};
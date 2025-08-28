/**
 * Chat API Hook
 * チャット関連API操作の統一Hook
 */

import { useState, useCallback } from 'react';
import { chatAPI } from '@/lib/services/api/APIServiceManager';
import type { 
  SendMessageRequest, 
  SendMessageResponse
} from '@/lib/services/api/ChatAPIService';
import type { ChatMessage } from '@/types';
import { useErrorHandler } from '../utils/useErrorHandler';
import { useAsyncOperation } from '../utils/useAsyncOperation';

export interface UseChatAPIReturn {
  // State
  isLoading: boolean;
  error: string | null;
  
  // Chat Operations (実装済み機能のみ)
  sendMessage: (request: SendMessageRequest) => Promise<SendMessageResponse | null>;
  getChatHistory: (limit?: number, cursor?: string) => Promise<ChatMessage[]>;
  sendGroupMessage: (message: string, conversationId: string) => Promise<SendMessageResponse | null>;
  
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


  const sendGroupMessage = useCallback(async (
    message: string, 
    conversationId: string
  ): Promise<SendMessageResponse | null> => {
    return execute(
      async () => {
        const response = await chatAPI().sendGroupMessage(message, conversationId);
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

  // Utility

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
    
    // Core Chat Operations (実装済み機能のみ)
    sendMessage,
    getChatHistory,
    sendGroupMessage,
    
    // Utility
    clearError,
    resetState
  };
};
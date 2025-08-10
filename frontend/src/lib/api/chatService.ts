import { apiClient } from './index';
import { ChatMessage, AICharacter, PraiseLevel } from '@/types';

export interface SendMessageRequest {
  message: string;
  ai_character: AICharacter;
  praise_level: PraiseLevel;
  conversation_context?: ChatMessage[];
  is_emotion_stamp?: boolean;
  emotion_type?: string;
}

export interface SendMessageResponse {
  ai_response: string;
  emotion_detected?: string;
  fruit_generated: boolean;
  tree_updated: boolean;
  message_id: string;
  conversation_id: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  total_count: number;
  has_more: boolean;
  cursor?: string;
}

export class ChatService {
  /**
   * メッセージを送信してAI応答を取得
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      const response = await apiClient.post('/chat/message', request);
      return response.data;
    } catch (error) {
      console.error('Send message error:', error);
      throw new Error('メッセージの送信に失敗しました。');
    }
  }

  /**
   * チャット履歴を取得
   */
  async getChatHistory(limit = 50, cursor?: string): Promise<ChatHistoryResponse> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await apiClient.get(`/chat/history?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get chat history error:', error);
      throw new Error('チャット履歴の取得に失敗しました。');
    }
  }

  /**
   * 特定の会話を削除
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await apiClient.delete(`/chat/conversations/${conversationId}`);
    } catch (error) {
      console.error('Delete conversation error:', error);
      throw new Error('会話の削除に失敗しました。');
    }
  }

  /**
   * チャット履歴を全削除
   */
  async clearChatHistory(): Promise<void> {
    try {
      await apiClient.delete('/chat/history');
    } catch (error) {
      console.error('Clear chat history error:', error);
      throw new Error('チャット履歴のクリアに失敗しました。');
    }
  }

  /**
   * AI設定を更新
   */
  async updateAISettings(settings: {
    ai_character?: AICharacter;
    praise_level?: PraiseLevel;
  }): Promise<void> {
    try {
      await apiClient.put('/chat/settings', settings);
    } catch (error) {
      console.error('Update AI settings error:', error);
      throw new Error('AI設定の更新に失敗しました。');
    }
  }

  /**
   * グループチャット開始
   */
  async startGroupChat(): Promise<{ conversation_id: string }> {
    try {
      const response = await apiClient.post('/chat/group/start');
      return response.data;
    } catch (error) {
      console.error('Start group chat error:', error);
      throw new Error('グループチャットの開始に失敗しました。');
    }
  }

  /**
   * グループチャットにメッセージ送信
   */
  async sendGroupMessage(request: {
    message: string;
    conversation_id: string;
  }): Promise<SendMessageResponse> {
    try {
      const response = await apiClient.post('/chat/group/message', request);
      return response.data;
    } catch (error) {
      console.error('Send group message error:', error);
      throw new Error('グループメッセージの送信に失敗しました。');
    }
  }
}

// カスタムフック
export const useChatService = () => {
  return new ChatService();
};
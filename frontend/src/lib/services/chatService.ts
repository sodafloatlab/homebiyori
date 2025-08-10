import apiClient from '@/lib/api';
import { 
  ChatRequest, 
  ChatResponse, 
  GetChatHistoryRequest, 
  GetChatHistoryResponse,
  ChatHistoryItem 
} from '@/types/api';
import { AICharacter, PraiseLevel } from '@/types';

export class ChatService {
  /**
   * チャットメッセージを送信
   */
  static async sendMessage(params: {
    message: string;
    aiCharacter?: AICharacter;
    praiseLevel?: PraiseLevel;
    contextLength?: number;
  }): Promise<ChatResponse> {
    const request: ChatRequest = {
      message: params.message,
      ai_character: params.aiCharacter,
      praise_level: params.praiseLevel,
      context_length: params.contextLength || 10
    };

    return await apiClient.post('/chat', request);
  }

  /**
   * チャット履歴を取得
   */
  static async getChatHistory(params: GetChatHistoryRequest = {}): Promise<GetChatHistoryResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.limit) {
      queryParams.set('limit', params.limit.toString());
    }
    
    if (params.start_key) {
      queryParams.set('start_key', params.start_key);
    }

    const url = `/chat/history${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return await apiClient.get(url);
  }

  /**
   * チャット履歴を削除
   */
  static async deleteChatHistory(chatId: string): Promise<void> {
    await apiClient.delete(`/chat/history/${chatId}`);
  }

  /**
   * 全チャット履歴を削除
   */
  static async clearAllChatHistory(): Promise<void> {
    await apiClient.delete('/chat/history');
  }

  /**
   * チャット文脈を取得（最近のN件）
   */
  static async getChatContext(limit: number = 10): Promise<ChatHistoryItem[]> {
    const response = await this.getChatHistory({ limit });
    return response.chats.slice(-limit); // 最新のlimit件を取得
  }

  /**
   * AIキャラクターの応答例を取得
   */
  static async getAIResponseSample(params: {
    aiCharacter: AICharacter;
    praiseLevel: PraiseLevel;
    sampleType?: 'greeting' | 'praise' | 'listen';
  }): Promise<{ response: string; emotion: string }> {
    return await apiClient.get('/chat/sample', {
      params: {
        ai_character: params.aiCharacter,
        praise_level: params.praiseLevel,
        sample_type: params.sampleType || 'greeting'
      }
    });
  }

  /**
   * チャット統計情報を取得
   */
  static async getChatStats(): Promise<{
    total_chats: number;
    total_characters: number;
    favorite_character: AICharacter;
    average_response_length: number;
    last_chat_date: string;
  }> {
    return await apiClient.get('/chat/stats');
  }
}

export default ChatService;
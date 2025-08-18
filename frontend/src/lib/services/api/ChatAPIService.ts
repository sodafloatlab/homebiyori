/**
 * 統一Chat API Service
 * チャット関連のAPIを統一したアーキテクチャで提供
 */

import { BaseAPIService, PaginatedResponse, PaginatedRequest } from './index';
import { ChatMessage, AICharacterUnified as AICharacter, PraiseLevelUnified as PraiseLevel } from '@/types';

// ============================================
// Request/Response Types
// ============================================

export interface SendMessageRequest {
  message: string;
  ai_character: AICharacter;
  praise_level: PraiseLevel;
  conversation_context?: ChatMessage[];
  is_emotion_stamp?: boolean;
  emotion_type?: string;
  context_length?: number;
}

export interface SendMessageResponse {
  ai_response: string;
  emotion_detected?: string;
  fruit_generated: boolean;
  tree_updated: boolean;
  message_id: string;
  conversation_id: string;
}

export interface ChatHistoryResponse extends PaginatedResponse<ChatMessage> {}

export interface ChatStatsResponse {
  total_chats: number;
  total_characters: number;
  favorite_character: AICharacter;
  average_response_length: number;
  last_chat_date: string;
}

export interface AISettingsRequest {
  ai_character?: AICharacter;
  praise_level?: PraiseLevel;
}

export interface GroupChatRequest {
  message: string;
  conversation_id?: string;
}

export interface AIResponseSampleRequest {
  ai_character: AICharacter;
  praise_level: PraiseLevel;
  sample_type?: 'greeting' | 'praise' | 'listen';
}

export interface AIResponseSampleResponse {
  response: string;
  emotion: string;
}

// ============================================
// Unified Chat API Service
// ============================================

export class ChatAPIService extends BaseAPIService {
  constructor() {
    super('/chat');
  }

  /**
   * メッセージを送信してAI応答を取得
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    return this.post<SendMessageResponse>('/message', request);
  }

  /**
   * チャット履歴を取得（ページネーション対応）
   */
  async getChatHistory(request: PaginatedRequest = {}): Promise<ChatHistoryResponse> {
    return this.get<ChatHistoryResponse>('/history', request);
  }

  /**
   * チャット文脈を取得（最近のN件）
   */
  async getChatContext(limit: number = 10): Promise<ChatMessage[]> {
    const response = await this.getChatHistory({ limit });
    return response.data.slice(-limit);
  }

  /**
   * 特定の会話を削除
   */
  async deleteConversation(conversationId: string): Promise<void> {
    return this.delete(`/conversations/${conversationId}`);
  }

  /**
   * チャット履歴を全削除
   */
  async clearChatHistory(): Promise<void> {
    return this.delete('/history');
  }

  /**
   * AI設定を更新
   */
  async updateAISettings(settings: AISettingsRequest): Promise<void> {
    return this.put('/settings', settings);
  }

  /**
   * グループチャット開始
   */
  async startGroupChat(): Promise<{ conversation_id: string }> {
    return this.post<{ conversation_id: string }>('/group/start');
  }

  /**
   * グループチャットにメッセージ送信
   */
  async sendGroupMessage(request: GroupChatRequest): Promise<SendMessageResponse> {
    return this.post<SendMessageResponse>('/group/message', request);
  }

  /**
   * AIキャラクターの応答例を取得
   */
  async getAIResponseSample(request: AIResponseSampleRequest): Promise<AIResponseSampleResponse> {
    return this.get<AIResponseSampleResponse>('/sample', {
      ai_character: request.ai_character,
      praise_level: request.praise_level,
      sample_type: request.sample_type || 'greeting'
    });
  }

  /**
   * チャット統計情報を取得
   */
  async getChatStats(): Promise<ChatStatsResponse> {
    return this.get<ChatStatsResponse>('/stats');
  }

  /**
   * 特定チャットメッセージを削除
   */
  async deleteMessage(messageId: string): Promise<void> {
    return this.delete(`/messages/${messageId}`);
  }

  /**
   * チャットメッセージを編集
   */
  async editMessage(messageId: string, newMessage: string): Promise<ChatMessage> {
    return this.put<ChatMessage>(`/messages/${messageId}`, { message: newMessage });
  }

  /**
   * 会話をお気に入りに追加
   */
  async favoriteConversation(conversationId: string): Promise<void> {
    return this.post(`/conversations/${conversationId}/favorite`);
  }

  /**
   * 会話のお気に入りを解除
   */
  async unfavoriteConversation(conversationId: string): Promise<void> {
    return this.delete(`/conversations/${conversationId}/favorite`);
  }
}
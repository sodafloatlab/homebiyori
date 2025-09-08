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
  message_id: string;
  ai_response: string;
  tree_growth: {
    previous_stage: number;
    current_stage: number;
    previous_total: number;
    current_total: number;
    added_characters: number;
    stage_changed: boolean;
    growth_celebration?: string;
  };
  fruit_generated: boolean;
  fruit_info?: {
    fruit_id: string;
    user_id: string;
    user_message: string;
    ai_response: string;
    ai_character: string;
    interaction_mode: string;
    detected_emotion?: string;
    created_at: string;
  };
  timestamp: string;
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

export interface GroupChatResponse {
  message_id: string;
  ai_responses: Array<{
    character: string;
    response: string;
    is_representative: boolean;
  }>;
  tree_growth: {
    previous_stage: number;
    current_stage: number;
    previous_total: number;
    current_total: number;
    added_characters: number;
    stage_changed: boolean;
    growth_celebration?: string;
  };
  fruit_generated: boolean;
  fruit_info?: {
    fruit_id: string;
    user_id: string;
    user_message: string;
    ai_response: string;
    ai_character: string;
    interaction_mode: string;
    detected_emotion?: string;
    created_at: string;
  };
  timestamp: string;
  active_characters: string[];
}

// ============================================
// Unified Chat API Service
// ============================================

export class ChatAPIService extends BaseAPIService {
  constructor() {
    super('/api/chat');
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

  // ✅ 既存API活用 - 感情スタンプ機能
  async sendEmotionStamp(emotion: string, targetMessageId?: string): Promise<void> {
    return this.post('/emotions', {
      emotion_type: emotion,
      target_message_id: targetMessageId,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ 既存API活用 - グループチャットメッセージ生成機能（パス修正）
  async sendGroupMessage(message: string, conversationId?: string): Promise<GroupChatResponse> {
    // POST: グループチャット時のチャットメッセージ生成リクエスト機能
    return this.post('/group-messages', {
      message,
      conversation_id: conversationId
    });
  }

}
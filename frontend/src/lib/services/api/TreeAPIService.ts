/**
 * 統一Tree API Service
 * 木の成長・フルーツ関連のAPIを統一したアーキテクチャで提供
 */

import { BaseAPIService, PaginatedResponse, PaginatedRequest } from './index';
import { AiRole, TreeStageUnified as TreeStage } from '@/types';

// ============================================
// Request/Response Types
// ============================================

export interface TreeStatus {
  current_stage: TreeStage;
  total_characters: number;
  growth_progress: number;
  last_updated: string;
  theme_color: string;
}

export interface FruitInfo {
  fruit_id: string;
  user_message: string;
  ai_response: string;
  ai_character: AiRole;
  emotion_detected: string;
  created_at: string;
  position?: { x: number; y: number };
}

export interface TreeStatsResponse {
  total_fruits: number;
  total_characters: number;
  current_stage: TreeStage;
  days_growing: number;
  favorite_emotion: string;
  character_distribution: Record<AiRole, number>;
}

export interface FruitsListResponse extends PaginatedResponse<FruitInfo> {}

export interface CreateFruitRequest {
  user_message: string;
  ai_response: string;
  ai_character: AiRole;
  emotion_detected: string;
}

export interface UpdateTreeRequest {
  characters_added: number;
  ai_character?: AiRole;
}

export interface TreeThemeRequest {
  theme_color: string;
  ai_character: AiRole;
}

export interface FruitFilterRequest extends PaginatedRequest {
  character_filter?: AiRole;
  emotion_filter?: string;
  date_from?: string;
  date_to?: string;
  search_query?: string;
}

// ============================================
// Unified Tree API Service
// ============================================

export class TreeAPIService extends BaseAPIService {
  constructor() {
    super('/api/tree');
  }

  /**
   * 木の現在ステータスを取得
   */
  async getTreeStatus(): Promise<TreeStatus> {
    return this.get<TreeStatus>('/status');
  }

  // ✅ 既存API活用 - 木の初期化（リセット代替）
  async initializeTree(): Promise<TreeStatus> {
    return this.put('/status');
  }
  
  // ✅ 既存API活用 - 手動成長更新（デバッグ・管理用）
  async manualGrowthUpdate(characters: number): Promise<TreeStatus> {
    return this.post('/update-growth', { added_characters: characters });
  }

  // ✅ 既存API活用 - 手動実生成（特別イベント用）
  async createManualFruit(request: CreateFruitRequest): Promise<FruitInfo> {
    return this.post('/fruits', request);
  }

}
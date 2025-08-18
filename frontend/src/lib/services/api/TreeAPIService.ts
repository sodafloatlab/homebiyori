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
    super('/tree');
  }

  /**
   * 木の現在ステータスを取得
   */
  async getTreeStatus(): Promise<TreeStatus> {
    return this.get<TreeStatus>('/status');
  }

  /**
   * 木を更新（文字数追加）
   */
  async updateTree(request: UpdateTreeRequest): Promise<TreeStatus> {
    return this.put<TreeStatus>('/', request);
  }

  /**
   * 木の統計情報を取得
   */
  async getTreeStats(): Promise<TreeStatsResponse> {
    return this.get<TreeStatsResponse>('/stats');
  }

  /**
   * フルーツ一覧を取得（フィルター・ページネーション対応）
   */
  async getFruitsList(request: FruitFilterRequest = {}): Promise<FruitsListResponse> {
    return this.get<FruitsListResponse>('/fruits', request);
  }

  /**
   * 新しいフルーツを作成
   */
  async createFruit(request: CreateFruitRequest): Promise<FruitInfo> {
    return this.post<FruitInfo>('/fruits', request);
  }

  /**
   * 特定フルーツの詳細を取得
   */
  async getFruitDetail(fruitId: string): Promise<FruitInfo> {
    return this.get<FruitInfo>(`/fruits/${fruitId}`);
  }

  /**
   * フルーツを削除
   */
  async deleteFruit(fruitId: string): Promise<void> {
    return this.delete(`/fruits/${fruitId}`);
  }

  /**
   * 木のテーマカラーを設定
   */
  async setTreeTheme(request: TreeThemeRequest): Promise<TreeStatus> {
    return this.put<TreeStatus>('/theme', request);
  }

  /**
   * 木をリセット（初期状態に戻す）
   */
  async resetTree(): Promise<TreeStatus> {
    return this.post<TreeStatus>('/reset');
  }

  /**
   * フルーツの位置を更新
   */
  async updateFruitPosition(fruitId: string, position: { x: number; y: number }): Promise<FruitInfo> {
    return this.put<FruitInfo>(`/fruits/${fruitId}/position`, { position });
  }

  /**
   * 感情別フルーツ統計を取得
   */
  async getEmotionStats(): Promise<Record<string, number>> {
    return this.get<Record<string, number>>('/stats/emotions');
  }

  /**
   * キャラクター別フルーツ統計を取得
   */
  async getCharacterStats(): Promise<Record<AiRole, number>> {
    return this.get<Record<AiRole, number>>('/stats/characters');
  }

  /**
   * 成長履歴を取得
   */
  async getGrowthHistory(): Promise<{
    date: string;
    stage: TreeStage;
    characters_added: number;
  }[]> {
    return this.get<{
      date: string;
      stage: TreeStage;
      characters_added: number;
    }[]>('/growth-history');
  }

  /**
   * 今日追加された文字数を取得
   */
  async getTodayProgress(): Promise<{
    characters_today: number;
    progress_to_next_stage: number;
    estimated_next_stage_date?: string;
  }> {
    return this.get<{
      characters_today: number;
      progress_to_next_stage: number;
      estimated_next_stage_date?: string;
    }>('/today-progress');
  }
}
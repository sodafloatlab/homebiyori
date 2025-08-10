import apiClient from '@/lib/api';
import {
  GetTreeStatusResponse,
  AddFruitRequest,
  AddFruitResponse,
  GetFruitsRequest,
  GetFruitsResponse
} from '@/types/api';
import { AICharacter } from '@/types';

export class TreeService {
  /**
   * 木の状態を取得
   */
  static async getTreeStatus(): Promise<GetTreeStatusResponse> {
    return await apiClient.get('/tree/status');
  }

  /**
   * 実を追加（木の成長）
   */
  static async addFruit(params: AddFruitRequest): Promise<AddFruitResponse> {
    return await apiClient.post('/tree/fruits', params);
  }

  /**
   * 実の一覧を取得
   */
  static async getFruits(params: GetFruitsRequest = {}): Promise<GetFruitsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.limit) {
      queryParams.set('limit', params.limit.toString());
    }
    
    if (params.start_key) {
      queryParams.set('start_key', params.start_key);
    }
    
    if (params.ai_character) {
      queryParams.set('ai_character', params.ai_character);
    }

    const url = `/tree/fruits${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return await apiClient.get(url);
  }

  /**
   * 特定の実を取得
   */
  static async getFruit(fruitId: string): Promise<{
    fruit_id: string;
    user_message: string;
    ai_response: string;
    ai_character: AICharacter;
    emotion: string;
    created_at: string;
  }> {
    return await apiClient.get(`/tree/fruits/${fruitId}`);
  }

  /**
   * 実を削除
   */
  static async deleteFruit(fruitId: string): Promise<void> {
    await apiClient.delete(`/tree/fruits/${fruitId}`);
  }

  /**
   * 木の成長レベルを計算
   */
  static async calculateGrowthLevel(characterCount: number): Promise<{
    level: number;
    experience: number;
    experience_to_next: number;
    progress_percentage: number;
  }> {
    return await apiClient.get('/tree/calculate-level', {
      params: { character_count: characterCount }
    });
  }

  /**
   * 木の成長統計を取得
   */
  static async getGrowthStats(): Promise<{
    total_fruits: number;
    total_characters: number;
    current_level: number;
    days_active: number;
    favorite_character: AICharacter;
    growth_milestones: Array<{
      level: number;
      achieved_at: string;
      characters_needed: number;
    }>;
  }> {
    return await apiClient.get('/tree/stats');
  }

  /**
   * 木のテーマカラーを更新
   */
  static async updateThemeColor(color: string): Promise<void> {
    await apiClient.patch('/tree/theme', { theme_color: color });
  }

  /**
   * 月別成長レポートを取得
   */
  static async getMonthlyGrowthReport(year: number, month: number): Promise<{
    year: number;
    month: number;
    total_fruits: number;
    total_characters: number;
    daily_activities: Array<{
      date: string;
      fruits_count: number;
      characters_count: number;
      primary_emotion: string;
    }>;
    character_distribution: Record<AICharacter, number>;
    emotion_distribution: Record<string, number>;
  }> {
    return await apiClient.get('/tree/monthly-report', {
      params: { year, month }
    });
  }

  /**
   * 成長マイルストーンを取得
   */
  static async getGrowthMilestones(): Promise<{
    milestones: Array<{
      id: string;
      title: string;
      description: string;
      level_required: number;
      characters_required: number;
      is_achieved: boolean;
      achieved_at?: string;
      reward_type: 'badge' | 'theme' | 'feature';
      reward_data: any;
    }>;
  }> {
    return await apiClient.get('/tree/milestones');
  }
}

export default TreeService;
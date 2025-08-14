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
   * 木が初期化されていない場合は自動で初期化を試行
   */
  static async getTreeStatus(): Promise<GetTreeStatusResponse> {
    try {
      return await apiClient.get('/tree/status');
    } catch (error: any) {
      // 404エラー（木が未初期化）の場合は自動初期化を試行
      if (error?.response?.status === 404) {
        console.log('Tree not initialized, attempting to initialize...');
        try {
          await TreeService.initializeTree();
          // 初期化後に再度状態を取得
          return await apiClient.get('/tree/status');
        } catch (initError) {
          console.error('Tree initialization error:', initError);
          throw new Error('木の初期化に失敗しました。');
        }
      }
      throw error;
    }
  }

  /**
   * 木を初期化
   */
  static async initializeTree(): Promise<GetTreeStatusResponse> {
    try {
      return await apiClient.put('/tree/status');
    } catch (error: any) {
      // 409エラー（既に初期化済み）の場合は正常とみなす
      if (error?.response?.status === 409) {
        console.log('Tree already initialized');
        // 既存の状態を取得して返す
        return await apiClient.get('/tree/status');
      }
      throw error;
    }
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
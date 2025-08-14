import { apiClient } from './index';
import { TreeStatus, Fruit, TreeStage } from '@/types';

export interface TreeStatusResponse {
  tree_status: TreeStatus;
  fruits: Fruit[];
  growth_history: Array<{
    stage: TreeStage;
    achieved_at: string;
    messages_count: number;
  }>;
}

export interface FruitDetailsResponse {
  fruit: Fruit;
  related_fruits: Fruit[];
}

export interface TreeStatsResponse {
  total_messages: number;
  total_fruits: number;
  current_stage: TreeStage;
  days_active: number;
  emotions_detected: {
    [emotion: string]: number;
  };
  ai_characters_used: {
    [character: string]: number;
  };
}

export class TreeService {
  /**
   * 木の状態と実の一覧を取得
   * 木が初期化されていない場合は自動で初期化を試行
   */
  async getTreeStatus(): Promise<TreeStatusResponse> {
    try {
      const response = await apiClient.get('/tree/status');
      return response.data;
    } catch (error: any) {
      // 404エラー（木が未初期化）の場合は自動初期化を試行
      if (error?.response?.status === 404) {
        console.log('Tree not initialized, attempting to initialize...');
        try {
          await this.initializeTree();
          // 初期化後に再度状態を取得
          const response = await apiClient.get('/tree/status');
          return response.data;
        } catch (initError) {
          console.error('Tree initialization error:', initError);
          throw new Error('木の初期化に失敗しました。');
        }
      }
      console.error('Get tree status error:', error);
      throw new Error('木の状態の取得に失敗しました。');
    }
  }

  /**
   * 木を初期化
   */
  async initializeTree(): Promise<TreeStatusResponse> {
    try {
      const response = await apiClient.put('/tree/status');
      return response.data;
    } catch (error: any) {
      // 409エラー（既に初期化済み）の場合は正常とみなす
      if (error?.response?.status === 409) {
        console.log('Tree already initialized');
        // 既存の状態を取得して返す
        const response = await apiClient.get('/tree/status');
        return response.data;
      }
      console.error('Initialize tree error:', error);
      throw new Error('木の初期化に失敗しました。');
    }
  }

  /**
   * 特定の実の詳細情報を取得
   */
  async getFruitDetails(fruitId: string): Promise<FruitDetailsResponse> {
    try {
      const response = await apiClient.get(`/tree/fruits/${fruitId}`);
      return response.data;
    } catch (error) {
      console.error('Get fruit details error:', error);
      throw new Error('実の詳細情報の取得に失敗しました。');
    }
  }

  /**
   * 実の一覧を取得（ページネーション付き）
   */
  async getFruits(params?: {
    limit?: number;
    cursor?: string;
    emotion?: string;
    ai_character?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{
    fruits: Fruit[];
    total_count: number;
    has_more: boolean;
    cursor?: string;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.cursor) queryParams.append('cursor', params.cursor);
      if (params?.emotion) queryParams.append('emotion', params.emotion);
      if (params?.ai_character) queryParams.append('ai_character', params.ai_character);
      if (params?.date_from) queryParams.append('date_from', params.date_from);
      if (params?.date_to) queryParams.append('date_to', params.date_to);

      const response = await apiClient.get(`/tree/fruits?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Get fruits error:', error);
      throw new Error('実の一覧の取得に失敗しました。');
    }
  }

  /**
   * 木の統計情報を取得
   */
  async getTreeStats(): Promise<TreeStatsResponse> {
    try {
      const response = await apiClient.get('/tree/stats');
      return response.data;
    } catch (error) {
      console.error('Get tree stats error:', error);
      throw new Error('木の統計情報の取得に失敗しました。');
    }
  }

  /**
   * 木の成長履歴を取得
   */
  async getGrowthHistory(): Promise<Array<{
    stage: TreeStage;
    achieved_at: string;
    messages_count: number;
    milestone_message?: string;
  }>> {
    try {
      const response = await apiClient.get('/tree/growth-history');
      return response.data.growth_history;
    } catch (error) {
      console.error('Get growth history error:', error);
      throw new Error('成長履歴の取得に失敗しました。');
    }
  }

  /**
   * 実を削除（管理者機能またはユーザーの削除要求）
   */
  async deleteFruit(fruitId: string): Promise<void> {
    try {
      await apiClient.delete(`/tree/fruits/${fruitId}`);
    } catch (error) {
      console.error('Delete fruit error:', error);
      throw new Error('実の削除に失敗しました。');
    }
  }

  /**
   * 木をリセット（開発・テスト用）
   */
  async resetTree(): Promise<void> {
    try {
      await apiClient.post('/tree/reset');
    } catch (error) {
      console.error('Reset tree error:', error);
      throw new Error('木のリセットに失敗しました。');
    }
  }

  /**
   * 実にメモを追加
   */
  async addFruitMemo(fruitId: string, memo: string): Promise<void> {
    try {
      await apiClient.put(`/tree/fruits/${fruitId}/memo`, { memo });
    } catch (error) {
      console.error('Add fruit memo error:', error);
      throw new Error('実へのメモ追加に失敗しました。');
    }
  }

  /**
   * 実のお気に入り状態を切り替え
   */
  async toggleFruitFavorite(fruitId: string): Promise<{ is_favorite: boolean }> {
    try {
      const response = await apiClient.put(`/tree/fruits/${fruitId}/favorite`);
      return response.data;
    } catch (error) {
      console.error('Toggle fruit favorite error:', error);
      throw new Error('お気に入り状態の変更に失敗しました。');
    }
  }

  /**
   * 木の画像をエクスポート（将来の機能）
   */
  async exportTreeImage(): Promise<{ image_url: string }> {
    try {
      const response = await apiClient.post('/tree/export');
      return response.data;
    } catch (error) {
      console.error('Export tree image error:', error);
      throw new Error('木の画像エクスポートに失敗しました。');
    }
  }
}

// カスタムフック
export const useTreeService = () => {
  return new TreeService();
};
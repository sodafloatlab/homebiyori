import apiClient from '@/lib/api';
import { 
  CreateUserProfileRequest,
  UpdateUserProfileRequest,
  UpdateAIPreferencesRequest 
} from '@/types/api';
import { UserProfile, AICharacter, PraiseLevel } from '@/types';

export class UserService {
  /**
   * ユーザープロフィールを取得
   */
  static async getProfile(): Promise<UserProfile> {
    return await apiClient.get('/user/profile');
  }

  /**
   * ユーザープロフィールを作成
   */
  static async createProfile(params: CreateUserProfileRequest): Promise<UserProfile> {
    return await apiClient.post('/user/profile', params);
  }

  /**
   * ユーザープロフィールを更新
   */
  static async updateProfile(params: UpdateUserProfileRequest): Promise<UserProfile> {
    return await apiClient.patch('/user/profile', params);
  }

  /**
   * AI設定を取得
   */
  static async getAIPreferences(): Promise<{
    ai_character: AICharacter;
    praise_level: PraiseLevel;
  }> {
    return await apiClient.get('/user/ai-preferences');
  }

  /**
   * AI設定を更新
   */
  static async updateAIPreferences(params: UpdateAIPreferencesRequest): Promise<{
    ai_character: AICharacter;
    praise_level: PraiseLevel;
  }> {
    return await apiClient.patch('/user/ai-preferences', params);
  }

  /**
   * 対話モードを更新（praise/listen）
   */
  static async updateInteractionMode(interactionMode: 'praise' | 'listen'): Promise<void> {
    await apiClient.patch('/user/ai-preferences', { 
      interaction_mode: interactionMode 
    });
  }

  /**
   * オンボーディング完了を記録
   */
  static async completeOnboarding(): Promise<void> {
    await apiClient.patch('/user/profile', { 
      onboarding_completed: true 
    });
  }

  /**
   * ユーザー統計情報を取得
   */
  static async getUserStats(): Promise<{
    total_chat_days: number;
    total_characters: number;
    total_fruits: number;
    current_streak: number;
    longest_streak: number;
    favorite_character: AICharacter;
    account_created: string;
    last_activity: string;
  }> {
    return await apiClient.get('/user/stats');
  }

  /**
   * アクティビティ履歴を取得
   */
  static async getActivityHistory(params: {
    limit?: number;
    start_date?: string;
    end_date?: string;
  } = {}): Promise<{
    activities: Array<{
      date: string;
      activity_type: 'chat' | 'fruit_added' | 'level_up';
      description: string;
      metadata: any;
    }>;
    total_count: number;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.limit) {
      queryParams.set('limit', params.limit.toString());
    }
    
    if (params.start_date) {
      queryParams.set('start_date', params.start_date);
    }
    
    if (params.end_date) {
      queryParams.set('end_date', params.end_date);
    }

    const url = `/user/activity${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return await apiClient.get(url);
  }

  /**
   * ユーザーデータをエクスポート
   */
  static async exportUserData(): Promise<{
    export_id: string;
    download_url: string;
    expires_at: string;
  }> {
    return await apiClient.post('/user/export');
  }

  /**
   * ユーザーアカウントを削除
   */
  static async deleteAccount(params: {
    confirmation: string;
    reason?: string;
    feedback?: string;
  }): Promise<void> {
    await apiClient.delete('/user/account', params);
  }

  /**
   * プライバシー設定を取得
   */
  static async getPrivacySettings(): Promise<{
    data_collection: boolean;
    analytics: boolean;
    marketing_communications: boolean;
    data_retention_days: number;
  }> {
    return await apiClient.get('/user/privacy');
  }

  /**
   * プライバシー設定を更新
   */
  static async updatePrivacySettings(params: {
    data_collection?: boolean;
    analytics?: boolean;
    marketing_communications?: boolean;
    data_retention_days?: number;
  }): Promise<{
    data_collection: boolean;
    analytics: boolean;
    marketing_communications: boolean;
    data_retention_days: number;
  }> {
    return await apiClient.patch('/user/privacy', params);
  }
}

export default UserService;
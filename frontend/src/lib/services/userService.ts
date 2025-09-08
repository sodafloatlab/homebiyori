import apiClient from '@/lib/api';
import { 
  UpdateUserProfileRequest,
  UpdateAIPreferencesRequest 
} from '@/types/api';
import { UserProfile, AICharacter, PraiseLevel } from '@/types';

export class UserService {
  /**
   * ユーザープロフィールを取得（存在しない場合はデフォルト値を返却）
   */
  static async getProfile(): Promise<UserProfile> {
    return await apiClient.get('/api/user/profile');
  }

  /**
   * ユーザープロフィールを更新（存在しない場合は作成）
   */
  static async updateProfile(params: UpdateUserProfileRequest): Promise<{message: string}> {
    return await apiClient.put('/api/user/profile', params);
  }

  /**
   * AI設定を更新（プロフィールに統合）
   */
  static async updateAIPreferences(params: UpdateAIPreferencesRequest): Promise<{message: string}> {
    return await apiClient.put('/api/user/profile/ai-preferences', params);
  }

  // ✅ 既存API活用 - オンボーディング機能
  static async getOnboardingStatus(): Promise<{user_id: string, is_completed: boolean, completed_at?: string}> {
    try {
      console.log('🔍 UserService: Calling onboarding-status API...');
      const response = await apiClient.get('/api/user/account/onboarding-status');
      console.log('🔍 UserService: API response received:', {
        response,
        type: typeof response,
        hasIsCompleted: response ? 'is_completed' in response : false
      });
      return response;
    } catch (error) {
      console.error('🚫 UserService: API call failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  static async completeOnboarding(data?: any): Promise<{message: string}> {
    return await apiClient.post('/api/user/account/complete-onboarding', data || {});
  }

}

export default UserService;
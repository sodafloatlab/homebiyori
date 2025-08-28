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
  static async updateProfile(params: UpdateUserProfileRequest): Promise<UserProfile> {
    return await apiClient.put('/api/user/profile', params);
  }

  /**
   * AI設定を更新（プロフィールに統合）
   */
  static async updateAIPreferences(params: UpdateAIPreferencesRequest): Promise<{
    ai_character: AICharacter;
    praise_level: PraiseLevel;
  }> {
    return await apiClient.put('/api/user/profile/ai-preferences', params);
  }

  // ✅ 既存API活用 - オンボーディング機能
  static async getOnboardingStatus(): Promise<{onboarding_completed: boolean}> {
    return await apiClient.get('/api/user/account/onboarding-status');
  }

  static async completeOnboarding(data?: any): Promise<{message: string}> {
    return await apiClient.post('/api/user/account/complete-onboarding', data || {});
  }

}

export default UserService;
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthUser, UserProfile, APIResponse } from '@/types';
import { STORAGE_KEYS } from '@/lib/constants';

interface AuthState {
  // 認証状態
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;

  // ユーザープロフィール
  profile: UserProfile | null;
  isProfileLoading: boolean;
  profileError: string | null;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProfileLoading: (loading: boolean) => void;
  setProfileError: (error: string | null) => void;

  // Auth Actions
  login: (authResponse: { user: AuthUser; profile: UserProfile }) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearError: () => void;

  // Token Management
  getAccessToken: () => string | null;
  isTokenValid: () => boolean;
  refreshAuthToken: () => Promise<boolean>;
  
  // Amplify Auth Integration
  initialize: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  signOut: () => Promise<void>;
  
  // Profile Sync Functions
  syncProfileWithBackend: () => Promise<boolean>;
  retryProfileSync: () => Promise<void>;
  hasBackendConnection: () => boolean;
  
  // Onboarding Functions
  checkOnboardingStatus: () => Promise<boolean>;
  completeOnboarding: (data?: any) => Promise<boolean>;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,
      profile: null,
      isProfileLoading: false,
      profileError: null,

      // Basic Setters
      setUser: (user) => set({ user, isLoggedIn: !!user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setProfileLoading: (isProfileLoading) => set({ isProfileLoading }),
      setProfileError: (profileError) => set({ profileError }),

      // Auth Actions
      login: ({ user, profile }) => {
        set({
          user,
          profile,
          isLoggedIn: true,
          isLoading: false,
          error: null,
          profileError: null
        });
      },

      logout: () => {
        set({
          user: null,
          profile: null,
          isLoggedIn: false,
          isLoading: false,
          error: null,
          profileError: null
        });
      },

      updateProfile: (updates) => {
        const currentProfile = get().profile;
        if (currentProfile) {
          set({
            profile: {
              ...currentProfile,
              ...updates,
              updated_at: new Date().toISOString()
            }
          });
        }
      },

      clearError: () => set({ error: null, profileError: null }),

      // Token Management
      getAccessToken: () => {
        const { user } = get();
        return user?.accessToken || null;
      },

      isTokenValid: () => {
        const { user } = get();
        if (!user?.accessToken) return false;

        try {
          // JWT Token の有効性チェック（簡易版）
          const tokenParts = user.accessToken.split('.');
          if (tokenParts.length !== 3) return false;

          const payload = JSON.parse(atob(tokenParts[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          return payload.exp && payload.exp > currentTime;
        } catch {
          return false;
        }
      },

      refreshAuthToken: async () => {
        const { user } = get();
        if (!user?.accessToken) return false;

        try {
          set({ isLoading: true, error: null });

          // AWS Amplify Auth では自動でトークンリフレッシュが処理される
          // fetchAuthSession({ forceRefresh: true }) で最新トークンを取得
          console.log('Token refresh requested for user:', user.userId);
          
          set({ isLoading: false });
          return true;
        } catch (error) {
          set({ 
            isLoading: false, 
            error: 'トークンの更新に失敗しました',
            user: null,
            isLoggedIn: false 
          });
          return false;
        }
      },

      // Amplify Auth Integration
      initialize: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Amplify Auth初期化処理をここで実行
          // 実際の実装は必要に応じて追加
          console.log('Auth store initialized');
          
          set({ isLoading: false });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: '認証初期化に失敗しました' 
          });
        }
      },

      checkAuthStatus: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Step 1: AWS Amplify Authで現在の認証状態をチェック
          const { getCurrentUserInfo } = await import('@/lib/amplify');
          const { user, tokens } = await getCurrentUserInfo();
          
          if (user && tokens?.accessToken) {
            // 認証済みユーザーの場合
            const authUser = {
              userId: user.userId,
              email: user.signInDetails?.loginId || user.username || '',
              nickname: user.signInDetails?.loginId || user.username || '',
              accessToken: tokens.accessToken.toString()
            };
            
            let userProfile;
            
            try {
              // Step 2: バックエンドから実際のプロフィール取得を試行
              const { default: UserService } = await import('@/lib/services/userService');
              userProfile = await UserService.getProfile();
              
              console.log('✅ Profile fetched from backend:', {
                userId: userProfile.user_id,
                aiCharacter: userProfile.ai_character,
                onboardingCompleted: userProfile.onboarding_completed
              });
              
            } catch (backendError) {
              // Step 3: バックエンドエラー時はGraceful Degradation
              console.warn('⚠️ Backend profile fetch failed, using local defaults:', backendError);
              
              // ローカルデフォルト値でプロフィール構築
              userProfile = {
                user_id: user.userId,
                nickname: authUser.nickname,
                ai_character: 'mittyan' as const,
                praise_level: 'normal' as const,
                onboarding_completed: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              // プロフィールエラーを別途記録（UIで表示可能）
              set({
                profileError: 'プロフィールの同期に失敗しました。オフライン機能を利用中です。'
              });
            }
            
            set({
              user: authUser,
              profile: userProfile,
              isLoggedIn: true,
              isLoading: false,
              error: null
            });
            
            console.log('✅ Auth status updated with profile sync:', {
              userId: authUser.userId,
              hasBackendProfile: !get().profileError,
              aiCharacter: userProfile.ai_character
            });
            
          } else {
            // 未認証の場合
            set({
              user: null,
              profile: null,
              isLoggedIn: false,
              isLoading: false,
              error: null,
              profileError: null
            });
            
            console.log('❌ User not authenticated');
          }
          
        } catch (error) {
          console.error('Auth status check failed:', error);
          set({ 
            isLoading: false, 
            error: '認証状態の確認に失敗しました',
            user: null,
            profile: null,
            isLoggedIn: false,
            profileError: null
          });
        }
      },

      signOut: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // AWS Amplify Authでサインアウト
          // 実際のサインアウトロジックを実装
          console.log('Signing out...');
          
          // ローカル状態をクリア
          set({
            user: null,
            profile: null,
            isLoggedIn: false,
            isLoading: false,
            error: null,
            profileError: null
          });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: 'サインアウトに失敗しました' 
          });
        }
      },

      // Profile Sync Functions Implementation
      syncProfileWithBackend: async () => {
        const { user } = get();
        if (!user?.userId) {
          console.warn('No authenticated user for profile sync');
          return false;
        }

        try {
          set({ isProfileLoading: true, profileError: null });

          // バックエンドから最新プロフィールを取得
          const { default: UserService } = await import('@/lib/services/userService');
          const updatedProfile = await UserService.getProfile();

          set({
            profile: updatedProfile,
            isProfileLoading: false,
            profileError: null
          });

          console.log('✅ Profile synced successfully:', {
            userId: updatedProfile.user_id,
            aiCharacter: updatedProfile.ai_character,
            onboardingCompleted: updatedProfile.onboarding_completed
          });

          return true;
        } catch (error) {
          console.error('Profile sync failed:', error);
          set({
            isProfileLoading: false,
            profileError: 'プロフィール同期に失敗しました'
          });
          return false;
        }
      },

      retryProfileSync: async () => {
        const { user, profileError } = get();
        
        // プロフィールエラーがあり、認証済みの場合のみリトライ
        if (profileError && user?.userId) {
          console.log('🔄 Retrying profile sync...');
          const success = await get().syncProfileWithBackend();
          
          if (success) {
            console.log('✅ Profile sync retry successful');
          } else {
            console.log('❌ Profile sync retry failed');
          }
        }
      },

      hasBackendConnection: () => {
        const { profileError } = get();
        return !profileError || profileError === null;
      },

      // Onboarding Functions Implementation
      checkOnboardingStatus: async () => {
        const { user } = get();
        if (!user?.userId) {
          console.warn('No authenticated user for onboarding check');
          return false;
        }

        try {
          // バックエンドからオンボーディング状態を取得
          const { default: UserService } = await import('@/lib/services/userService');
          const onboardingStatus = await UserService.getOnboardingStatus();

          // プロフィールのオンボーディング状態を更新
          const currentProfile = get().profile;
          if (currentProfile) {
            set({
              profile: {
                ...currentProfile,
                onboarding_completed: onboardingStatus.onboarding_completed
              }
            });
          }

          console.log('✅ Onboarding status checked:', onboardingStatus.onboarding_completed);
          return onboardingStatus.onboarding_completed;

        } catch (error) {
          console.error('Onboarding status check failed:', error);
          
          // バックエンドエラー時はローカル状態を使用
          const currentProfile = get().profile;
          return currentProfile?.onboarding_completed || false;
        }
      },

      completeOnboarding: async (data?: any) => {
        const { user } = get();
        if (!user?.userId) {
          console.warn('No authenticated user for onboarding completion');
          return false;
        }

        try {
          set({ isLoading: true, error: null });

          // バックエンドでオンボーディング完了処理
          const { default: UserService } = await import('@/lib/services/userService');
          await UserService.completeOnboarding(data);

          // ローカル状態を更新
          const currentProfile = get().profile;
          if (currentProfile) {
            set({
              profile: {
                ...currentProfile,
                onboarding_completed: true,
                updated_at: new Date().toISOString()
              }
            });
          }

          set({ isLoading: false });

          console.log('✅ Onboarding completed successfully');
          return true;

        } catch (error) {
          console.error('Onboarding completion failed:', error);
          set({ 
            isLoading: false, 
            error: 'オンボーディングの完了に失敗しました' 
          });
          return false;
        }
      }
    }),
    {
      name: STORAGE_KEYS.USER_PROFILE,
      storage: createJSONStorage(() => localStorage),
      // セキュリティのため、アクセストークンは永続化しない
      partialize: (state) => ({
        user: state.user ? {
          ...state.user,
          accessToken: '' // アクセストークンは除外
        } : null,
        profile: state.profile,
        isLoggedIn: state.isLoggedIn
      }),
      // ハイドレーション後に認証状態をチェック
      onRehydrateStorage: () => (state) => {
        if (state) {
          // トークンが無効な場合はログアウト
          if (state.isLoggedIn && !state.isTokenValid()) {
            state.logout();
          }
        }
      }
    }
  )
);

export default useAuthStore;
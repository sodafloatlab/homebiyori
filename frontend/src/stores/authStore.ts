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
            // user.userId の必須チェック - 初期認証時
            if (!user.userId) {
              console.error('❌ Critical: user.userId is undefined in initial auth check', { 
                user, 
                userType: typeof user, 
                userKeys: user ? Object.keys(user) : null,
                hasUsername: !!user.username,
                hasSignInDetails: !!user.signInDetails
              });
              
              // フォールバック: usernameがある場合はそれを使用
              if (user.username) {
                console.warn('⚠️ Using username as fallback for userId:', user.username);
                user.userId = user.username;
              } else {
                throw new Error('認証情報が正しく取得できませんでした。再度ログインしてください。');
              }
            }
            
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
              let backendProfile;
              
              try {
                backendProfile = await UserService.getProfile();
              } catch (apiError) {
                console.error('🚫 API call failed:', {
                  error: apiError,
                  errorMessage: apiError instanceof Error ? apiError.message : String(apiError),
                  errorStack: apiError instanceof Error ? apiError.stack : undefined
                });
                throw apiError; // re-throw to catch block
              }
              
              // バックエンドレスポンスの構造を安全にチェック
              console.log('🔍 Backend profile response:', {
                response: backendProfile,
                responseType: typeof backendProfile,
                responseKeys: backendProfile ? Object.keys(backendProfile) : null,
                hasUserId: backendProfile ? ('user_id' in backendProfile) : false,
                hasUserId2: backendProfile ? ('userId' in backendProfile) : false
              });
              
              // レスポンス構造を正規化（user_id または userId に対応）
              if (backendProfile && typeof backendProfile === 'object' && Object.keys(backendProfile).length > 0) {
                // 型安全な方法でuserIdフィールドにアクセス
                const backendAny = backendProfile as any;
                
                userProfile = {
                  user_id: backendProfile.user_id || backendAny.userId || user.userId,
                  nickname: backendProfile.nickname || authUser.nickname,
                  ai_character: backendProfile.ai_character || 'mittyan',
                  praise_level: backendProfile.praise_level || 'normal',
                  interaction_mode: backendProfile.interaction_mode || backendAny.interaction_mode || 'praise',
                  onboarding_completed: backendProfile.onboarding_completed || false,
                  account_deleted: backendProfile.account_deleted || backendAny.account_deleted || false,
                  created_at: backendProfile.created_at || new Date().toISOString(),
                  updated_at: backendProfile.updated_at || new Date().toISOString()
                };
                
                console.log('✅ Profile normalized from backend:', {
                  userId: userProfile.user_id,
                  aiCharacter: userProfile.ai_character,
                  onboardingCompleted: userProfile.onboarding_completed
                });
              } else {
                throw new Error('Backend returned empty profile');
              }
              
            } catch (backendError) {
              // Step 3: バックエンドエラー時はGraceful Degradation
              console.warn('⚠️ Backend profile fetch failed, using local defaults:', backendError);
              
              // user.userId の安全性チェック
              if (!user?.userId) {
                console.error('❌ Critical: user.userId is undefined', { 
                  user, 
                  userType: typeof user, 
                  userKeys: user ? Object.keys(user) : null 
                });
                throw new Error('認証情報が正しく取得できませんでした。再度ログインしてください。');
              }
              
              // ローカルデフォルト値でプロフィール構築
              userProfile = {
                user_id: user.userId,
                nickname: authUser.nickname,
                ai_character: 'mittyan' as const,
                praise_level: 'normal' as const,
                interaction_mode: 'praise',
                onboarding_completed: false,
                account_deleted: false,
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
          
          console.log('🔍 Requesting onboarding status for user:', user?.userId);
          const onboardingStatus = await UserService.getOnboardingStatus();
          
          // 詳細なレスポンス分析
          console.log('🔍 Raw onboarding status response:', {
            response: onboardingStatus,
            type: typeof onboardingStatus,
            isNull: onboardingStatus === null,
            isUndefined: onboardingStatus === undefined,
            keys: onboardingStatus ? Object.keys(onboardingStatus) : null,
            hasIsCompleted: onboardingStatus ? 'is_completed' in onboardingStatus : false,
            isCompletedValue: onboardingStatus ? onboardingStatus.is_completed : 'N/A',
            isCompletedType: onboardingStatus ? typeof onboardingStatus.is_completed : 'N/A'
          });
          
          // レスポンスの安全性チェック
          if (!onboardingStatus || typeof onboardingStatus.is_completed !== 'boolean') {
            console.error('❌ Invalid onboarding status response:', onboardingStatus);
            throw new Error('オンボーディング状態の取得に失敗しました');
          }

          // プロフィールのオンボーディング状態を更新
          const currentProfile = get().profile;
          if (currentProfile) {
            set({
              profile: {
                ...currentProfile,
                onboarding_completed: onboardingStatus.is_completed
              }
            });
          }

          console.log('✅ Onboarding status checked:', onboardingStatus.is_completed);
          return onboardingStatus.is_completed;

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
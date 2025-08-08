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
        if (!user?.refreshToken) return false;

        try {
          set({ isLoading: true, error: null });

          // TODO: API統合時にrefresh token endpoint を呼び出し
          // const response = await apiClient.post('/auth/refresh', {
          //   refresh_token: user.refreshToken
          // });

          // 現在はダミー実装
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
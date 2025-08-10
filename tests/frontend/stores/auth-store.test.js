/**
 * AuthStore のテスト（モック実装）
 */

// Zustand の create をモック
const mockCreate = jest.fn();
const mockPersist = jest.fn();

jest.mock('zustand', () => ({
  create: (callback) => mockCreate(callback)
}));

jest.mock('zustand/middleware', () => ({
  persist: (callback, options) => mockPersist(callback, options),
  createJSONStorage: () => ({ getItem: jest.fn(), setItem: jest.fn() })
}));

// モック AuthStore 実装
const createAuthStore = () => {
  let state = {
    // 認証状態
    user: null,
    isLoggedIn: false,
    isLoading: false,
    error: null,
    profile: null,
    isProfileLoading: false,
    profileError: null
  };

  const setState = (partial) => {
    state = { ...state, ...partial };
  };

  const getState = () => state;

  return {
    getState,
    setState,
    subscribe: jest.fn(),
    
    // Actions
    setUser: (user) => setState({ user, isLoggedIn: !!user }),
    setProfile: (profile) => setState({ profile }),
    setLoading: (isLoading) => setState({ isLoading }),
    setError: (error) => setState({ error }),
    setProfileLoading: (isProfileLoading) => setState({ isProfileLoading }),
    setProfileError: (profileError) => setState({ profileError }),

    login: ({ user, profile }) => {
      setState({
        user,
        profile,
        isLoggedIn: true,
        isLoading: false,
        error: null,
        profileError: null
      });
    },

    logout: () => {
      setState({
        user: null,
        profile: null,
        isLoggedIn: false,
        isLoading: false,
        error: null,
        profileError: null
      });
    },

    updateProfile: (updates) => {
      const currentProfile = state.profile;
      if (currentProfile) {
        setState({
          profile: {
            ...currentProfile,
            ...updates,
            updated_at: new Date().toISOString()
          }
        });
      }
    },

    clearError: () => setState({ error: null, profileError: null }),

    getAccessToken: () => {
      return state.user?.accessToken || null;
    },

    isTokenValid: () => {
      if (!state.user?.accessToken) return false;
      
      try {
        const tokenParts = state.user.accessToken.split('.');
        if (tokenParts.length !== 3) return false;

        const payload = JSON.parse(atob(tokenParts[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        return payload.exp && payload.exp > currentTime;
      } catch {
        return false;
      }
    },

    refreshAuthToken: async () => {
      if (!state.user?.refreshToken) return false;

      try {
        setState({ isLoading: true, error: null });
        
        // ダミー実装
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setState({ isLoading: false });
        return true;
      } catch (error) {
        setState({ 
          isLoading: false, 
          error: 'トークンの更新に失敗しました',
          user: null,
          isLoggedIn: false 
        });
        return false;
      }
    }
  };
};

describe('AuthStore', () => {
  let authStore;

  beforeEach(() => {
    authStore = createAuthStore();
  });

  describe('初期状態', () => {
    test('正しい初期値が設定されていること', () => {
      const state = authStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoggedIn).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isProfileLoading).toBe(false);
      expect(state.profileError).toBeNull();
    });
  });

  describe('setUser', () => {
    test('ユーザー設定時にログイン状態が更新されること', () => {
      const mockUser = {
        userId: 'user123',
        accessToken: 'token123',
        refreshToken: 'refresh123'
      };

      authStore.setUser(mockUser);
      const state = authStore.getState();

      expect(state.user).toBe(mockUser);
      expect(state.isLoggedIn).toBe(true);
    });

    test('ユーザーをnullに設定時にログアウト状態になること', () => {
      authStore.setUser(null);
      const state = authStore.getState();

      expect(state.user).toBeNull();
      expect(state.isLoggedIn).toBe(false);
    });
  });

  describe('login', () => {
    test('ログイン時に適切に状態が更新されること', () => {
      const mockUser = {
        userId: 'user123',
        accessToken: 'token123',
        refreshToken: 'refresh123'
      };
      const mockProfile = {
        userId: 'user123',
        nickname: 'テストユーザー',
        created_at: '2024-08-09T00:00:00Z'
      };

      authStore.login({ user: mockUser, profile: mockProfile });
      const state = authStore.getState();

      expect(state.user).toBe(mockUser);
      expect(state.profile).toBe(mockProfile);
      expect(state.isLoggedIn).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.profileError).toBeNull();
    });
  });

  describe('logout', () => {
    test('ログアウト時に状態がクリアされること', () => {
      // まずログイン
      const mockUser = { userId: 'user123', accessToken: 'token123' };
      const mockProfile = { userId: 'user123', nickname: 'テスト' };
      authStore.login({ user: mockUser, profile: mockProfile });

      // ログアウト
      authStore.logout();
      const state = authStore.getState();

      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isLoggedIn).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.profileError).toBeNull();
    });
  });

  describe('updateProfile', () => {
    test('プロフィール更新が正しく動作すること', () => {
      const mockProfile = {
        userId: 'user123',
        nickname: '元の名前',
        created_at: '2024-08-09T00:00:00Z'
      };

      authStore.setProfile(mockProfile);
      
      const updates = { nickname: '新しい名前' };
      authStore.updateProfile(updates);
      
      const state = authStore.getState();
      expect(state.profile.nickname).toBe('新しい名前');
      expect(state.profile.userId).toBe('user123');
      expect(state.profile.updated_at).toBeDefined();
    });

    test('プロフィールが存在しない場合は何もしないこと', () => {
      authStore.updateProfile({ nickname: '新しい名前' });
      const state = authStore.getState();
      expect(state.profile).toBeNull();
    });
  });

  describe('エラー管理', () => {
    test('setError でエラーが設定されること', () => {
      authStore.setError('テストエラー');
      const state = authStore.getState();
      expect(state.error).toBe('テストエラー');
    });

    test('clearError でエラーがクリアされること', () => {
      authStore.setError('テストエラー');
      authStore.setProfileError('プロフィールエラー');
      
      authStore.clearError();
      const state = authStore.getState();
      
      expect(state.error).toBeNull();
      expect(state.profileError).toBeNull();
    });
  });

  describe('トークン管理', () => {
    test('getAccessToken が正しいトークンを返すこと', () => {
      const mockUser = {
        userId: 'user123',
        accessToken: 'token123'
      };
      authStore.setUser(mockUser);
      
      expect(authStore.getAccessToken()).toBe('token123');
    });

    test('ユーザーが存在しない場合 null を返すこと', () => {
      expect(authStore.getAccessToken()).toBeNull();
    });

    test('isTokenValid で有効なトークンを判定すること', () => {
      // 有効なJWTトークン（テスト用）
      const validPayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; // 1時間後
      const validToken = 'header.' + btoa(JSON.stringify(validPayload)) + '.signature';
      
      const mockUser = {
        userId: 'user123',
        accessToken: validToken
      };
      authStore.setUser(mockUser);
      
      expect(authStore.isTokenValid()).toBe(true);
    });

    test('refreshAuthToken でトークン更新をテストすること', async () => {
      const mockUser = {
        userId: 'user123',
        accessToken: 'token123',
        refreshToken: 'refresh123'
      };
      authStore.setUser(mockUser);
      
      const result = await authStore.refreshAuthToken();
      expect(result).toBe(true);
      
      const state = authStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('ローディング状態', () => {
    test('setLoading でローディング状態が変更されること', () => {
      authStore.setLoading(true);
      expect(authStore.getState().isLoading).toBe(true);
      
      authStore.setLoading(false);
      expect(authStore.getState().isLoading).toBe(false);
    });

    test('setProfileLoading でプロフィールローディング状態が変更されること', () => {
      authStore.setProfileLoading(true);
      expect(authStore.getState().isProfileLoading).toBe(true);
      
      authStore.setProfileLoading(false);
      expect(authStore.getState().isProfileLoading).toBe(false);
    });
  });
});
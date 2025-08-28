import { Amplify } from 'aws-amplify';
import { signIn, signOut, signInWithRedirect, getCurrentUser, fetchAuthSession } from '@aws-amplify/auth';
import { AuthUser, UserProfile } from '@/types';
import apiClient from './api';

// AWS Amplify設定
const authConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || '',
      identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID || '',
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [
            process.env.NEXT_PUBLIC_APP_URL + '/auth/callback' || 'http://localhost:3000/auth/callback'
          ],
          redirectSignOut: [
            process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          ],
          responseType: 'code' as const,
        }
      }
    }
  }
};

// Amplify初期化
if (typeof window !== 'undefined') {
  Amplify.configure(authConfig);
}

export class AuthService {
  /**
   * Google OAuth経由でサインイン
   */
  static async signInWithGoogle(): Promise<{ user: AuthUser; profile: UserProfile }> {
    try {
      // Google OAuth経由でサインイン
      await signInWithRedirect({
        provider: 'Google'
      });

      // 認証完了後、ユーザー情報を取得
      const user = await this.getCurrentAuthenticatedUser();
      
      // バックエンドAPIでユーザープロフィールを取得/作成
      const profile = await this.getOrCreateUserProfile(user);

      return { user, profile };
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw new Error('Googleログインに失敗しました。');
    }
  }

  /**
   * サインアウト
   */
  static async signOut(): Promise<void> {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign-out error:', error);
      throw new Error('ログアウトに失敗しました。');
    }
  }

  /**
   * 現在の認証ユーザーを取得
   */
  static async getCurrentAuthenticatedUser(): Promise<AuthUser> {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      
      const accessToken = session.tokens?.accessToken?.toString() || '';

      return {
        userId: user.userId,
        email: user.signInDetails?.loginId,
        nickname: undefined, // プロフィールから取得
        accessToken
      };
    } catch (error) {
      console.error('Get current user error:', error);
      throw new Error('認証ユーザーの取得に失敗しました。');
    }
  }

  /**
   * ユーザープロフィールを取得または作成
   */
  private static async getOrCreateUserProfile(user: AuthUser): Promise<UserProfile> {
    try {
      // まず既存プロフィールの取得を試行
      try {
        const profile = await apiClient.get('/user/profile');
        return profile;
      } catch (error: any) {
        // 404の場合は新規作成、その他はエラー
        if (error.response?.status !== 404) {
          throw error;
        }
      }

      // プロフィールが存在しない場合は作成
      const newProfile = await apiClient.post('/user/profile', {
        nickname: user.email?.split('@')[0] || 'ユーザー', // デフォルトニックネーム
        ai_character: 'mittyan', // デフォルトキャラクター
        praise_level: 'normal' // デフォルト褒めレベル
      });

      return newProfile;
    } catch (error) {
      console.error('Profile creation error:', error);
      throw new Error('ユーザープロフィールの作成に失敗しました。');
    }
  }

  /**
   * 認証状態をチェック
   */
  static async checkAuthStatus(): Promise<{ user: AuthUser; profile: UserProfile } | null> {
    try {
      const user = await this.getCurrentAuthenticatedUser();
      const profile = await apiClient.get('/user/profile');
      
      // APIクライアントはCognito ID tokenを自動取得
      
      return { user, profile };
    } catch (error) {
      console.log('User not authenticated');
      return null;
    }
  }

  /**
   * トークンの有効性をチェック
   */
  static async isTokenValid(): Promise<boolean> {
    try {
      const session = await fetchAuthSession();
      return !!session.tokens?.accessToken;
    } catch {
      return false;
    }
  }

  /**
   * トークンを更新
   */
  static async refreshAuthSession(): Promise<boolean> {
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const accessToken = session.tokens?.accessToken?.toString();
      
      if (accessToken) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * OAuth認証後のコールバック処理
   */
  static async handleAuthCallback(): Promise<{ user: AuthUser; profile: UserProfile }> {
    try {
      // OAuth認証完了後の処理
      const user = await this.getCurrentAuthenticatedUser();
      const profile = await this.getOrCreateUserProfile(user);
      
      // APIクライアントはCognito ID tokenを自動取得
      
      return { user, profile };
    } catch (error) {
      console.error('Auth callback error:', error);
      throw new Error('認証コールバックの処理に失敗しました。');
    }
  }
}

// グローバルイベントリスナー設定
if (typeof window !== 'undefined') {
  // メンテナンスモード検出時の処理
  window.addEventListener('maintenance-detected', (event: Event) => {
    const maintenanceInfo = (event as CustomEvent).detail;
    console.log('Maintenance mode detected:', maintenanceInfo);
    
    // メンテナンスストアに通知
    // この部分は実際のコンポーネントで実装
  });

  // 認証失敗検出時の処理
  window.addEventListener('auth-failure', () => {
    console.log('Authentication failure detected');
    
    // 認証ストアに通知してログアウト処理
    // この部分は実際のコンポーネントで実装
  });
}

export default AuthService;
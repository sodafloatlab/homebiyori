/**
 * AWS Amplify Auth Initialization
 * 
 * ■機能概要■
 * - Amplify初期化とCognito認証設定
 * - Google OAuth認証ヘルパー関数
 * - 認証状態管理
 * - エラーハンドリング
 */

import { Amplify } from 'aws-amplify';
import { 
  signInWithRedirect, 
  signOut, 
  getCurrentUser, 
  fetchAuthSession,
  AuthTokens,
  AuthUser 
} from 'aws-amplify/auth';
import { amplifyConfig, validateAmplifyConfig, getAmplifyConfigDebugInfo } from './amplify-config';

// Amplify初期化
let isInitialized = false;

export const initializeAmplify = (): boolean => {
  if (isInitialized) {
    return true;
  }

  const validation = validateAmplifyConfig();
  if (!validation.isValid) {
    console.error('Amplify configuration is invalid:', validation.errors);
    if (process.env.NODE_ENV === 'development') {
      console.warn('Amplify Debug Info:', getAmplifyConfigDebugInfo());
    }
    return false;
  }

  try {
    Amplify.configure(amplifyConfig, { ssr: true });
    isInitialized = true;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Amplify initialized successfully');
      console.log('Debug Info:', getAmplifyConfigDebugInfo());
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Amplify:', error);
    return false;
  }
};

// Google OAuth認証開始
export const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  if (!initializeAmplify()) {
    return { success: false, error: 'Amplify initialization failed' };
  }

  // まず既存の認証状態を確認
  try {
    const user = await getCurrentUser();
    
    // ユーザーが存在する場合は認証済みと判断
    if (user && user.userId) {
      console.log('User already authenticated:', user.userId);
      return { success: true };
    }
  } catch (error) {
    // 認証されていない場合は新規ログインを続行
    console.log('No existing auth session found, proceeding with login');
  }

  // 認証されていない場合のみリダイレクトを実行
  try {
    await signInWithRedirect({
      provider: 'Google'
    });
    
    // signInWithRedirect は非同期でリダイレクトするため、ここには到達しない
    return { success: true };
    
  } catch (error) {
    console.error('Google sign-in error:', error);
    
    // UserAlreadyAuthenticatedException の特別処理
    if (error instanceof Error && (
      error.name === 'UserAlreadyAuthenticatedException' || 
      error.message.includes('already a signed in user')
    )) {
      console.log('User already authenticated exception handled');
      return { success: true };
    }
    
    let errorMessage = 'ログインに失敗しました';
    if (error instanceof Error) {
      if (error.message.includes('popup_closed_by_user')) {
        errorMessage = 'ログインがキャンセルされました';
      } else if (error.message.includes('network')) {
        errorMessage = 'ネットワークエラーが発生しました';
      }
    }
    
    return { success: false, error: errorMessage };
  }
};

// ログアウト
export const signOutUser = async (): Promise<{ success: boolean; error?: string }> => {
  if (!initializeAmplify()) {
    return { success: false, error: 'Amplify initialization failed' };
  }

  try {
    await signOut();
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: 'ログアウトに失敗しました' };
  }
};

// 現在のユーザー情報取得
export const getCurrentUserInfo = async (): Promise<{
  user: AuthUser | null;
  tokens: AuthTokens | null;
  error?: string;
}> => {
  if (!initializeAmplify()) {
    return { user: null, tokens: null, error: 'Amplify initialization failed' };
  }

  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    
    return {
      user,
      tokens: session.tokens || null,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('No authenticated user:', error);
    }
    return { user: null, tokens: null };
  }
};

// 認証状態チェック
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { user } = await getCurrentUserInfo();
    return user !== null;
  } catch {
    return false;
  }
};

// OAuth コールバック処理後の認証確認
export const handleAuthCallback = async (): Promise<{
  success: boolean;
  user?: AuthUser;
  error?: string;
}> => {
  if (!initializeAmplify()) {
    return { success: false, error: 'Amplify initialization failed' };
  }

  try {
    // OAuth完了後、ユーザー情報を取得
    const { user, tokens } = await getCurrentUserInfo();
    
    if (user && tokens) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Authentication successful:', {
          userId: user.userId,
          username: user.username,
          signInDetails: user.signInDetails?.loginId
        });
      }
      
      return { success: true, user };
    } else {
      return { success: false, error: 'ユーザー情報の取得に失敗しました' };
    }
    
  } catch (error) {
    console.error('Auth callback handling error:', error);
    
    let errorMessage = '認証処理に失敗しました';
    if (error instanceof Error) {
      if (error.message.includes('NotAuthorizedException')) {
        errorMessage = '認証が拒否されました';
      } else if (error.message.includes('UserNotConfirmedException')) {
        errorMessage = 'アカウントの確認が必要です';
      }
    }
    
    return { success: false, error: errorMessage };
  }
};

// useAuth.ts 互換性のための AuthService クラス風インターフェース
export class AuthService {
  /**
   * Google OAuth経由でサインイン
   */
  static async signInWithGoogle(): Promise<{ user: any }> {
    if (!initializeAmplify()) {
      throw new Error('Amplify initialization failed');
    }

    try {
      // まず既存の認証状態を確認
      try {
        const user = await getCurrentUser();
        
        // ユーザーが存在する場合は認証済みと判断
        if (user && user.userId) {
          console.log('User already authenticated in AuthService:', user.userId);
          
          const authUser = {
            userId: user.userId,
            email: user.signInDetails?.loginId,
            nickname: undefined,
            accessToken: '' // 必要に応じて後で取得
          };
          
          return { user: authUser };
        }
      } catch (error) {
        // 認証されていない場合は続行
        console.log('No existing auth session found, proceeding with login');
      }

      await signInWithRedirect({
        provider: 'Google'
      });

      // この時点では通常リダイレクトが発生するため、以下のコードは実行されない
      throw new Error('リダイレクト処理が完了していません');
      
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      // UserAlreadyAuthenticatedException の特別処理
      if (error instanceof Error && (
        error.name === 'UserAlreadyAuthenticatedException' || 
        error.message.includes('already a signed in user')
      )) {
        try {
          const user = await getCurrentUser();
          
          const authUser = {
            userId: user.userId,
            email: user.signInDetails?.loginId,
            nickname: undefined,
            accessToken: '' // 必要に応じて後で取得
          };
          
          return { user: authUser };
        } catch (authError) {
          console.error('Failed to handle existing auth:', authError);
        }
      }
      
      throw new Error('Googleログインに失敗しました。');
    }
  }

  /**
   * サインアウト
   */
  static async signOut(): Promise<void> {
    const result = await signOutUser();
    if (!result.success) {
      throw new Error(result.error || 'ログアウトに失敗しました');
    }
  }

  /**
   * 認証状態をチェック
   */
  static async checkAuthStatus(): Promise<{ user: any } | null> {
    try {
      const user = await getCurrentUser();
      
      if (user && user.userId) {
        const authUser = {
          userId: user.userId,
          email: user.signInDetails?.loginId,
          nickname: undefined,
          accessToken: '' // 必要に応じて後で取得
        };
        
        return { user: authUser };
      }
      
      return null;
    } catch (error) {
      console.log('User not authenticated');
      return null;
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
  static async handleAuthCallback(): Promise<{ user: any }> {
    try {
      const result = await handleAuthCallback();
      
      if (!result.success || !result.user) {
        throw new Error(result.error || '認証コールバックの処理に失敗しました');
      }
      
      const authUser = {
        userId: result.user.userId,
        email: result.user.signInDetails?.loginId,
        nickname: undefined,
        accessToken: '' // セッションから取得
      };
      
      return { user: authUser };
    } catch (error) {
      console.error('Auth callback error:', error);
      throw new Error('認証コールバックの処理に失敗しました。');
    }
  }
}

// 開発用: Amplify状態のデバッグ情報
export const getAmplifyDebugInfo = async () => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const configInfo = getAmplifyConfigDebugInfo();
  const { user, tokens } = await getCurrentUserInfo();
  
  return {
    config: configInfo,
    authentication: {
      isAuthenticated: user !== null,
      userId: user?.userId || null,
      username: user?.username || null,
      hasTokens: tokens !== null,
      tokenExpiry: tokens?.accessToken ? 'Available' : 'None',
    },
    timestamp: new Date().toISOString(),
  };
};
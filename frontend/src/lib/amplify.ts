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

  try {
    await signInWithRedirect({
      provider: 'Google'
    });
    
    // signInWithRedirect は非同期でリダイレクトするため、ここには到達しない
    return { success: true };
    
  } catch (error) {
    console.error('Google sign-in error:', error);
    
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
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { APIResponse, APIError, RequestConfig } from '@/types/api';
import { API_CONFIG } from '@/lib/constants';
import { getErrorMessage, extractApiErrorMessage } from '@/lib/utils';

class APIClient {
  public client: AxiosInstance; // MaintenanceStoreからアクセス可能にする

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Cognito IDトークンの自動付与
    this.client.interceptors.request.use(
      async (config) => {
        // 認証が必要なリクエストの場合、Cognito IDトークンを付与
        if (typeof window !== 'undefined' && !config.headers['No-Auth']) {
          try {
            const token = await this.getCognitoIdToken();
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch (error) {
            console.warn('Failed to get Cognito token:', error);
            // 認証エラーは個別のリクエストで処理
          }
        }

        // リクエストログ（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            params: config.params,
            data: config.data,
            hasAuth: !!config.headers.Authorization,
          });
        }

        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - エラーハンドリング
    this.client.interceptors.response.use(
      (response) => {
        // すべてのレスポンスでメンテナンス状態をチェック（Primary Detection）
        this.checkMaintenanceInResponse(response);

        // レスポンスログ（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          });
        }

        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // 503エラー（メンテナンス）の場合、メンテナンス状態を通知
        if (error.response?.status === 503) {
          this.handleMaintenanceMode(error.response);
          return Promise.reject(error);
        }

        // 401エラー（認証失敗）の場合、認証失敗を通知
        if (error.response?.status === 401) {
          console.warn('🔐 Authentication failed - redirecting to sign in');
          this.handleAuthFailure();
          return Promise.reject(this.formatError(error));
        }

        // その他のエラー処理
        console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });

        return Promise.reject(this.formatError(error));
      }
    );
  }

  // Cognito IDトークンを取得
  private async getCognitoIdToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      
      if (process.env.NODE_ENV === 'development' && idToken) {
        console.log('🔐 Cognito ID Token obtained for API request');
      }
      
      return idToken || null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔐 Failed to get Cognito ID Token:', error);
      }
      return null;
    }
  }

  // 認証状態を確認
  private async isAuthenticatedWithCognito(): Promise<boolean> {
    try {
      const token = await this.getCognitoIdToken();
      return !!token;
    } catch {
      return false;
    }
  }

  private checkMaintenanceInResponse(response: AxiosResponse) {
    // レスポンスヘッダーまたはデータでメンテナンス状態をチェック
    const isMaintenanceMode = 
      response.headers?.['x-maintenance-mode'] === 'true' ||
      response.data?.maintenance_status?.is_maintenance_mode === true;

    if (isMaintenanceMode) {
      this.handleMaintenanceMode(response);
    }
  }

  private handleMaintenanceMode(response: AxiosResponse) {
    // Zustand MaintenanceStoreに直接通知（Primary Detection Method）
    if (typeof window !== 'undefined') {
      // Dynamic importでMaintenanceStoreを呼び出し
      import('@/stores/maintenanceStore').then(({ default: useMaintenanceStore }) => {
        const store = useMaintenanceStore.getState();
        store.handleMaintenanceResponse(response);
        console.log('🔧 Primary Maintenance Detection via API Interceptor:', {
          endpoint: response.config?.url,
          status: response.status,
          method: 'API_INTERCEPTOR'
        });
      });
    }
  }

  private handleAuthFailure() {
    // 認証失敗をAmplify AuthとZustand Storeに反映
    if (typeof window !== 'undefined') {
      // 認証ストアに失敗を通知
      import('@/stores/authStore').then((module) => {
        const useAuthStore = module.default;
        const store = useAuthStore.getState();
        store.signOut();
        store.setError('認証が失効しました。再度ログインしてください。');
      });

      // カスタムイベントも発行（互換性のため）
      const event = new CustomEvent('auth-failure');
      window.dispatchEvent(event);

      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Auth failure handled - user signed out from store');
      }
    }
  }

  private formatError(error: any): APIError {
    const timestamp = new Date().toISOString();
    
    if (error.response?.data) {
      return {
        error_code: error.response.data.error_code || 'API_ERROR',
        error_message: error.response.data.error_message || error.response.data.message || '通信エラーが発生しました',
        details: error.response.data.details,
        request_id: error.response.headers['x-request-id'],
        timestamp
      };
    }

    return {
      error_code: 'NETWORK_ERROR',
      error_message: extractApiErrorMessage(error),
      timestamp
    };
  }

  // HTTP メソッド
  async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.client.get<APIResponse<T>>(url, this.buildConfig(config));
    return this.handleResponse(response);
  }

  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.client.post<APIResponse<T>>(url, data, this.buildConfig(config));
    return this.handleResponse(response);
  }

  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.client.put<APIResponse<T>>(url, data, this.buildConfig(config));
    return this.handleResponse(response);
  }

  async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.client.patch<APIResponse<T>>(url, data, this.buildConfig(config));
    return this.handleResponse(response);
  }

  async delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.client.delete<APIResponse<T>>(url, this.buildConfig(config));
    return this.handleResponse(response);
  }

  private buildConfig(config?: RequestConfig): AxiosRequestConfig {
    const axiosConfig: AxiosRequestConfig = {};
    
    if (config?.timeout) {
      axiosConfig.timeout = config.timeout;
    }

    if (config?.requiresAuth === false) {
      axiosConfig.headers = { ...axiosConfig.headers, 'No-Auth': 'true' };
    }

    if (config?.params) {
      axiosConfig.params = config.params;
    }

    return axiosConfig;
  }

  private handleResponse<T>(response: AxiosResponse<APIResponse<T>>): T {
    const { data } = response;
    
    if (data.status === 'error') {
      throw new Error(data.error || 'APIエラーが発生しました');
    }

    return data.data as T;
  }

  // Amplify Auth統合ヘルパー
  async isAuthenticated(): Promise<boolean> {
    return await this.isAuthenticatedWithCognito();
  }

  // 現在のCognito IDトークンを取得（外部使用可能）
  async getCurrentToken(): Promise<string | null> {
    return await this.getCognitoIdToken();
  }

  // Amplify Authと連携したサインアウト
  async signOut(): Promise<void> {
    try {
      // Amplify Authでサインアウト
      const { signOutUser } = await import('@/lib/amplify');
      await signOutUser();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 User signed out via API client');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
const apiClient = new APIClient();

export default apiClient;
export { apiClient };
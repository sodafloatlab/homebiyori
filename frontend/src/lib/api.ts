import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { APIResponse, APIError, RequestConfig } from '@/types/api';
import { API_CONFIG } from '@/lib/constants';
import { getErrorMessage, extractApiErrorMessage } from '@/lib/utils';

class APIClient {
  public client: AxiosInstance; // MaintenanceStoreからアクセス可能にする
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

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
    // Request interceptor - 認証トークンの自動付与
    this.client.interceptors.request.use(
      (config) => {
        // 認証が必要なリクエストの場合、トークンを付与
        if (typeof window !== 'undefined') {
          const token = this.getStoredToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // リクエストログ（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            params: config.params,
            data: config.data,
          });
        }

        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - エラーハンドリング、トークン更新
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

        // 401エラー（認証失敗）の場合、トークン更新を試行
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // 既にリフレッシュ中の場合はキューに追加
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              return this.client(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            await this.refreshToken();
            this.processQueue(null);
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError);
            this.handleAuthFailure();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
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

  private processQueue(error: any) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });

    this.failedQueue = [];
  }

  private getStoredToken(): string | null {
    try {
      const stored = localStorage.getItem('homebiyori_auth_token');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      const refreshToken = this.getStoredRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken
      });

      const { access_token, refresh_token: newRefreshToken } = response.data;
      
      // 新しいトークンを保存
      localStorage.setItem('homebiyori_auth_token', JSON.stringify(access_token));
      if (newRefreshToken) {
        localStorage.setItem('homebiyori_refresh_token', JSON.stringify(newRefreshToken));
      }
    } catch (error) {
      localStorage.removeItem('homebiyori_auth_token');
      localStorage.removeItem('homebiyori_refresh_token');
      throw error;
    }
  }

  private getStoredRefreshToken(): string | null {
    try {
      const stored = localStorage.getItem('homebiyori_refresh_token');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
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
    // 認証失敗をグローバル状態に反映
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('auth-failure');
      window.dispatchEvent(event);
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

    return axiosConfig;
  }

  private handleResponse<T>(response: AxiosResponse<APIResponse<T>>): T {
    const { data } = response;
    
    if (data.status === 'error') {
      throw new Error(data.error || 'APIエラーが発生しました');
    }

    return data.data as T;
  }

  // 認証関連ヘルパー
  setAuthToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('homebiyori_auth_token', JSON.stringify(token));
    }
  }

  clearAuthToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('homebiyori_auth_token');
      localStorage.removeItem('homebiyori_refresh_token');
    }
  }

  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }
}

// シングルトンインスタンス
const apiClient = new APIClient();

export default apiClient;
export { apiClient };
/**
 * 統一API Service Layer
 * 全てのAPIサービスのベースクラスと共通機能を提供
 */

import { APIResponse } from '@/types';
import { apiClient } from '@/lib/api';
import { getErrorMessage, extractApiErrorMessage } from '@/lib/utils';

/**
 * 基底APIサービスクラス
 * 全てのAPIサービスが継承する
 */
export abstract class BaseAPIService {
  protected endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  /**
   * エラーハンドリング付きGETリクエスト
   */
  protected async get<T>(path: string = '', params?: Record<string, any>): Promise<T> {
    try {
      const url = this.buildUrl(path);
      const response = await apiClient.get(url, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'GET');
    }
  }

  /**
   * エラーハンドリング付きPOSTリクエスト
   */
  protected async post<T>(path: string = '', data?: any): Promise<T> {
    try {
      const url = this.buildUrl(path);
      const response = await apiClient.post(url, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'POST');
    }
  }

  /**
   * エラーハンドリング付きPUTリクエスト
   */
  protected async put<T>(path: string = '', data?: any): Promise<T> {
    try {
      const url = this.buildUrl(path);
      const response = await apiClient.put(url, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'PUT');
    }
  }

  /**
   * エラーハンドリング付きDELETEリクエスト
   */
  protected async delete<T>(path: string = ''): Promise<T> {
    try {
      const url = this.buildUrl(path);
      const response = await apiClient.delete(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'DELETE');
    }
  }

  /**
   * URLを構築
   */
  private buildUrl(path: string): string {
    const basePath = this.endpoint.startsWith('/') ? this.endpoint : `/${this.endpoint}`;
    if (!path) return basePath;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${basePath}${cleanPath}`;
  }

  /**
   * 統一エラーハンドリング
   */
  private handleError(error: any, method: string): Error {
    const errorMessage = extractApiErrorMessage(error);
    console.error(`${method} ${this.endpoint} Error:`, error);
    return new Error(errorMessage);
  }
}

/**
 * APIサービスファクトリー
 * 各種APIサービスのインスタンスを提供
 */
export class APIServiceFactory {
  private static instances: Map<string, any> = new Map();

  /**
   * シングルトンパターンでAPIサービスインスタンスを取得
   */
  static getInstance<T>(ServiceClass: new (...args: any[]) => T, ...args: any[]): T {
    const key = ServiceClass.name;
    
    if (!this.instances.has(key)) {
      this.instances.set(key, new ServiceClass(...args));
    }
    
    return this.instances.get(key);
  }

  /**
   * 全インスタンスをクリア（テスト用）
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}

/**
 * APIレスポンス型ガード
 */
export const isAPIResponse = <T>(response: any): response is APIResponse<T> => {
  return response && typeof response === 'object' && 'status' in response;
};

/**
 * ページネーション付きレスポンス型
 */
export interface PaginatedResponse<T> {
  data: T[];
  total_count: number;
  has_more: boolean;
  cursor?: string;
  page?: number;
  per_page?: number;
}

/**
 * ページネーション付きリクエスト型
 */
export interface PaginatedRequest {
  limit?: number;
  cursor?: string;
  page?: number;
  per_page?: number;
}
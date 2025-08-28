/**
 * API Service Manager
 * 全APIサービスの統一管理とファクトリーパターン実装
 */

import { APIServiceFactory } from './index';
import { ChatAPIService } from './ChatAPIService';
import { TreeAPIService } from './TreeAPIService';

// ============================================
// API Service Types
// ============================================

export interface APIServices {
  chat: ChatAPIService;
  tree: TreeAPIService;
}

// ============================================
// Unified API Service Manager
// ============================================

export class APIServiceManager {
  private static instance: APIServiceManager;
  private services: Partial<APIServices> = {};

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): APIServiceManager {
    if (!APIServiceManager.instance) {
      APIServiceManager.instance = new APIServiceManager();
    }
    return APIServiceManager.instance;
  }

  /**
   * Chat API Service を取得
   */
  get chat(): ChatAPIService {
    if (!this.services.chat) {
      this.services.chat = APIServiceFactory.getInstance(ChatAPIService);
    }
    return this.services.chat;
  }

  /**
   * Tree API Service を取得
   */
  get tree(): TreeAPIService {
    if (!this.services.tree) {
      this.services.tree = APIServiceFactory.getInstance(TreeAPIService);
    }
    return this.services.tree;
  }

  /**
   * 全サービスを取得
   */
  getAllServices(): APIServices {
    return {
      chat: this.chat,
      tree: this.tree
    };
  }

  /**
   * サービスキャッシュをクリア（主にテスト用）
   */
  clearCache(): void {
    this.services = {};
    APIServiceFactory.clearInstances();
  }

  /**
   * ヘルスチェック - 全サービスの接続確認
   */
  async healthCheck(): Promise<{
    chat: boolean;
    tree: boolean;
    overall: boolean;
  }> {
    const results = {
      chat: false,
      tree: false,
      overall: false
    };

    try {
      // Chat service health check (using basic chat history instead of removed getChatStats)
      await this.chat.getChatHistory({ limit: 1 });
      results.chat = true;
    } catch (error) {
      console.warn('Chat service health check failed:', error);
    }

    try {
      // Tree service health check  
      await this.tree.getTreeStatus();
      results.tree = true;
    } catch (error) {
      console.warn('Tree service health check failed:', error);
    }

    results.overall = results.chat && results.tree;
    return results;
  }
}

// ============================================
// Convenience Exports
// ============================================

/**
 * グローバルAPIサービスインスタンス
 */
export const apiServices = APIServiceManager.getInstance();

/**
 * 個別サービス取得のショートカット
 */
export const chatAPI = () => apiServices.chat;
export const treeAPI = () => apiServices.tree;

/**
 * React Hook用のAPIサービス取得
 */
export const useAPIServices = () => ({
  chat: chatAPI(),
  tree: treeAPI(),
  manager: apiServices
});

// ============================================
// React Hook Integration
// ============================================

/**
 * Chat APIサービス用Hook
 */
export const useChatService = () => chatAPI();

/**
 * Tree APIサービス用Hook
 */
export const useTreeService = () => treeAPI();
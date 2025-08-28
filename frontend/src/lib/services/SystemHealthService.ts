/**
 * System Health Service
 * 既存APIを活用した全サービスのヘルスチェック機能
 */

import apiClient from '@/lib/api';

// ============================================
// Types
// ============================================

export interface ServiceHealthStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  service: string;
  timestamp?: string;
  response_time_ms?: number;
}

export interface SystemHealthStatus {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    user: ServiceHealthStatus;
    chat: ServiceHealthStatus;
    tree: ServiceHealthStatus;
    billing: ServiceHealthStatus;
  };
  timestamp: string;
}

// ============================================
// System Health Service Implementation
// ============================================

export class SystemHealthService {
  /**
   * 全サービスのヘルスチェックを実行
   * ✅ 既存API活用: 各サービスのヘルスチェックAPIを使用
   */
  static async checkAllServices(): Promise<SystemHealthStatus> {
    const timestamp = new Date().toISOString();
    
    const services = await Promise.allSettled([
      SystemHealthService.checkUserService(),
      SystemHealthService.checkChatService(),
      SystemHealthService.checkTreeService(),
      SystemHealthService.checkBillingService()
    ]);

    const [userResult, chatResult, treeResult, billingResult] = services;

    const serviceStatuses = {
      user: userResult.status === 'fulfilled' ? userResult.value : { 
        status: 'unhealthy' as const, 
        service: 'user_service',
        timestamp: new Date().toISOString()
      },
      chat: chatResult.status === 'fulfilled' ? chatResult.value : { 
        status: 'unhealthy' as const, 
        service: 'chat_service',
        timestamp: new Date().toISOString()
      },
      tree: treeResult.status === 'fulfilled' ? treeResult.value : { 
        status: 'unhealthy' as const, 
        service: 'tree_service',
        timestamp: new Date().toISOString()
      },
      billing: billingResult.status === 'fulfilled' ? billingResult.value : { 
        status: 'unhealthy' as const, 
        service: 'billing_service',
        timestamp: new Date().toISOString()
      }
    };

    const overallStatus = SystemHealthService.calculateOverallStatus(serviceStatuses);

    return {
      overall_status: overallStatus,
      services: serviceStatuses,
      timestamp
    };
  }

  /**
   * ユーザーサービスのヘルスチェック
   * ✅ 既存API活用: GET /api/user/health
   */
  private static async checkUserService(): Promise<ServiceHealthStatus> {
    const startTime = Date.now();
    try {
      const response = await apiClient.get('/api/user/health');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        service: 'user_service',
        timestamp: response.timestamp || new Date().toISOString(),
        response_time_ms: responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        service: 'user_service',
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime
      };
    }
  }

  /**
   * チャットサービスのヘルスチェック
   * ✅ 既存API活用: GET /api/chat/health
   */
  private static async checkChatService(): Promise<ServiceHealthStatus> {
    const startTime = Date.now();
    try {
      const response = await apiClient.get('/api/chat/health');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        service: 'chat_service',
        timestamp: response.timestamp || new Date().toISOString(),
        response_time_ms: responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        service: 'chat_service',
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime
      };
    }
  }

  /**
   * ツリーサービスのヘルスチェック
   * ✅ 既存API活用: GET /api/tree/health
   */
  private static async checkTreeService(): Promise<ServiceHealthStatus> {
    const startTime = Date.now();
    try {
      const response = await apiClient.get('/api/tree/health');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        service: 'tree_service',
        timestamp: response.timestamp || new Date().toISOString(),
        response_time_ms: responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        service: 'tree_service',
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime
      };
    }
  }

  /**
   * 課金サービスのヘルスチェック
   * ✅ 既存API活用: GET /api/billing/health
   */
  private static async checkBillingService(): Promise<ServiceHealthStatus> {
    const startTime = Date.now();
    try {
      const response = await apiClient.get('/api/billing/health');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        service: 'billing_service',
        timestamp: response.timestamp || new Date().toISOString(),
        response_time_ms: responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        service: 'billing_service',
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime
      };
    }
  }

  /**
   * 個別サービスのヘルスチェック
   */
  static async checkService(serviceName: 'user' | 'chat' | 'tree' | 'billing'): Promise<ServiceHealthStatus> {
    switch (serviceName) {
      case 'user':
        return SystemHealthService.checkUserService();
      case 'chat':
        return SystemHealthService.checkChatService();
      case 'tree':
        return SystemHealthService.checkTreeService();
      case 'billing':
        return SystemHealthService.checkBillingService();
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }

  /**
   * 全体的なヘルス状態を計算
   */
  private static calculateOverallStatus(services: SystemHealthStatus['services']): 'healthy' | 'degraded' | 'unhealthy' {
    const serviceStatuses = Object.values(services).map(service => service.status);
    const healthyCount = serviceStatuses.filter(status => status === 'healthy').length;
    const totalServices = serviceStatuses.length;

    if (healthyCount === totalServices) {
      return 'healthy';
    } else if (healthyCount >= totalServices / 2) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * サービス状態の詳細レポート生成
   */
  static generateHealthReport(healthStatus: SystemHealthStatus): string {
    const { overall_status, services, timestamp } = healthStatus;
    
    let report = `System Health Report (${timestamp})\n`;
    report += `Overall Status: ${overall_status.toUpperCase()}\n\n`;
    
    Object.entries(services).forEach(([serviceName, status]) => {
      report += `${serviceName.toUpperCase()}: ${status.status.toUpperCase()}`;
      if (status.response_time_ms) {
        report += ` (${status.response_time_ms}ms)`;
      }
      report += '\n';
    });

    return report;
  }
}

export default SystemHealthService;
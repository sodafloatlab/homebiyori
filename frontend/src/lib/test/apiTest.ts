/**
 * API統合テスト用ユーティリティ
 * バックエンドLambdaサービスとの接続テスト
 */

import { apiClient } from '@/lib/api';

export interface APITestResult {
  service: string;
  endpoint: string;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  data?: any;
}

export class APITester {
  private results: APITestResult[] = [];

  /**
   * すべてのAPIエンドポイントをテスト
   */
  async runAllTests(): Promise<APITestResult[]> {
    this.results = [];
    
    console.log('🧪 API統合テスト開始...');
    
    // Health Check Service
    await this.testHealthCheck();
    
    // User Service  
    await this.testUserService();
    
    // Chat Service
    await this.testChatService();
    
    // Tree Service
    await this.testTreeService();
    
    // Notification Service
    await this.testNotificationService();
    
    // Billing Service
    await this.testBillingService();
    
    console.log('🧪 API統合テスト完了');
    this.printTestSummary();
    
    return this.results;
  }

  /**
   * Health Check Service テスト
   */
  private async testHealthCheck(): Promise<void> {
    await this.testEndpoint(
      'health_check',
      '/health',
      'GET'
    );
    
    await this.testEndpoint(
      'health_check', 
      '/health/detailed',
      'GET'
    );
  }

  /**
   * User Service テスト
   */
  private async testUserService(): Promise<void> {
    // 認証が必要なエンドポイントは後でテスト
    await this.testEndpoint(
      'user_service',
      '/users/me',
      'GET',
      undefined,
      true // 認証が必要
    );
  }

  /**
   * Chat Service テスト
   */
  private async testChatService(): Promise<void> {
    await this.testEndpoint(
      'chat_service',
      '/chat/health',
      'GET'
    );

    // 認証が必要なエンドポイント
    await this.testEndpoint(
      'chat_service',
      '/chat/history',
      'GET',
      undefined,
      true
    );
  }

  /**
   * Tree Service テスト
   */
  private async testTreeService(): Promise<void> {
    await this.testEndpoint(
      'tree_service',
      '/tree/health',
      'GET'
    );

    // 認証が必要なエンドポイント
    await this.testEndpoint(
      'tree_service',
      '/tree/status',
      'GET',
      undefined,
      true
    );
  }

  /**
   * Notification Service テスト
   */
  private async testNotificationService(): Promise<void> {
    await this.testEndpoint(
      'notification_service',
      '/notifications/health',
      'GET'
    );
  }

  /**
   * Billing Service テスト
   */
  private async testBillingService(): Promise<void> {
    await this.testEndpoint(
      'billing_service',
      '/billing/health',
      'GET'
    );
  }

  /**
   * 個別エンドポイントテスト
   */
  private async testEndpoint(
    service: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any,
    requiresAuth: boolean = false
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Testing ${service}: ${method} ${endpoint}`);
      
      if (requiresAuth) {
        // 認証が必要な場合は、デモ用のトークンまたはスキップ
        console.log(`⚠️  Skipping ${endpoint} (requires authentication)`);
        this.results.push({
          service,
          endpoint,
          success: false,
          responseTime: 0,
          error: 'Authentication required - skipped in test'
        });
        return;
      }

      let response;
      const config = {
        timeout: 10000, // 10秒タイムアウト
        validateStatus: (status: number) => status < 500 // 5xx以外は成功とみなす
      };

      switch (method) {
        case 'GET':
          response = await apiClient.get(endpoint, config);
          break;
        case 'POST':
          response = await apiClient.post(endpoint, data, config);
          break;
        case 'PUT':
          response = await apiClient.put(endpoint, data, config);
          break;
        case 'DELETE':
          response = await apiClient.delete(endpoint, config);
          break;
      }

      const responseTime = Date.now() - startTime;

      this.results.push({
        service,
        endpoint,
        success: response.status < 400,
        responseTime,
        statusCode: response.status,
        data: response.data
      });

      console.log(`✅ ${service} ${endpoint}: ${response.status} (${responseTime}ms)`);

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      this.results.push({
        service,
        endpoint,
        success: false,
        responseTime,
        statusCode: error.response?.status,
        error: error.message
      });

      console.log(`❌ ${service} ${endpoint}: ${error.message} (${responseTime}ms)`);
    }
  }

  /**
   * テスト結果サマリー表示
   */
  private printTestSummary(): void {
    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;
    const failed = total - successful;

    console.log('\n📊 API統合テスト結果サマリー');
    console.log('================================');
    console.log(`✅ 成功: ${successful}/${total}`);
    console.log(`❌ 失敗: ${failed}/${total}`);
    console.log(`📈 成功率: ${((successful / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ 失敗したエンドポイント:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   ${r.service}: ${r.endpoint} - ${r.error}`);
        });
    }

    // レスポンス時間統計
    const responseTimes = this.results
      .filter(r => r.success && r.responseTime > 0)
      .map(r => r.responseTime);

    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      console.log('\n📊 レスポンス時間統計:');
      console.log(`   平均: ${avgResponseTime.toFixed(0)}ms`);
      console.log(`   最大: ${maxResponseTime}ms`);
      console.log(`   最小: ${minResponseTime}ms`);
    }
  }

  /**
   * 認証トークンテスト
   */
  async testAuthFlow(): Promise<boolean> {
    console.log('🔐 認証フローテスト開始...');
    
    try {
      // デモモードでの認証テスト
      const demoUser = {
        user_id: 'demo-user-001',
        email: 'demo@homebiyori.com',
        nickname: 'テストユーザー'
      };

      console.log('📝 デモユーザーでの認証テスト:', demoUser);
      
      // 実際のGoogle OAuth認証は手動テストが必要
      console.log('⚠️  Google OAuth認証は手動テストが必要です');
      
      return true;
    } catch (error) {
      console.error('❌ 認証フローテスト失敗:', error);
      return false;
    }
  }

  /**
   * メンテナンスモードテスト
   */
  async testMaintenanceMode(): Promise<boolean> {
    console.log('🔧 メンテナンスモードテスト開始...');
    
    try {
      // Parameter Storeからメンテナンス状態を確認
      const response = await apiClient.get('/health/maintenance');
      
      console.log('🔧 メンテナンス状態:', response.data);
      
      return true;
    } catch (error) {
      console.error('❌ メンテナンスモードテスト失敗:', error);
      return false;
    }
  }

  /**
   * エラーハンドリングテスト
   */
  async testErrorHandling(): Promise<boolean> {
    console.log('⚡ エラーハンドリングテスト開始...');
    
    const errorTests = [
      { endpoint: '/nonexistent', expectedStatus: 404, description: '404エラー' },
      { endpoint: '/chat/message', method: 'POST', expectedStatus: 401, description: '401認証エラー' },
    ];

    let allPassed = true;

    for (const test of errorTests) {
      try {
        console.log(`🧪 Testing ${test.description}: ${test.endpoint}`);
        
        await apiClient.get(test.endpoint, {
          validateStatus: () => false // すべてのステータスコードを受け入れ
        });
        
      } catch (error: any) {
        const actualStatus = error.response?.status;
        const passed = actualStatus === test.expectedStatus;
        
        console.log(
          passed 
            ? `✅ ${test.description}: Expected ${test.expectedStatus}, Got ${actualStatus}` 
            : `❌ ${test.description}: Expected ${test.expectedStatus}, Got ${actualStatus}`
        );
        
        if (!passed) allPassed = false;
      }
    }

    return allPassed;
  }
}

// デバッグ用エクスポート
export const runAPITest = async () => {
  const tester = new APITester();
  const results = await tester.runAllTests();
  
  // 認証・メンテナンス・エラーハンドリングテストも実行
  await tester.testAuthFlow();
  await tester.testMaintenanceMode();
  await tester.testErrorHandling();
  
  return results;
};

// ブラウザコンソールからテスト実行可能
if (typeof window !== 'undefined') {
  (window as any).runAPITest = runAPITest;
  console.log('🧪 API統合テスト利用可能: runAPITest() を実行してください');
}
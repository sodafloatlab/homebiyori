'use client';

import React from 'react';

/**
 * ネットワーク監視とオフライン対応
 */

export interface NetworkStatus {
  online: boolean;
  connectionType: string;
  downlink?: number;
  effectiveType?: string;
  lastOnline?: Date;
  lastOffline?: Date;
}

export type NetworkStatusListener = (status: NetworkStatus) => void;

class NetworkMonitor {
  private listeners: Set<NetworkStatusListener> = new Set();
  private status: NetworkStatus;
  private retryQueue: Array<() => Promise<void>> = [];
  private isRetrying = false;

  constructor() {
    this.status = {
      online: navigator.onLine,
      connectionType: this.getConnectionType(),
      downlink: this.getDownlink(),
      effectiveType: this.getEffectiveType()
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // オンライン/オフライン状態の監視
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // ネットワーク情報の監視
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', this.handleConnectionChange);
    }

    // ページ表示/非表示の監視
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleOnline = (): void => {
    console.log('📡 ネットワーク接続復旧');
    
    this.status = {
      ...this.status,
      online: true,
      lastOnline: new Date(),
      connectionType: this.getConnectionType(),
      downlink: this.getDownlink(),
      effectiveType: this.getEffectiveType()
    };

    this.notifyListeners();
    this.processRetryQueue();
  };

  private handleOffline = (): void => {
    console.log('📡 ネットワーク接続切断');
    
    this.status = {
      ...this.status,
      online: false,
      lastOffline: new Date()
    };

    this.notifyListeners();
  };

  private handleConnectionChange = (): void => {
    const newConnectionType = this.getConnectionType();
    const newDownlink = this.getDownlink();
    const newEffectiveType = this.getEffectiveType();

    if (
      newConnectionType !== this.status.connectionType ||
      newDownlink !== this.status.downlink ||
      newEffectiveType !== this.status.effectiveType
    ) {
      console.log('📡 ネットワーク品質変更:', {
        type: newConnectionType,
        downlink: newDownlink,
        effectiveType: newEffectiveType
      });

      this.status = {
        ...this.status,
        connectionType: newConnectionType,
        downlink: newDownlink,
        effectiveType: newEffectiveType
      };

      this.notifyListeners();
    }
  };

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      // ページが表示されたときに接続状態を確認
      this.checkConnectivity();
    }
  };

  private getConnectionType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.type || 'unknown';
    }
    return 'unknown';
  }

  private getDownlink(): number | undefined {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.downlink;
    }
    return undefined;
  }

  private getEffectiveType(): string | undefined {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.effectiveType;
    }
    return undefined;
  }

  private async checkConnectivity(): Promise<void> {
    try {
      // 小さなリクエストで接続性をチェック
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!this.status.online) {
        this.handleOnline();
      }
    } catch (error) {
      if (!this.status.online) {
        console.log('📡 接続性チェック失敗 - オフラインを維持');
      } else {
        console.log('📡 接続性チェック失敗 - オフラインに切り替え');
        this.handleOffline();
      }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('Network status listener error:', error);
      }
    });
  }

  private async processRetryQueue(): Promise<void> {
    if (this.isRetrying || this.retryQueue.length === 0 || !this.status.online) {
      return;
    }

    this.isRetrying = true;
    console.log(`📡 リトライキュー処理開始 (${this.retryQueue.length}件)`);

    const queue = [...this.retryQueue];
    this.retryQueue = [];

    for (const retryFunction of queue) {
      try {
        await retryFunction();
        await new Promise(resolve => setTimeout(resolve, 100)); // 短いディレイ
      } catch (error) {
        console.error('Retry failed:', error);
        // 失敗したものは再度キューに追加
        this.retryQueue.push(retryFunction);
      }
    }

    this.isRetrying = false;
    console.log('📡 リトライキュー処理完了');
  }

  /**
   * ネットワーク状態の監視を開始
   */
  subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);

    // 現在の状態を即座に通知
    listener(this.status);

    // アンサブスクライブ関数を返す
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 現在のネットワーク状態を取得
   */
  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  /**
   * 失敗したリクエストをリトライキューに追加
   */
  addToRetryQueue(retryFunction: () => Promise<void>): void {
    this.retryQueue.push(retryFunction);
    console.log(`📡 リトライキューに追加 (キュー数: ${this.retryQueue.length})`);

    // オンラインの場合は即座に処理
    if (this.status.online) {
      this.processRetryQueue();
    }
  }

  /**
   * 接続品質の判定
   */
  getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (!this.status.online) return 'poor';

    const effectiveType = this.status.effectiveType;
    const downlink = this.status.downlink;

    if (effectiveType === '4g' && downlink && downlink > 10) {
      return 'excellent';
    } else if (effectiveType === '4g' || (downlink && downlink > 5)) {
      return 'good';
    } else if (effectiveType === '3g' || (downlink && downlink > 1)) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * 低品質接続モードかどうか
   */
  isLowQualityConnection(): boolean {
    const quality = this.getConnectionQuality();
    return quality === 'poor' || quality === 'fair';
  }

  /**
   * データセーブモードの推奨
   */
  shouldUseSaveData(): boolean {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.saveData === true || this.isLowQualityConnection();
    }
    return this.isLowQualityConnection();
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.removeEventListener('change', this.handleConnectionChange);
    }

    this.listeners.clear();
    this.retryQueue = [];
  }
}

// シングルトンインスタンス
let networkMonitor: NetworkMonitor | null = null;

export const getNetworkMonitor = (): NetworkMonitor => {
  if (typeof window === 'undefined') {
    // SSR環境では何もしない
    return {
      subscribe: () => () => {},
      getStatus: () => ({ online: true, connectionType: 'unknown' }),
      addToRetryQueue: () => {},
      getConnectionQuality: () => 'good',
      isLowQualityConnection: () => false,
      shouldUseSaveData: () => false,
      destroy: () => {}
    } as NetworkMonitor;
  }

  if (!networkMonitor) {
    networkMonitor = new NetworkMonitor();
  }

  return networkMonitor;
};

// React Hook
export const useNetworkStatus = () => {
  const [status, setStatus] = React.useState<NetworkStatus>(() => 
    getNetworkMonitor().getStatus()
  );

  React.useEffect(() => {
    const monitor = getNetworkMonitor();
    const unsubscribe = monitor.subscribe(setStatus);

    return unsubscribe;
  }, []);

  return {
    ...status,
    isLowQuality: getNetworkMonitor().isLowQualityConnection(),
    shouldSaveData: getNetworkMonitor().shouldUseSaveData(),
    quality: getNetworkMonitor().getConnectionQuality()
  };
};

// エラー関数でのリトライ機能付きfetch
export const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<Response> => {
  const monitor = getNetworkMonitor();
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (!monitor.getStatus().online) {
        throw new Error('Network offline');
      }

      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000) // 10秒タイムアウト
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      console.log(`Fetch attempt ${attempt + 1} failed:`, error);

      if (attempt < maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`Retrying in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }

  throw lastError!;
};
import { create } from 'zustand';
import { MaintenanceStatus } from '@/types/api';

interface MaintenanceState {
  // メンテナンス状態
  isMaintenanceMode: boolean;
  maintenanceInfo: MaintenanceStatus | null;
  isLoading: boolean;
  error: string | null;

  // UI状態
  showMaintenanceModal: boolean;
  lastChecked: number | null;
  checkInterval: number; // ミリ秒

  // Actions
  setMaintenanceMode: (isMaintenanceMode: boolean) => void;
  setMaintenanceInfo: (info: MaintenanceStatus | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setShowModal: (show: boolean) => void;
  setLastChecked: (timestamp: number) => void;
  setCheckInterval: (interval: number) => void;

  // Maintenance Actions
  checkMaintenanceStatus: () => Promise<void>;
  startAutoCheck: () => void;
  stopAutoCheck: () => void;
  handleMaintenanceResponse: (response: any) => void;
  clearError: () => void;

  // Computed values
  shouldShowMaintenance: () => boolean;
  getEstimatedRecoveryTime: () => string | null;
  getAffectedServices: () => string[];
}

let maintenanceCheckInterval: NodeJS.Timeout | null = null;

const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  // Initial State
  isMaintenanceMode: false,
  maintenanceInfo: null,
  isLoading: false,
  error: null,
  showMaintenanceModal: false,
  lastChecked: null,
  checkInterval: 30000, // 30秒間隔

  // Basic Setters
  setMaintenanceMode: (isMaintenanceMode) => set({ isMaintenanceMode }),
  setMaintenanceInfo: (maintenanceInfo) => set({ maintenanceInfo }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setShowModal: (showMaintenanceModal) => set({ showMaintenanceModal }),
  setLastChecked: (lastChecked) => set({ lastChecked }),
  setCheckInterval: (checkInterval) => set({ checkInterval }),

  // Maintenance Actions - Secondary Detection Method（補助的検知）
  checkMaintenanceStatus: async () => {
    const { setLoading, setError, setLastChecked, handleMaintenanceResponse } = get();

    try {
      setLoading(true);
      setError(null);

      // Secondary Detection: 定期ヘルスチェック（API Interceptorを経由）
      const { apiClient } = await import('@/lib/api');
      
      // API Interceptorを経由して統一的なメンテナンス検知を実行
      const response = await apiClient.client.get('/api/health', {
        validateStatus: (status) => status < 500 || status === 503
      });

      setLastChecked(Date.now());
      
      // 明示的にSecondary Detectionとしてログ出力
      console.log('🔍 Secondary Maintenance Detection via Health Check:', {
        endpoint: '/api/health',
        status: response.status,
        method: 'HEALTH_CHECK'
      });

      // API Interceptorで既にメンテナンス状態が検知されている場合があるため
      // ここでは明示的にhandleMaintenanceResponseを呼ばない（重複回避）

    } catch (error) {
      console.error('Health check error:', error);
      
      if ((error as any)?.response?.status === 503) {
        // 503エラーの場合は既にAPI Interceptorで処理済み
        console.log('🔍 Secondary Detection: 503 handled by Primary Interceptor');
      } else if ((error as any)?.code === 'NETWORK_ERROR' || !(error as any)?.response) {
        setError('ネットワークエラーが発生しました。接続を確認してください。');
      } else {
        setError('システム状態の確認に失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  },

  startAutoCheck: () => {
    const { checkMaintenanceStatus, checkInterval } = get();
    
    // 既存のインターバルをクリア
    if (maintenanceCheckInterval) {
      clearInterval(maintenanceCheckInterval);
    }

    // 新しいインターバルを設定
    maintenanceCheckInterval = setInterval(() => {
      checkMaintenanceStatus();
    }, checkInterval);

    // 初回チェック
    checkMaintenanceStatus();
  },

  stopAutoCheck: () => {
    if (maintenanceCheckInterval) {
      clearInterval(maintenanceCheckInterval);
      maintenanceCheckInterval = null;
    }
  },

  handleMaintenanceResponse: (response: any) => {
    const { setMaintenanceInfo, setMaintenanceMode } = get();
    const currentState = get();

    // 統一ハンドラー: すべてのメンテナンス検知方法に対応
    let maintenanceData = null;
    let isMaintenanceDetected = false;

    // Detection Priority 1: HTTP 503 Service Unavailable（最高優先度）
    if (response.status === 503) {
      isMaintenanceDetected = true;
      maintenanceData = response.data || {
        is_maintenance_mode: true,
        maintenance_message: 'システムメンテナンス中です。しばらくお待ちください。',
        estimated_recovery_time: undefined,
        affected_services: ['全サービス']
      };
      console.log('🔧 Maintenance detected (Priority 1 - HTTP 503):', maintenanceData);
    }
    // Detection Priority 2: Response Headers（中優先度）
    else if (response.headers?.['x-maintenance-mode'] === 'true') {
      isMaintenanceDetected = true;
      maintenanceData = {
        is_maintenance_mode: true,
        maintenance_message: response.headers?.['x-maintenance-message'] || 'システムメンテナンス中です。',
        estimated_recovery_time: response.headers?.['x-maintenance-recovery'],
        affected_services: response.headers?.['x-maintenance-services']?.split(',') || ['全サービス']
      };
      console.log('🔧 Maintenance detected (Priority 2 - Headers):', maintenanceData);
    }
    // Detection Priority 3: API Response Data（低優先度）
    else if (response.status === 200 && response.data?.maintenance_status?.is_maintenance_mode) {
      isMaintenanceDetected = true;
      maintenanceData = response.data.maintenance_status;
      console.log('🔧 Maintenance detected (Priority 3 - Response Data):', maintenanceData);
    }

    // メンテナンス状態の処理
    if (isMaintenanceDetected && maintenanceData) {
      // 新しいメンテナンス状態の開始または継続
      if (!currentState.isMaintenanceMode) {
        console.log('🚨 Entering Maintenance Mode');
      }
      setMaintenanceInfo(maintenanceData);
      setMaintenanceMode(true);
      set({ showMaintenanceModal: true });
    } else {
      // 正常状態: メンテナンス終了の検知
      if (currentState.isMaintenanceMode) {
        console.log('✅ Exiting Maintenance Mode - System Restored');
        setMaintenanceInfo(null);
        setMaintenanceMode(false);
        set({ showMaintenanceModal: false });
      }
    }
  },

  clearError: () => set({ error: null }),

  // Computed values
  shouldShowMaintenance: () => {
    const { isMaintenanceMode, maintenanceInfo } = get();
    return isMaintenanceMode && !!maintenanceInfo;
  },

  getEstimatedRecoveryTime: () => {
    const { maintenanceInfo } = get();
    return maintenanceInfo?.estimated_recovery_time || null;
  },

  getAffectedServices: () => {
    const { maintenanceInfo } = get();
    return maintenanceInfo?.affected_services || [];
  }
}));

// ストアが破棄される際にインターバルをクリーンアップ
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (maintenanceCheckInterval) {
      clearInterval(maintenanceCheckInterval);
    }
  });
}

export default useMaintenanceStore;
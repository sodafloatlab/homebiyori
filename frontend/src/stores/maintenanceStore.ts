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

  // Maintenance Actions
  checkMaintenanceStatus: async () => {
    const { setLoading, setError, setMaintenanceInfo, setLastChecked } = get();

    try {
      setLoading(true);
      setError(null);

      // TODO: API統合時に実際のメンテナンス状態チェックAPI呼び出し
      // const response = await apiClient.get('/maintenance/status');
      // const maintenanceData = response.data;

      // 現在はダミー実装
      const maintenanceData: MaintenanceStatus = {
        is_maintenance_mode: false,
        maintenance_message: undefined,
        estimated_recovery_time: undefined,
        affected_services: []
      };

      setMaintenanceInfo(maintenanceData);
      setLastChecked(Date.now());

      // メンテナンスモードが検出された場合
      if (maintenanceData.is_maintenance_mode) {
        set({ 
          isMaintenanceMode: true, 
          showMaintenanceModal: true 
        });
      } else {
        set({ isMaintenanceMode: false });
      }

    } catch (error) {
      // API エラーの場合、メンテナンス状態として扱う可能性もある
      if ((error as any)?.response?.status === 503) {
        const maintenanceData = (error as any).response?.data;
        if (maintenanceData) {
          set({
            isMaintenanceMode: true,
            maintenanceInfo: maintenanceData,
            showMaintenanceModal: true
          });
        }
      } else {
        setError('メンテナンス状態の確認に失敗しました。');
        console.error('Maintenance check error:', error);
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

    // HTTPステータス503 (Service Unavailable) の場合
    if (response.status === 503) {
      const maintenanceData = response.data || {
        is_maintenance_mode: true,
        maintenance_message: 'システムメンテナンス中です。',
        estimated_recovery_time: undefined,
        affected_services: ['全サービス']
      };

      setMaintenanceInfo(maintenanceData);
      setMaintenanceMode(true);
      set({ showMaintenanceModal: true });
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
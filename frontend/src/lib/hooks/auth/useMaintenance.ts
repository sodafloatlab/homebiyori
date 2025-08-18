/**
 * メンテナンス状態管理Hook - 統一アーキテクチャ版
 * 
 * ■機能概要■
 * - メンテナンス状態監視
 * - 自動チェック機能
 * - メンテナンス情報表示制御
 */

'use client';

import { useCallback } from 'react';
import useMaintenanceStore from '@/stores/maintenanceStore';
import type { MaintenanceStatus } from '@/types/api';

interface UseMaintenanceReturn {
  // 状態
  isMaintenanceMode: boolean;
  maintenanceInfo: MaintenanceStatus | null;
  isLoading: boolean;
  error: string | null;
  showMaintenanceModal: boolean;
  lastChecked: number | null;
  
  // アクション
  checkMaintenanceStatus: () => Promise<void>;
  startAutoCheck: () => void;
  stopAutoCheck: () => void;
  setShowModal: (show: boolean) => void;
  clearError: () => void;
  
  // 計算値
  shouldShowMaintenance: boolean;
  estimatedRecoveryTime: string | null;
  affectedServices: string[];
}

export function useMaintenance(): UseMaintenanceReturn {
  const {
    isMaintenanceMode,
    maintenanceInfo,
    isLoading,
    error,
    showMaintenanceModal,
    lastChecked,
    checkMaintenanceStatus,
    startAutoCheck,
    stopAutoCheck,
    setShowModal,
    clearError,
    shouldShowMaintenance,
    getEstimatedRecoveryTime,
    getAffectedServices
  } = useMaintenanceStore();

  // 計算値をメモ化
  const shouldShow = shouldShowMaintenance();
  const estimatedRecoveryTime = getEstimatedRecoveryTime();
  const affectedServices = getAffectedServices();

  return {
    // 状態
    isMaintenanceMode,
    maintenanceInfo,
    isLoading,
    error,
    showMaintenanceModal,
    lastChecked,
    
    // アクション
    checkMaintenanceStatus,
    startAutoCheck,
    stopAutoCheck,
    setShowModal,
    clearError,
    
    // 計算値
    shouldShowMaintenance: shouldShow,
    estimatedRecoveryTime,
    affectedServices
  };
}
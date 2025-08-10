'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Info,
  Calendar,
  Globe
} from 'lucide-react';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import ResponsiveContainer from '@/components/layout/ResponsiveContainer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import useMaintenanceStore from '@/stores/maintenanceStore';

interface MaintenanceScreenProps {
  isModal?: boolean;
  onClose?: () => void;
  showFullScreen?: boolean;
}

const MaintenanceScreen = ({ 
  isModal = false, 
  onClose,
  showFullScreen = true 
}: MaintenanceScreenProps) => {
  const {
    isMaintenanceMode,
    maintenanceInfo,
    isLoading,
    error,
    showMaintenanceModal,
    lastChecked,
    checkMaintenanceStatus,
    clearError,
    setShowModal,
    shouldShowMaintenance,
    getEstimatedRecoveryTime,
    getAffectedServices
  } = useMaintenanceStore();

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(30);

  // 自動更新カウントダウン
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          checkMaintenanceStatus();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, checkMaintenanceStatus]);

  const handleManualRefresh = async () => {
    setRefreshCountdown(30);
    await checkMaintenanceStatus();
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setShowModal(false);
    }
  };

  const formatLastChecked = () => {
    if (!lastChecked) return '未確認';
    return new Date(lastChecked).toLocaleString('ja-JP');
  };

  const formatEstimatedRecovery = () => {
    const recoveryTime = getEstimatedRecoveryTime();
    if (!recoveryTime) return null;
    
    try {
      return new Date(recoveryTime).toLocaleString('ja-JP');
    } catch {
      return recoveryTime;
    }
  };

  const getMaintenanceIcon = () => {
    if (isLoading) {
      return <LoadingSpinner size="lg" />;
    }
    
    if (isMaintenanceMode) {
      return <Wrench className="w-16 h-16 text-orange-500 mx-auto" />;
    }
    
    return <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />;
  };

  const getMaintenanceTitle = () => {
    if (isLoading) {
      return 'システム状態を確認中...';
    }
    
    if (isMaintenanceMode) {
      return 'システムメンテナンス中';
    }
    
    return 'システム正常稼働中';
  };

  const getMaintenanceMessage = () => {
    if (isMaintenanceMode && maintenanceInfo?.maintenance_message) {
      return maintenanceInfo.maintenance_message;
    }
    
    if (isMaintenanceMode) {
      return 'システムの保守作業を実施しております。ご不便をおかけして申し訳ございません。';
    }
    
    return 'システムは正常に稼働しています。';
  };

  // モーダル表示の場合
  if (isModal || showMaintenanceModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6"
        >
          <div className="text-center mb-6">
            {getMaintenanceIcon()}
            <Typography variant="h3" color="primary" className="mt-4 mb-2">
              {getMaintenanceTitle()}
            </Typography>
            <Typography variant="body" color="secondary">
              {getMaintenanceMessage()}
            </Typography>
          </div>

          {/* 復旧予定時刻 */}
          {isMaintenanceMode && formatEstimatedRecovery() && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <Typography variant="body" weight="bold" color="primary">
                  復旧予定時刻
                </Typography>
              </div>
              <Typography variant="body" color="secondary" className="mt-1">
                {formatEstimatedRecovery()}
              </Typography>
            </div>
          )}

          {/* 影響を受けるサービス */}
          {isMaintenanceMode && getAffectedServices().length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <Typography variant="body" weight="bold" color="primary">
                  影響を受けるサービス
                </Typography>
              </div>
              <ul className="mt-2 space-y-1">
                {getAffectedServices().map((service, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <Typography variant="small" color="secondary">
                      {service}
                    </Typography>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <Typography variant="body" weight="bold" color="error">
                  エラー
                </Typography>
              </div>
              <Typography variant="small" color="error" className="mt-1">
                {error}
              </Typography>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="mt-2 text-red-600"
              >
                エラーを閉じる
              </Button>
            </div>
          )}

          {/* 操作ボタン */}
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={handleManualRefresh}
              disabled={isLoading}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
              className="flex-1"
            >
              再確認
            </Button>
            
            {!isMaintenanceMode && (
              <Button
                variant="primary"
                onClick={handleClose}
                className="flex-1"
              >
                閉じる
              </Button>
            )}
          </div>

          {/* 最終確認時刻 */}
          <div className="mt-4 text-center">
            <Typography variant="small" color="secondary">
              最終確認: {formatLastChecked()}
            </Typography>
          </div>
        </motion.div>
      </div>
    );
  }

  // フルスクリーン表示の場合
  if (!showFullScreen) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      <ResponsiveContainer maxWidth="2xl" padding="lg" className="py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {/* メインアイコン */}
          <div className="mb-8">
            {getMaintenanceIcon()}
          </div>

          {/* タイトル */}
          <Typography variant="h1" color="primary" className="mb-4">
            {getMaintenanceTitle()}
          </Typography>

          {/* メッセージ */}
          <Typography variant="body" color="secondary" className="mb-8 max-w-2xl mx-auto">
            {getMaintenanceMessage()}
          </Typography>

          {/* メンテナンス詳細情報 */}
          {isMaintenanceMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* 復旧予定時刻 */}
              {formatEstimatedRecovery() && (
                <div className="bg-white p-6 rounded-2xl border border-orange-200 shadow-sm">
                  <div className="flex items-center justify-center space-x-3 mb-3">
                    <Calendar className="w-6 h-6 text-orange-600" />
                    <Typography variant="h4" color="primary">
                      復旧予定時刻
                    </Typography>
                  </div>
                  <Typography variant="body" color="secondary">
                    {formatEstimatedRecovery()}
                  </Typography>
                </div>
              )}

              {/* 影響を受けるサービス */}
              {getAffectedServices().length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm">
                  <div className="flex items-center justify-center space-x-3 mb-3">
                    <Globe className="w-6 h-6 text-red-600" />
                    <Typography variant="h4" color="primary">
                      影響を受けるサービス
                    </Typography>
                  </div>
                  <div className="space-y-2">
                    {getAffectedServices().map((service, index) => (
                      <div key={index} className="flex items-center justify-center space-x-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <Typography variant="body" color="secondary">
                          {service}
                        </Typography>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 操作パネル */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-lg max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Info className="w-5 h-5 text-blue-600" />
              <Typography variant="h4" color="primary">
                システム状態確認
              </Typography>
            </div>

            {/* 自動更新設定 */}
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
              <Typography variant="body" color="secondary">
                自動更新
              </Typography>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* 次回更新カウントダウン */}
            {autoRefresh && (
              <div className="mb-4 text-center">
                <Typography variant="small" color="secondary">
                  次回自動更新まで {refreshCountdown} 秒
                </Typography>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${((30 - refreshCountdown) / 30) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* 手動更新ボタン */}
            <Button
              variant="primary"
              onClick={handleManualRefresh}
              disabled={isLoading}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
              className="w-full mb-4"
            >
              {isLoading ? 'システム状態確認中...' : '今すぐ確認'}
            </Button>

            {/* 最終確認時刻 */}
            <Typography variant="small" color="secondary" className="text-center">
              最終確認: {formatLastChecked()}
            </Typography>
          </div>

          {/* エラー表示 */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 max-w-md mx-auto"
            >
              <div className="flex items-center justify-center space-x-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <Typography variant="body" weight="bold" color="error">
                  エラーが発生しました
                </Typography>
              </div>
              <Typography variant="small" color="error" className="text-center mb-3">
                {error}
              </Typography>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="w-full text-red-600"
              >
                エラーを閉じる
              </Button>
            </motion.div>
          )}

          {/* システム正常時の追加情報 */}
          {!isMaintenanceMode && !isLoading && (
            <div className="mt-8 text-center">
              <Typography variant="body" color="secondary">
                システムは正常に稼働しています。<br />
                ご利用いただき、ありがとうございます。
              </Typography>
            </div>
          )}
        </motion.div>
      </ResponsiveContainer>
    </div>
  );
};

export default MaintenanceScreen;
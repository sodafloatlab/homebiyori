'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Signal, SignalHigh, SignalMedium, SignalLow } from 'lucide-react';
import { useNetworkStatus } from '@/lib/network/networkMonitor';
import Typography from '@/components/ui/Typography';

interface NetworkStatusProps {
  showDetails?: boolean;
  className?: string;
}

const NetworkStatus = ({ showDetails = false, className = '' }: NetworkStatusProps) => {
  const networkStatus = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);

  useEffect(() => {
    if (!networkStatus.online) {
      setShowBanner(true);
      if (networkStatus.lastOnline) {
        setLastOnlineTime(networkStatus.lastOnline);
      }
    } else {
      // オンライン復旧時は少し遅延してからバナーを隠す
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [networkStatus.online, networkStatus.lastOnline]);

  const getSignalIcon = () => {
    if (!networkStatus.online) {
      return <WifiOff className="w-4 h-4" />;
    }

    switch (networkStatus.quality) {
      case 'excellent':
        return <Signal className="w-4 h-4 text-green-600" />;
      case 'good':
        return <SignalHigh className="w-4 h-4 text-green-500" />;
      case 'fair':
        return <SignalMedium className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <SignalLow className="w-4 h-4 text-red-500" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  };

  const getConnectionDescription = () => {
    if (!networkStatus.online) {
      return 'オフライン';
    }

    const descriptions = {
      'excellent': '優秀な接続',
      'good': '良好な接続',
      'fair': '普通の接続',
      'poor': '低速な接続'
    };

    return descriptions[networkStatus.quality] || '接続中';
  };

  const formatLastOnlineTime = (time: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return '数秒前';
    if (diffMinutes < 60) return `${diffMinutes}分前`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}時間前`;
    
    return time.toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!showDetails && networkStatus.online && !showBanner) {
    return null;
  }

  return (
    <div className={className}>
      {/* オフライン/復旧バナー */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed top-0 left-0 right-0 z-40 ${
              networkStatus.online 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}
          >
            <div className="flex items-center justify-center py-3 px-4">
              <div className="flex items-center space-x-2">
                {networkStatus.online ? (
                  <Wifi className="w-5 h-5" />
                ) : (
                  <WifiOff className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">
                  {networkStatus.online 
                    ? '📡 ネットワーク接続が復旧しました'
                    : '📡 インターネット接続がありません'
                  }
                </span>
              </div>
              
              {!networkStatus.online && (
                <button
                  onClick={() => setShowBanner(false)}
                  className="ml-4 text-white hover:text-gray-200"
                >
                  ×
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 詳細表示 */}
      {showDetails && (
        <div className={`p-4 rounded-lg border ${
          networkStatus.online 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${
              networkStatus.online 
                ? 'bg-green-100' 
                : 'bg-red-100'
            }`}>
              {getSignalIcon()}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <Typography 
                  variant="body" 
                  weight="medium" 
                  color={networkStatus.online ? 'primary' : 'error'}
                >
                  {getConnectionDescription()}
                </Typography>
                
                {networkStatus.shouldSaveData && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    データ節約
                  </span>
                )}
              </div>

              {/* 接続詳細情報 */}
              <div className="mt-1 space-y-1">
                {networkStatus.online && networkStatus.effectiveType && (
                  <Typography variant="caption" color="secondary">
                    回線: {networkStatus.effectiveType.toUpperCase()}
                    {networkStatus.downlink && ` (${networkStatus.downlink}Mbps)`}
                  </Typography>
                )}
                
                {!networkStatus.online && lastOnlineTime && (
                  <Typography variant="caption" color="secondary">
                    最後の接続: {formatLastOnlineTime(lastOnlineTime)}
                  </Typography>
                )}
              </div>
            </div>
          </div>

          {/* オフライン時の機能説明 */}
          {!networkStatus.online && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Typography variant="small" color="secondary">
                <strong>オフラインモード:</strong><br />
                • 一部機能は制限されます<br />
                • 作成中の内容は一時保存されます<br />
                • 接続復旧時に自動的に同期されます
              </Typography>
            </div>
          )}

          {/* 低品質接続時の説明 */}
          {networkStatus.online && networkStatus.isLowQuality && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Typography variant="small" color="secondary">
                <strong>低速接続検出:</strong><br />
                • データ使用量を最適化しています<br />
                • 一部の機能が簡略化される場合があります
              </Typography>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;
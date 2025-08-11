'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Archive, ExternalLink } from 'lucide-react';

// 通知の型定義
interface Notification {
  notification_id: string;
  user_id: string;
  type: 'SUBSCRIPTION_CANCELLED' | 'SUBSCRIPTION_RESUMED' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'PLAN_CHANGED' | 'ACCOUNT_DELETED' | 'MAINTENANCE_START' | 'MAINTENANCE_END';
  title: string;
  message: string;
  priority: 'high' | 'normal' | 'low';
  status: 'unread' | 'read' | 'archived';
  action_button?: {
    text: string;
    action: string;
    url?: string;
  };
  created_at: string;
  expires_at?: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  by_priority: {
    high: number;
    normal: number;
    low: number;
  };
}

interface NotificationBellProps {
  className?: string;
  onNavigate?: (screen: 'notifications') => void;
}

const NotificationBell = ({ className = "", onNavigate }: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    by_priority: { high: 0, normal: 0, low: 0 }
  });
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 通知データを取得
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      // 最新5件の通知を取得
      const response = await fetch('/api/notifications?page=1&page_size=5', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // 実際の認証ヘッダーを追加する必要があります
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data.notifications || []);
        setStats(data.data.stats || { total: 0, unread: 0, by_priority: { high: 0, normal: 0, low: 0 } });
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // フォールバックのモックデータ
      setNotifications([
        {
          notification_id: '1',
          user_id: 'user1',
          type: 'PAYMENT_SUCCESS',
          title: '決済完了',
          message: 'プレミアムプランの月額料金をお支払いいただきありがとうございます。',
          priority: 'normal',
          status: 'unread',
          created_at: new Date().toISOString()
        },
        {
          notification_id: '2',
          user_id: 'user1',
          type: 'SUBSCRIPTION_CANCELLED',
          title: 'プラン解約完了',
          message: 'プレミアムプランが解約されました。30日以内でしたら再開できます。',
          priority: 'high',
          status: 'unread',
          action_button: {
            text: '解約を取り消す',
            action: 'resume_subscription'
          },
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
      setStats({ total: 2, unread: 2, by_priority: { high: 1, normal: 1, low: 0 } });
    } finally {
      setIsLoading(false);
    }
  };

  // 通知を既読にする
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => 
          n.notification_id === notificationId 
            ? { ...n, status: 'read' as const }
            : n
        ));
        setStats(prev => ({ 
          ...prev, 
          unread: Math.max(0, prev.unread - 1) 
        }));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // 全て既読にする
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
        setStats(prev => ({ ...prev, unread: 0 }));
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // アクションボタン処理
  const handleAction = (action: string, url?: string) => {
    switch (action) {
      case 'resume_subscription':
        // プラン再開処理
        window.location.href = '/#premium';
        break;
      case 'update_payment':
        // 決済方法更新
        window.location.href = '/#premium';
        break;
      default:
        if (url) {
          window.open(url, '_blank');
        }
    }
  };

  // 外部クリック検出
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 通知データ初期読み込み
  useEffect(() => {
    fetchNotifications();
    
    // 30秒ごとに通知を更新（ポーリング）
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // 通知の優先度に応じたスタイル
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-red-400 bg-red-50';
      case 'low':
        return 'border-l-4 border-gray-300 bg-gray-50 opacity-75';
      default:
        return 'border-l-4 border-blue-400 bg-blue-50';
    }
  };

  // 通知タイプのアイコン
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT_SUCCESS':
        return '💳';
      case 'PAYMENT_FAILED':
        return '⚠️';
      case 'SUBSCRIPTION_CANCELLED':
        return '📋';
      case 'SUBSCRIPTION_RESUMED':
        return '✅';
      case 'PLAN_CHANGED':
        return '🔄';
      case 'ACCOUNT_DELETED':
        return '🗑️';
      case 'MAINTENANCE_START':
        return '🔧';
      case 'MAINTENANCE_END':
        return '✨';
      default:
        return '📢';
    }
  };

  // 相対時間表示
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diff = now.getTime() - past.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return '今';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 通知ベルアイコン */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-emerald-50 transition-colors group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="通知"
      >
        <Bell className={`w-5 h-5 transition-colors ${
          stats.unread > 0 
            ? 'text-emerald-600 group-hover:text-emerald-700' 
            : 'text-gray-500 group-hover:text-emerald-600'
        }`} />
        
        {/* 未読数バッジ */}
        <AnimatePresence>
          {stats.unread > 0 && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium"
            >
              {stats.unread > 99 ? '99+' : stats.unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* 通知ドロップダウン */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-96 max-w-screen-sm bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-[500px] overflow-hidden"
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-gray-800">通知</h3>
                {stats.unread > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium">
                    {stats.unread}件未読
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {stats.unread > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    すべて既読
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* 通知リスト */}
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">読み込み中...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">通知はありません</p>
                  <p className="text-gray-400 text-sm mt-1">新しい通知があるとここに表示されます</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.notification_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        notification.status === 'unread' ? 'bg-blue-50/30' : ''
                      } ${getPriorityStyles(notification.priority)}`}
                      onClick={() => notification.status === 'unread' && markAsRead(notification.notification_id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-lg flex-shrink-0">
                          {getTypeIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-800 text-sm">
                                {notification.title}
                                {notification.status === 'unread' && (
                                  <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block" />
                                )}
                              </h4>
                              <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                              {getRelativeTime(notification.created_at)}
                            </span>
                          </div>
                          
                          {/* アクションボタン */}
                          {notification.action_button && (
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction(notification.action_button!.action, notification.action_button!.url);
                              }}
                              className="mt-3 inline-flex items-center space-x-1 bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <span>{notification.action_button.text}</span>
                              <ExternalLink className="w-3 h-3" />
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="border-t border-gray-100 p-3">
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onNavigate) {
                    onNavigate('notifications');
                  }
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-1"
              >
                すべての通知を表示
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
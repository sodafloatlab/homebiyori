'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Archive, Trash2, Filter, Search, RefreshCw, ExternalLink } from 'lucide-react';
import NavigationHeader from '../../layout/NavigationHeader';
import { AppScreen, UserPlan, UserInfo } from '../../../types';

// 通知の型定義（NotificationBellと同じ）
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

interface NotificationsPageProps {
  onNavigate: (screen: AppScreen) => void;
  previousScreen?: AppScreen | null;
  userPlan?: UserPlan;
  userInfo?: UserInfo;
  isLoggedIn?: boolean;
  onPlanChange?: (plan: UserPlan) => void;
  onPlanChangeRequest?: (plan: UserPlan) => void;
  onLogout?: () => void;
  onNicknameChange?: (nickname: string) => void;
  onEmailChange?: (email: string) => void;
}

const NotificationsPage = ({
  onNavigate,
  previousScreen,
  userPlan = 'free',
  userInfo,
  isLoggedIn = false,
  onPlanChange,
  onPlanChangeRequest,
  onLogout,
  onNicknameChange,
  onEmailChange
}: NotificationsPageProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    by_priority: { high: 0, normal: 0, low: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high' | 'normal' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 通知データを取得
  const fetchNotifications = async (pageNum: number = 1, appendData: boolean = false) => {
    if (!appendData) setIsLoading(true);
    
    try {
      const queryParams = new URLSearchParams({
        page: pageNum.toString(),
        page_size: '20',
        ...(filter === 'unread' && { unread_only: 'true' }),
        ...(filter !== 'all' && filter !== 'unread' && { priority: filter }),
      });

      const response = await fetch(`/api/notifications?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // 実際の認証ヘッダーを追加する必要があります
        },
      });

      if (response.ok) {
        const data = await response.json();
        const newNotifications = data.data.notifications || [];
        
        if (appendData) {
          setNotifications(prev => [...prev, ...newNotifications]);
        } else {
          setNotifications(newNotifications);
        }
        
        setStats(data.data.stats || { total: 0, unread: 0, by_priority: { high: 0, normal: 0, low: 0 } });
        setHasMore(newNotifications.length === 20); // ページサイズと同じ場合は続きがある可能性
      } else {
        throw new Error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      
      // フォールバックのモックデータ（初回のみ）
      if (!appendData) {
        setNotifications([
          {
            notification_id: '1',
            user_id: 'user1',
            type: 'PAYMENT_SUCCESS',
            title: '決済完了',
            message: 'プレミアムプランの月額料金をお支払いいただきありがとうございます。次回請求日は2025年9月11日です。',
            priority: 'normal',
            status: 'unread',
            created_at: new Date().toISOString()
          },
          {
            notification_id: '2',
            user_id: 'user1',
            type: 'SUBSCRIPTION_CANCELLED',
            title: 'プラン解約完了',
            message: 'プレミアムプランが解約されました。30日以内でしたら解約を取り消すことができます。解約取り消しをご希望の場合は、下のボタンからお手続きください。',
            priority: 'high',
            status: 'unread',
            action_button: {
              text: '解約を取り消す',
              action: 'resume_subscription'
            },
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          },
          {
            notification_id: '3',
            user_id: 'user1',
            type: 'PLAN_CHANGED',
            title: 'プラン変更完了',
            message: '月額プランから年額プランに変更されました。年額プランでは20%お得にご利用いただけます。',
            priority: 'normal',
            status: 'read',
            created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
          },
          {
            notification_id: '4',
            user_id: 'user1',
            type: 'MAINTENANCE_END',
            title: 'メンテナンス完了',
            message: 'システムメンテナンスが完了しました。ご利用いただけない時間があり、申し訳ありませんでした。',
            priority: 'low',
            status: 'read',
            created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
          }
        ]);
        setStats({ total: 4, unread: 2, by_priority: { high: 1, normal: 2, low: 1 } });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // フィルタ条件に応じて通知をリロード
  useEffect(() => {
    setPage(1);
    fetchNotifications(1, false);
  }, [filter]);

  // 初回データ読み込み
  useEffect(() => {
    fetchNotifications();
  }, []);

  // さらに読み込み
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  };

  // 通知を既読にする
  const markAsRead = async (notificationIds: string[]) => {
    try {
      const promises = notificationIds.map(id =>
        fetch(`/api/notifications/${id}/read`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await Promise.all(promises);

      setNotifications(prev => prev.map(n => 
        notificationIds.includes(n.notification_id)
          ? { ...n, status: 'read' as const }
          : n
      ));
      
      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - notificationIds.length)
      }));
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  // 全て既読にする
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
      setStats(prev => ({ ...prev, unread: 0 }));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // アクションボタン処理
  const handleAction = (action: string, url?: string) => {
    switch (action) {
      case 'resume_subscription':
        onNavigate('premium');
        break;
      case 'update_payment':
        onNavigate('premium');
        break;
      default:
        if (url) {
          window.open(url, '_blank');
        }
    }
  };

  // 通知の選択切り替え
  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  // 全選択切り替え
  const toggleSelectAll = () => {
    const visibleNotificationIds = filteredNotifications.map(n => n.notification_id);
    const allSelected = visibleNotificationIds.every(id => selectedNotifications.includes(id));
    
    if (allSelected) {
      setSelectedNotifications(prev => prev.filter(id => !visibleNotificationIds.includes(id)));
    } else {
      setSelectedNotifications(prev => [...new Set([...prev, ...visibleNotificationIds])]);
    }
  };

  // 検索とフィルタリング
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = searchQuery === '' || 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filter === 'all' ||
      (filter === 'unread' && notification.status === 'unread') ||
      (['normal', 'low', 'high'].includes(filter) && notification.priority === filter);
    
    return matchesSearch && matchesFilter;
  });

  // 通知タイプのアイコン
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT_SUCCESS': return '💳';
      case 'PAYMENT_FAILED': return '⚠️';
      case 'SUBSCRIPTION_CANCELLED': return '📋';
      case 'SUBSCRIPTION_RESUMED': return '✅';
      case 'PLAN_CHANGED': return '🔄';
      case 'ACCOUNT_DELETED': return '🗑️';
      case 'MAINTENANCE_START': return '🔧';
      case 'MAINTENANCE_END': return '✨';
      default: return '📢';
    }
  };

  // 優先度スタイル
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-red-400';
      case 'low': return 'border-l-4 border-gray-300';
      default: return 'border-l-4 border-blue-400';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <NavigationHeader
        currentScreen="notifications"
        title="通知"
        subtitle={`全${stats.total}件${stats.unread > 0 ? `（未読${stats.unread}件）` : ''}`}
        onNavigate={onNavigate}
        previousScreen={previousScreen || 'landing'}
        userPlan={userPlan}
        userInfo={userInfo}
        isLoggedIn={isLoggedIn}
        onPlanChange={onPlanChange}
        onPlanChangeRequest={onPlanChangeRequest}
        onLogout={onLogout}
        onNicknameChange={onNicknameChange}
        onEmailChange={onEmailChange}
      />

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* ツールバー */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          {/* 検索・フィルター */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* 検索 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="通知を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* フィルター */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="unread">未読のみ</option>
                <option value="high">高優先度</option>
                <option value="normal">通常</option>
                <option value="low">低優先度</option>
              </select>
            </div>

            {/* 更新ボタン */}
            <button
              onClick={() => fetchNotifications()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>更新</span>
            </button>
          </div>

          {/* 一括操作 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filteredNotifications.length > 0 && 
                    filteredNotifications.every(n => selectedNotifications.includes(n.notification_id))}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">すべて選択</span>
              </label>
              
              {selectedNotifications.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {selectedNotifications.length}件選択中
                  </span>
                  <button
                    onClick={() => markAsRead(selectedNotifications)}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm flex items-center space-x-1"
                  >
                    <Check className="w-4 h-4" />
                    <span>既読にする</span>
                  </button>
                </div>
              )}
            </div>

            {stats.unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>すべて既読</span>
              </button>
            )}
          </div>
        </div>

        {/* 通知一覧 */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 text-center shadow-lg">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">読み込み中...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 text-center shadow-lg">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-2">
                {searchQuery ? '検索結果が見つかりません' : '通知はありません'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchQuery ? '別のキーワードでお試しください' : '新しい通知があるとここに表示されます'}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.notification_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden ${
                    notification.status === 'unread' ? 'ring-2 ring-blue-200' : ''
                  } ${getPriorityStyles(notification.priority)}`}
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* 選択チェックボックス */}
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.notification_id)}
                        onChange={() => toggleSelection(notification.notification_id)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />

                      {/* アイコン */}
                      <div className="text-2xl flex-shrink-0 mt-1">
                        {getTypeIcon(notification.type)}
                      </div>

                      {/* コンテンツ */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-gray-800 text-lg">
                              {notification.title}
                            </h3>
                            {notification.status === 'unread' && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <span className="text-sm text-gray-500 flex-shrink-0">
                            {getRelativeTime(notification.created_at)}
                          </span>
                        </div>

                        <p className="text-gray-700 mb-4 leading-relaxed">
                          {notification.message}
                        </p>

                        {/* アクションボタン */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {notification.status === 'unread' && (
                              <button
                                onClick={() => markAsRead([notification.notification_id])}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                              >
                                <Check className="w-4 h-4" />
                                <span>既読にする</span>
                              </button>
                            )}
                            
                            {notification.action_button && (
                              <motion.button
                                onClick={() => handleAction(
                                  notification.action_button!.action, 
                                  notification.action_button!.url
                                )}
                                className="inline-flex items-center space-x-2 bg-blue-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <span>{notification.action_button.text}</span>
                                <ExternalLink className="w-4 h-4" />
                              </motion.button>
                            )}
                          </div>

                          {/* 優先度表示 */}
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              notification.priority === 'high' 
                                ? 'bg-red-100 text-red-600'
                                : notification.priority === 'low'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {notification.priority === 'high' ? '高' : 
                               notification.priority === 'low' ? '低' : '通常'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* さらに読み込み */}
          {hasMore && filteredNotifications.length > 0 && !isLoading && (
            <div className="text-center py-4">
              <button
                onClick={loadMore}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                さらに読み込む
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
import { create } from 'zustand';
import { NotificationItem } from '@/types/api';

interface NotificationState {
  // 通知状態
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // UI状態
  showNotificationPanel: boolean;
  selectedNotification: NotificationItem | null;

  // Actions
  setNotifications: (notifications: NotificationItem[]) => void;
  addNotification: (notification: NotificationItem) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setShowPanel: (show: boolean) => void;
  setSelectedNotification: (notification: NotificationItem | null) => void;

  // Notification Actions
  fetchNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  clearNotifications: () => void;
  clearError: () => void;

  // Computed values
  getUnreadNotifications: () => NotificationItem[];
  getNotificationsByType: (type: NotificationItem['type']) => NotificationItem[];
}

const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial State
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  showNotificationPanel: false,
  selectedNotification: null,

  // Basic Setters
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    set({ notifications, unreadCount });
  },

  addNotification: (notification) => {
    const currentNotifications = get().notifications;
    const updatedNotifications = [notification, ...currentNotifications];
    const unreadCount = updatedNotifications.filter(n => !n.is_read).length;
    set({ notifications: updatedNotifications, unreadCount });
  },

  markAsRead: (notificationId) => {
    const { notifications } = get();
    const updatedNotifications = notifications.map(n =>
      n.notification_id === notificationId ? { ...n, is_read: true } : n
    );
    const unreadCount = updatedNotifications.filter(n => !n.is_read).length;
    set({ notifications: updatedNotifications, unreadCount });

    // TODO: API統合時にサーバーサイドでも既読マークを更新
    // apiClient.post(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: () => {
    const { notifications } = get();
    const updatedNotifications = notifications.map(n => ({ ...n, is_read: true }));
    set({ notifications: updatedNotifications, unreadCount: 0 });

    // TODO: API統合時にサーバーサイドでも一括既読マーク
    // apiClient.post('/notifications/mark-all-read');
  },

  removeNotification: (notificationId) => {
    const { notifications } = get();
    const updatedNotifications = notifications.filter(n => n.notification_id !== notificationId);
    const unreadCount = updatedNotifications.filter(n => !n.is_read).length;
    set({ notifications: updatedNotifications, unreadCount });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setShowPanel: (showNotificationPanel) => set({ showNotificationPanel }),
  setSelectedNotification: (selectedNotification) => set({ selectedNotification }),

  // Notification Actions
  fetchNotifications: async () => {
    const { setLoading, setError, setNotifications } = get();

    try {
      setLoading(true);
      setError(null);

      // TODO: API統合時に実際の通知取得API呼び出し
      // const response = await apiClient.get('/notifications');
      // setNotifications(response.data.notifications);

      // 現在はダミーデータ
      console.log('Notifications fetch requested');

    } catch (error) {
      setError('通知の取得に失敗しました。');
      console.error('Notification fetch error:', error);
    } finally {
      setLoading(false);
    }
  },

  refreshNotifications: async () => {
    await get().fetchNotifications();
  },

  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
  clearError: () => set({ error: null }),

  // Computed values
  getUnreadNotifications: () => {
    const { notifications } = get();
    return notifications.filter(n => !n.is_read);
  },

  getNotificationsByType: (type) => {
    const { notifications } = get();
    return notifications.filter(n => n.type === type);
  }
}));

export default useNotificationStore;
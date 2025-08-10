import apiClient from '@/lib/api';
import {
  NotificationItem,
  GetNotificationsRequest,
  GetNotificationsResponse,
  MarkNotificationReadRequest
} from '@/types/api';

export class NotificationService {
  /**
   * 通知一覧を取得
   */
  static async getNotifications(params: GetNotificationsRequest = {}): Promise<GetNotificationsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.limit) {
      queryParams.set('limit', params.limit.toString());
    }
    
    if (params.start_key) {
      queryParams.set('start_key', params.start_key);
    }
    
    if (params.unread_only) {
      queryParams.set('unread_only', 'true');
    }

    const url = `/notifications${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return await apiClient.get(url);
  }

  /**
   * 未読通知数を取得
   */
  static async getUnreadCount(): Promise<{ unread_count: number }> {
    return await apiClient.get('/notifications/unread-count');
  }

  /**
   * 特定の通知を既読にマーク
   */
  static async markAsRead(notificationId: string): Promise<void> {
    const request: MarkNotificationReadRequest = {
      notification_id: notificationId
    };
    
    await apiClient.post('/notifications/mark-read', request);
  }

  /**
   * 複数の通知を既読にマーク
   */
  static async markMultipleAsRead(notificationIds: string[]): Promise<void> {
    await apiClient.post('/notifications/mark-read-batch', {
      notification_ids: notificationIds
    });
  }

  /**
   * 全ての通知を既読にマーク
   */
  static async markAllAsRead(): Promise<void> {
    await apiClient.post('/notifications/mark-all-read');
  }

  /**
   * 特定の通知を削除
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`);
  }

  /**
   * 既読通知を一括削除
   */
  static async deleteReadNotifications(): Promise<void> {
    await apiClient.delete('/notifications/read');
  }

  /**
   * 全ての通知を削除
   */
  static async deleteAllNotifications(): Promise<void> {
    await apiClient.delete('/notifications');
  }

  /**
   * 通知設定を取得
   */
  static async getNotificationSettings(): Promise<{
    email_notifications: boolean;
    push_notifications: boolean;
    achievement_notifications: boolean;
    reminder_notifications: boolean;
    maintenance_notifications: boolean;
    marketing_notifications: boolean;
  }> {
    return await apiClient.get('/notifications/settings');
  }

  /**
   * 通知設定を更新
   */
  static async updateNotificationSettings(params: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    achievement_notifications?: boolean;
    reminder_notifications?: boolean;
    maintenance_notifications?: boolean;
    marketing_notifications?: boolean;
  }): Promise<{
    email_notifications: boolean;
    push_notifications: boolean;
    achievement_notifications: boolean;
    reminder_notifications: boolean;
    maintenance_notifications: boolean;
    marketing_notifications: boolean;
  }> {
    return await apiClient.patch('/notifications/settings', params);
  }

  /**
   * テスト通知を送信
   */
  static async sendTestNotification(type: 'info' | 'achievement' | 'reminder'): Promise<void> {
    await apiClient.post('/notifications/test', { type });
  }

  /**
   * 通知をタイプ別に取得
   */
  static async getNotificationsByType(
    type: NotificationItem['type'],
    limit: number = 10
  ): Promise<NotificationItem[]> {
    const response = await this.getNotifications({ limit: 50 }); // 多めに取得してフィルタ
    return response.notifications
      .filter(notification => notification.type === type)
      .slice(0, limit);
  }

  /**
   * 期限切れ通知をクリーンアップ
   */
  static async cleanupExpiredNotifications(): Promise<{ deleted_count: number }> {
    return await apiClient.post('/notifications/cleanup');
  }

  /**
   * 通知統計情報を取得
   */
  static async getNotificationStats(): Promise<{
    total_notifications: number;
    unread_notifications: number;
    notifications_by_type: Record<NotificationItem['type'], number>;
    last_notification_date: string | null;
    average_read_time: number; // 秒
  }> {
    return await apiClient.get('/notifications/stats');
  }
}

export default NotificationService;
/**
 * Contact API - 問い合わせ機能API統合
 * 
 * Contact Serviceとの通信を行う専用APIモジュール。
 * 問い合わせ送信、カテゴリ取得、バリデーション機能を提供。
 */

import { apiClient } from '@/lib/api';
import { APIResponse } from '@/types/api';

// Contact API型定義
export interface ContactCategory {
  value: string;
  label: string;
  description: string;
  icon: string;
}

export interface ContactInquiry {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  user_id?: string;
  user_agent?: string;
}

export interface ContactInquiryResponse {
  inquiry_id: string;
  submitted_at: string;
  category: string;
  priority: string;
  notification_sent: boolean;
  estimated_response_time: string;
}

export interface ContactCategoriesResponse {
  categories: ContactCategory[];
}

/**
 * Contact API クライアント
 */
export class ContactAPI {
  /**
   * 問い合わせカテゴリ一覧を取得
   * 
   * @returns Promise<ContactCategory[]> カテゴリ一覧
   */
  static async getContactCategories(): Promise<ContactCategory[]> {
    try {
      const response = await apiClient.get<ContactCategoriesResponse>('/contact/categories');
      return response.categories;
    } catch (error) {
      console.error('Failed to get contact categories:', error);
      
      // フォールバック：デフォルトカテゴリを返す
      return [
        {
          value: 'general',
          label: '一般的なお問い合わせ',
          description: '使い方や機能についてのご質問',
          icon: '❓'
        },
        {
          value: 'bug_report',
          label: 'バグ報告・不具合',
          description: 'アプリの動作不良や表示異常',
          icon: '🐛'
        },
        {
          value: 'feature_request',
          label: '新機能要望',
          description: '新しい機能や改善のご提案',
          icon: '💡'
        },
        {
          value: 'account_issue',
          label: 'アカウント関連',
          description: 'ログインやアカウント設定の問題',
          icon: '👤'
        },
        {
          value: 'payment',
          label: '決済・課金関連',
          description: 'お支払いやプランに関するお問い合わせ',
          icon: '💳'
        },
        {
          value: 'privacy',
          label: 'プライバシー・データ削除',
          description: '個人情報の取り扱いやデータ削除依頼',
          icon: '🔒'
        },
        {
          value: 'other',
          label: 'その他',
          description: '上記に当てはまらないお問い合わせ',
          icon: '📝'
        }
      ];
    }
  }

  /**
   * 問い合わせを送信
   * 
   * @param inquiry 問い合わせ情報
   * @returns Promise<ContactInquiryResponse> 送信結果
   */
  static async submitInquiry(inquiry: ContactInquiry): Promise<ContactInquiryResponse> {
    try {
      const response = await apiClient.post<ContactInquiryResponse>('/contact/submit', inquiry);
      return response;
    } catch (error) {
      console.error('Failed to submit inquiry:', error);
      throw error;
    }
  }

  /**
   * 問い合わせ内容のバリデーション
   * 
   * @param inquiry 問い合わせ情報
   * @returns {isValid: boolean, errors: string[]} バリデーション結果
   */
  static validateInquiry(inquiry: Partial<ContactInquiry>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 名前チェック
    if (!inquiry.name || !inquiry.name.trim()) {
      errors.push('お名前を入力してください');
    } else if (inquiry.name.trim().length > 50) {
      errors.push('お名前は50文字以内で入力してください');
    } else if (/[<>"\';\\]/.test(inquiry.name)) {
      errors.push('お名前に不適切な文字が含まれています');
    }

    // メールアドレスチェック
    if (!inquiry.email || !inquiry.email.trim()) {
      errors.push('メールアドレスを入力してください');
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(inquiry.email.trim())) {
        errors.push('有効なメールアドレスを入力してください');
      } else if (inquiry.email.length > 100) {
        errors.push('メールアドレスは100文字以内で入力してください');
      }
    }

    // 件名チェック
    if (!inquiry.subject || !inquiry.subject.trim()) {
      errors.push('件名を入力してください');
    } else if (inquiry.subject.trim().length > 100) {
      errors.push('件名は100文字以内で入力してください');
    } else if (/<script|javascript:|onload=|onerror=/i.test(inquiry.subject)) {
      errors.push('件名に不適切な文字が含まれています');
    }

    // メッセージ内容チェック
    if (!inquiry.message || !inquiry.message.trim()) {
      errors.push('お問い合わせ内容を入力してください');
    } else if (inquiry.message.trim().length < 10) {
      errors.push('お問い合わせ内容は10文字以上で入力してください');
    } else if (inquiry.message.length > 5000) {
      errors.push('お問い合わせ内容は5000文字以内で入力してください');
    } else if (/<script|javascript:|onload=|onerror=/i.test(inquiry.message)) {
      errors.push('お問い合わせ内容に不適切な文字が含まれています');
    }

    // カテゴリチェック
    const validCategories = [
      'general', 'bug_report', 'feature_request', 
      'account_issue', 'payment', 'privacy', 'other'
    ];
    if (inquiry.category && !validCategories.includes(inquiry.category)) {
      errors.push('無効なカテゴリが選択されています');
    }

    // 優先度チェック
    const validPriorities = ['low', 'medium', 'high'];
    if (inquiry.priority && !validPriorities.includes(inquiry.priority)) {
      errors.push('無効な優先度が選択されています');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * スパム検出（簡易版）
   * 
   * @param inquiry 問い合わせ情報
   * @returns number スパムスコア（0.0-1.0）
   */
  static detectSpam(inquiry: Partial<ContactInquiry>): number {
    let spamScore = 0.0;

    if (!inquiry.subject || !inquiry.message) {
      return spamScore;
    }

    // 疑わしいキーワードをチェック
    const spamKeywords = [
      'クリック', '今すぐ', '無料', '限定', '特典', '稼げる', '副業',
      '投資', 'FX', '仮想通貨', 'ビットコイン', 'http://', 'https://bit.ly'
    ];

    const text = `${inquiry.subject} ${inquiry.message}`.toLowerCase();
    
    for (const keyword of spamKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        spamScore += 0.1;
      }
    }

    // URLの数をチェック
    const urlCount = (inquiry.message.match(/https?:\/\//g) || []).length;
    if (urlCount > 3) {
      spamScore += 0.3;
    }

    // 文字の多様性をチェック
    if (inquiry.message.length > 0) {
      const uniqueChars = new Set(inquiry.message.toLowerCase()).size;
      const diversity = uniqueChars / inquiry.message.length;
      if (diversity < 0.3) {
        spamScore += 0.2;
      }
    }

    return Math.min(spamScore, 1.0);
  }

  /**
   * 優先度の自動検出
   * 
   * @param inquiry 問い合わせ情報
   * @returns string 推奨優先度
   */
  static detectPriority(inquiry: Partial<ContactInquiry>): 'low' | 'medium' | 'high' {
    if (!inquiry.subject || !inquiry.message) {
      return 'medium';
    }

    const text = `${inquiry.subject} ${inquiry.message}`.toLowerCase();

    // 高優先度キーワード
    const highPriorityKeywords = [
      '緊急', '至急', '使えない', '困っている', '重要', 'すぐに',
      'ログインできない', 'エラー', '支払い', '課金'
    ];

    // 低優先度キーワード  
    const lowPriorityKeywords = [
      '質問', '教えて', 'どうやって', '方法', 'できますか', '使い方'
    ];

    for (const keyword of highPriorityKeywords) {
      if (text.includes(keyword)) {
        return 'high';
      }
    }

    for (const keyword of lowPriorityKeywords) {
      if (text.includes(keyword)) {
        return 'low';
      }
    }

    // カテゴリによる優先度調整
    if (inquiry.category) {
      if (['bug_report', 'account_issue', 'payment', 'privacy'].includes(inquiry.category)) {
        return 'medium';
      }
    }

    return 'medium';
  }

  /**
   * テスト通知送信（開発環境のみ）
   * 
   * @returns Promise<any> テスト結果
   */
  static async sendTestNotification(): Promise<any> {
    try {
      const response = await apiClient.post<any>('/contact/test-notification', {});
      return response;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      throw error;
    }
  }
}

export default ContactAPI;
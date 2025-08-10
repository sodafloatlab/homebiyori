'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Mail, User, MessageSquare, ArrowLeft, CheckCircle, HelpCircle } from 'lucide-react';
import NavigationHeader from '../../layout/NavigationHeader';
import { AppScreen } from '@/types';

interface ContactFormPageProps {
  onNavigate: (screen: AppScreen) => void;
  onClose: () => void;
}

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const ContactFormPage = ({ onNavigate, onClose }: ContactFormPageProps) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // デモ用の送信処理
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
      
      // フォームをリセット
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    }, 2000);
  };

  const subjectOptions = [
    { value: '', label: '選択してください' },
    { value: 'general', label: '一般的なお問い合わせ' },
    { value: 'technical', label: '技術的な問題' },
    { value: 'feature', label: '機能の要望・提案' },
    { value: 'account', label: 'アカウントに関する問題' },
    { value: 'billing', label: '料金・課金について' },
    { value: 'other', label: 'その他' }
  ];

  const isFormValid = formData.name.trim() && formData.email.trim() && formData.subject && formData.message.trim();

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
        <NavigationHeader
          currentScreen="contact"
          title="お問い合わせ"
          onNavigate={onNavigate}
          previousScreen="landing"
        />
        <div className="max-w-2xl mx-auto p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-emerald-800 mb-2">
              お問い合わせを受け付けました！
            </h3>
            <p className="text-emerald-600 mb-6">
              3営業日以内にご返信いたします
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
            >
              ホームに戻る
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      <NavigationHeader
        currentScreen="contact"
        title="お問い合わせ"
        subtitle="ご質問やご要望をお聞かせください"
        onNavigate={onNavigate}
        previousScreen="landing"
      />

      <div className="max-w-2xl mx-auto p-6">
        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-800 mb-2">
            お問い合わせ
          </h2>
          <p className="text-emerald-600 text-sm">
            ほめびよりに関するご質問やご要望がございましたら、<br />
            お気軽にお問い合わせください
          </p>
        </motion.div>

        {/* お問い合わせフォーム */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg p-8 space-y-6"
        >
          {/* お名前 */}
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-2">
              お名前 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-500"
                placeholder="山田太郎"
                required
              />
            </div>
          </div>

          {/* メールアドレス */}
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-2">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-500"
                placeholder="example@email.com"
                required
              />
            </div>
          </div>

          {/* お問い合わせ種別 */}
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-2">
              お問い合わせ種別 <span className="text-red-500">*</span>
            </label>
            <select
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
              required
            >
              {subjectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* メッセージ */}
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-2">
              お問い合わせ内容 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows={6}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-gray-900 placeholder-gray-500"
                placeholder="お問い合わせ内容をできるだけ詳しくお聞かせください..."
                required
              />
            </div>
          </div>

          {/* 注意事項 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-800 mb-2">ご注意事項</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• ご返信まで3営業日程度お時間をいただく場合があります</li>
              <li>• 内容によってはお答えできない場合もございます</li>
              <li>• お急ぎの場合は、アプリ内のヘルプ機能もご利用ください</li>
            </ul>
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="w-full py-4 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>送信中...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>お問い合わせを送信</span>
              </>
            )}
          </button>
        </motion.form>

        {/* よくある質問へのリンク */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <div className="bg-white rounded-xl p-6 shadow-sm border border-emerald-100">
            <h3 className="font-semibold text-emerald-800 mb-2">
              よくある質問もご確認ください
            </h3>
            <p className="text-sm text-emerald-600 mb-4">
              お問い合わせの前に、よくある質問で解決する場合があります
            </p>
            <div className="space-y-2 text-sm text-emerald-700 mb-4">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>アカウントの作成・ログイン方法</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>AIキャラクターの使い方</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>プレミアム機能について</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('faq')}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
            >
              <HelpCircle className="w-4 h-4" />
              <span>よくある質問を見る</span>
            </button>
          </div>
        </motion.div>

        {/* 戻るボタン */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <button
            onClick={onClose}
            className="inline-flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>前のページに戻る</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactFormPage;
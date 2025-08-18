'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Mail, User, MessageSquare, ArrowLeft, CheckCircle, HelpCircle, Home } from 'lucide-react';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Footer from '@/components/layout/Footer';
import { motion } from 'framer-motion';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ 
    type: 'success' as const, 
    title: '', 
    message: '' 
  });

  const handleNavigate = (screen: string) => {
    console.log('Navigate to:', screen);
  };

  const breadcrumbItems = [
    {
      label: 'ホーム',
      href: '/',
      icon: <Home className="w-4 h-4" />
    },
    {
      label: 'お問い合わせ',
      href: '/contact'
    }
  ];

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

    // デモ用の送信処理（実際のアプリでは本物のAPI呼び出しを実装）
    setTimeout(() => {
      setIsLoading(false);
      setToastMessage({
        type: 'success',
        title: 'お問い合わせを受け付けました！',
        message: '3営業日以内にご返信いたします'
      });
      setShowToast(true);
      
      // フォームをリセット
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      
      // 3秒後に自動的に前のページに戻る
      setTimeout(() => {
        router.push('/');
      }, 3000);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      {/* ヘッダー */}
      <div className="bg-white/95 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {/* メインヘッダー */}
          <div className="flex items-center justify-between">
            {/* 左側：戻るボタンとタイトル */}
            <div className="flex items-center space-x-3">
              <motion.button
                onClick={() => router.push('/')}
                className="p-2 rounded-xl hover:bg-emerald-50 transition-colors group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700" />
              </motion.button>
              
              <div>
                <h1 className="text-xl font-bold text-emerald-800">お問い合わせ</h1>
                <p className="text-sm text-emerald-600 mt-0.5">ご質問やご要望をお聞かせください</p>
              </div>
            </div>

            {/* 右側：ホームボタン */}
            <div className="flex items-center space-x-2">
              <motion.button
                onClick={() => router.push('/')}
                className="p-2 rounded-xl hover:bg-emerald-50 transition-colors group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="ホームに戻る"
              >
                <Home className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700" />
              </motion.button>
            </div>
          </div>

          {/* パンくずナビゲーション */}
          <motion.div 
            className="mt-3 pt-3 border-t border-emerald-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Breadcrumb items={breadcrumbItems} />
          </motion.div>
        </div>

        {/* プログレスバー */}
        <motion.div 
          className="h-0.5 bg-gradient-to-r from-emerald-500 to-green-400"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ transformOrigin: 'left' }}
        />
      </div>

      {/* ローディングスピナー */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700">お問い合わせを送信中です...</p>
          </div>
        </div>
      )}

      {/* トースト通知 */}
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 border border-emerald-200"
        >
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
            <div>
              <h3 className="font-semibold text-emerald-800">{toastMessage.title}</h3>
              <p className="text-sm text-emerald-600">{toastMessage.message}</p>
            </div>
          </div>
        </motion.div>
      )}

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
              onClick={() => router.push('/faq')}
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
            onClick={() => router.push('/')}
            className="inline-flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>前のページに戻る</span>
          </button>
        </motion.div>
      </div>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
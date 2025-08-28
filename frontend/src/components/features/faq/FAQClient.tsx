/**
 * FAQ Client Component - SSG対応版
 * 
 * ■機能概要■
 * - クライアントサイド機能を分離
 * - インタラクティブFAQ機能
 * - 検索・フィルタリング機能
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, ChevronDown, ChevronUp, HelpCircle, Search, User, Crown, MessageCircle, Settings, Shield, Mail } from 'lucide-react';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Footer from '@/components/layout/Footer';
import { motion, AnimatePresence } from 'framer-motion';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
}

interface FAQClientProps {
  faqData: FAQItem[];
}

export default function FAQClient({ faqData }: FAQClientProps) {
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'all', label: '全て', iconType: 'HelpCircle' },
    { id: 'account', label: 'アカウント・ログイン', iconType: 'User' },
    { id: 'character', label: 'AIキャラクター', iconType: 'MessageCircle' },
    { id: 'premium', label: 'プレミアム', iconType: 'Crown' },
    { id: 'tree', label: '成長の木', iconType: 'Settings' },
    { id: 'privacy', label: 'プライバシー', iconType: 'Shield' },
    { id: 'support', label: 'サポート', iconType: 'Mail' }
  ];

  // アイコンマッピング関数
  const getIcon = (iconType: string, className: string = "w-5 h-5") => {
    const iconProps = { className };
    
    switch (iconType) {
      case 'HelpCircle':
        return <HelpCircle {...iconProps} />;
      case 'User':
        return <User {...iconProps} />;
      case 'MessageCircle':
        return <MessageCircle {...iconProps} />;
      case 'Crown':
        return <Crown {...iconProps} />;
      case 'Settings':
        return <Settings {...iconProps} />;
      case 'Shield':
        return <Shield {...iconProps} />;
      case 'Mail':
        return <Mail {...iconProps} />;
      default:
        return <HelpCircle {...iconProps} />;
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const handleNavigate = (screen: string) => {
    const pageRoutes: { [key: string]: string } = {
      'home': '/',
      'contact': '/contact',
      'terms-of-service': '/legal/terms',
      'privacy-policy': '/legal/privacy'
    };
    
    const route = pageRoutes[screen];
    if (route) {
      router.push(route);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-blue-50">
      {/* パンくずナビ */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Breadcrumb
            items={[
              { label: 'トップ', href: '/', icon: <Home className="w-4 h-4" /> },
              { label: 'よくある質問', href: '/faq' }
            ]}
          />
        </div>
      </div>

      {/* ヘッダーセクション */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-6">
              <HelpCircle className="w-8 h-8 text-emerald-600" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              よくある質問
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              ほめびよりについてのよくある質問と回答をまとめました。<br />
              お探しの情報が見つからない場合は、お気軽にお問い合わせください。
            </p>
          </motion.div>
        </div>

        {/* 検索とカテゴリフィルター */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white rounded-3xl shadow-lg p-8 mb-12"
        >
          {/* 検索バー */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="質問を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 text-lg border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* カテゴリフィルター */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {categories.map((category) => {
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedCategory === category.id
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    {getIcon(category.iconType, "w-6 h-6")}
                    <span className="text-sm font-medium text-center leading-tight">
                      {category.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* FAQ一覧 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="space-y-4"
        >
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleExpanded(faq.id)}
                  className="w-full px-6 py-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 pr-4">
                        {faq.question}
                      </h3>
                    </div>
                    <div className="flex-shrink-0">
                      {expandedItems.includes(faq.id) ? (
                        <ChevronUp className="w-6 h-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>
                
                <AnimatePresence>
                  {expandedItems.includes(faq.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-gray-200"
                    >
                      <div className="px-6 py-6">
                        <div className="prose prose-emerald max-w-none">
                          <p className="text-gray-700 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl">
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                該当する質問が見つかりませんでした
              </h3>
              <p className="text-gray-600">
                検索条件を変更するか、お気軽にお問い合わせください。
              </p>
            </div>
          )}
        </motion.div>

        {/* お問い合わせセクション */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 bg-gradient-to-r from-emerald-500 to-green-600 rounded-3xl p-12 text-center text-white"
        >
          <h2 className="text-3xl font-bold mb-4">
            他にもご質問がありますか？
          </h2>
          <p className="text-xl opacity-90 mb-8">
            お気軽にお問い合わせください。できる限り迅速にお答えします。
          </p>
          <button
            onClick={() => handleNavigate('contact')}
            className="bg-white text-emerald-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-gray-100 transition-colors inline-flex items-center"
          >
            <Mail className="w-6 h-6 mr-2" />
            お問い合わせ
          </button>
        </motion.div>
      </div>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
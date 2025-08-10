'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, ChevronUp, Search, User, Crown, MessageCircle, Settings, Shield, ArrowLeft, Mail } from 'lucide-react';
import NavigationHeader from '../../layout/NavigationHeader';
import { AppScreen } from '@/types';

interface FAQPageProps {
  onNavigate: (screen: AppScreen) => void;
  onClose: () => void;
}

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
}

const FAQPage = ({ onNavigate, onClose }: FAQPageProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const faqData: FAQItem[] = [
    // アカウント・ログイン関連
    {
      id: 'account-1',
      category: 'account',
      question: 'アカウントの作成方法を教えてください',
      answer: 'トップページの「無料でほめびよりを始める」ボタンをクリックし、Googleアカウントでログインするか、メールアドレスとパスワードで新規登録してください。登録は1分程度で完了します。',
      keywords: ['アカウント', '登録', 'サインアップ', 'Google', 'メール']
    },
    {
      id: 'account-2',
      category: 'account',
      question: 'ログインできません',
      answer: 'メールアドレスとパスワードが正しいか確認してください。Googleアカウントでログインしている場合は、Googleアカウントでのサインインを選択してください。それでも解決しない場合は、お問い合わせください。',
      keywords: ['ログイン', 'パスワード', 'サインイン', 'エラー', 'Google']
    },
    {
      id: 'account-3',
      category: 'account',
      question: 'パスワードを忘れました',
      answer: 'ログイン画面でパスワードを忘れた場合は、「パスワードを忘れた方」リンクをクリックしてください。登録されたメールアドレス宛にパスワードリセットのリンクをお送りします。',
      keywords: ['パスワード', 'リセット', '忘れた', 'メール']
    },

    // AIキャラクター関連
    {
      id: 'character-1',
      category: 'character',
      question: 'AIキャラクターの違いは何ですか？',
      answer: 'たまさんは温かく包み込むような優しさ、まどか姉さんは明るく前向きなエネルギー、ヒデじいは人生経験豊富な深い洞察力が特徴です。それぞれ異なる個性で、あなたの育児を支えてくれます。',
      keywords: ['たまさん', 'まどか姉さん', 'ヒデじい', 'キャラクター', '個性', '違い']
    },
    {
      id: 'character-2',
      category: 'character',
      question: 'キャラクターを途中で変更できますか？',
      answer: 'はい、いつでも変更可能です。チャット画面の設定から別のキャラクターを選択できます。その日の気分に合わせて自由に切り替えてお使いください。',
      keywords: ['キャラクター', '変更', '切り替え', '設定']
    },
    {
      id: 'character-3',
      category: 'character',
      question: 'AIの返答が不適切だと感じます',
      answer: 'AIは学習を続けていますが、時折不適切な応答をする場合があります。そのような場合は、該当のメッセージを報告していただけると改善に役立ちます。重要な判断には専門家のアドバイスをお求めください。',
      keywords: ['AI', '不適切', '報告', '改善', '専門家']
    },

    // 機能・使い方関連
    {
      id: 'usage-1',
      category: 'usage',
      question: '成長の木はどのように成長しますか？',
      answer: 'チャットでの文字数に応じて木が成長します。AIとの会話を続けることで、あなたの育児努力が可視化され、達成感を得られます。6つの成長段階があり、それぞれ異なる見た目になります。',
      keywords: ['成長の木', '文字数', '可視化', '達成感', '段階']
    },
    {
      id: 'usage-4',
      category: 'usage',
      question: '無料版でも利用できますか？',
      answer: 'はい、無料版でもほめびよりの全ての基本機能をご利用いただけます。チャット履歴は30日間保存され、ほめの実の記録は永続的に残ります。プレミアム版では、ディープモード、グループチャット、チャット履歴の180日保存が追加されます。',
      keywords: ['無料', '無料版', 'チャット履歴', '30日間', 'ほめの実', '永続']
    },
    {
      id: 'usage-2',
      category: 'usage',
      question: 'ほめの実とは何ですか？',
      answer: 'AIがあなたの感情を検出した際に生成される特別なメッセージです。疲れや喜び、愛情などの感情が込められた会話から、AIが「ほめの実」として褒めの言葉を残してくれます。',
      keywords: ['ほめの実', '感情', '検出', '褒め', 'メッセージ']
    },
    {
      id: 'usage-3',
      category: 'usage',
      question: '褒めモードと聞くモードの違いは？',
      answer: '褒めモードはあなたの頑張りを積極的に褒めてくれるモード、聞くモードは話を聞いて共感してくれるモードです。今の気分に合わせて選択してください。',
      keywords: ['褒めモード', '聞くモード', '違い', '気分', '共感']
    },

    // プレミアム機能関連
    {
      id: 'premium-1',
      category: 'premium',
      question: 'プレミアムプランの特典は何ですか？',
      answer: 'ディープモード（より深い会話）、グループチャット機能（複数のAIキャラクターとの同時会話）、チャット履歴の180日保存が利用できます。無料版でも基本機能はすべて使用可能で、チャット履歴は30日間保存されます。',
      keywords: ['プレミアム', '特典', 'ディープモード', 'グループチャット', 'チャット履歴', '180日']
    },
    {
      id: 'premium-2',
      category: 'premium',
      question: 'プレミアムプランの料金はいくらですか？',
      answer: 'プレミアムプランは月額580円（税込）、年額5,800円（税込・約17%お得）でご利用いただけます。いつでも解約可能です。',
      keywords: ['料金', '月額', '年額', '580円', '5800円', '価格', 'プレミアム']
    },
    {
      id: 'premium-3',
      category: 'premium',
      question: 'プレミアムプランは途中で解約できますか？',
      answer: 'はい、いつでも解約可能です。解約後も現在の課金期間終了まではプレミアム機能をご利用いただけます。',
      keywords: ['解約', 'キャンセル', '途中', '期間', 'プレミアム']
    },

    // 技術的な問題
    {
      id: 'technical-1',
      category: 'technical',
      question: 'アプリが重い・遅いです',
      answer: 'ブラウザのキャッシュをクリアする、他のタブを閉じる、ページを再読み込みするなどを試してください。それでも改善しない場合は、ご利用の端末やブラウザの情報と合わせてお問い合わせください。',
      keywords: ['重い', '遅い', 'キャッシュ', '再読み込み', 'ブラウザ']
    },
    {
      id: 'technical-2',
      category: 'technical',
      question: 'スマートフォンで正しく表示されません',
      answer: 'ほめびよりはモバイルファーストで設計されており、スマートフォンでの利用を推奨しています。表示に問題がある場合は、ブラウザを最新版に更新してください。',
      keywords: ['スマートフォン', 'モバイル', '表示', 'ブラウザ', '更新']
    },

    // プライバシー・セキュリティ
    {
      id: 'privacy-1',
      category: 'privacy',
      question: '個人情報は安全に管理されていますか？',
      answer: 'はい、お客様の個人情報は暗号化して保存し、厳重に管理しています。詳細はプライバシーポリシーをご確認ください。',
      keywords: ['個人情報', '安全', '暗号化', 'プライバシーポリシー', '管理']
    },
    {
      id: 'privacy-2',
      category: 'privacy',
      question: 'チャット内容は保存されますか？',
      answer: 'チャット履歴はより良いサービス提供のために一定期間保存されますが、個人を特定する情報と紐付けることなく、匿名化された形で処理されます。',
      keywords: ['チャット', '履歴', '保存', '匿名化', 'サービス向上']
    }
  ];

  const categories = [
    { id: 'all', label: 'すべて', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'account', label: 'アカウント・ログイン', icon: <User className="w-4 h-4" /> },
    { id: 'character', label: 'AIキャラクター', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'usage', label: '機能・使い方', icon: <Settings className="w-4 h-4" /> },
    { id: 'premium', label: 'プレミアム機能', icon: <Crown className="w-4 h-4" /> },
    { id: 'technical', label: '技術的な問題', icon: <Settings className="w-4 h-4" /> },
    { id: 'privacy', label: 'プライバシー', icon: <Shield className="w-4 h-4" /> }
  ];

  // フィルタリング機能
  const filteredFAQs = faqData.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // アコーディオンの開閉
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      <NavigationHeader
        currentScreen="faq"
        title="よくある質問"
        subtitle="お困りの際はこちらをご確認ください"
        onNavigate={onNavigate}
        previousScreen="landing"
      />

      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-800 mb-2">
            よくある質問
          </h2>
          <p className="text-emerald-600 text-sm">
            ほめびよりの使い方やよくあるご質問にお答えします
          </p>
        </motion.div>

        {/* 検索とフィルター */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          {/* 検索バー */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="質問や回答を検索..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* カテゴリフィルター */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.icon}
                <span className="hidden md:inline">{category.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* FAQ一覧 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {filteredFAQs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                該当する質問が見つかりませんでした
              </h3>
              <p className="text-gray-600 mb-4">
                検索キーワードを変更するか、お問い合わせフォームをご利用ください
              </p>
              <button
                onClick={() => onNavigate('contact')}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>お問い合わせする</span>
              </button>
            </div>
          ) : (
            filteredFAQs.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleExpanded(item.id)}
                  className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {categories.find(cat => cat.id === item.category)?.icon}
                      <span className="text-xs text-emerald-600 font-medium">
                        {categories.find(cat => cat.id === item.category)?.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 text-left">
                      {item.question}
                    </h3>
                  </div>
                  <div className="ml-4">
                    {expandedItems.has(item.id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedItems.has(item.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 border-t border-gray-100">
                        <div className="pt-4">
                          <p className="text-gray-700 leading-relaxed">
                            {item.answer}
                          </p>
                          {item.keywords.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {item.keywords.slice(0, 3).map((keyword, kidx) => (
                                <span
                                  key={kidx}
                                  className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* お問い合わせへの案内 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-8 text-center border border-emerald-200"
        >
          <h3 className="text-lg font-semibold text-emerald-800 mb-4">
            解決しない場合は
          </h3>
          <p className="text-emerald-600 mb-6">
            上記で解決しない問題やご質問がございましたら、<br />
            お気軽にお問い合わせください
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('contact')}
              className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span>お問い合わせする</span>
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-white text-emerald-700 border border-emerald-300 rounded-xl font-medium hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>前のページに戻る</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FAQPage;
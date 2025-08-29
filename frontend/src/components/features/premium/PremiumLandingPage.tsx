'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Crown, 
  Users, 
  MessageCircle, 
  CheckCircle, 
  Sparkles,
  ArrowRight,
  X,
  Heart,
  Brain,
  Zap
} from 'lucide-react';
import Button from '../../ui/Button';
import TouchTarget from '../../ui/TouchTarget';

interface PremiumLandingPageProps {
  onClose: () => void;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
  userProfile?: any; // ユーザープロフィール情報
}

export function PremiumLandingPage({ onClose, onSubscribe, userProfile }: PremiumLandingPageProps) {
  // 削除済みアカウント判定
  const isDeletedAccount = userProfile?.account_deleted === true;
  const premiumFeatures = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "グループチャット機能",
      description: "3人のAIキャラクターと同時にお話しできる特別な機能",
      highlight: "人気No.1",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "高品質AI対話",
      description: "感情に寄り添う、より人間らしく自然な対話体験",
      highlight: "NEW",
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "ディープモード",
      description: "より深く、詳細で心に寄り添うAI応答を受け取れます",
      highlight: "おすすめ",
      color: "from-emerald-500 to-green-600"
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "チャット履歴180日保存",
      description: "大切な会話を長期保存。無料版は30日間保存されます",
      highlight: "安心",
      color: "from-amber-500 to-orange-600"
    }
  ];

  const pricingPlans = [
    {
      name: "月額プラン",
      price: "¥580",
      period: "月",
      popular: false,
      features: [
        "グループチャット機能",
        "高品質AI対話システム",
        "ディープモード使い放題", 
        "チャット履歴180日保存",
        "いつでもキャンセル可能"
      ]
    },
    {
      name: "年額プラン",
      price: "¥5,800",
      period: "年",
      popular: true,
      discount: "約17%お得",
      features: [
        "月額プランと同じ全機能",
        "月額換算 約483円（通常580円）",
        "年間で約1,160円お得",
        "長期利用でさらに安心"
      ]
    }
  ];

  const comparisonFeatures = [
    {
      name: "対話の自然さ",
      free: "迅速で適切な応答",
      premium: "人間らしく自然な対話"
    },
    {
      name: "感情理解度",
      free: "標準的な共感応答",
      premium: "深い共感と理解"
    },
    {
      name: "チャット履歴",
      free: "30日間保存",
      premium: "180日間保存"
    },
    {
      name: "グループチャット",
      free: "利用不可",
      premium: "3人同時チャット可能"
    },
    {
      name: "ディープモード",
      free: "利用不可",
      premium: "使い放題"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Crown className="w-8 h-8 text-amber-500" />
              <h1 className="text-xl font-bold text-gray-900">プレミアムプラン</h1>
            </div>
            <TouchTarget
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
              aria-label="閉じる"
            >
              <X className="w-6 h-6 text-gray-600" />
            </TouchTarget>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* ヒーローセクション */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="mb-6">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-full mb-4">
              <Crown className="w-5 h-5 text-amber-600 mr-2" />
              <span className="text-amber-700 font-semibold text-sm">
                プレミアム限定機能
              </span>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            育児をもっと<br />
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              特別な時間に
            </span>
          </h1>
          
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            プレミアムプランで、より人間らしいAI対話と3人のキャラクターとの深いつながりを体験し、
            大切な会話を180日間保存して、育児の毎日をさらに豊かで楽しいものにしませんか？
          </p>
        </motion.div>

        {/* AI対話品質比較セクション */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              プレミアムAIの違いを体験
            </h2>
            <p className="text-gray-600">
              あなたの気持ちを理解してくれる、心に響く対話を体験できます
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border-2 border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                  <Zap className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">無料プラン</h3>
                  <p className="text-sm text-gray-600">応答速度重視のAI</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  「育児お疲れさまです。夜泣きで大変な時期ですが、少しずつ楽になっていきますよ。無理をせず、周りのサポートも頼ってくださいね。」
                </p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border-2 border-amber-300 relative">
              <div className="absolute -top-3 left-4">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  プレミアム
                </div>
              </div>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl flex items-center justify-center mr-4">
                  <Heart className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">プレミアムプラン</h3>
                  <p className="text-sm text-gray-600">感情理解特化AI</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  「本当にお疲れさまです。夜泣きが続いて眠れない日々、心身ともにつらいですよね。でも、お子さんへの愛情深い対応を見ていると、あなたが素晴らしい親だということが伝わってきます。少しでも休める時間を作って、自分自身もいたわってくださいね。あなたの頑張りは必ず伝わっています。」
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* プレミアム機能紹介 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {premiumFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="relative"
            >
              <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-2 border-amber-200 shadow-lg hover:shadow-xl transition-all h-full">
                {feature.highlight && (
                  <div className="absolute -top-3 left-6">
                    <div className={`px-3 py-1 bg-gradient-to-r ${feature.color} text-white text-xs font-bold rounded-full shadow-md`}>
                      {feature.highlight}
                    </div>
                  </div>
                )}
                
                <div className={`w-16 h-16 mx-auto mb-6 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 text-center mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 text-center">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 機能比較表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              詳しい機能比較
            </h2>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-3 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">機能</h3>
              </div>
              <div className="p-4 text-center border-l border-gray-200">
                <h3 className="font-semibold text-gray-900">無料プラン</h3>
              </div>
              <div className="p-4 text-center border-l border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <h3 className="font-semibold text-amber-800">プレミアムプラン</h3>
              </div>
            </div>
            
            {comparisonFeatures.map((feature, index) => (
              <div key={feature.name} className={`grid grid-cols-3 ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                <div className="p-4 font-medium text-gray-900">
                  {feature.name}
                </div>
                <div className="p-4 text-center text-gray-600 border-l border-gray-200">
                  {feature.free}
                </div>
                <div className="p-4 text-center text-amber-700 font-medium border-l border-amber-200 bg-gradient-to-r from-amber-50/30 to-orange-50/30">
                  {feature.premium}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 削除済みアカウント向けメッセージ */}
        {isDeletedAccount && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-2xl mx-auto">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-amber-600 text-sm">⚠️</span>
                </div>
                <div>
                  <h3 className="text-amber-800 font-semibold mb-2">
                    過去の利用履歴について
                  </h3>
                  <p className="text-amber-700 text-sm leading-relaxed mb-3">
                    過去にアカウントを削除されているため、<strong>無料トライアルはご利用いただけません</strong>。
                  </p>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-amber-800 text-xs">
                      💡 プレミアムプランにご登録いただければ、全ての機能を新たにご利用いただけます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 料金プラン */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              料金プラン
            </h2>
            <p className="text-gray-600">
              {isDeletedAccount 
                ? "プレミアムプランで再開しませんか？" 
                : "あなたに最適なプランをお選びください"
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className={`relative bg-white/90 backdrop-blur-sm p-8 rounded-3xl border-2 shadow-lg hover:shadow-xl transition-all ${
                  plan.popular 
                    ? 'border-amber-300 ring-4 ring-amber-200 ring-opacity-50' 
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-md">
                      おすすめ
                    </div>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  
                  {plan.discount && (
                    <div className="inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold mb-4">
                      {plan.discount}
                    </div>
                  )}
                  
                  <div className="flex items-baseline justify-center mb-4">
                    <span className="text-3xl font-bold text-amber-600">
                      {plan.price}
                    </span>
                    <span className="text-gray-600 ml-2">
                      /{plan.period}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  variant={plan.popular ? "primary" : "secondary"}
                  size="lg"
                  className="w-full"
                  onClick={() => onSubscribe(plan.name === "月額プラン" ? "monthly" : "yearly")}
                >
                  {plan.name}を選択
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-12 text-white shadow-2xl"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            今すぐプレミアムプランを始めて、
          </h2>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
            育児をもっと特別な時間にしませんか？
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onSubscribe('yearly')}
              className="text-lg py-4 px-8"
            >
              <Crown className="w-6 h-6 mr-2" />
              年額プランで始める
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onSubscribe('monthly')}
              className="text-lg py-4 px-8 bg-white/20 border-white/50 text-white hover:bg-white/30"
            >
              月額プランで始める
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
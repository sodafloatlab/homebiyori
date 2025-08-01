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
  X 
} from 'lucide-react';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import TouchTarget from '@/components/ui/TouchTarget';
import ResponsiveContainer from '@/components/layout/ResponsiveContainer';
import Footer from '@/components/layout/Footer';
import { AppScreen } from './MainApp';

interface PremiumLandingPageProps {
  onNavigate: (screen: AppScreen) => void;
  onClose: () => void;
}

const PremiumLandingPage = ({ onNavigate, onClose }: PremiumLandingPageProps) => {
  const premiumFeatures = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "グループチャット機能",
      description: "3人のAIキャラクターと同時にお話しできる特別な機能",
      highlight: "人気No.1",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "ディープモード",
      description: "より深く、詳細で心に寄り添うAI応答を受け取れます",
      highlight: "おすすめ",
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "チャット履歴無制限保存",
      description: "大切な会話を永続的に保存。無料版は3日間のみ保存されます",
      highlight: "安心",
      color: "from-emerald-500 to-green-600"
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
        "ディープモード使い放題",
        "チャット履歴無制限保存",
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


  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-amber-200">
        <ResponsiveContainer maxWidth="2xl" padding="sm">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Crown className="w-8 h-8 text-amber-500" />
              <Typography variant="h4" color="primary">プレミアムプラン</Typography>
            </div>
            <TouchTarget
              variant="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6 text-gray-600" />
            </TouchTarget>
          </div>
        </ResponsiveContainer>
      </div>

      {/* ヒーローセクション */}
      <ResponsiveContainer maxWidth="2xl" padding="lg" className="py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="mb-6">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-full mb-4">
              <Crown className="w-5 h-5 text-amber-600 mr-2" />
              <Typography variant="small" weight="semibold" className="text-amber-700">
                プレミアム限定機能
              </Typography>
            </div>
          </div>
          
          <Typography variant="hero" color="primary" className="mb-6" align="center">
            育児をもっと<br />
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              特別な時間に
            </span>
          </Typography>
          
          <Typography variant="body" color="secondary" className="mb-8 max-w-2xl mx-auto">
            プレミアムプランで、3人のAIキャラクターとのより深いつながりを体験し、
            大切な会話を永続的に保存して、育児の毎日をさらに豊かで楽しいものにしませんか？
          </Typography>
          
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 max-w-2xl mx-auto mb-8">
            <Typography variant="small" color="secondary" className="text-center">
              💡 <strong>無料でもご利用いただけます</strong><br />
              無料版では、チャット履歴は3日間保存されます。ほめの実の記録はずっと残ります。
            </Typography>
          </div>
        </motion.div>

        {/* プレミアム機能紹介 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {premiumFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-2 border-amber-200 shadow-lg hover:shadow-xl transition-all">
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
                
                <Typography variant="h4" color="primary" align="center" className="mb-4">
                  {feature.title}
                </Typography>
                
                <Typography variant="body" color="secondary" align="center">
                  {feature.description}
                </Typography>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 料金プラン */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <Typography variant="h2" color="primary" className="mb-4" align="center">
              料金プラン
            </Typography>
            <Typography variant="body" color="secondary" align="center">
              あなたに最適なプランをお選びください
            </Typography>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
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
                  <Typography variant="h3" color="primary" className="mb-2">
                    {plan.name}
                  </Typography>
                  
                  {plan.discount && (
                    <div className="inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold mb-4">
                      {plan.discount}
                    </div>
                  )}
                  
                  <div className="flex items-baseline justify-center mb-4">
                    <Typography variant="hero" className="text-3xl font-bold text-amber-600">
                      {plan.price}
                    </Typography>
                    <Typography variant="body" color="secondary" className="ml-2">
                      /{plan.period}
                    </Typography>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <Typography variant="small" color="secondary">
                        {feature}
                      </Typography>
                    </div>
                  ))}
                </div>

                <Button
                  variant={plan.popular ? "primary" : "outline"}
                  size="lg"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  className="w-full"
                  onClick={() => {
                    // 実際の課金処理へのリダイレクト
                    alert(`${plan.name}への課金処理を開始します`);
                  }}
                >
                  {plan.name}を選択
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>


        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-12 text-white shadow-2xl"
        >
          <Typography variant="h2" className="text-white mb-4">
            今すぐプレミアムプランを始めて、
          </Typography>
          <Typography variant="h2" className="text-white mb-8">
            育児をもっと特別な時間にしませんか？
          </Typography>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              size="xl"
              rightIcon={<Crown className="w-6 h-6" />}
              onClick={() => alert('年額プランへの課金処理を開始します')}
              className="text-xl py-6 px-12"
            >
              年額プランで始める
            </Button>
            <Button
              variant="outline"
              size="xl"
              onClick={() => alert('月額プランへの課金処理を開始します')}
              className="text-xl py-6 px-12 bg-white/20 border-white/50 text-white hover:bg-white/30"
            >
              月額プランで始める
            </Button>
          </div>
        </motion.div>
      </ResponsiveContainer>

      {/* Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default PremiumLandingPage;
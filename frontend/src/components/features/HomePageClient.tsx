/**
 * Home Page Client Component - SSG対応版
 * 
 * ■機能概要■
 * - クライアントサイド機能を分離
 * - アニメーション・インタラクション処理
 * - 動的状態管理
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, TrendingUp, Users, ArrowRight, CheckCircle, Star, Sparkles, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import TopPageWatercolorTree from '@/components/ui/TopPageWatercolorTree';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import TouchTarget from '@/components/ui/TouchTarget';
import ResponsiveContainer from '@/components/layout/ResponsiveContainer';
import Footer from '@/components/layout/Footer';
import useAuthStore from '@/stores/authStore';

interface HomePageClientProps {
  characters: Array<{
    name: string;
    role: string;
    color: string;
    gradientColor: string;
    bgColor: string;
    description: string;
    image: string;
    personality: string;
    strength: string;
    approach: string;
    benefits: string[];
    examples: string[];
  }>;
  features: Array<{
    iconType: string;
    title: string;
    description: string;
    benefit: string;
    color: string;
    bgColor: string;
  }>;
  journeySteps: Array<{
    step: number;
    title: string;
    description: string;
    iconType: string;
  }>;
}

export default function HomePageClient({ characters, features, journeySteps }: HomePageClientProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [currentTreeStage, setCurrentTreeStage] = useState(0);
  const [expandedCharacter, setExpandedCharacter] = useState<string | null>(null);
  
  // 認証状態取得
  const { isLoggedIn, isLoading } = useAuthStore();

  // アイコンマッピング関数
  const getIcon = (iconType: string, className: string = "w-8 h-8") => {
    const iconProps = { className };
    
    switch (iconType) {
      case 'Heart':
        return <Heart {...iconProps} />;
      case 'TrendingUp':
        return <TrendingUp {...iconProps} />;
      case 'Users':
        return <Users {...iconProps} />;
      case 'CheckCircle':
        return <CheckCircle {...iconProps} />;
      case 'Star':
        return <Star {...iconProps} />;
      case 'Sparkles':
        return <Sparkles {...iconProps} />;
      case 'MessageCircle':
        return <MessageCircle {...iconProps} />;
      default:
        return <CheckCircle {...iconProps} />;
    }
  };

  useEffect(() => {
    setIsVisible(true);
    
    // 機能ハイライトのローテーション
    const featureInterval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 3);
    }, 5000);

    // 木の成長デモ（0~5の6段階、動的間隔制御）
    const treeGrowthTimer = setTimeout(() => {
      let currentStage = 0;
      let nextTimeout: NodeJS.Timeout;
      
      const scheduleNextGrowth = () => {
        // 各段階の表示時間を動的に決定
        let delayTime;
        if (currentStage === 0) {
          delayTime = 1500; // 土→芽: 1.5秒（短縮）
        } else if (currentStage === 5) {
          delayTime = 10000; // 最終段階→土: 10秒（キープ）
        } else {
          delayTime = 3000; // その他の段階: 3秒
        }
        
        nextTimeout = setTimeout(() => {
          currentStage = currentStage >= 5 ? 0 : currentStage + 1;
          setCurrentTreeStage(currentStage);
          scheduleNextGrowth(); // 次の成長をスケジュール
        }, delayTime);
      };
      
      scheduleNextGrowth();
      
      // クリーンアップ関数を返す
      return () => {
        if (nextTimeout) clearTimeout(nextTimeout);
      };
    }, 2000);

    return () => {
      clearInterval(featureInterval);
      clearTimeout(treeGrowthTimer);
    };
  }, []);

  // 認証状態確認 - 認証済みユーザーはオンボーディング状態をチェック
  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      console.log('User is authenticated, checking onboarding status...');
      // オンボーディング状態をチェックしてリダイレクト
      const checkAndRedirect = async () => {
        const { checkOnboardingStatus } = useAuthStore.getState();
        const isOnboardingCompleted = await checkOnboardingStatus();
        
        if (isOnboardingCompleted) {
          // オンボーディング完了済み → そのままホーム画面に留まる（リダイレクトしない）
          console.log('Onboarding completed, staying on home page');
        } else {
          // オンボーディング未完了 → ニックネーム登録画面へ
          console.log('Onboarding not completed, redirecting to nickname registration');
          router.push('/onboarding/nickname');
        }
      };
      
      checkAndRedirect();
    }
  }, [isLoggedIn, isLoading, router]);

  const handleNavigateToAuth = () => {
    router.push('/auth/signin');
  };

  const handleNavigate = (screen: string) => {
    // 各ページへのルーティング（実装済みのページのみ）
    const pageRoutes: { [key: string]: string } = {
      'auth': '/auth/signin',
      'terms-of-service': '/legal/terms',
      'privacy-policy': '/legal/privacy',
      'commercial-transaction': '/legal/commercial',
      'contact': '/contact',
      'faq': '/faq'
    };
    
    const route = pageRoutes[screen];
    if (route) {
      router.push(route);
    } else {
      console.log('Page not implemented yet:', screen);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 relative overflow-hidden">
      {/* ヒーローセクション */}
      <ResponsiveContainer maxWidth="2xl" padding="lg">
        <div className="relative">
          {/* メインコンテンツ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-screen py-12">
            {/* 左側：メインメッセージ */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -50 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="flex flex-col justify-center space-y-8"
            >
              {/* キャッチコピー */}
              <div className="space-y-6">
                <Typography variant="hero" color="primary" animated>
                  育児を頑張る
                  <br />
                  <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    あなたを褒める
                  </span>
                </Typography>
                
                <Typography variant="body" color="secondary" animated>
                  AIが優しく寄り添い、育児の努力を認めて褒めてくれる。
                  <br />
                  忙しい毎日の中で、自己肯定感を高めるひとときを。
                </Typography>
              </div>

              {/* CTAボタン */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 1, delay: 0.8 }}
                className="space-y-4"
              >
                <Button
                  variant="primary"
                  size="xl"
                  fullWidth
                  rightIcon={<ArrowRight className="w-6 h-6" />}
                  onClick={handleNavigateToAuth}
                  className="text-xl py-6"
                >
                  無料でほめびよりを始める
                </Button>
                
                <div className="flex items-center justify-center space-x-4 text-sm text-emerald-600">
                  <span className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    無料で利用可
                  </span>
                  <span className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    1分で開始
                  </span>
                  <span className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    登録簡単
                  </span>
                </div>
              </motion.div>

              {/* 次のステップ予告 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="p-4 bg-emerald-50 rounded-xl border border-emerald-200"
              >
                <Typography variant="caption" color="secondary" className="mb-3 font-medium">
                  このボタンを押すと：
                </Typography>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {journeySteps.map((step) => (
                    <div key={step.step} className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {step.step}
                      </div>
                      <div>
                        <Typography variant="small" weight="semibold" color="primary">
                          {step.title}
                        </Typography>
                        <br />
                        <Typography variant="small" color="secondary" className="text-xs">
                          {step.description}
                        </Typography>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* 右側：成長の木 */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 50 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="flex justify-center items-center"
            >
              {/* 成長の木 - レスポンシブ対応 */}
              <div className="relative w-full max-w-md">
                {/* モバイル用サイズ */}
                <div className="block md:hidden">
                  <TopPageWatercolorTree ageInDays={currentTreeStage * 100} />
                </div>
                {/* PC用サイズ */}
                <div className="hidden md:block">
                  <TopPageWatercolorTree ageInDays={currentTreeStage * 100} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </ResponsiveContainer>

      {/* 主要機能セクション */}
      <ResponsiveContainer maxWidth="2xl" padding="lg" className="py-20">
        <div className="text-center mb-16">
          <Typography variant="h2" color="primary" animated className="mb-4">
            なぜほめびよりが選ばれるのか
          </Typography>
          <Typography variant="body" color="secondary" animated>
            育児を頑張るあなたに、3つの特別な価値を提供します
          </Typography>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <TouchTarget
                variant="card"
                className={`relative p-8 ${feature.bgColor} rounded-2xl border-2 border-transparent hover:border-emerald-200 h-full ${
                  activeFeature === index ? 'ring-2 ring-emerald-300 shadow-lg' : ''
                }`}
              >
                {/* 優先度インジケータ */}
                {index === 0 && (
                  <div className="absolute -top-3 -right-3">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center">
                      <Star className="w-3 h-3 mr-1" />
                      最推し
                    </div>
                  </div>
                )}

                <div className="text-center space-y-4">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.color} text-white`}>
                    {getIcon(feature.iconType)}
                  </div>
                  
                  <Typography variant="h4" color="primary">
                    {feature.title}
                  </Typography>
                  
                  <Typography variant="caption" color="secondary" className="text-left">
                    {feature.description}
                  </Typography>

                  <div className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                    <Sparkles className="w-4 h-4 mr-1" />
                    {feature.benefit}
                  </div>
                </div>
              </TouchTarget>
            </motion.div>
          ))}
        </div>
      </ResponsiveContainer>

      {/* AIキャラクター詳細紹介セクション */}
      <ResponsiveContainer maxWidth="2xl" padding="lg" className="py-20">
        <div className="text-center mb-16">
          <Typography variant="h2" color="primary" animated className="mb-4">
            あなたを支える3人のAIキャラクター
          </Typography>
          <Typography variant="body" color="secondary" animated>
            それぞれ異なる個性で、あなたの育児を温かく見守り、褒めてくれます
          </Typography>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {characters.map((character, index) => (
            <motion.div
              key={character.role}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <TouchTarget
                variant="card"
                onClick={() => setExpandedCharacter(
                  expandedCharacter === character.role ? null : character.role
                )}
                className={`relative p-8 ${character.bgColor} rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                  expandedCharacter === character.role 
                    ? 'border-emerald-300 shadow-lg' 
                    : 'border-transparent hover:border-emerald-200'
                }`}
              >
                {/* キャラクター画像とヘッダー */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <Image
                      src={character.image}
                      alt={character.name}
                      width={80}
                      height={80}
                      sizes="80px"
                      className="object-cover w-full h-full"
                      priority={index < 3}
                    />
                  </div>
                  
                  <Typography variant="h3" color="primary" className="mb-2">
                    {character.name}
                  </Typography>
                  
                  <Typography variant="caption" color="secondary" className="mb-4">
                    {character.personality} • {character.strength}
                  </Typography>
                  
                  <Typography variant="body" color="secondary" className="mb-6 text-left">
                    {character.approach}
                  </Typography>
                </div>

                {/* クリックで詳細表示のヒント */}
                <div className="text-center mb-4">
                  <div className="inline-flex items-center px-3 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium hover:bg-emerald-200 transition-colors">
                    <span>{expandedCharacter === character.role ? '詳細を閉じる' : '詳細を見る'}</span>
                    <motion.div
                      animate={{ rotate: expandedCharacter === character.role ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="ml-2"
                    >
                      <ArrowRight className="w-4 h-4 transform rotate-90" />
                    </motion.div>
                  </div>
                </div>

                {/* 折りたたみ式詳細コンテンツ */}
                <AnimatePresence>
                  {expandedCharacter === character.role && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      {/* 効果・メリット */}
                      <div className="mb-6">
                        <Typography variant="small" weight="semibold" color="primary" className="mb-3">
                          このキャラクターの効果：
                        </Typography>
                        <div className="flex flex-wrap gap-2">
                          {character.benefits.map((benefit, benefitIndex) => (
                            <div key={benefitIndex} className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                              <Sparkles className="w-3 h-3 mr-1" />
                              {benefit}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 実際の言葉の例 */}
                      <div className="space-y-3">
                        <Typography variant="small" weight="semibold" color="primary" className="mb-3">
                          実際の褒め言葉の例：
                        </Typography>
                        {character.examples.slice(0, 2).map((example, exampleIndex) => (
                          <div key={exampleIndex} className="bg-white/80 p-3 rounded-lg border border-emerald-100">
                            <Typography variant="small" color="secondary" className="italic">
                              {example}
                            </Typography>
                          </div>
                        ))}
                        <div className="text-center pt-2">
                          <Typography variant="small" color="secondary" className="text-emerald-600">
                            ＋他にも個性豊かな褒め方で応援してくれます
                          </Typography>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TouchTarget>
            </motion.div>
          ))}
        </div>

        {/* キャラクター選択のヒント */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 p-8 bg-gradient-to-br from-emerald-50 via-green-50 to-blue-50 rounded-3xl border-2 border-emerald-200 shadow-lg"
        >
          <div className="text-center">
            <div className="mb-6">
              <Typography variant="h3" color="primary" className="mb-3">
                💡 どのキャラクターを選べばいいの？
              </Typography>
              <Typography variant="body" color="secondary" className="mb-6">
                あなたの今の気持ちに合わせて、最適なAIキャラクターをお選びください
              </Typography>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-pink-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <Typography variant="small" weight="bold" color="primary" className="mb-2">疲れている時は</Typography>
                </div>
                <Typography variant="small" color="secondary" className="text-center">
                  みっちゃんの温かい包容力で<br />心を癒してもらいましょう
                </Typography>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <Typography variant="small" weight="bold" color="primary" className="mb-2">元気を出したい時は</Typography>
                </div>
                <Typography variant="small" color="secondary" className="text-center">
                  まどかさんの明るいパワーで<br />前向きな気持ちになりましょう
                </Typography>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-amber-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <Typography variant="small" weight="bold" color="primary" className="mb-2">落ち着いて話したい時は</Typography>
                </div>
                <Typography variant="small" color="secondary" className="text-center">
                  ヒデじいの深い洞察力で<br />心に響くアドバイスをもらいましょう
                </Typography>
              </div>
            </div>
            
            <div className="bg-emerald-100/50 p-4 rounded-xl border border-emerald-200">
              <Typography variant="caption" color="secondary" className="block">
                💫 もちろん、その日の気分に合わせていつでも変更できます！
              </Typography>
            </div>
          </div>
        </motion.div>
      </ResponsiveContainer>

      {/* CTA セクション */}
      <ResponsiveContainer maxWidth="lg" padding="lg" className="py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-3xl p-12 text-center text-white shadow-2xl"
        >
          <Typography variant="h2" align="center" className="text-white mb-4">
            今すぐ始めて、育児をもっと楽しく
          </Typography>
          <Typography variant="body" align="center" className="text-white mb-8">
            子育ての毎日に、小さな成長と大きな喜びを
          </Typography>
          
          <Button 
            variant="secondary"
            size="xl"
            rightIcon={<ArrowRight className="w-6 h-6" />}
            onClick={handleNavigateToAuth}
            className="text-xl py-6 px-12"
          >
            無料で今すぐ始める
          </Button>
        </motion.div>
      </ResponsiveContainer>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, TrendingUp, Users, ArrowRight, CheckCircle, Star, Sparkles } from 'lucide-react';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import TouchTarget from '@/components/ui/TouchTarget';
import { AppScreen } from '@/types';
import { useAuth, useMaintenance } from '@/lib/hooks';

interface TopPageProps {
  onNavigate: (screen: AppScreen) => void;
}

const TopPage = ({ onNavigate }: TopPageProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [currentTreeStage, setCurrentTreeStage] = useState(1);
  const [expandedCharacter, setExpandedCharacter] = useState<string | null>(null);

  const auth = useAuth();
  const maintenance = useMaintenance();

  useEffect(() => {
    setIsVisible(true);
    
    // 機能ハイライトのローテーション
    const featureInterval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 3);
    }, 5000);

    // 木の成長デモ
    const treeGrowthTimer = setTimeout(() => {
      const growthInterval = setInterval(() => {
        setCurrentTreeStage(prev => {
          const next = prev >= 6 ? 1 : prev + 1;
          return next;
        });
      }, 3000);

      return () => clearInterval(growthInterval);
    }, 2000);

    return () => {
      clearInterval(featureInterval);
      clearTimeout(treeGrowthTimer);
    };
  }, []);

  // 認証開始ハンドラ
  const handleStartAuth = async () => {
    if (maintenance.isMaintenanceMode) {
      return; // メンテナンス中は認証不可
    }

    try {
      await auth.signInWithGoogle();
      onNavigate('character-selection');
    } catch (error) {
      console.error('Authentication failed:', error);
      // エラーはauth storeに保存されているのでUIで表示
    }
  };

  // 主要機能の定義（重要度順）
  const features = [
    {
      icon: <Heart className="w-8 h-8" />,
      title: "毎日の頑張りを褒めてくれる",
      description: "育児の小さな努力も見逃さず、AIが優しく褒めて自己肯定感を高めます",
      benefit: "やる気アップ",
      color: "from-pink-400 to-rose-500",
      bgColor: "bg-pink-50"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "成長が目に見えて分かる",
      description: "あなたの育児努力が「成長の木」として可視化され、達成感が得られます",
      benefit: "継続しやすい",
      color: "from-emerald-400 to-green-500",
      bgColor: "bg-cyan-100"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "3人のAIがいつでも支える",
      description: "個性豊かなAIキャラクターが、いつでもあなたをサポート",
      benefit: "孤独感解消",
      color: "from-blue-400 to-indigo-500",
      bgColor: "bg-blue-50"
    }
  ];

  // ユーザージャーニーの説明
  const journeySteps = [
    {
      step: 1,
      title: "簡単ログイン",
      description: "Googleアカウントでワンクリックログイン",
      icon: <CheckCircle className="w-5 h-5" />
    },
    {
      step: 2,
      title: "AIキャラクター選択",
      description: "今の気分に合わせてAIを選択",
      icon: <Heart className="w-5 h-5" />
    },
    {
      step: 3,
      title: "チャット開始",
      description: "今日の育児について話してみましょう",
      icon: <Sparkles className="w-5 h-5" />
    }
  ];

  const characters = [
    {
      name: "たまさん", 
      role: "tama",
      color: "bg-pink-50 border-pink-200",
      gradientColor: "from-pink-400 to-rose-500",
      bgColor: "bg-pink-50",
      description: "優しく包み込む温かさ",
      image: "/images/icons/tamasan.png",
      personality: "母親のような温かさ",
      strength: "心に寄り添う優しさ",
      approach: "あなたの気持ちを理解し、包み込むように褒めてくれます",
      benefits: ["疲れた心を癒す", "自己肯定感向上", "温かい励まし"],
      examples: [
        "「今日も一日お疲れさま。あなたの頑張り、ちゃんと見ていますよ」",
        "「完璧じゃなくても大丈夫。そのままのあなたが素敵です」",
        "「小さなことでも、それは愛情の表れですね」"
      ]
    },
    {
      name: "まどか姉さん", 
      role: "madoka",
      color: "bg-sky-50 border-sky-200",
      gradientColor: "from-blue-400 to-indigo-500",
      bgColor: "bg-blue-50",
      description: "お姉さん的な頼もしいサポート",
      image: "/images/icons/madokanesan.png",
      personality: "頼れるお姉さん",
      strength: "前向きなエネルギー",
      approach: "明るく元気に、あなたの頑張りを全力で応援してくれます",
      benefits: ["やる気アップ", "前向き思考", "明るい気持ち"],
      examples: [
        "「すごいじゃないですか！その調子で頑張っていきましょう！」",
        "「大丈夫、あなたなら必ずできます。私が応援していますから！」",
        "「その前向きな気持ち、とても素敵です！」"
      ]
    },
    {
      name: "ヒデじい",
      role: "hide", 
      color: "bg-amber-50 border-amber-200",
      gradientColor: "from-yellow-400 to-orange-500",
      bgColor: "bg-amber-50",
      description: "人生経験豊富な温かな励まし",
      image: "/images/icons/hideji.png",
      personality: "人生の先輩",
      strength: "深い洞察力と包容力",
      approach: "長い人生経験から、あなたの成長を見守り励ましてくれます",
      benefits: ["人生の知恵", "深い理解", "穏やかな安心感"],
      examples: [
        "「その気持ちが一番大切じゃよ。人間としての成長を感じるよ」",
        "「わしの長い人生から言わせてもらうと、それは立派なことじゃ」",
        "「昔も今も、親の愛は変わらんからのう。安心するがよい」"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 relative overflow-hidden">
      {/* メンテナンス時のオーバーレイ */}
      {maintenance.isMaintenanceMode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 mx-4 max-w-md text-center">
            <Typography variant="h3" color="neutral">
              システムメンテナンス中
            </Typography>
            <Typography variant="body" color="secondary" className="mt-4">
              {maintenance.maintenanceInfo?.maintenance_message || 
               'システムの改善作業中です。しばらくお待ちください。'}
            </Typography>
            {maintenance.getEstimatedRecoveryTime() && (
              <Typography variant="caption" color="secondary" className="mt-2">
                予定復旧時刻: {maintenance.getEstimatedRecoveryTime()}
              </Typography>
            )}
          </div>
        </div>
      )}

      {/* ヒーローセクション */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  onClick={handleStartAuth}
                  loading={auth.isLoading}
                  disabled={maintenance.isMaintenanceMode}
                  leftIcon={<Heart className="w-5 h-5" />}
                >
                  {auth.isLoading ? 'ログイン中...' : '無料で始める（Google ログイン）'}
                </Button>

                {auth.error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-600 text-sm text-center"
                  >
                    {auth.error}
                  </motion.div>
                )}

                <Typography variant="caption" color="secondary" align="center">
                  ※ アカウント登録不要。Googleアカウントで簡単に始められます
                </Typography>
              </div>

              {/* 統計情報 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex items-center space-x-6 pt-4"
              >
                <div className="text-center">
                  <Typography variant="h4" color="primary">2,000+</Typography>
                  <Typography variant="small" color="secondary">利用者数</Typography>
                </div>
                <div className="text-center">
                  <Typography variant="h4" color="primary">98%</Typography>
                  <Typography variant="small" color="secondary">満足度</Typography>
                </div>
                <div className="text-center">
                  <Typography variant="h4" color="primary">365日</Typography>
                  <Typography variant="small" color="secondary">いつでも対応</Typography>
                </div>
              </motion.div>
            </motion.div>

            {/* 右側：デモ表示 */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 50 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="relative"
            >
              {/* 木の成長デモ */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl">
                <div className="text-center mb-6">
                  <Typography variant="h3" color="primary">
                    あなたの成長の木
                  </Typography>
                  <Typography variant="body" color="secondary">
                    チャットするたびに、木が成長していきます
                  </Typography>
                </div>
                
                {/* 木の画像表示エリア */}
                <div className="relative h-64 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center">
                  <motion.div
                    key={currentTreeStage}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                  >
                    Stage {currentTreeStage}
                  </motion.div>
                  
                  {/* 光る実のエフェクト */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute top-4 right-4 w-4 h-4 bg-yellow-400 rounded-full"
                  />
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5
                    }}
                    className="absolute bottom-6 left-6 w-3 h-3 bg-pink-400 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 機能説明セクション */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Typography variant="h1" color="primary">
              なぜHomebiyoriが選ばれるのか
            </Typography>
            <Typography variant="body" color="secondary" className="mt-4">
              育児を頑張るあなたを支える3つの特徴
            </Typography>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className={`${feature.bgColor} rounded-2xl p-8 text-center hover:shadow-xl transition-all duration-300 ${
                  activeFeature === index ? 'ring-4 ring-emerald-200 scale-105' : ''
                }`}
              >
                <div className={`w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center text-white`}>
                  {feature.icon}
                </div>
                <Typography variant="h3" color="primary" className="mb-4">
                  {feature.title}
                </Typography>
                <Typography variant="body" color="secondary" className="mb-4">
                  {feature.description}
                </Typography>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium">
                  <Star className="w-4 h-4 mr-1" />
                  {feature.benefit}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* 簡単3ステップセクション */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Typography variant="h1" color="primary">
              簡単3ステップで始められます
            </Typography>
          </motion.div>

          <div className="space-y-8">
            {journeySteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="flex items-center space-x-6 bg-white rounded-2xl p-6 shadow-lg"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {step.step}
                </div>
                <div className="flex-1">
                  <Typography variant="h3" color="primary" className="mb-2">
                    {step.title}
                  </Typography>
                  <Typography variant="body" color="secondary">
                    {step.description}
                  </Typography>
                </div>
                <div className="flex-shrink-0 text-emerald-500">
                  {step.icon}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Button
              variant="primary"
              size="xl"
              onClick={handleStartAuth}
              loading={auth.isLoading}
              disabled={maintenance.isMaintenanceMode}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              今すぐ無料で始める
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TopPage;
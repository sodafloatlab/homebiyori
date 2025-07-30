'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, TrendingUp, Users, ArrowRight, CheckCircle, Star, Sparkles, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import TopPageWatercolorTree from '@/components/ui/TopPageWatercolorTree';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import TouchTarget from '@/components/ui/TouchTarget';
import ResponsiveContainer from '@/components/layout/ResponsiveContainer';
import { AppScreen } from './MainApp';

interface TopPageProps {
  onNavigate: (screen: AppScreen) => void;
}

const TopPage = ({ onNavigate }: TopPageProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [currentTreeStage, setCurrentTreeStage] = useState(1);
  const [expandedCharacter, setExpandedCharacter] = useState<string | null>(null);

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
      bgColor: "bg-emerald-50"
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
                  onClick={() => onNavigate('auth')}
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
              {/* 成長の木 */}
              <div className="relative w-full max-w-lg">
                <TopPageWatercolorTree ageInDays={currentTreeStage * 100} />
                
                {/* 成長ステージ表示 */}
                <motion.div
                  key={currentTreeStage}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm z-10"
                >
                  <Typography variant="small" weight="semibold" color="primary">
                    成長段階 {currentTreeStage}/6
                  </Typography>
                </motion.div>
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
                    {feature.icon}
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
                      className="object-cover"
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
                  たまさんの温かい包容力で<br />心を癒してもらいましょう
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
                  まどか姉さんの明るいパワーで<br />前向きな気持ちになりましょう
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
            onClick={() => onNavigate('auth')}
            className="text-xl py-6 px-12"
          >
            無料で今すぐ始める
          </Button>
        </motion.div>
      </ResponsiveContainer>
    </div>
  );
};

export default TopPage;
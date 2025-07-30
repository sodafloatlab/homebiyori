'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Heart, TrendingUp, Users, Leaf } from 'lucide-react';
import Image from 'next/image';
import TopPageWatercolorTree from '@/components/ui/TopPageWatercolorTree';
import { AppScreen } from './MainApp';

interface TopPageProps {
  onNavigate: (screen: AppScreen) => void;
}

const TopPage = ({ onNavigate }: TopPageProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [currentTreeStage, setCurrentTreeStage] = useState(1);

  useEffect(() => {
    setIsVisible(true);
    
    // 機能ハイライトのローテーション
    const featureInterval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 3);
    }, 4000);

    // 木の成長デモ
    const treeGrowthTimer = setTimeout(() => {
      const growthInterval = setInterval(() => {
        setCurrentTreeStage(prev => {
          if (prev < 6) {
            const newStage = prev + 1;
            return newStage;
          } else {
            // 最後のステージ（6）に達した場合、20秒待機してから新芽（1）に戻る
            setTimeout(() => {
              setCurrentTreeStage(1);
            }, 20000);
            return prev; // 現在のステージを維持
          }
        });
      }, 3000);
      
      return () => clearInterval(growthInterval);
    }, 2000);

    return () => {
      clearInterval(featureInterval);
      clearTimeout(treeGrowthTimer);
    };
  }, []);

  const features = [
    {
      icon: <Heart className="w-7 h-7 text-rose-600" />,
      title: "頑張りを応援",
      description: "育児を頑張るあなたを温かく褒めます"
    },
    {
      icon: <TrendingUp className="w-7 h-7 text-emerald-700" />,
      title: "成長を実感",
      description: "木の成長として努力を可視化"
    },
    {
      icon: <Users className="w-7 h-7 text-amber-700" />,
      title: "AIがサポート",
      description: "AIキャラクターがいつでもあなたを応援"
    }
  ];

  const characters = [
    {
      name: "たまさん",
      role: "tama",
      color: "bg-rose-50 border-rose-200",
      description: "優しく包み込むような温かさ",
      image: "/images/icons/tamasan.png"
    },
    {
      name: "まどか姉さん", 
      role: "madoka",
      color: "bg-sky-50 border-sky-200",
      description: "お姉さん的な頼もしいサポート",
      image: "/images/icons/madokanesan.png"
    },
    {
      name: "ヒデじい",
      role: "hide", 
      color: "bg-amber-50 border-amber-200",
      description: "人生経験豊富な温かな励まし",
      image: "/images/icons/hideji.png"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 relative" style={{
      backgroundColor: '#fdfdf8',
      backgroundImage: 'linear-gradient(135deg, #f0f9f0 0%, #fefffe 35%, #f8fcf0 100%)'
    }}>
      {/* Hero Section - 60% */}
      <div className="relative overflow-hidden min-h-[55vh] flex items-center py-8">
        {/* 背景装飾 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20" style={{
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.08) 50%, transparent 100%)'
          }}></div>
          <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full opacity-15" style={{
            background: 'radial-gradient(circle, rgba(101, 163, 13, 0.12) 0%, rgba(132, 204, 22, 0.06) 50%, transparent 100%)'
          }}></div>
          
          {/* ヒーローセクション周囲の葉っぱエフェクト - 文字に被らないように配置 */}
          {[...Array(12)].map((_, i) => {
            // 左右の端に配置して中央の文字を避ける
            const isLeft = i < 6;
            const indexInSide = i % 6;
            return (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: isLeft ? `${5 + indexInSide * 8}%` : `${70 + indexInSide * 8}%`,
                  top: `${15 + indexInSide * 12}%`,
                }}
                animate={{
                  y: [0, -40, -20, 0],
                  x: [0, isLeft ? -15 : 15, 0],
                  rotate: [0, 360],
                  opacity: [0.15, 0.35, 0.25, 0.15],
                  scale: [0.9, 1.1, 1, 0.9]
                }}
                transition={{
                  duration: 7 + (i * 0.3),
                  repeat: Infinity,
                  delay: i * 0.6,
                  ease: "easeInOut"
                }}
              >
                <Leaf className="w-3 h-3 text-emerald-400 drop-shadow-sm" style={{
                  filter: 'drop-shadow(0 1px 2px rgba(34, 197, 94, 0.15))'
                }} />
              </motion.div>
            );
          })}
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* キャッチコピー */}
          <motion.div 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -30 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <motion.h1 
              className="text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 1.2, delay: 0.2 }}
            >
              <span className="text-emerald-800">育児の頑張りを</span>
              <br />
              <span className="text-emerald-600">美しい成長で実感</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl lg:text-2xl text-emerald-700 mb-8 font-medium leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 1.2, delay: 0.4 }}
            >
              毎日の子育ての努力をAIが優しく褒めて、<br className="hidden lg:block" />
              成長として記録するアプリケーション
            </motion.p>

            {/* メインCTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 1.2, delay: 0.6 }}
            >
              <motion.button 
                onClick={() => onNavigate('auth')}
                className="group relative inline-flex items-center justify-center px-10 py-4 text-lg font-semibold text-white rounded-full shadow-xl transition-all duration-300 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
                  boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3), 0 5px 10px rgba(16, 185, 129, 0.2)'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
                <Leaf className="w-5 h-5 mr-3 relative z-10 group-hover:rotate-12 transition-transform" />
                <span className="relative z-10">ほめびよりを始める</span>
                <ChevronRight className="w-5 h-5 ml-3 relative z-10 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Tree Growth Section - 独立した木のセクション */}
      <div className="py-12 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/20 to-white/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-emerald-800 mb-4">
              あなたの努力が木を育てます
            </h2>
            <p className="text-lg text-emerald-600/80 max-w-2xl mx-auto">
              毎日の子育ての頑張りを記録して、成長する木として可視化してみましょう
            </p>
          </motion.div>

          {/* 大きな木の表示エリア */}
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.0, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="w-full max-w-2xl">
              <TopPageWatercolorTree 
                ageInDays={
                  currentTreeStage === 1 ? 50 :    // tree_1.png - 芽（50日）
                  currentTreeStage === 2 ? 150 :   // tree_2.png - 小さな苗（150日）
                  currentTreeStage === 3 ? 250 :   // tree_3.png - 若木（250日）
                  currentTreeStage === 4 ? 350 :   // tree_4.png - 中木（350日）
                  currentTreeStage === 5 ? 450 :   // tree_5.png - 大木（450日）
                  550                               // tree_6.png - 完全成長（550日）
                }
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section - 20% */}
      <div className="py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/40 to-white/20"></div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-emerald-800 mb-4">
              3つの特徴
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className={`group relative p-6 rounded-2xl transition-all duration-500 cursor-pointer border ${
                  activeFeature === index 
                    ? 'bg-gradient-to-br from-white to-emerald-100 shadow-2xl border-emerald-200 scale-105' 
                    : 'bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-xl border-emerald-100/50'
                }`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                onMouseEnter={() => setActiveFeature(index)}
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-center">
                  <motion.div 
                    className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 transition-all duration-300 ${
                      activeFeature === index ? 'bg-emerald-50 scale-110 shadow-lg' : 'bg-emerald-100 group-hover:bg-emerald-50'
                    }`}
                    whileHover={{ rotate: 5 }}
                  >
                    {feature.icon}
                  </motion.div>
                  <h3 className="text-lg font-bold text-emerald-800 mb-2">{feature.title}</h3>
                  <p className="text-emerald-600/80 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Characters Section */}
      <div className="py-16 relative">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(240, 249, 240, 0.2) 0%, rgba(254, 255, 254, 0.4) 50%, rgba(248, 252, 240, 0.2) 100%)'
        }}></div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-emerald-800 mb-4">
              3人のAIキャラクター
            </h2>
            <p className="text-lg text-emerald-600/80 max-w-2xl mx-auto">
              あなたの子育てを温かく見守り、毎日褒めてくれる仲間たち
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {characters.map((character, index) => (
              <motion.div
                key={index}
                className="group relative p-6 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02, y: -5 }}
              >
                <div className="text-center">
                  <motion.div 
                    className={`inline-flex items-center justify-center w-28 h-28 rounded-full mb-4 border-2 ${character.color} group-hover:scale-105 transition-transform duration-300 shadow-sm overflow-hidden`}
                    whileHover={{ rotate: 5 }}
                  >
                    <Image
                      src={character.image}
                      alt={character.name}
                      width={88}
                      height={88}
                      className="object-cover rounded-full"
                      style={{ width: 'auto', height: 'auto' }}
                    />
                  </motion.div>
                  <h3 className="text-xl font-bold text-emerald-800 mb-2">{character.name}</h3>
                  <p className="text-emerald-600/80 text-sm leading-relaxed">{character.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA Section - 20% */}
      <div className="py-20 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #059669 0%, #047857 25%, #065f46 50%, #064e3b 75%, #042f2e 100%)'
      }}>
        {/* パターンオーバーレイ */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        
        <motion.div 
          className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <motion.h2 
            className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            今日から始めよう
          </motion.h2>
          <motion.p 
            className="text-xl lg:text-2xl text-emerald-100 mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            子育ての毎日に、小さな成長と大きな喜びを
          </motion.p>
          
          <motion.button 
            onClick={() => onNavigate('auth')}
            className="group relative inline-flex items-center justify-center px-12 py-4 text-xl font-semibold bg-white text-emerald-700 rounded-full shadow-2xl hover:shadow-white/25 transition-all duration-300"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Leaf className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform text-emerald-600" />
            ほめびよりを始める
            <ChevronRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform text-emerald-600" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default TopPage;
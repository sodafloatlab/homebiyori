'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { calculateTreeStage } from '@/lib/utils';

interface Props {
  stage?: number;
  ageInDays?: number;
  size?: 'small' | 'medium' | 'large';
  isBackground?: boolean;
  fruits?: Array<{
    id: string;
    userMessage: string;
    aiResponse: string;
    aiRole: 'mittyan' | 'madokasan' | 'hideji';
    createdAt: string;
    emotion: string;
  }>;
  onFruitClick?: (fruit: {
    id: string;
    userMessage: string;
    aiResponse: string;
    aiRole: 'mittyan' | 'madokasan' | 'hideji';
    createdAt: string;
    emotion: string;
  }) => void;
}


const WatercolorTree = ({ stage, ageInDays, size = 'medium', isBackground = false, fruits = [], onFruitClick }: Props) => {
  // stageが指定された場合はstageを使用、そうでなければageInDaysから計算
  const effectiveStage = stage || calculateTreeStage(ageInDays || 0);
  const [isClient, setIsClient] = useState(false);
  const [previousAge, setPreviousAge] = useState(ageInDays || 0);
  const [isGrowing, setIsGrowing] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  // 実際のfruitsデータを使用（背景でも実データを使用）
  const getDisplayFruits = () => {
    // 背景でも実際の表示でも、常に実際のfruitsデータを使用
    return fruits;
  };

  // 成長したときのアニメーションを検知
  useEffect(() => {
    const currentAge = ageInDays || 0;
    if (previousAge !== currentAge) {
      // 成長段階が変わった場合
      const prevStage = getGrowthStage(previousAge);
      const currentStage = getGrowthStage(currentAge);
      
      if (prevStage !== currentStage) {
        setIsGrowing(true);
        // 1.5秒後にアニメーション終了
        setTimeout(() => setIsGrowing(false), 1500);
      }
      
      setPreviousAge(currentAge);
    }
  }, [ageInDays, previousAge]);

  // 成長段階を数値で返す関数（6段階）- utils関数を使用
  const getGrowthStage = (days: number) => {
    return calculateTreeStage(days);
  };

  // 画像パスを決定する関数（7段階: 0-6）
  const getTreeImage = () => {
    const currentStage = effectiveStage;
    return `/images/trees/tree_${currentStage}.png`;
  };


  // クライアントサイドでない場合はSSRプレースホルダーを表示
  if (!isClient) {
    return (
      <div className={`relative w-full h-[600px] overflow-hidden ${
        isBackground 
          ? '' 
          : 'rounded-2xl bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50 shadow-lg'
      }`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto bg-emerald-100 rounded-lg animate-pulse mb-4 opacity-50"></div>
            <p className="text-emerald-600 text-sm opacity-60">木を育てています...</p>
          </div>
        </div>
      </div>
    );
  }

  // 成長段階に応じた木のサイズを決定（7段階: 0-6）
  const getTreeSize = () => {
    switch (effectiveStage) {
      case 0: return { width: 200, height: 200 };    // tree_0.png - 土だけ
      case 1: return { width: 240, height: 240 };    // tree_1.png - 芽
      case 2: return { width: 320, height: 320 };    // tree_2.png - 小さな苗
      case 3: return { width: 420, height: 420 };    // tree_3.png - 若木
      case 4: return { width: 520, height: 520 };    // tree_4.png - 中木
      case 5: return { width: 680, height: 680 };    // tree_5.png - 大木
      case 6: return { width: 800, height: 800 };    // tree_6.png - 完全成長
      default: return { width: 200, height: 200 };
    }
  };

  // コンテナの高さは固定（最大サイズに対応、余白を削減）
  const getContainerHeight = () => {
    return 'h-[600px]'; // 固定サイズ - 最大の木（800px）にフィット
  };

  // ほめの実の浮遊エリアを成長段階に応じて定義（7段階: 0-6）
  const getBubbleAreas = () => {
    switch (effectiveStage) {
      case 0: return { centerX: 50, centerY: 60, radiusX: 10, radiusY: 5 };   // 土だけ（実なし推奨）
      case 1: return { centerX: 50, centerY: 45, radiusX: 15, radiusY: 10 };  // 芽
      case 2: return { centerX: 50, centerY: 40, radiusX: 20, radiusY: 15 };  // 小さな苗
      case 3: return { centerX: 50, centerY: 35, radiusX: 25, radiusY: 20 };  // 若木
      case 4: return { centerX: 50, centerY: 32, radiusX: 32, radiusY: 28 };  // 中木
      case 5: return { centerX: 50, centerY: 25, radiusX: 50, radiusY: 40 };  // 大木
      case 6: return { centerX: 50, centerY: 20, radiusX: 60, radiusY: 50 };  // 完全成長
      default: return { centerX: 50, centerY: 60, radiusX: 10, radiusY: 5 };
    }
  };

  // ほめの実の浮遊位置を決定（木の周りをふわふわ）
  const getBubblePosition = (index: number) => {
    const area = getBubbleAreas();
    
    // インデックスベースで軌道を決定（固定だが自然な配置）
    const angle = (index * 73) % 360;
    const radiusRatio = 0.6 + ((index * 17) % 40) / 100;
    const heightOffset = ((index * 23) % 20) - 10;
    
    const x = area.centerX + Math.cos(angle * Math.PI / 180) * area.radiusX * radiusRatio;
    const y = area.centerY + Math.sin(angle * Math.PI / 180) * area.radiusY * radiusRatio + heightOffset;
    
    return { 
      x: Math.max(10, Math.min(90, x)), 
      y: Math.max(10, Math.min(80, y))
    };
  };

  // AIロールに応じた色設定を取得
  const getFruitColors = (aiRole: string) => {
    switch (aiRole) {
      case 'mittyan':
        return {
          gradient: 'radial-gradient(circle, rgba(255, 182, 193, 0.8), rgba(255, 148, 179, 0.7), rgba(255, 105, 180, 0.6))',
          shadow: '0 0 15px rgba(255, 182, 193, 0.6), 0 0 25px rgba(255, 182, 193, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.4)'
        };
      case 'madokasan':
        return {
          gradient: 'radial-gradient(circle, rgba(135, 206, 235, 0.8), rgba(103, 171, 225, 0.7), rgba(70, 130, 180, 0.6))',
          shadow: '0 0 15px rgba(135, 206, 235, 0.6), 0 0 25px rgba(135, 206, 235, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.4)'
        };
      case 'hideji':
        return {
          gradient: 'radial-gradient(circle, rgba(255, 215, 0, 0.8), rgba(255, 190, 83, 0.7), rgba(255, 165, 0, 0.6))',
          shadow: '0 0 15px rgba(255, 215, 0, 0.6), 0 0 25px rgba(255, 215, 0, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.4)'
        };
      default:
        return {
          gradient: 'radial-gradient(circle, rgba(255, 215, 0, 0.8), rgba(255, 190, 83, 0.7), rgba(255, 165, 0, 0.6))',
          shadow: '0 0 15px rgba(255, 215, 0, 0.6), 0 0 25px rgba(255, 215, 0, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.4)'
        };
    }
  };

  const imagePath = getTreeImage();
  const treeSize = getTreeSize();
  const displayFruits = getDisplayFruits();

  return (
    <div className={`relative w-full ${getContainerHeight()} overflow-hidden ${
      isBackground 
        ? '' 
        : 'rounded-2xl bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50 shadow-lg'
    }`}>
      
      
      {/* 水彩風の背景効果 */}
      {!isBackground && (
        <div className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent opacity-70"></div>
      )}
      
      {/* 中央の木の画像 - 成長時のみアニメーション */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div 
          className="relative"
          animate={isGrowing ? {
            scale: [0.8, 1.1, 1],
            rotate: [0, 2, 0],
            y: [0, -10, 0]
          } : {
            scale: 1,
            rotate: 0,
            y: 0
          }}
          transition={isGrowing ? {
            duration: 1.5,
            ease: "easeOut",
            times: [0, 0.6, 1]
          } : {
            duration: 0.5,
            ease: "easeInOut"
          }}
        >
          <Image
            src={imagePath}
            alt="成長する木"
            width={treeSize.width}
            height={treeSize.height}
            className="object-contain drop-shadow-2xl"
            style={{ 
              width: `${treeSize.width}px`,
              height: `${treeSize.height}px`,
              filter: 'drop-shadow(0 25px 25px rgba(0, 0, 0, 0.15))'
            }}
          />
          
          {/* 成長時のエフェクト */}
          {isGrowing && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%)',
                pointerEvents: 'none'
              }}
            />
          )}
        </motion.div>
      </div>

      {/* ほめの実の浮遊アニメーション */}
      {displayFruits.map((fruit, index) => {
        const position = getBubblePosition(index);
        const floatDelay = index * 0.5;
        const colors = getFruitColors(fruit.aiRole);
        
        const handleFruitClick = () => {
          if (onFruitClick && !isBackground) {
            onFruitClick(fruit);
          }
        };
        
        return (
          <motion.div
            key={fruit.id}
            className={`absolute ${!isBackground ? 'cursor-pointer' : ''}`}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              // ふわふわと浮遊するアニメーション
              x: [0, 10, -5, 8, 0],
              rotate: [0, 5, -3, 2, 0]
            }}
            transition={{ 
              scale: { delay: 0.8 + index * 0.2, duration: 0.8 },
              opacity: { delay: 0.8 + index * 0.2, duration: 0.8 },
              y: { delay: 0.8 + index * 0.2, duration: 0.8 },
              x: { 
                delay: floatDelay,
                duration: 4 + (index % 3), 
                repeat: Infinity, 
                ease: "easeInOut" 
              },
              rotate: { 
                delay: floatDelay,
                duration: 3 + (index % 3), 
                repeat: Infinity, 
                ease: "easeInOut" 
              }
            }}
            whileHover={!isBackground ? { scale: 1.3, y: -5 } : {}}
            onClick={handleFruitClick}
          >
            <motion.div
              className="absolute w-5 h-5 cursor-pointer transition-all duration-300 ease-in-out hover:scale-110 hover:brightness-120"
              style={{
                animationDelay: `${index * 0.5}s`
              }}
              animate={{
                y: [0, -15, -8, 0],
                opacity: [0.8, 1, 0.9, 0.8],
                filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1.1)', 'brightness(1)']
              }}
              transition={{ 
                y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                filter: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
              whileHover={{ scale: 1.1, filter: "brightness(1.2)" }}
            >
              <div
                className="w-full h-full rounded-full relative overflow-hidden"
                style={{
                  background: colors.gradient,
                  boxShadow: colors.shadow,
                  filter: 'blur(0.2px)'
                }}
              >
                {/* 内側のハイライト */}
                <div 
                  className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.2), transparent)'
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        );
      })}
      
      
    </div>
  );
};

export default WatercolorTree;
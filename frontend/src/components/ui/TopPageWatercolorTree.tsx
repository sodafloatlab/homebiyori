'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  ageInDays: number;
}

const TopPageWatercolorTree = ({ ageInDays }: Props) => {
  const [isClient, setIsClient] = useState(false);
  const [previousAge, setPreviousAge] = useState(ageInDays);
  const [isGrowing, setIsGrowing] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 成長段階に応じた実の数を決定（0~5の6段階、芽から実表示）
  const getFruitCount = () => {
    if (ageInDays <= 0) return 0;       // stage 0: 土だけ - 実なし
    if (ageInDays <= 100) return 1;     // stage 1: 芽 - 1個（新規追加）
    if (ageInDays <= 200) return 3;     // stage 2: 小さな苗 - 3個（+1）
    if (ageInDays <= 300) return 6;     // stage 3: 若木 - 6個（+1）
    if (ageInDays <= 400) return 10;    // stage 4: 中木 - 10個（+2）
    return 15;                          // stage 5: 大木 - 15個（+3）
  };

  // トップページ用のデモ実データを生成
  const generateTopPageFruits = () => {
    const fruitCount = getFruitCount();
    const fruits = [];
    
    for (let i = 0; i < fruitCount; i++) {
      const aiRoles: ('mittyan' | 'madokasan' | 'hideji')[] = ['mittyan', 'madokasan', 'hideji'];
      fruits.push({
        id: `toppage-fruit-${i}`,
        aiRole: aiRoles[i % 3],
        userMessage: `頑張っている育児の一コマ${i + 1}`,
        aiResponse: `素敵な育児をされていますね${i + 1}`,
        createdAt: new Date().toLocaleDateString(),
        emotion: ['嬉しい', '愛情', '疲れ'][i % 3]
      });
    }
    
    return fruits;
  };

  // 成長したときのアニメーションを検知
  useEffect(() => {
    if (previousAge !== ageInDays) {
      setIsGrowing(true);
      const timer = setTimeout(() => {
        setIsGrowing(false);
      }, 2000);
      setPreviousAge(ageInDays);
      return () => clearTimeout(timer);
    }
  }, [ageInDays, previousAge]);

  // 成長段階を数値で返す関数（6段階：0-5）
  const getGrowthStage = (days: number) => {
    if (days <= 0) return 0;    // 土だけ
    if (days <= 100) return 1;  // 芽
    if (days <= 200) return 2;  // 小さな苗
    if (days <= 300) return 3;  // 若木
    if (days <= 400) return 4;  // 中木
    return 5;                   // 大木
  };

  // 画像パスを決定する関数（6段階：0-5）
  const getTreeImage = () => {
    if (ageInDays <= 0) return '/images/trees/tree_0.png';    // 土だけ
    if (ageInDays <= 100) return '/images/trees/tree_1.png';  // 芽
    if (ageInDays <= 200) return '/images/trees/tree_2.png';  // 小さな苗
    if (ageInDays <= 300) return '/images/trees/tree_3.png';  // 若木
    if (ageInDays <= 400) return '/images/trees/tree_4.png';  // 中木
    return '/images/trees/tree_5.png';                        // 大木
  };


  // SSR時の初期ローディング状態
  if (!isClient) {
    return (
      <div className="relative w-full h-[600px] overflow-hidden rounded-2xl bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50 shadow-lg flex items-center justify-center">
        <div className="text-emerald-600 text-lg font-medium">
          木を育てています...
        </div>
      </div>
    );
  }

  // 成長段階に応じた木のサイズを決定（6段階：0-5）
  const getTreeSize = () => {
    if (ageInDays <= 0) return { width: 200, height: 200 };      // tree_0.png - 土だけ
    if (ageInDays <= 100) return { width: 240, height: 240 };    // tree_1.png - 芽
    if (ageInDays <= 200) return { width: 320, height: 320 };    // tree_2.png - 小さな苗
    if (ageInDays <= 300) return { width: 420, height: 420 };    // tree_3.png - 若木
    if (ageInDays <= 400) return { width: 520, height: 520 };    // tree_4.png - 中木
    return { width: 540, height: 540 };                          // tree_5.png - 大木（少し縮小）
  };

  // コンテナの高さは固定（最大サイズに対応、余白を削減）
  const getContainerHeight = () => {
    return 'h-[700px]'; // 固定サイズ - 拡大表示に対応
  };

  // 成長段階に応じた拡大倍率を決定（6段階：0-5）
  const getScaleFactor = () => {
    if (ageInDays <= 400) return 1;    // tree_0-4: 通常サイズ
    return 1.05;                       // tree_5: 1.05倍拡大（縮小）
  };

  // ほめの実の浮遊エリアを成長段階に応じて定義（6段階：0-5）
  const getBubbleAreas = () => {
    if (ageInDays <= 0) {
      return { centerX: 50, centerY: 50, radiusX: 0, radiusY: 0 };    // 土だけ - 実なし
    } else if (ageInDays <= 100) {
      return { centerX: 50, centerY: 42, radiusX: 12, radiusY: 8 };   // 芽 - 1個用に調整
    } else if (ageInDays <= 200) {
      return { centerX: 50, centerY: 38, radiusX: 22, radiusY: 16 };  // 小さな苗 - 3個用に調整
    } else if (ageInDays <= 300) {
      return { centerX: 50, centerY: 34, radiusX: 28, radiusY: 22 };  // 若木 - 6個用に調整
    } else if (ageInDays <= 400) {
      return { centerX: 50, centerY: 30, radiusX: 35, radiusY: 30 };  // 中木 - 10個用に調整
    } else {
      return { centerX: 50, centerY: 26, radiusX: 48, radiusY: 38 };  // 大木 - 15個用に調整
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
  const scaleFactor = getScaleFactor();
  const topPageFruits = generateTopPageFruits();

  return (
    <motion.div 
      className={`relative w-full ${getContainerHeight()} overflow-hidden rounded-2xl bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50 shadow-lg`}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      
      {/* 水彩風の背景効果 */}
      <div className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent opacity-70"></div>
      
      {/* 中央の木の画像 - 成長時のみアニメーション */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div 
          className="relative"
          key={`tree-${ageInDays}`}
          initial={{ opacity: 0, scale: 0.95 * scaleFactor, y: 10 }}
          animate={{ 
            opacity: 1, 
            scale: isGrowing ? 
              [0.95 * scaleFactor, 1.05 * scaleFactor, 1 * scaleFactor] : 
              1 * scaleFactor, 
            y: isGrowing ? [10, -5, 0] : 0,
            rotate: isGrowing ? [0, 1, 0] : 0
          }}
          transition={{ 
            duration: isGrowing ? 1.5 : 1, 
            ease: "easeOut",
            delay: isGrowing ? 0 : 0.2
          }}
        >
          <Image
            src={imagePath}
            alt={`育児の木 - 成長段階${getGrowthStage(ageInDays)}`}
            width={treeSize.width}
            height={treeSize.height}
            className="object-contain filter drop-shadow-lg"
            priority
            onError={(e) => {
              console.error('🚨 Image load error:', imagePath);
              // フォールバック画像を設定
              (e.target as HTMLImageElement).src = '/images/trees/tree_1.png';
            }}
          />
          
          {/* 成長時のエフェクト */}
          {isGrowing && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 50%, transparent 100%)',
                filter: 'blur(8px)'
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: [0, 0.6, 0] }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          )}
        </motion.div>
      </div>

      {/* ほめの実の浮遊アニメーション */}
      {topPageFruits.map((fruit, index) => {
        const position = getBubblePosition(index);
        const floatDelay = index * 0.5;
        const colors = getFruitColors(fruit.aiRole);
        
        return (
          <motion.div
            key={fruit.id}
            className="absolute"
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
            whileHover={{ scale: 1.2, y: -3 }}
          >
            <motion.div
              className="absolute w-5 h-5 transition-all duration-300 ease-in-out hover:scale-110 hover:brightness-120"
              style={{
                animationDelay: `${index * 0.5}s`
              }}
            >
              <div
                className="w-full h-full rounded-full opacity-90"
                style={{
                  background: colors.gradient,
                  boxShadow: colors.shadow
                }}
              />
              
              {/* 内部の光る効果 */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.3) 40%, transparent 70%)'
                }}
                animate={{
                  opacity: [0.3, 0.8, 0.3],
                  scale: [0.8, 1.1, 0.8]
                }}
                transition={{
                  duration: 2 + (index % 3) * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.3
                }}
              />
            </motion.div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default TopPageWatercolorTree;
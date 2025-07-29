'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  ageInDays: number;
}

const WatercolorTree = ({ ageInDays }: Props) => {
  const [isClient, setIsClient] = useState(false);
  const [previousAge, setPreviousAge] = useState(ageInDays);
  const [isGrowing, setIsGrowing] = useState(false);

  useEffect(() => {
    console.log('WatercolorTree useEffect triggered');
    setIsClient(true);
  }, []);

  // 成長段階に応じた実の数を決定
  const getFruitCount = () => {
    if (ageInDays <= 7) return 0;       // 芽 - 実なし
    if (ageInDays <= 30) return 1;      // 小さな苗 - 1個
    if (ageInDays <= 90) return 3;      // 若木 - 3個
    if (ageInDays <= 180) return 6;     // 中木 - 6個
    if (ageInDays <= 365) return 10;    // 大木 - 10個
    return 15;                          // 完全成長 - 15個
  };

  // デモ用の実データを生成
  const generateDemoFruits = () => {
    const fruitCount = getFruitCount();
    const fruits = [];
    
    for (let i = 0; i < fruitCount; i++) {
      const aiRoles = ['たまさん', 'まどか姉さん', 'ヒデじい'];
      fruits.push({
        id: `demo-fruit-${i}`,
        x: 0, // getBubblePositionで計算される
        y: 0, // getBubblePositionで計算される
        type: i % 2 === 0 ? 'encouragement' : 'reflection',
        aiRole: aiRoles[i % 3],
        message: `デモメッセージ${i + 1}`,
        createdAt: new Date().toISOString()
      });
    }
    
    return fruits;
  };

  // 成長したときのアニメーションを検知
  useEffect(() => {
    if (previousAge !== ageInDays) {
      // 成長段階が変わった場合
      const prevStage = getGrowthStage(previousAge);
      const currentStage = getGrowthStage(ageInDays);
      
      if (prevStage !== currentStage) {
        setIsGrowing(true);
        // 1.5秒後にアニメーション終了
        setTimeout(() => setIsGrowing(false), 1500);
      }
      
      setPreviousAge(ageInDays);
    }
  }, [ageInDays, previousAge]);

  // 成長段階を数値で返す関数
  const getGrowthStage = (days: number) => {
    if (days <= 7) return 1;
    if (days <= 30) return 2;
    if (days <= 90) return 3;
    if (days <= 180) return 4;
    if (days <= 365) return 5;
    return 6;
  };

  // 画像パスを決定する関数
  const getTreeImage = () => {
    if (ageInDays <= 7) return '/images/trees/tree_1.png';
    if (ageInDays <= 30) return '/images/trees/tree_2.png';
    if (ageInDays <= 90) return '/images/trees/tree_3.png';
    if (ageInDays <= 180) return '/images/trees/tree_4.png';
    if (ageInDays <= 365) return '/images/trees/tree_5.png';
    return '/images/trees/tree_6.png';
  };

  console.log('🌳 WatercolorTree RENDER:');
  console.log('  - isClient:', isClient);
  console.log('  - ageInDays:', ageInDays);
  console.log('  - imagePath:', getTreeImage());
  console.log('  - will show SSR placeholder:', !isClient);

  // クライアントサイドでない場合はSSRプレースホルダーを表示
  if (!isClient) {
    return (
      <div className="relative w-full h-[400px] rounded-2xl overflow-hidden bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50 shadow-lg border-4 border-orange-500">
        {/* SSRデバッグ情報 */}
        <div className="absolute top-2 left-2 z-50 bg-orange-500 text-white text-xs p-2">
          SSR PLACEHOLDER<br/>
          ageInDays: {ageInDays}<br/>
          imagePath: {getTreeImage()}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg animate-pulse mb-4"></div>
            <p className="text-gray-500 text-sm">木を育てています... (SSR)</p>
          </div>
        </div>
      </div>
    );
  }

  // 成長段階に応じた木のサイズを決定（6段階すべてを使用、最後の2枚はさらに大きく）
  const getTreeSize = () => {
    if (ageInDays <= 7) return { width: 240, height: 240 };      // tree_1.png - 芽
    if (ageInDays <= 30) return { width: 320, height: 320 };     // tree_2.png - 小さな苗
    if (ageInDays <= 90) return { width: 420, height: 420 };     // tree_3.png - 若木
    if (ageInDays <= 180) return { width: 520, height: 520 };    // tree_4.png - 中木
    if (ageInDays <= 365) return { width: 680, height: 680 };    // tree_5.png - 大木（特に大きく）
    return { width: 800, height: 800 };                          // tree_6.png - 完全成長（最大）
  };

  // コンテナの高さは固定（最大サイズに対応、余白を削減）
  const getContainerHeight = () => {
    return 'h-[600px]'; // 固定サイズ - 最大の木（800px）にフィット
  };

  // シャボン玉の浮遊エリアを成長段階に応じて定義
  const getBubbleAreas = () => {
    if (ageInDays <= 7) {
      return { centerX: 50, centerY: 45, radiusX: 15, radiusY: 10 };
    } else if (ageInDays <= 30) {
      return { centerX: 50, centerY: 40, radiusX: 20, radiusY: 15 };
    } else if (ageInDays <= 90) {
      return { centerX: 50, centerY: 35, radiusX: 25, radiusY: 20 };
    } else if (ageInDays <= 180) {
      return { centerX: 50, centerY: 32, radiusX: 32, radiusY: 28 };
    } else if (ageInDays <= 365) {
      return { centerX: 50, centerY: 25, radiusX: 50, radiusY: 40 };
    } else {
      return { centerX: 50, centerY: 20, radiusX: 60, radiusY: 50 };
    }
  };

  // シャボン玉の浮遊位置を決定（木の周りをふわふわ）
  const getBubblePosition = (fruit: any) => {
    const area = getBubbleAreas();
    
    // IDベースで軌道を決定（固定だが自然な配置）
    const angle = (parseInt(fruit.id.split('-')[2]) * 73) % 360;
    const radiusRatio = 0.6 + ((parseInt(fruit.id.split('-')[2]) * 17) % 40) / 100;
    const heightOffset = ((parseInt(fruit.id.split('-')[2]) * 23) % 20) - 10;
    
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
      case 'たまさん':
        return {
          gradient: 'radial-gradient(circle, rgba(255, 182, 193, 0.8), rgba(255, 148, 179, 0.7), rgba(255, 105, 180, 0.6))',
          shadow: '0 0 15px rgba(255, 182, 193, 0.6), 0 0 25px rgba(255, 182, 193, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.4)'
        };
      case 'まどか姉さん':
        return {
          gradient: 'radial-gradient(circle, rgba(135, 206, 235, 0.8), rgba(103, 171, 225, 0.7), rgba(70, 130, 180, 0.6))',
          shadow: '0 0 15px rgba(135, 206, 235, 0.6), 0 0 25px rgba(135, 206, 235, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.4)'
        };
      case 'ヒデじい':
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
  const demoFruits = generateDemoFruits();

  return (
    <div className={`relative w-full ${getContainerHeight()} rounded-2xl overflow-hidden bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50 shadow-lg`}>
      
      
      {/* 水彩風の背景効果 */}
      <div className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent opacity-70"></div>
      
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

      {/* シャボン玉のような浮遊する実 */}
      {demoFruits.map((fruit, index) => {
        const position = getBubblePosition(fruit);
        const floatDelay = index * 0.5;
        const colors = getFruitColors(fruit.aiRole);
        return (
          <motion.div
            key={fruit.id}
            className="absolute cursor-pointer"
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
            whileHover={{ scale: 1.3, y: -5 }}
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
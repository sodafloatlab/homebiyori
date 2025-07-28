'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface Fruit {
  id: string;
  x: number;
  y: number;
  type: 'encouragement' | 'reflection';
  aiRole: string;
  message: string;
  createdAt: string;
  isGlowing: boolean;
}

interface Props {
  ageInDays: number;
  fruits: Fruit[];
  childrenNames: string[];
  onFruitClick?: (fruit: Fruit, event?: MouseEvent) => void;
  onTreeShadeClick?: () => void;
}

const WatercolorTree = ({ ageInDays, fruits, childrenNames, onFruitClick, onTreeShadeClick }: Props) => {
  // 成長段階に応じて木の画像を選択（生後期間ベース）
  const getTreeImage = () => {
    if (ageInDays <= 7) return '/images/trees/tree_1.png';    // 生後1週間まで - 芽
    if (ageInDays <= 30) return '/images/trees/tree_2.png';   // 生後1ヶ月まで - 小さな苗
    if (ageInDays <= 90) return '/images/trees/tree_3.png';   // 生後3ヶ月まで - 若木
    if (ageInDays <= 180) return '/images/trees/tree_4.png';  // 生後半年まで - 中木
    if (ageInDays <= 365) return '/images/trees/tree_5.png';  // 生後1年まで - 大木
    return '/images/trees/tree_6.png';                        // 生後3年以降 - 完全成長
  };

  // 成長段階に応じて木の画像サイズを決定
  const getTreeSize = () => {
    if (ageInDays <= 7) return { width: 'w-64', height: 'h-64', minSize: '256px' };      // 256px - 芽
    if (ageInDays <= 30) return { width: 'w-72', height: 'h-72', minSize: '288px' };     // 288px - 小さな苗
    if (ageInDays <= 90) return { width: 'w-80', height: 'h-80', minSize: '320px' };     // 320px - 若木
    if (ageInDays <= 180) return { width: 'w-96', height: 'h-96', minSize: '384px' };    // 384px - 中木
    if (ageInDays <= 365) return { width: 'w-[550px]', height: 'h-[550px]', minSize: '550px' }; // 550px - 大木（大幅拡大）
    return { width: 'w-[700px]', height: 'h-[700px]', minSize: '700px' };                // 700px - 完全成長（非常に大きく）
  };

  // シャボン玉の浮遊エリアを成長段階に応じて定義
  const getBubbleAreas = () => {
    if (ageInDays <= 7) {
      // 生後1週間まで - 芽：とても小さな範囲
      return {
        centerX: 50,
        centerY: 45,
        radiusX: 15,
        radiusY: 10
      };
    } else if (ageInDays <= 30) {
      // 生後1ヶ月まで - 小さな苗：小さな範囲
      return {
        centerX: 50,
        centerY: 40,
        radiusX: 20,
        radiusY: 15
      };
    } else if (ageInDays <= 90) {
      // 生後3ヶ月まで - 若木：中程度の範囲
      return {
        centerX: 50,
        centerY: 35,
        radiusX: 25,
        radiusY: 20
      };
    } else if (ageInDays <= 180) {
      // 生後半年まで - 中木：やや広い範囲
      return {
        centerX: 50,
        centerY: 32,
        radiusX: 32,
        radiusY: 28
      };
    } else if (ageInDays <= 365) {
      // 生後1年まで - 大木：非常に広い範囲
      return {
        centerX: 50,
        centerY: 25,
        radiusX: 50,
        radiusY: 40
      };
    } else {
      // 生後3年以降 - 完全成長：最大範囲
      return {
        centerX: 50,
        centerY: 20,
        radiusX: 60,
        radiusY: 50
      };
    }
  };

  // シャボン玉の浮遊位置を決定（木の周りをふわふわ）
  const getBubblePosition = (fruit: Fruit) => {
    const area = getBubbleAreas();
    
    // IDベースで軌道を決定（固定だが自然な配置）
    const angle = (parseInt(fruit.id) * 73) % 360;
    const radiusRatio = 0.6 + ((parseInt(fruit.id) * 17) % 40) / 100; // 0.6-1.0の範囲
    const heightOffset = ((parseInt(fruit.id) * 23) % 20) - 10; // -10 to +10のランダム高さ
    
    const x = area.centerX + Math.cos(angle * Math.PI / 180) * area.radiusX * radiusRatio;
    const y = area.centerY + Math.sin(angle * Math.PI / 180) * area.radiusY * radiusRatio + heightOffset;
    
    // 画面境界内に制限
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

  // コンテナの高さも成長に応じて調整
  const getContainerHeight = () => {
    if (ageInDays <= 7) return 'h-[400px]';     // 400px - 芽
    if (ageInDays <= 30) return 'h-[450px]';    // 450px - 小さな苗
    if (ageInDays <= 90) return 'h-[500px]';    // 500px - 若木
    if (ageInDays <= 180) return 'h-[550px]';   // 550px - 中木
    if (ageInDays <= 365) return 'h-[700px]';   // 700px - 大木（大幅拡大）
    return 'h-[800px]';                         // 800px - 完全成長（非常に高く）
  };

  return (
    <div className={`relative w-full ${getContainerHeight()} rounded-2xl overflow-hidden bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50 shadow-lg`}>
      
      {/* 木の上部メッセージ */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-sm border border-green-100">
        <h3 className="font-noto-sans-jp text-sm font-bold text-green-700 text-center">木は今日も静かに育っています</h3>
        <p className="text-xs text-gray-600 text-center mt-1">
          あなたの育児の頑張りが小さな実になっていきます
        </p>
      </div>
      
      {/* 実の数表示（右上） */}
      <motion.div 
        className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-green-100/50"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <div className="flex items-center space-x-2">
          <div className="text-lg">✨</div>
          <div className="font-noto-sans-jp text-sm font-bold text-green-700">{fruits.length} 個の実</div>
        </div>
      </motion.div>
      
      {/* 水彩風の背景効果 */}
      <div className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent opacity-70"></div>
      
      {/* メイン木の画像（成長に応じてサイズ変化） */}
      <div className="absolute inset-0 flex items-end justify-center pb-4">
        <motion.div
          key={getTreeImage()}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className={`relative ${getTreeSize().width} ${getTreeSize().height}`}
          style={{ 
            minHeight: getTreeSize().minSize, 
            minWidth: getTreeSize().minSize 
          }}
        >
          <Image
            src={getTreeImage()}
            alt="成長する木"
            fill
            className="object-contain drop-shadow-lg"
            priority
          />
        </motion.div>
      </div>

      {/* シャボン玉のような浮遊する実 */}
      {fruits.map((fruit, index) => {
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
                duration: 4 + Math.random() * 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              },
              rotate: { 
                delay: floatDelay,
                duration: 3 + Math.random() * 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }
            }}
            whileHover={{ scale: 1.3, y: -5 }}
            onClick={(e) => onFruitClick?.(fruit, e.nativeEvent)}
          >
            {fruit.isGlowing ? (
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
            ) : (
              <motion.div
                className="absolute w-5 h-5 cursor-pointer transition-all duration-300 ease-in-out hover:scale-110 hover:brightness-120"
                style={{
                  animationDelay: `${index * 0.3}s`
                }}
                animate={{
                  y: [0, -15, -8, 0],
                  opacity: [0.8, 1, 0.9, 0.8],
                  filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1.1)', 'brightness(1)']
                }}
                transition={{ 
                  y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                  opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  filter: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                whileHover={{ scale: 1.1, y: -3 }}
              >
                <div 
                  className="w-full h-full rounded-full flex items-center justify-center text-sm relative overflow-hidden"
                  style={{
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8), rgba(245, 248, 252, 0.7))',
                    boxShadow: '0 0 12px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.2), inset 0 1px 3px rgba(255, 255, 255, 0.6)',
                    filter: 'blur(0.3px)'
                  }}
                >
                  {/* 内側のハイライト */}
                  <div 
                    className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4), transparent)'
                    }}
                  />
                  <span className="relative z-10 opacity-90">✨</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}


      {/* 風と木の葉の演出 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* 舞い散る木の葉 */}
        {[...Array(12)].map((_, i) => {
          const leafTypes = ['🍃', '🍂', '🌿'];
          const leafType = leafTypes[i % leafTypes.length];
          const startX = Math.random() * 100;
          const startY = -10;
          const endX = startX + (Math.random() - 0.5) * 40;
          const endY = 110;
          const duration = 8 + Math.random() * 6;
          const delay = Math.random() * 10;
          
          return (
            <motion.div
              key={i}
              className="absolute text-lg"
              style={{
                left: `${startX}%`,
                top: `${startY}%`,
              }}
              animate={{
                x: [0, (endX - startX) + '%'],
                y: [0, (endY - startY) + '%'],
                rotate: [0, 360 + Math.random() * 720],
                scale: [0.8, 1, 0.6],
                opacity: [0, 0.8, 0.6, 0],
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                delay: delay,
                ease: "easeInOut",
                times: [0, 0.2, 0.8, 1],
              }}
            >
              {leafType}
            </motion.div>
          );
        })}
        
        {/* 風の軌跡（見やすい粒子） */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`wind-${i}`}
            className="absolute w-1.5 h-1.5 rounded-full bg-blue-300/70 shadow-sm"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${20 + Math.random() * 60}%`,
            }}
            animate={{
              x: [0, '200px', '400px'],
              y: [0, `${(Math.random() - 0.5) * 100}px`, `${(Math.random() - 0.5) * 200}px`],
              scale: [0, 1, 0],
              opacity: [0, 0.7, 0],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeOut",
            }}
          />
        ))}
        
        {/* 光る花びら */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`petal-${i}`}
            className="absolute w-2 h-2 rounded-full bg-pink-200/60"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${10 + Math.random() * 30}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 0.6, 0],
              y: [0, '50px', '100px'],
              x: [0, `${(Math.random() - 0.5) * 60}px`],
              rotate: [0, 180],
            }}
            transition={{
              duration: 5 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>



    </div>
  );
};

export default WatercolorTree;
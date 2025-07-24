'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface Fruit {
  id: string;
  x: number;
  y: number;
  type: 'encouragement' | 'reflection';
  aiRole: 'たまさん' | 'まどか姉さん' | 'ヒデじい';
  message: string;
  createdAt: string;
  isGlowing: boolean;
}

interface Props {
  ageInDays: number;
  fruits: Fruit[];
  childrenNames: string[];
  onFruitClick?: (fruit: Fruit) => void;
}

const WatercolorTree = ({ ageInDays, fruits, childrenNames, onFruitClick }: Props) => {
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
            onClick={() => onFruitClick?.(fruit)}
          >
            {fruit.isGlowing ? (
              <motion.div
                className="relative w-8 h-8 rounded-full cursor-pointer"
                style={{
                  background: `radial-gradient(circle at 30% 30%, 
                    rgba(255, 255, 255, 0.8) 0%, 
                    ${fruit.type === 'encouragement' ? 'rgba(255, 215, 0, 0.7)' : 'rgba(135, 206, 235, 0.7)'} 40%, 
                    ${fruit.type === 'encouragement' ? 'rgba(255, 165, 0, 0.9)' : 'rgba(70, 130, 180, 0.9)'} 100%)`,
                  boxShadow: `0 4px 15px ${fruit.type === 'encouragement' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(135, 206, 235, 0.4)'}`,
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
                animate={{
                  // シャボン玉のような光る効果
                  boxShadow: [
                    `0 4px 15px ${fruit.type === 'encouragement' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(135, 206, 235, 0.4)'}`,
                    `0 6px 25px ${fruit.type === 'encouragement' ? 'rgba(255, 215, 0, 0.6)' : 'rgba(135, 206, 235, 0.6)'}`,
                    `0 4px 15px ${fruit.type === 'encouragement' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(135, 206, 235, 0.4)'}`
                  ],
                  // ゆっくりとした上下の浮遊
                  y: [-2, 2, -2]
                }}
                transition={{ 
                  boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }
                }}
              >
                {/* シャボン玉の光沢効果 */}
                <div 
                  className="absolute top-1 left-2 w-2 h-2 bg-white rounded-full opacity-60"
                  style={{ filter: 'blur(0.5px)' }}
                />
                <div 
                  className="absolute top-2 left-1 w-1 h-1 bg-white rounded-full opacity-80"
                />
              </motion.div>
            ) : (
              <motion.div 
                className="w-6 h-6 rounded-full bg-white/60 border border-gray-300 flex items-center justify-center text-xs backdrop-blur-sm"
                animate={{
                  y: [-1, 1, -1],
                  opacity: [0.6, 0.8, 0.6]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: index * 0.2
                }}
              >
                ✨
              </motion.div>
            )}
          </motion.div>
        );
      })}

      {/* 育児日数表示（コンパクト） */}
      <motion.div 
        className="absolute top-4 right-4 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-green-100/50"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <div className="text-xs font-medium text-green-700">親になって{ageInDays}日目</div>
      </motion.div>

      {/* 水彩風の装飾効果 */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-yellow-200/60"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${10 + Math.random() * 30}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* 子供の名前（水彩風カード） */}
      {childrenNames.length > 0 && (
        <motion.div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-yellow-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.8 }}
        >
          <span className="text-sm font-medium text-green-700">
            {childrenNames.join(' ・ ')}
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default WatercolorTree;
'use client';

import { motion } from 'framer-motion';

interface Fruit {
  id: string;
  x: number;
  y: number;
  type: 'encouragement' | 'reflection';
  createdAt: string;
  isGlowing: boolean;
  aiRole: 'たまさん' | 'まどか姉さん' | 'ヒデじい';
  message: string;
}

interface Props {
  ageInDays: number;
  fruits: Fruit[];
  childrenNames: string[];
  onFruitClick?: (fruit: Fruit) => void;
}

const MagicTree = ({ ageInDays, fruits, childrenNames, onFruitClick }: Props) => {
  // 成長段階計算（0-1）
  const growthStage = Math.min(ageInDays / 365, 1);
  
  // 木のパラメータ
  const trunkHeight = 80 + growthStage * 60; // 80-140
  const trunkWidth = 8 + growthStage * 12; // 8-20
  const crownSize = 60 + growthStage * 80; // 60-140
  
  // 実の色設定
  const fruitColors = {
    encouragement: {
      glow: 'rgba(255, 215, 0, 0.9)',     // ゴールド
      base: 'rgba(255, 224, 130, 0.95)',   // パステルイエロー
      shadow: '0 0 20px rgba(255, 215, 0, 0.6)'
    },
    reflection: {
      glow: 'rgba(100, 149, 237, 0.9)',    // コーンフラワーブルー
      base: 'rgba(173, 216, 230, 0.95)',   // ライトブルー
      shadow: '0 0 20px rgba(100, 149, 237, 0.6)'
    }
  };

  // 葉っぱの生成
  const generateLeaves = () => {
    const leaves = [];
    const leafCount = Math.floor(8 + growthStage * 20);
    
    for (let i = 0; i < leafCount; i++) {
      const angle = (i / leafCount) * 2 * Math.PI;
      const radius = (crownSize / 2) * (0.6 + Math.random() * 0.4);
      const x = 110 + Math.cos(angle) * radius;
      const y = 80 - Math.sin(angle) * radius * 0.7;
      
      leaves.push(
        <motion.ellipse
          key={`leaf-${i}`}
          cx={x}
          cy={y}
          rx={4 + growthStage * 3}
          ry={2 + growthStage * 2}
          fill={`hsl(${120 + Math.random() * 20}, ${60 + growthStage * 20}%, ${40 + growthStage * 20}%)`}
          opacity={0.7 + Math.random() * 0.3}
          initial={{ scale: 0, rotate: 0 }}
          animate={{ 
            scale: [0.8, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            scale: { duration: 2, delay: i * 0.1 },
            rotate: { duration: 4 + i * 0.1, repeat: Infinity, ease: "easeInOut" }
          }}
        />
      );
    }
    return leaves;
  };

  // 枝の生成
  const generateBranches = () => {
    if (growthStage < 0.2) {
      return `M110 ${160 - trunkHeight + 20} Q90 ${140 - trunkHeight} 75 ${120 - trunkHeight}
              M110 ${160 - trunkHeight + 20} Q130 ${140 - trunkHeight} 145 ${120 - trunkHeight}`;
    } else if (growthStage < 0.6) {
      return `M110 ${160 - trunkHeight + 30} Q80 ${130 - trunkHeight} 60 ${100 - trunkHeight}
              M110 ${160 - trunkHeight + 30} Q140 ${130 - trunkHeight} 160 ${100 - trunkHeight}
              M110 ${160 - trunkHeight + 15} Q95 ${120 - trunkHeight} 70 ${90 - trunkHeight}
              M110 ${160 - trunkHeight + 15} Q125 ${120 - trunkHeight} 150 ${90 - trunkHeight}`;
    } else {
      return `M110 ${160 - trunkHeight + 40} Q70 ${140 - trunkHeight} 40 ${110 - trunkHeight}
              M110 ${160 - trunkHeight + 40} Q150 ${140 - trunkHeight} 180 ${110 - trunkHeight}
              M110 ${160 - trunkHeight + 25} Q85 ${125 - trunkHeight} 55 ${95 - trunkHeight}
              M110 ${160 - trunkHeight + 25} Q135 ${125 - trunkHeight} 165 ${95 - trunkHeight}
              M110 ${160 - trunkHeight + 10} Q95 ${110 - trunkHeight} 65 ${80 - trunkHeight}
              M110 ${160 - trunkHeight + 10} Q125 ${110 - trunkHeight} 155 ${80 - trunkHeight}`;
    }
  };

  return (
    <motion.div 
      className="relative w-full h-96 rounded-xl overflow-hidden shadow-2xl"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1 }}
    >
      {/* 魔法的な背景グラデーション */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#e6f3ff] via-[#f0f8e6] to-[#e8f5e8]" />
      
      {/* 柔らかい光の効果 */}
      <div className="absolute inset-0 bg-gradient-radial from-[rgba(255,255,255,0.4)] via-transparent to-transparent opacity-60" />
      
      {/* 地面のグラデーション */}
      <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-[#c8d6c8] to-transparent opacity-70" />

      <svg
        className="absolute inset-0 w-full h-full z-10"
        viewBox="0 0 220 240"
        preserveAspectRatio="xMidYEnd meet"
      >
        {/* 魔法的な木の幹 */}
        <defs>
          <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6B4423" />
            <stop offset="50%" stopColor="#8B5E3C" />
            <stop offset="100%" stopColor="#5D3A1A" />
          </linearGradient>
          
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* 木の根 */}
        <ellipse
          cx="110"
          cy="220"
          rx={trunkWidth + 8}
          ry="8"
          fill="#7A5436"
          opacity="0.6"
        />

        {/* 木の幹 */}
        <motion.rect
          x={110 - trunkWidth/2}
          y={240 - trunkHeight}
          width={trunkWidth}
          height={trunkHeight}
          fill="url(#trunkGradient)"
          rx={trunkWidth * 0.3}
          initial={{ height: 0 }}
          animate={{ height: trunkHeight }}
          transition={{ duration: 2, ease: "easeOut" }}
        />

        {/* 年輪 */}
        {Array.from({ length: Math.floor(ageInDays / 30) }, (_, i) => (
          <line
            key={`ring-${i}`}
            x1={110 - trunkWidth/2 + 2}
            y1={242 - trunkHeight + i * 4}
            x2={110 + trunkWidth/2 - 2}
            y2={242 - trunkHeight + i * 4}
            stroke="#5D3A1A"
            strokeWidth="0.5"
            opacity="0.7"
          />
        )).slice(0, 8)}

        {/* 魔法的な枝 */}
        <motion.path
          d={generateBranches()}
          stroke="#4A5D4A"
          strokeWidth={2 + growthStage * 2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#softGlow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, delay: 1 }}
        />

        {/* 葉っぱ */}
        {generateLeaves()}
      </svg>

      {/* 光る実 */}
      {fruits.map((fruit, idx) => (
        <motion.div
          key={fruit.id}
          className="absolute rounded-full cursor-pointer z-20"
          style={{
            width: '18px',
            height: '18px',
            backgroundColor: fruit.isGlowing ? 
              fruitColors[fruit.type].glow : 
              fruitColors[fruit.type].base,
            left: `${fruit.x}%`,
            top: `${fruit.y}%`,
            boxShadow: fruit.isGlowing ? fruitColors[fruit.type].shadow : 'none',
            filter: fruit.isGlowing ? 'brightness(1.2)' : 'brightness(0.8)'
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: fruit.isGlowing ? [1, 1.2, 1] : 1,
            opacity: 1
          }}
          transition={{
            scale: fruit.isGlowing ? {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            } : { duration: 0.6, delay: idx * 0.15 },
            opacity: { duration: 0.6, delay: idx * 0.15 }
          }}
          whileHover={{ scale: 1.3 }}
          onClick={() => onFruitClick?.(fruit)}
        >
          {/* 実の内側の光 */}
          {fruit.isGlowing && (
            <div 
              className="absolute inset-1 rounded-full"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                boxShadow: 'inset 0 0 8px rgba(255, 255, 255, 0.8)'
              }}
            />
          )}
        </motion.div>
      ))}

      {/* 魔法的なキラキラ効果 */}
      {Array.from({ length: Math.floor(3 + growthStage * 8) }, (_, i) => (
        <motion.div
          key={`sparkle-${i}`}
          className="absolute rounded-full bg-yellow-200 opacity-60 z-15"
          style={{
            width: '3px',
            height: '3px',
            left: `${20 + Math.random() * 60}%`,
            top: `${10 + Math.random() * 60}%`,
          }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 0.8, 0],
            rotate: [0, 180]
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 4,
          }}
        />
      ))}

      {/* 子供の名前 */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 1 }}
      >
        <div className="bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
          <span className="text-sm font-medium text-gray-700">
            {childrenNames.join(' ・ ')}
          </span>
        </div>
      </motion.div>

      {/* 成長情報 */}
      <motion.div 
        className="absolute top-4 right-4 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 1 }}
      >
        <div className="bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
          <div className="text-xs text-gray-600">
            育児 {ageInDays} 日目
          </div>
          <div className="text-xs text-green-600 font-medium">
            成長度 {Math.round(growthStage * 100)}%
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MagicTree;
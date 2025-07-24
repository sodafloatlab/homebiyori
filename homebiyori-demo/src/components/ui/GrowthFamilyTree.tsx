'use client';

import { motion } from 'framer-motion';

interface MockFruit {
  id: string;
  x: number;
  y: number;
  color: 'pink' | 'blue' | 'gold';
  aiRole: 'たまさん' | 'まどか姉さん' | 'ヒデじい';
  message: string;
  date: string;
  isGlowing: boolean;
}

interface GrowthFamilyTreeProps {
  parentingDays: number;
  fruits: MockFruit[];
  childrenNames: string[];
  onFruitClick: (fruit: MockFruit) => void;
}

export default function GrowthFamilyTree({ parentingDays, fruits, childrenNames, onFruitClick }: GrowthFamilyTreeProps) {
  // 成長段階を計算（0-1の値）
  const growthStage = Math.min(parentingDays / 365, 1); // 1年で完全成長
  
  // 木のサイズと形状を成長段階に応じて調整
  const trunkHeight = 15 + growthStage * 15; // 15-30
  const trunkWidth = 3 + growthStage * 8; // 3-11
  const crownRadius = 8 + growthStage * 20; // 8-28
  const leafDensity = 3 + growthStage * 12; // 3-15
  
  // 実の色を取得
  const getFruitColor = (color: string, isGlowing: boolean) => {
    const colors = {
      pink: isGlowing ? '#ff69b4' : '#ffb6c1',
      blue: isGlowing ? '#4169e1' : '#87ceeb', 
      gold: isGlowing ? '#ffd700' : '#f0e68c'
    };
    return colors[color as keyof typeof colors] || '#90ee90';
  };

  // 枝のパスを成長段階に応じて生成
  const generateBranches = () => {
    const baseY = 70 - trunkHeight;
    if (growthStage < 0.3) {
      // 小さい木：シンプルな枝
      return `M 50 ${baseY + 5} Q 40 ${baseY - 3} 35 ${baseY - 8} M 50 ${baseY + 5} Q 60 ${baseY - 3} 65 ${baseY - 8}`;
    } else if (growthStage < 0.7) {
      // 中程度の木：より多くの枝
      return `M 50 ${baseY + 8} Q 35 ${baseY} 25 ${baseY - 10} 
              M 50 ${baseY + 8} Q 65 ${baseY} 75 ${baseY - 10} 
              M 50 ${baseY + 3} Q 40 ${baseY - 5} 30 ${baseY - 15}
              M 50 ${baseY + 3} Q 60 ${baseY - 5} 70 ${baseY - 15}`;
    } else {
      // 大きな木：複雑な枝分かれ
      return `M 50 ${baseY + 10} Q 30 ${baseY + 2} 20 ${baseY - 8} 
              M 50 ${baseY + 10} Q 70 ${baseY + 2} 80 ${baseY - 8}
              M 50 ${baseY + 5} Q 35 ${baseY - 3} 25 ${baseY - 15}
              M 50 ${baseY + 5} Q 65 ${baseY - 3} 75 ${baseY - 15}
              M 50 ${baseY} Q 40 ${baseY - 8} 28 ${baseY - 20}
              M 50 ${baseY} Q 60 ${baseY - 8} 72 ${baseY - 20}`;
    }
  };

  // 葉っぱを成長段階に応じて生成
  const generateLeaves = () => {
    const leaves = [];
    const centerX = 50;
    const centerY = 70 - trunkHeight - 10;
    
    for (let i = 0; i < leafDensity; i++) {
      const angle = (i / leafDensity) * 2 * Math.PI;
      const radiusVariation = 0.7 + Math.random() * 0.6;
      const x = centerX + Math.cos(angle) * crownRadius * radiusVariation;
      const y = centerY + Math.sin(angle) * crownRadius * radiusVariation * 0.6;
      
      // 成長段階に応じた葉の色
      const leafColor = growthStage < 0.3 ? '#90EE90' : 
                       growthStage < 0.7 ? '#228B22' : '#006400';
      
      leaves.push(
        <motion.ellipse
          key={i}
          cx={x}
          cy={y}
          rx={2 + growthStage * 2}
          ry={1 + growthStage * 1.5}
          fill={leafColor}
          opacity="0.8"
          initial={{ rotate: i * 15, scale: 0 }}
          animate={{ 
            rotate: [i * 15, i * 15 + 3, i * 15 - 3, i * 15],
            scale: [0.8 + growthStage * 0.4, 1 + growthStage * 0.2, 0.8 + growthStage * 0.4]
          }}
          transition={{ 
            duration: 4 + i * 0.1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.05
          }}
          transformOrigin={`${x} ${y}`}
        />
      );
    }
    return leaves;
  };

  // 年輪を生成
  const generateRings = () => {
    const rings = [];
    const ringCount = Math.floor(parentingDays / 30); // 月ごとに年輪
    for (let i = 0; i < ringCount && i < 8; i++) {
      rings.push(
        <line
          key={i}
          x1={50 - trunkWidth/2 + 1}
          y1={72 - trunkHeight + i * 2}
          x2={50 + trunkWidth/2 - 1}
          y2={72 - trunkHeight + i * 2}
          stroke="#654321"
          strokeWidth="0.3"
          opacity="0.6"
        />
      );
    }
    return rings;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative bg-gradient-to-b from-sky-200 to-green-100 rounded-lg shadow-lg p-4 overflow-hidden"
    >
      <svg viewBox="0 0 100 100" className="w-full h-96">
        {/* 背景のグラデーション */}
        <defs>
          <radialGradient id="backgroundGlow" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#fff8dc" opacity="0.3" />
            <stop offset="100%" stopColor="#98fb98" opacity="0.1" />
          </radialGradient>
          
          {/* 光る実のフィルター効果 */}
          <filter id="fruitGlow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* 背景の光る効果 */}
        <rect width="100" height="100" fill="url(#backgroundGlow)" />
        
        {/* 地面 */}
        <ellipse cx="50" cy="85" rx="45" ry="8" fill="#8fbc8f" opacity="0.8" />
        
        {/* 木の根（拡張されたベース） */}
        <ellipse 
          cx="50" 
          cy={78} 
          rx={trunkWidth/2 + 3 + growthStage * 5} 
          ry={2 + growthStage * 2} 
          fill="#8b4513" 
          opacity="0.7" 
        />
        
        {/* 木の幹 */}
        <rect 
          x={50 - trunkWidth/2} 
          y={70 - trunkHeight} 
          width={trunkWidth} 
          height={trunkHeight} 
          fill="#8b4513" 
          rx={trunkWidth * 0.2}
        />
        
        {/* 年輪 */}
        {generateRings()}
        
        {/* 木の枝 */}
        <motion.path
          d={generateBranches()}
          stroke="#8b4513"
          strokeWidth={1.5 + growthStage}
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
        />
        
        {/* 葉っぱ */}
        {generateLeaves()}
        
        {/* 実 */}
        {fruits.map((fruit, index) => (
          <motion.g 
            key={fruit.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
          >
            <circle
              cx={fruit.x}
              cy={fruit.y}
              r={2 + growthStage}
              fill={getFruitColor(fruit.color, fruit.isGlowing)}
              stroke={fruit.isGlowing ? '#fff' : 'none'}
              strokeWidth={fruit.isGlowing ? '0.5' : '0'}
              className="cursor-pointer transition-all duration-300 hover:r-4"
              onClick={() => onFruitClick(fruit)}
              filter={fruit.isGlowing ? "url(#fruitGlow)" : undefined}
            />
            
            {/* 光る効果の波紋 */}
            {fruit.isGlowing && (
              <motion.circle
                cx={fruit.x}
                cy={fruit.y}
                r={4 + growthStage}
                fill={getFruitColor(fruit.color, true)}
                opacity="0.4"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 0.1, 0.4]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
            
            {/* 未投稿誘導アイコン */}
            {!fruit.isGlowing && (
              <motion.text
                x={fruit.x}
                y={fruit.y - 3}
                textAnchor="middle"
                fontSize="2"
                fill="#666"
                className="pointer-events-none"
                animate={{ y: [fruit.y - 3, fruit.y - 4, fruit.y - 3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                ✨
              </motion.text>
            )}
          </motion.g>
        ))}
        
        {/* 子供の名前（根の部分に刻まれたスタイル） */}
        <text
          x="50"
          y="80"
          textAnchor="middle"
          fontSize={2.5 + growthStage}
          fill="#654321"
          fontWeight="bold"
          style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}
        >
          {childrenNames.join(' ・ ')}
        </text>
        
        {/* 成長段階の表示 */}
        <text
          x="50"
          y="95"
          textAnchor="middle"
          fontSize="2"
          fill="#4a5568"
          opacity="0.8"
        >
          育児 {parentingDays} 日目 ・ 成長度 {Math.round(growthStage * 100)}%
        </text>
      </svg>
      
      {/* 季節の演出効果（小さなキラキラ） */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: Math.floor(3 + growthStage * 5) }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-300 rounded-full opacity-60"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${10 + Math.random() * 40}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
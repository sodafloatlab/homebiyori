'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

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

interface EnhancedFamilyTreeProps {
  parentingDays: number;
  fruits: MockFruit[];
  childrenNames: string[];
  onFruitClick: (fruit: MockFruit, event?: MouseEvent) => void;
}

export default function EnhancedFamilyTree({ parentingDays, fruits, childrenNames, onFruitClick }: EnhancedFamilyTreeProps) {
  // 年輪の太さを計算（日数に応じて）
  const trunkWidth = Math.min(15 + (parentingDays / 8), 45);
  
  // 木の成長段階を計算
  const growthStage = Math.min(Math.floor(parentingDays / 15), 5);
  
  // 実の色を取得
  const getFruitColor = (color: string, isGlowing: boolean) => {
    const colors = {
      pink: isGlowing ? '#ff1493' : '#ffb6c1',
      blue: isGlowing ? '#00bfff' : '#87ceeb', 
      gold: isGlowing ? '#ffd700' : '#f0e68c'
    };
    return colors[color as keyof typeof colors] || '#90ee90';
  };

  // 枝の座標を動的生成
  const branches = useMemo(() => {
    const branchData = [];
    const centerX = 50;
    const trunkTop = 45;
    
    // メイン枝（左右に大きく伸びる）
    branchData.push({
      id: 'main-left',
      path: `M ${centerX} ${trunkTop + 5} Q ${centerX - 12} ${trunkTop - 5} ${centerX - 25} ${trunkTop - 15}`,
      width: 4,
      length: 25
    });
    branchData.push({
      id: 'main-right', 
      path: `M ${centerX} ${trunkTop + 5} Q ${centerX + 12} ${trunkTop - 5} ${centerX + 25} ${trunkTop - 15}`,
      width: 4,
      length: 25
    });
    
    // サブ枝（上部に複数）
    for (let i = 0; i < growthStage; i++) {
      const angle = (i * 60) - 150; // -150°から210°
      const length = 15 + Math.random() * 10;
      const startY = trunkTop - (i * 3);
      const endX = centerX + Math.cos(angle * Math.PI / 180) * length;
      const endY = startY + Math.sin(angle * Math.PI / 180) * length;
      
      branchData.push({
        id: `sub-${i}`,
        path: `M ${centerX} ${startY} Q ${centerX + (endX - centerX) * 0.7} ${startY - 5} ${endX} ${endY}`,
        width: 2 + Math.random(),
        length: length
      });
    }
    
    return branchData;
  }, [growthStage, trunkWidth]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative bg-gradient-to-b from-sky-200 via-sky-100 to-green-100 rounded-xl shadow-2xl p-4 overflow-hidden"
    >
      {/* 背景の雲 */}
      <div className="absolute top-2 left-4 w-12 h-6 bg-white rounded-full opacity-60"></div>
      <div className="absolute top-4 right-8 w-8 h-4 bg-white rounded-full opacity-40"></div>
      <div className="absolute top-1 right-16 w-6 h-3 bg-white rounded-full opacity-50"></div>
      
      <svg viewBox="0 0 100 100" className="w-full h-96">
        {/* グラデーション定義 */}
        <defs>
          {/* 空のグラデーション */}
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87ceeb" />
            <stop offset="70%" stopColor="#b0e0e6" />
            <stop offset="100%" stopColor="#f0f8ff" />
          </linearGradient>
          
          {/* 地面のグラデーション */}
          <linearGradient id="groundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9acd32" />
            <stop offset="50%" stopColor="#8fbc8f" />
            <stop offset="100%" stopColor="#556b2f" />
          </linearGradient>
          
          {/* 幹のグラデーション */}
          <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b4513" />
            <stop offset="50%" stopColor="#a0522d" />
            <stop offset="100%" stopColor="#654321" />
          </linearGradient>
          
          {/* 実の光る効果 */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* 背景の空 */}
        <rect width="100" height="75" fill="url(#skyGradient)" />
        
        {/* 地面 */}
        <path 
          d="M 0 75 Q 50 72 100 75 L 100 100 L 0 100 Z" 
          fill="url(#groundGradient)" 
        />
        
        {/* 小さな草 */}
        {Array.from({ length: 12 }, (_, i) => (
          <motion.path
            key={`grass-${i}`}
            d={`M ${5 + i * 8} 78 Q ${6 + i * 8} 75 ${7 + i * 8} 78`}
            stroke="#228b22"
            strokeWidth="0.5"
            fill="none"
            animate={{ 
              rotate: [0, 2, -2, 0],
              opacity: [0.6, 0.8, 0.6]
            }}
            transition={{ 
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.1
            }}
            transformOrigin={`${5 + i * 8} 78`}
          />
        ))}
        
        {/* 木の根系 */}
        <motion.ellipse 
          cx="50" 
          cy="78" 
          rx={trunkWidth/2 + 8} 
          ry="6" 
          fill="#654321" 
          opacity="0.6"
          animate={{ 
            rx: [trunkWidth/2 + 8, trunkWidth/2 + 10, trunkWidth/2 + 8]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* 木の幹（より自然な形状） */}
        <motion.path
          d={`M ${50 - trunkWidth/2} 75 
              Q ${50 - trunkWidth/2 + 2} 65 ${50 - trunkWidth/2 + 1} 55
              Q ${50 - trunkWidth/2} 45 ${50 - trunkWidth/2 + 2} 35
              L ${50 + trunkWidth/2 - 2} 35
              Q ${50 + trunkWidth/2} 45 ${50 + trunkWidth/2 - 1} 55  
              Q ${50 + trunkWidth/2 - 2} 65 ${50 + trunkWidth/2} 75 Z`}
          fill="url(#trunkGradient)"
          animate={{ 
            scale: [1, 1.02, 1]
          }}
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* 年輪の詳細表現 */}
        {Array.from({ length: Math.floor(parentingDays / 10) }, (_, i) => (
          <motion.line
            key={`ring-${i}`}
            x1={50 - trunkWidth/2 + 3}
            y1={50 + i * 4}
            x2={50 + trunkWidth/2 - 3}
            y2={50 + i * 4}
            stroke="#654321"
            strokeWidth="0.3"
            opacity="0.7"
            animate={{ 
              opacity: [0.5, 0.9, 0.5]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2
            }}
          />
        ))}
        
        {/* 幹の質感（縦の線） */}
        {Array.from({ length: 3 }, (_, i) => (
          <motion.line
            key={`texture-${i}`}
            x1={50 - trunkWidth/2 + 4 + i * (trunkWidth - 8) / 2}
            y1={75}
            x2={50 - trunkWidth/2 + 4 + i * (trunkWidth - 8) / 2}
            y2={35}
            stroke="#5d4037"
            strokeWidth="0.4"
            opacity="0.6"
            animate={{ 
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5
            }}
          />
        ))}
        
        {/* 枝（動的生成） */}
        {branches.map((branch, index) => (
          <motion.path
            key={branch.id}
            d={branch.path}
            stroke="#8b4513"
            strokeWidth={branch.width}
            fill="none"
            strokeLinecap="round"
            animate={{ 
              rotate: [0, 1, -1, 0],
              scale: [1, 1.01, 1]
            }}
            transition={{ 
              duration: 4 + index * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.2
            }}
            transformOrigin="50 50"
          />
        ))}
        
        {/* 葉っぱ（より豊富で自然） */}
        {Array.from({ length: 15 + growthStage * 3 }, (_, i) => {
          const angle = (i * 360 / (15 + growthStage * 3)) * Math.PI / 180;
          const radius = 20 + Math.random() * 15;
          const leafX = 50 + Math.cos(angle) * radius;
          const leafY = 35 + Math.sin(angle) * radius * 0.6;
          
          return (
            <motion.g key={`leaf-${i}`}>
              <motion.ellipse
                cx={leafX}
                cy={leafY}
                rx="3"
                ry="5"
                fill={Math.random() > 0.7 ? "#32cd32" : "#228b22"}
                opacity="0.9"
                animate={{ 
                  rotate: [i * 15, i * 15 + 8, i * 15 - 8, i * 15],
                  scale: [1, 1.2, 0.9, 1],
                  opacity: [0.7, 1, 0.8, 0.9]
                }}
                transition={{ 
                  duration: 3 + (i % 3),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.1
                }}
                transformOrigin={`${leafX} ${leafY}`}
              />
              {/* 葉脈 */}
              <motion.line
                x1={leafX}
                y1={leafY - 2}
                x2={leafX}
                y2={leafY + 2}
                stroke="#1f5f1f"
                strokeWidth="0.2"
                opacity="0.8"
                animate={{ 
                  rotate: [i * 15, i * 15 + 8, i * 15 - 8, i * 15]
                }}
                transition={{ 
                  duration: 3 + (i % 3),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.1
                }}
                transformOrigin={`${leafX} ${leafY}`}
              />
            </motion.g>
          );
        })}
        
        {/* 実（改良版） */}
        {fruits.map((fruit) => (
          <motion.g key={fruit.id}>
            {/* 実の影 */}
            <ellipse
              cx={fruit.x + 0.5}
              cy={fruit.y + 0.5}
              rx="3"
              ry="2.5"
              fill="rgba(0,0,0,0.2)"
            />
            
            {/* 実本体 */}
            <motion.circle
              cx={fruit.x}
              cy={fruit.y}
              r="3.5"
              fill={getFruitColor(fruit.color, fruit.isGlowing)}
              stroke={fruit.isGlowing ? '#fff' : '#ffffff80'}
              strokeWidth={fruit.isGlowing ? '1' : '0.5'}
              filter={fruit.isGlowing ? 'url(#glow)' : 'none'}
              className="cursor-pointer transition-all duration-300 hover:r-4"
              onClick={(e) => onFruitClick(fruit, e.nativeEvent)}
              animate={fruit.isGlowing ? { 
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              } : {
                scale: [0.8, 1, 0.8],
                opacity: [0.5, 0.7, 0.5]
              }}
              transition={{ 
                duration: fruit.isGlowing ? 2 : 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* 実のハイライト */}
            <motion.circle
              cx={fruit.x - 1}
              cy={fruit.y - 1}
              r="1"
              fill="rgba(255,255,255,0.6)"
              className="pointer-events-none"
              animate={fruit.isGlowing ? { 
                opacity: [0.3, 0.8, 0.3]
              } : {
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* 未投稿の誘導表示 */}
            {!fruit.isGlowing && (
              <motion.text
                x={fruit.x}
                y={fruit.y - 6}
                textAnchor="middle"
                fontSize="3"
                fill="#666"
                className="pointer-events-none"
                animate={{ 
                  y: [fruit.y - 6, fruit.y - 8, fruit.y - 6],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                ✏️
              </motion.text>
            )}
          </motion.g>
        ))}
        
        {/* 子供の名前（台座風） */}
        <motion.rect
          x="35"
          y="82"
          width="30"
          height="8"
          rx="4"
          fill="rgba(139, 69, 19, 0.8)"
          animate={{ 
            opacity: [0.8, 1, 0.8]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <text
          x="50"
          y="87"
          textAnchor="middle"
          fontSize="2.5"
          fill="#fff"
          fontWeight="bold"
          className="font-serif"
        >
          {childrenNames.join(' ♡ ')}
        </text>
        
        {/* 育児日数表示（装飾的） */}
        <motion.g
          animate={{ 
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <rect
            x="20"
            y="92"
            width="60"
            height="6"
            rx="3"
            fill="rgba(255, 255, 255, 0.9)"
            stroke="rgba(76, 175, 80, 0.5)"
            strokeWidth="0.5"
          />
          <text
            x="50"
            y="96"
            textAnchor="middle"
            fontSize="2.2"
            fill="#4a5568"
            fontWeight="600"
          >
            🌱 育児 {parentingDays} 日目 🌱
          </text>
        </motion.g>
        
        {/* 季節の装飾（小鳥） */}
        <motion.g
          animate={{ 
            x: [0, 2, 0],
            y: [0, -1, 0]
          }}
          transition={{ 
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <circle cx="75" cy="25" r="1.5" fill="#ff6b6b" />
          <ellipse cx="77" cy="25" rx="2" ry="1" fill="#ff6b6b" />
          <circle cx="75.5" cy="24.5" r="0.3" fill="#333" />
        </motion.g>
      </svg>
    </motion.div>
  );
}
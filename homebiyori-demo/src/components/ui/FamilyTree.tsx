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

interface FamilyTreeProps {
  parentingDays: number;
  fruits: MockFruit[];
  childrenNames: string[];
  onFruitClick: (fruit: MockFruit) => void;
}

export default function FamilyTree({ parentingDays, fruits, childrenNames, onFruitClick }: FamilyTreeProps) {
  // 年輪の太さを計算（日数に応じて）
  const trunkWidth = Math.min(20 + (parentingDays / 10), 60);
  
  // 実の色を取得
  const getFruitColor = (color: string, isGlowing: boolean) => {
    const colors = {
      pink: isGlowing ? '#ff69b4' : '#ffb6c1',
      blue: isGlowing ? '#4169e1' : '#87ceeb', 
      gold: isGlowing ? '#ffd700' : '#f0e68c'
    };
    return colors[color as keyof typeof colors] || '#90ee90';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative bg-white rounded-lg shadow-lg p-4"
    >
      <svg viewBox="0 0 100 100" className="w-full h-80">
        {/* 背景の空 */}
        <defs>
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87ceeb" />
            <stop offset="100%" stopColor="#e0f6ff" />
          </linearGradient>
        </defs>
        <rect width="100" height="70" fill="url(#skyGradient)" />
        
        {/* 地面 */}
        <rect x="0" y="70" width="100" height="30" fill="#8fbc8f" />
        
        {/* 木の根（子供の名前を刻む場所） */}
        <ellipse cx="50" cy="75" rx={trunkWidth/2 + 5} ry="8" fill="#8b4513" opacity="0.7" />
        
        {/* 木の幹（年輪表現） */}
        <rect 
          x={50 - trunkWidth/2} 
          y="50" 
          width={trunkWidth} 
          height="25" 
          fill="#8b4513" 
          rx="5"
        />
        
        {/* 年輪の線 */}
        {Array.from({ length: Math.floor(parentingDays / 15) }, (_, i) => (
          <line
            key={i}
            x1={50 - trunkWidth/2 + 2}
            y1={52 + i * 3}
            x2={50 + trunkWidth/2 - 2}
            y2={52 + i * 3}
            stroke="#654321"
            strokeWidth="0.5"
            opacity="0.7"
          />
        ))}
        
        {/* 木の枝 */}
        <path
          d={`M 50 52 Q 35 45 25 35 M 50 52 Q 65 45 75 35 M 50 50 Q 40 40 30 30 M 50 50 Q 60 40 70 30`}
          stroke="#8b4513"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* 葉っぱ（風で揺れる効果） */}
        {Array.from({ length: 8 }, (_, i) => (
          <motion.ellipse
            key={i}
            cx={30 + i * 6}
            cy={25 + Math.sin(i) * 8}
            rx="4"
            ry="2"
            fill="#228b22"
            opacity="0.8"
            initial={{ rotate: i * 15 }}
            animate={{ 
              rotate: [i * 15, i * 15 + 5, i * 15 - 5, i * 15],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 3 + i * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.1
            }}
            transformOrigin={`${30 + i * 6} ${25 + Math.sin(i) * 8}`}
          />
        ))}
        
        {/* 実 */}
        {fruits.map((fruit) => (
          <g key={fruit.id}>
            <circle
              cx={fruit.x}
              cy={fruit.y}
              r="3"
              fill={getFruitColor(fruit.color, fruit.isGlowing)}
              stroke={fruit.isGlowing ? '#fff' : 'none'}
              strokeWidth={fruit.isGlowing ? '0.5' : '0'}
              className={`cursor-pointer transition-all duration-300 hover:r-4 ${
                fruit.isGlowing ? 'animate-pulse' : ''
              }`}
              onClick={() => onFruitClick(fruit)}
            />
            {/* 光る効果 */}
            {fruit.isGlowing && (
              <circle
                cx={fruit.x}
                cy={fruit.y}
                r="5"
                fill={getFruitColor(fruit.color, true)}
                opacity="0.3"
                className="animate-ping"
              />
            )}
            {/* 未投稿の誘導表示 */}
            {!fruit.isGlowing && (
              <text
                x={fruit.x}
                y={fruit.y - 5}
                textAnchor="middle"
                fontSize="2"
                fill="#666"
                className="pointer-events-none"
              >
                📝
              </text>
            )}
          </g>
        ))}
        
        {/* 子供の名前 */}
        <text
          x="50"
          y="78"
          textAnchor="middle"
          fontSize="3"
          fill="#fff"
          fontWeight="bold"
        >
          {childrenNames.join(' ・ ')}
        </text>
        
        {/* 育児日数表示 */}
        <text
          x="50"
          y="85"
          textAnchor="middle"
          fontSize="2.5"
          fill="#4a5568"
        >
          育児 {parentingDays} 日目
        </text>
      </svg>
    </motion.div>
  );
}
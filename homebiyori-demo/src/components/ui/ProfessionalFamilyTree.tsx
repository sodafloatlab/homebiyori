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

interface ProfessionalFamilyTreeProps {
  parentingDays: number;
  fruits: MockFruit[];
  childrenNames: string[];
  onFruitClick: (fruit: MockFruit, event?: MouseEvent) => void;
}

export default function ProfessionalFamilyTree({ parentingDays, fruits, childrenNames, onFruitClick }: ProfessionalFamilyTreeProps) {
  // 年輪の太さを計算（より自然な成長曲線）
  const trunkWidth = Math.min(18 + Math.log(parentingDays + 1) * 6, 55);
  const canopySize = Math.min(50 + Math.sqrt(parentingDays) * 2, 85);
  
  // 実の色を取得（より洗練された色合い）
  const getFruitColor = (color: string, isGlowing: boolean) => {
    const colors = {
      pink: {
        main: isGlowing ? '#ff6b9d' : '#ffadd6',
        shadow: isGlowing ? '#d63384' : '#e83e8c',
        glow: '#ff69b4'
      },
      blue: {
        main: isGlowing ? '#4dabf7' : '#a8dadc',
        shadow: isGlowing ? '#1864ab' : '#457b9d',
        glow: '#00bfff'
      },
      gold: {
        main: isGlowing ? '#ffd43b' : '#ffe066',
        shadow: isGlowing ? '#f08c00' : '#fab005',
        glow: '#ffd700'
      }
    };
    return colors[color as keyof typeof colors] || colors.pink;
  };

  // 枝のパスを自然に生成
  const branches = useMemo(() => {
    const branchData = [];
    const centerX = 50;
    const trunkTop = 42;

    // メイン枝（プライマリ）
    const primaryBranches = [
      { angle: -45, length: 22, thickness: 3.5, level: 1 },
      { angle: 45, length: 20, thickness: 3.2, level: 1 },
      { angle: -25, length: 18, thickness: 2.8, level: 2 },
      { angle: 25, length: 19, thickness: 2.5, level: 2 },
      { angle: -70, length: 15, thickness: 2.2, level: 3 },
      { angle: 70, length: 16, thickness: 2.0, level: 3 }
    ];

    primaryBranches.forEach((branch, i) => {
      const startY = trunkTop - (branch.level * 4);
      const endX = centerX + Math.cos(branch.angle * Math.PI / 180) * branch.length;
      const endY = startY + Math.sin(branch.angle * Math.PI / 180) * branch.length;
      const controlX = centerX + Math.cos(branch.angle * Math.PI / 180) * branch.length * 0.6;
      const controlY = startY + Math.sin(branch.angle * Math.PI / 180) * branch.length * 0.3;

      branchData.push({
        id: `primary-${i}`,
        path: `M ${centerX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
        thickness: branch.thickness,
        level: branch.level
      });

      // セカンダリ枝
      if (branch.level <= 2) {
        const secAngle1 = branch.angle - 30;
        const secAngle2 = branch.angle + 30;
        const secLength = branch.length * 0.6;

        [secAngle1, secAngle2].forEach((angle, j) => {
          const secEndX = endX + Math.cos(angle * Math.PI / 180) * secLength;
          const secEndY = endY + Math.sin(angle * Math.PI / 180) * secLength;
          
          branchData.push({
            id: `secondary-${i}-${j}`,
            path: `M ${endX} ${endY} L ${secEndX} ${secEndY}`,
            thickness: 1.5,
            level: branch.level + 1
          });
        });
      }
    });

    return branchData;
  }, [parentingDays]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative w-full bg-gradient-to-b from-slate-50 via-stone-50 to-emerald-50 rounded-3xl shadow-2xl overflow-hidden border border-white/20"
      style={{
        background: `radial-gradient(ellipse at top, 
          rgba(255, 255, 255, 0.9) 0%, 
          rgba(248, 250, 252, 0.95) 30%, 
          rgba(240, 253, 244, 0.98) 70%, 
          rgba(236, 253, 245, 1) 100%)`
      }}
    >
      {/* 高品質な背景グラデーション */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/30 via-transparent to-green-50/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent" />
      </div>

      {/* 環境光効果 */}
      <div className="absolute top-0 left-1/4 w-32 h-32 bg-yellow-200/10 rounded-full blur-3xl" />
      <div className="absolute top-10 right-1/4 w-24 h-24 bg-blue-200/10 rounded-full blur-2xl" />

      <svg viewBox="0 0 100 100" className="w-full h-[28rem] relative z-10">
        {/* 高品質なグラデーション定義 */}
        <defs>
          {/* 空のグラデーション */}
          <linearGradient id="professionalSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(135, 206, 235, 0.1)" />
            <stop offset="40%" stopColor="rgba(176, 224, 230, 0.05)" />
            <stop offset="100%" stopColor="rgba(240, 248, 255, 0)" />
          </linearGradient>
          
          {/* 地面のグラデーション */}
          <linearGradient id="professionalGround" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8fbc8f" />
            <stop offset="30%" stopColor="#9acd32" />
            <stop offset="70%" stopColor="#7cb342" />
            <stop offset="100%" stopColor="#689f38" />
          </linearGradient>
          
          {/* 幹のリアルなグラデーション */}
          <linearGradient id="professionalTrunk" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5d4037" />
            <stop offset="20%" stopColor="#795548" />
            <stop offset="50%" stopColor="#8d6e63" />
            <stop offset="80%" stopColor="#6d4c41" />
            <stop offset="100%" stopColor="#4e342e" />
          </linearGradient>

          {/* 枝のグラデーション */}
          <linearGradient id="branchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8d6e63" />
            <stop offset="50%" stopColor="#a1887f" />
            <stop offset="100%" stopColor="#795548" />
          </linearGradient>
          
          {/* 高品質な影とライティング */}
          <filter id="professionalShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="1" dy="2" result="offset"/>
            <feFlood floodColor="rgba(0,0,0,0.15)"/>
            <feComposite in2="offset" operator="in"/>
            <feMerge> 
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* 実の高品質グロー効果 */}
          <filter id="premiumGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* 葉っぱの質感 */}
          <radialGradient id="leafGradient">
            <stop offset="0%" stopColor="#66bb6a" />
            <stop offset="70%" stopColor="#4caf50" />
            <stop offset="100%" stopColor="#2e7d32" />
          </radialGradient>
        </defs>
        
        {/* 背景の空 */}
        <rect width="100" height="80" fill="url(#professionalSky)" />
        
        {/* 地面（よりリアルな形状） */}
        <path 
          d="M 0 75 Q 25 73 50 74 Q 75 75 100 76 L 100 100 L 0 100 Z" 
          fill="url(#professionalGround)" 
          filter="url(#professionalShadow)"
        />
        
        {/* 地面の質感 */}
        {Array.from({ length: 8 }, (_, i) => (
          <motion.circle
            key={`ground-texture-${i}`}
            cx={15 + i * 12}
            cy={77 + Math.sin(i) * 2}
            r="0.5"
            fill="rgba(76, 175, 80, 0.3)"
            animate={{ 
              opacity: [0.2, 0.4, 0.2],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3
            }}
          />
        ))}
        
        {/* 木の根系（よりリアル） */}
        <motion.ellipse 
          cx="50" 
          cy="78" 
          rx={trunkWidth/2 + 6} 
          ry="4" 
          fill="rgba(77, 62, 54, 0.6)" 
          filter="url(#professionalShadow)"
          animate={{ 
            rx: [trunkWidth/2 + 6, trunkWidth/2 + 8, trunkWidth/2 + 6]
          }}
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* 木の幹（プロフェッショナル品質） */}
        <motion.path
          d={`M ${50 - trunkWidth/2} 76 
              Q ${50 - trunkWidth/2 + 1} 68 ${50 - trunkWidth/2 + 0.5} 60
              Q ${50 - trunkWidth/2 - 0.5} 50 ${50 - trunkWidth/2 + 1} 40
              Q ${50 - trunkWidth/2} 30 ${50 - trunkWidth/2 + 2} 22
              L ${50 + trunkWidth/2 - 2} 22
              Q ${50 + trunkWidth/2} 30 ${50 + trunkWidth/2 - 1} 40  
              Q ${50 + trunkWidth/2 + 0.5} 50 ${50 + trunkWidth/2 - 0.5} 60
              Q ${50 + trunkWidth/2 - 1} 68 ${50 + trunkWidth/2} 76 Z`}
          fill="url(#professionalTrunk)"
          filter="url(#professionalShadow)"
          animate={{ 
            scale: [1, 1.005, 1]
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* 年輪と木の質感（高品質） */}
        {Array.from({ length: Math.floor(parentingDays / 8) }, (_, i) => (
          <motion.line
            key={`ring-${i}`}
            x1={50 - trunkWidth/2 + 4}
            y1={55 + i * 3}
            x2={50 + trunkWidth/2 - 4}
            y2={55 + i * 3}
            stroke="rgba(78, 52, 46, 0.4)"
            strokeWidth="0.3"
            opacity="0.7"
            animate={{ 
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15
            }}
          />
        ))}
        
        {/* 幹のバークテクスチャ */}
        {Array.from({ length: 4 }, (_, i) => (
          <motion.path
            key={`bark-${i}`}
            d={`M ${50 - trunkWidth/2 + 2 + i * (trunkWidth - 4) / 3} 76
                Q ${50 - trunkWidth/2 + 3 + i * (trunkWidth - 4) / 3} 50
                ${50 - trunkWidth/2 + 2 + i * (trunkWidth - 4) / 3} 24`}
            stroke="rgba(78, 52, 46, 0.3)"
            strokeWidth="0.4"
            fill="none"
            animate={{ 
              opacity: [0.2, 0.6, 0.2]
            }}
            transition={{ 
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4
            }}
          />
        ))}
        
        {/* 枝（プロフェッショナル品質） */}
        {branches.map((branch, index) => (
          <motion.path
            key={branch.id}
            d={branch.path}
            stroke="url(#branchGradient)"
            strokeWidth={branch.thickness}
            fill="none"
            strokeLinecap="round"
            filter="url(#professionalShadow)"
            animate={{ 
              rotate: [0, 0.8, -0.8, 0],
              scale: [1, 1.002, 1]
            }}
            transition={{ 
              duration: 6 + index * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.1
            }}
            transformOrigin="50 50"
          />
        ))}
        
        {/* 葉っぱ（プレミアム品質） */}
        {Array.from({ length: Math.min(25 + Math.floor(parentingDays / 10), 40) }, (_, i) => {
          const angle = (i * 360 / 25) * Math.PI / 180;
          const radiusVariation = 1 + Math.sin(i * 0.7) * 0.3;
          const radius = (20 + Math.sin(i * 0.3) * 8) * radiusVariation;
          const leafX = 50 + Math.cos(angle) * radius;
          const leafY = 35 + Math.sin(angle) * radius * 0.7;
          const leafSize = 2.8 + Math.sin(i * 0.5) * 0.8;
          
          return (
            <motion.g key={`leaf-${i}`}>
              {/* 葉っぱの影 */}
              <motion.ellipse
                cx={leafX + 0.3}
                cy={leafY + 0.3}
                rx={leafSize * 0.6}
                ry={leafSize}
                fill="rgba(0,0,0,0.1)"
                animate={{ 
                  rotate: [i * 8, i * 8 + 6, i * 8 - 6, i * 8],
                  scale: [0.9, 1.1, 0.95, 1]
                }}
                transition={{ 
                  duration: 4 + (i % 3),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.05
                }}
                transformOrigin={`${leafX} ${leafY}`}
              />
              
              {/* 葉っぱ本体 */}
              <motion.ellipse
                cx={leafX}
                cy={leafY}
                rx={leafSize * 0.6}
                ry={leafSize}
                fill="url(#leafGradient)"
                opacity="0.9"
                animate={{ 
                  rotate: [i * 8, i * 8 + 6, i * 8 - 6, i * 8],
                  scale: [0.95, 1.1, 0.9, 1],
                  opacity: [0.8, 1, 0.85, 0.9]
                }}
                transition={{ 
                  duration: 4 + (i % 3),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.05
                }}
                transformOrigin={`${leafX} ${leafY}`}
              />
              
              {/* 葉脈（詳細） */}
              <motion.line
                x1={leafX}
                y1={leafY - leafSize * 0.8}
                x2={leafX}
                y2={leafY + leafSize * 0.8}
                stroke="rgba(46, 125, 50, 0.6)"
                strokeWidth="0.15"
                animate={{ 
                  rotate: [i * 8, i * 8 + 6, i * 8 - 6, i * 8]
                }}
                transition={{ 
                  duration: 4 + (i % 3),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.05
                }}
                transformOrigin={`${leafX} ${leafY}`}
              />
              
              {/* サブ葉脈 */}
              <motion.g
                animate={{ 
                  rotate: [i * 8, i * 8 + 6, i * 8 - 6, i * 8]
                }}
                transition={{ 
                  duration: 4 + (i % 3),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.05
                }}
                transformOrigin={`${leafX} ${leafY}`}
              >
                <line
                  x1={leafX - leafSize * 0.3}
                  y1={leafY - leafSize * 0.2}
                  x2={leafX}
                  y2={leafY}
                  stroke="rgba(46, 125, 50, 0.3)"
                  strokeWidth="0.08"
                />
                <line
                  x1={leafX + leafSize * 0.3}
                  y1={leafY - leafSize * 0.2}
                  x2={leafX}
                  y2={leafY}
                  stroke="rgba(46, 125, 50, 0.3)"
                  strokeWidth="0.08"
                />
              </motion.g>
            </motion.g>
          );
        })}
        
        {/* 実（プレミアム品質） */}
        {fruits.map((fruit) => {
          const fruitColors = getFruitColor(fruit.color, fruit.isGlowing);
          
          return (
            <motion.g key={fruit.id}>
              {/* 実の影（リアル） */}
              <motion.ellipse
                cx={fruit.x + 0.8}
                cy={fruit.y + 1.2}
                rx="3.2"
                ry="2.4"
                fill="rgba(0,0,0,0.15)"
                animate={fruit.isGlowing ? { 
                  scale: [1, 1.1, 1],
                  opacity: [0.1, 0.2, 0.1]
                } : {
                  scale: [0.9, 1, 0.9],
                  opacity: [0.08, 0.15, 0.08]
                }}
                transition={{ 
                  duration: fruit.isGlowing ? 2.5 : 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* 実のベース */}
              <motion.circle
                cx={fruit.x}
                cy={fruit.y}
                r="4.2"
                fill={fruitColors.main}
                filter={fruit.isGlowing ? 'url(#premiumGlow)' : 'url(#professionalShadow)'}
                className="cursor-pointer"
                onClick={(e) => onFruitClick(fruit, e.nativeEvent)}
                animate={fruit.isGlowing ? { 
                  scale: [1, 1.15, 1],
                  rotate: [0, 3, -3, 0]
                } : {
                  scale: [0.85, 1, 0.85],
                  opacity: [0.6, 0.8, 0.6]
                }}
                transition={{ 
                  duration: fruit.isGlowing ? 2.5 : 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
              />
              
              {/* 実のハイライト（リアル） */}
              <motion.ellipse
                cx={fruit.x - 1.2}
                cy={fruit.y - 1.5}
                rx="1.8"
                ry="2.2"
                fill="rgba(255,255,255,0.6)"
                className="pointer-events-none"
                animate={fruit.isGlowing ? { 
                  opacity: [0.4, 0.8, 0.4],
                  scale: [0.9, 1.1, 0.9]
                } : {
                  opacity: [0.2, 0.5, 0.2],
                  scale: [0.8, 1, 0.8]
                }}
                transition={{ 
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* 実のインナーシャドウ */}
              <motion.circle
                cx={fruit.x}
                cy={fruit.y}
                r="3.8"
                fill="none"
                stroke={fruitColors.shadow}
                strokeWidth="0.3"
                opacity="0.4"
                className="pointer-events-none"
              />
              
              {/* 未投稿の誘導表示（洗練） */}
              {!fruit.isGlowing && (
                <motion.g>
                  <motion.circle
                    cx={fruit.x}
                    cy={fruit.y - 7}
                    r="3"
                    fill="rgba(255,255,255,0.95)"
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth="0.5"
                    className="pointer-events-none"
                    animate={{ 
                      y: [fruit.y - 7, fruit.y - 9, fruit.y - 7],
                      scale: [0.9, 1.1, 0.9]
                    }}
                    transition={{ 
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <motion.text
                    x={fruit.x}
                    y={fruit.y - 6}
                    textAnchor="middle"
                    fontSize="2.2"
                    fill="#666"
                    className="pointer-events-none font-medium"
                    animate={{ 
                      y: [fruit.y - 6, fruit.y - 8, fruit.y - 6]
                    }}
                    transition={{ 
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    ✏️
                  </motion.text>
                </motion.g>
              )}
            </motion.g>
          );
        })}
        
        {/* 子供の名前（プレミアムデザイン） */}
        <motion.g
          animate={{ 
            scale: [1, 1.02, 1]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <rect
            x="32"
            y="84"
            width="36"
            height="8"
            rx="4"
            fill="rgba(139, 69, 19, 0.85)"
            filter="url(#professionalShadow)"
          />
          <rect
            x="32.5"
            y="84.5"
            width="35"
            height="7"
            rx="3.5"
            fill="rgba(160, 136, 127, 0.3)"
          />
          <text
            x="50"
            y="89"
            textAnchor="middle"
            fontSize="2.8"
            fill="#fff"
            fontWeight="600"
            className="font-serif"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            {childrenNames.join(' ♡ ')}
          </text>
        </motion.g>
        
        {/* 育児日数表示（エレガント） */}
        <motion.g
          animate={{ 
            scale: [1, 1.03, 1]
          }}
          transition={{ 
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <rect
            x="15"
            y="93"
            width="70"
            height="5.5"
            rx="2.75"
            fill="rgba(255, 255, 255, 0.95)"
            stroke="rgba(76, 175, 80, 0.3)"
            strokeWidth="0.3"
            filter="url(#professionalShadow)"
          />
          <text
            x="50"
            y="97"
            textAnchor="middle"
            fontSize="2.5"
            fill="#2e7d32"
            fontWeight="600"
            className="font-sans"
          >
            育児 {parentingDays} 日目の成長記録
          </text>
        </motion.g>
      </svg>
    </motion.div>
  );
}
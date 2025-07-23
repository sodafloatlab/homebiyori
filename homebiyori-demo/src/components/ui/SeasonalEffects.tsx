'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export default function SeasonalEffects() {
  const [season, setSeason] = useState<Season>('spring');

  useEffect(() => {
    const month = new Date().getMonth(); // 0-11
    
    if (month >= 2 && month <= 4) {
      setSeason('spring');
    } else if (month >= 5 && month <= 7) {
      setSeason('summer');
    } else if (month >= 8 && month <= 10) {
      setSeason('autumn');
    } else {
      setSeason('winter');
    }
  }, []);

  const renderSeasonalEffect = () => {
    switch (season) {
      case 'spring':
        return (
          <>
            {/* 桜の花びら */}
            {Array.from({ length: 5 }, (_, i) => (
              <motion.div
                key={`petal-${i}`}
                className="absolute w-2 h-2 bg-pink-300 rounded-full opacity-70"
                style={{
                  left: `${20 + i * 15}%`,
                  top: '-10px'
                }}
                animate={{
                  y: ['0vh', '100vh'],
                  x: [0, Math.sin(i) * 50, 0],
                  rotate: [0, 360],
                  opacity: [0, 0.8, 0]
                }}
                transition={{
                  duration: 8 + i,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 2
                }}
              />
            ))}
          </>
        );
      
      case 'summer':
        return (
          <>
            {/* 蝶々 */}
            <motion.div
              className="absolute top-1/4 left-1/4"
              animate={{
                x: [0, 100, 50, 150, 0],
                y: [0, -30, 20, -10, 0]
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="text-2xl">🦋</div>
            </motion.div>
          </>
        );
      
      case 'autumn':
        return (
          <>
            {/* 落ち葉 */}
            {Array.from({ length: 4 }, (_, i) => (
              <motion.div
                key={`leaf-${i}`}
                className="absolute text-lg"
                style={{
                  left: `${10 + i * 20}%`,
                  top: '-20px'
                }}
                animate={{
                  y: ['0vh', '100vh'],
                  x: [0, Math.sin(i) * 30, 0],
                  rotate: [0, 180, 360],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 10 + i * 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 3
                }}
              >
                {['🍂', '🍁', '🌿', '🍃'][i]}
              </motion.div>
            ))}
          </>
        );
      
      case 'winter':
        return (
          <>
            {/* 雪の結晶 */}
            {Array.from({ length: 6 }, (_, i) => (
              <motion.div
                key={`snow-${i}`}
                className="absolute text-white text-lg opacity-80"
                style={{
                  left: `${15 + i * 12}%`,
                  top: '-20px'
                }}
                animate={{
                  y: ['0vh', '100vh'],
                  x: [0, Math.sin(i) * 20, 0],
                  rotate: [0, 360],
                  opacity: [0, 0.8, 0]
                }}
                transition={{
                  duration: 12 + i,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 1.5
                }}
              >
                ❄️
              </motion.div>
            ))}
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      {renderSeasonalEffect()}
    </div>
  );
}
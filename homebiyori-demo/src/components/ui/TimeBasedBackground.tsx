'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SeasonalEffects from './SeasonalEffects';

interface TimeBasedBackgroundProps {
  children: React.ReactNode;
}

type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

export default function TimeBasedBackground({ children }: TimeBasedBackgroundProps) {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');

  useEffect(() => {
    const updateTimeOfDay = () => {
      const hours = new Date().getHours();
      
      if (hours >= 5 && hours < 10) {
        setTimeOfDay('morning');
      } else if (hours >= 10 && hours < 17) {
        setTimeOfDay('day');
      } else if (hours >= 17 && hours < 21) {
        setTimeOfDay('evening');
      } else {
        setTimeOfDay('night');
      }
    };

    updateTimeOfDay();
    const interval = setInterval(updateTimeOfDay, 60000); // 1分ごとに更新

    return () => clearInterval(interval);
  }, []);

  const backgrounds = {
    morning: 'bg-gradient-to-br from-pink-200 via-orange-100 to-yellow-100',
    day: 'bg-gradient-to-br from-sky-200 via-blue-100 to-green-100',
    evening: 'bg-gradient-to-br from-orange-200 via-pink-100 to-purple-100',
    night: 'bg-gradient-to-br from-indigo-300 via-purple-200 to-blue-200'
  };

  const timeMessages = {
    morning: '朝のひととき、今日も頑張りましょう ☀️',
    day: '日中のお疲れ様です 🌤️',
    evening: '夕方のひととき、お疲れ様でした 🌅',
    night: '夜のリラックスタイム 🌙'
  };

  return (
    <motion.div 
      className={`min-h-screen transition-all duration-1000 ${backgrounds[timeOfDay]}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* 時間帯に応じた装飾要素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {timeOfDay === 'morning' && (
          <>
            {/* 朝の太陽 */}
            <motion.div
              className="absolute top-8 right-8 w-16 h-16 bg-yellow-300 rounded-full opacity-70"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 10, 0]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            {/* 朝の光線 */}
            {Array.from({ length: 6 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute top-10 right-10 w-1 h-8 bg-yellow-200 origin-bottom"
                style={{ 
                  transform: `rotate(${i * 60}deg)`,
                  transformOrigin: '50% 100%'
                }}
                animate={{ 
                  opacity: [0.3, 0.7, 0.3],
                  scaleY: [0.8, 1.2, 0.8]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2
                }}
              />
            ))}
          </>
        )}

        {timeOfDay === 'day' && (
          <>
            {/* 昼の雲 */}
            <motion.div
              className="absolute top-4 left-8 w-20 h-8 bg-white rounded-full opacity-60"
              animate={{ 
                x: [0, 10, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute top-12 right-16 w-16 h-6 bg-white rounded-full opacity-50"
              animate={{ 
                x: [0, -8, 0],
                scale: [1, 1.03, 1]
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </>
        )}

        {timeOfDay === 'evening' && (
          <>
            {/* 夕日 */}
            <motion.div
              className="absolute top-16 right-4 w-20 h-20 bg-gradient-to-br from-orange-300 to-red-300 rounded-full opacity-60"
              animate={{ 
                scale: [1, 1.08, 1],
                y: [0, 2, 0]
              }}
              transition={{ 
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            {/* 夕焼け雲 */}
            <motion.div
              className="absolute top-20 left-4 w-24 h-6 bg-gradient-to-r from-pink-200 to-orange-200 rounded-full opacity-70"
              animate={{ 
                x: [0, 5, 0],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ 
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </>
        )}

        {timeOfDay === 'night' && (
          <>
            {/* 月 */}
            <motion.div
              className="absolute top-6 right-8 w-14 h-14 bg-yellow-100 rounded-full opacity-80"
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 5, 0]
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            {/* 星 */}
            {Array.from({ length: 8 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-yellow-200 rounded-full"
                style={{
                  top: `${10 + (i % 4) * 15}%`,
                  left: `${15 + (i % 3) * 25}%`
                }}
                animate={{ 
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5
                }}
              />
            ))}
          </>
        )}
      </div>
      
      {/* 季節の演出 */}
      <SeasonalEffects />
      
      {/* メインコンテンツ */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import WatercolorTree from '@/components/ui/WatercolorTree';
import PremiumPostButtons from '@/components/ui/PremiumPostButtons';
import FloatingMessage from '@/components/ui/FloatingMessage';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import LetterModal from '@/components/ui/LetterModal';

// モックデータの型定義
interface MockFruit {
  id: string;
  x: number;
  y: number;
  type: 'encouragement' | 'reflection';
  aiRole: 'たまさん' | 'まどか姉さん' | 'ヒデじい';
  message: string;
  createdAt: string;
  isGlowing: boolean;
}

export default function TreeGrowthDemo() {
  // 育児日数（モック）- 成長段階を切り替え可能に
  const [parentingDays, setParentingDays] = useState(45);
  
  // 演出状態管理
  const [showFloatingMessage, setShowFloatingMessage] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const [selectedFruit, setSelectedFruit] = useState<MockFruit | null>(null);
  const [floatingPosition, setFloatingPosition] = useState({ x: 0, y: 0 });
  const [isFirstPost, setIsFirstPost] = useState(true);
  
  // 子供の名前（モック）
  const [childrenNames] = useState(['たろう', 'はなこ']);
  
  // 実のデータ（モック）
  const [fruits, setFruits] = useState<MockFruit[]>([
    {
      id: '1',
      x: 45,
      y: 35,
      type: 'encouragement',
      aiRole: 'たまさん',
      message: '今日もお疲れ様でした。お子さんの笑顔を大切にするあなた、とても素敵です。',
      createdAt: '2025-07-22',
      isGlowing: true
    },
    {
      id: '2',
      x: 65,
      y: 40,
      type: 'reflection',
      aiRole: 'まどか姉さん',
      message: '育児は大変だけど、あなたなら大丈夫。一歩一歩、確実に前に進んでいますね。',
      createdAt: '2025-07-21',
      isGlowing: true
    },
    {
      id: '3',
      x: 55,
      y: 50,
      type: 'encouragement',
      aiRole: 'ヒデじい',
      message: 'おつかれさん。君の子育ては立派じゃよ。昔も今も、親の愛は変わらんからのう。',
      createdAt: '2025-07-20',
      isGlowing: true
    },
    // 今日の分（未投稿）
    {
      id: '4',
      x: 50,
      y: 30,
      type: 'encouragement',
      aiRole: 'たまさん',
      message: '',
      createdAt: '2025-07-23',
      isGlowing: false
    }
  ]);

  // 実をタップした時の処理
  const handleFruitClick = (fruit: MockFruit, event?: MouseEvent) => {
    if (fruit.isGlowing && fruit.message) {
      // 浮遊演出付きでメッセージ表示
      if (event) {
        setFloatingPosition({ x: event.clientX, y: event.clientY });
      } else {
        // フォールバック位置
        setFloatingPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      }
      setSelectedFruit(fruit);
      setShowFloatingMessage(true);
    } else if (!fruit.isGlowing) {
      // 投稿誘導
      alert('今日の「えらい」を投稿してみませんか？\n📷写真から投稿 または 📝今日のえらいを書く');
    }
  };

  // 新しい投稿の処理（モック）
  const handleNewPost = (type: 'photo' | 'text') => {
    // 今日の実を光らせる
    const updatedFruits = fruits.map(fruit => {
      if (fruit.id === '4') {
        return {
          ...fruit,
          message: `${type === 'photo' ? '写真' : 'テキスト'}投稿をありがとうございます！今日も一日、本当にお疲れ様でした。`,
          isGlowing: true
        };
      }
      return fruit;
    });
    setFruits(updatedFruits);
    
    // 投稿時の演出
    setShowCelebration(true);
    
    // 初回投稿の場合は手紙演出も表示
    if (isFirstPost) {
      setTimeout(() => {
        const todaysFruit = updatedFruits.find(f => f.id === '4');
        if (todaysFruit) {
          setSelectedFruit(todaysFruit);
          setShowLetter(true);
          setIsFirstPost(false);
        }
      }, 3000); // お祝い演出の後に表示
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50">
      <div className="flex flex-col items-center space-y-8 p-4">
        

        {/* 成長段階コントロール */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-green-100">
          <h3 className="font-kaisei-tokumin text-lg font-bold text-green-700 mb-4 text-center">成長段階をお試しください</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-4xl">
            <button
              onClick={() => setParentingDays(5)}
              className={`font-kaisei-tokumin px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                parentingDays <= 7 
                  ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                  : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              🌱 芽
            </button>
            <button
              onClick={() => setParentingDays(20)}
              className={`font-kaisei-tokumin px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                parentingDays > 7 && parentingDays <= 30 
                  ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                  : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              🌿 苗
            </button>
            <button
              onClick={() => setParentingDays(60)}
              className={`font-kaisei-tokumin px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                parentingDays > 30 && parentingDays <= 90 
                  ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                  : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              🌱 若木
            </button>
            <button
              onClick={() => setParentingDays(120)}
              className={`font-kaisei-tokumin px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                parentingDays > 90 && parentingDays <= 180 
                  ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                  : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              🌿 中木
            </button>
            <button
              onClick={() => setParentingDays(200)}
              className={`font-kaisei-tokumin px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                parentingDays > 180 && parentingDays <= 365 
                  ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                  : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              🌳 大木
            </button>
            <button
              onClick={() => setParentingDays(800)}
              className={`font-kaisei-tokumin px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                parentingDays > 365 
                  ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                  : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              🌳 巨木
            </button>
          </div>
        </div>

      {/* 木の成長UI */}
      <div className="w-full">
        <WatercolorTree
          ageInDays={parentingDays}
          fruits={fruits}
          childrenNames={childrenNames}
          onFruitClick={handleFruitClick}
        />
      </div>

      {/* 投稿ボタン */}
      <PremiumPostButtons onPost={handleNewPost} />
      
      {/* 演出コンポーネント */}
      {selectedFruit && (
        <FloatingMessage
          isVisible={showFloatingMessage}
          message={selectedFruit.message}
          aiRole={selectedFruit.aiRole}
          date={selectedFruit.createdAt}
          position={floatingPosition}
          onClose={() => setShowFloatingMessage(false)}
        />
      )}
      
      <CelebrationOverlay
        isVisible={showCelebration}
        onClose={() => setShowCelebration(false)}
      />
      
      {selectedFruit && (
        <LetterModal
          isVisible={showLetter}
          message={selectedFruit.message}
          aiRole={selectedFruit.aiRole}
          onClose={() => setShowLetter(false)}
        />
      )}
      </div>
    </div>
  );
}
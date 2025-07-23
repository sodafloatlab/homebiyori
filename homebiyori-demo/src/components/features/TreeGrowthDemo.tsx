'use client';

import { useState, useRef } from 'react';
import SimplifiedCanvasTree from '@/components/ui/SimplifiedCanvasTree';
import PremiumPostButtons from '@/components/ui/PremiumPostButtons';
import FloatingMessage from '@/components/ui/FloatingMessage';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import LetterModal from '@/components/ui/LetterModal';

// モックデータの型定義
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

export default function TreeGrowthDemo() {
  // 育児日数（モック）
  const [parentingDays] = useState(45);
  
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
      color: 'pink',
      aiRole: 'たまさん',
      message: '今日もお疲れ様でした。お子さんの笑顔を大切にするあなた、とても素敵です。',
      date: '2025-07-22',
      isGlowing: true
    },
    {
      id: '2',
      x: 65,
      y: 40,
      color: 'blue',
      aiRole: 'まどか姉さん',
      message: '育児は大変だけど、あなたなら大丈夫。一歩一歩、確実に前に進んでいますね。',
      date: '2025-07-21',
      isGlowing: true
    },
    {
      id: '3',
      x: 55,
      y: 50,
      color: 'gold',
      aiRole: 'ヒデじい',
      message: 'おつかれさん。君の子育ては立派じゃよ。昔も今も、親の愛は変わらんからのう。',
      date: '2025-07-20',
      isGlowing: true
    },
    // 今日の分（未投稿）
    {
      id: '4',
      x: 50,
      y: 30,
      color: 'pink',
      aiRole: 'たまさん',
      message: '',
      date: '2025-07-23',
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
    <div className="flex flex-col items-center space-y-12">
      {/* 木の成長UI */}
      <div className="w-full">
        <SimplifiedCanvasTree
          parentingDays={parentingDays}
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
          date={selectedFruit.date}
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
  );
}
'use client';

import { useState } from 'react';
import WatercolorTree from '@/components/ui/WatercolorTree';
import PremiumPostButtons from '@/components/ui/PremiumPostButtons';
import FloatingMessage from '@/components/ui/FloatingMessage';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import LetterModal from '@/components/ui/LetterModal';
import { AI_ROLES, getAIRoleStyle } from '@/lib/aiRoleStyles';

// モックデータの型定義
interface MockFruit {
  id: string;
  x: number;
  y: number;
  type: 'encouragement' | 'reflection';
  aiRole: string;
  message: string;
  createdAt: string;
  isGlowing: boolean;
}

export default function TreeGrowthDemo() {
  // 育児日数（モック）- 成長段階を切り替え可能に
  const [parentingDays, setParentingDays] = useState(45);
  
  // AIロール設定
  const [currentAIRole, setCurrentAIRole] = useState('tama');
  
  // 演出状態管理
  const [showFloatingMessage, setShowFloatingMessage] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const [selectedFruit, setSelectedFruit] = useState<MockFruit | null>(null);
  const [floatingPosition, setFloatingPosition] = useState({ x: 0, y: 0 });
  const [isFirstPost, setIsFirstPost] = useState(true);
  const [newlyAddedFruit, setNewlyAddedFruit] = useState<string | null>(null);
  
  // 子供の名前（モック）
  const [childrenNames] = useState(['たろう', 'はなこ']);
  
  // 実のデータ（モック）
  const [fruits, setFruits] = useState<MockFruit[]>([
    {
      id: '1',
      x: 45,
      y: 35,
      type: 'encouragement',
      aiRole: 'tama',
      message: '今日もお疲れ様でした。お子さんの笑顔を大切にするあなた、とても素敵です。',
      createdAt: '2025-07-22',
      isGlowing: true
    },
    {
      id: '2',
      x: 65,
      y: 40,
      type: 'reflection',
      aiRole: 'madoka',
      message: '育児は大変だけど、あなたなら大丈夫。一歩一歩、確実に前に進んでいますね。',
      createdAt: '2025-07-21',
      isGlowing: true
    },
    {
      id: '3',
      x: 55,
      y: 50,
      type: 'encouragement',
      aiRole: 'hidejii',
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
      aiRole: 'tama',
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
    // まずはメッセージを準備（実はまだ光らせない）
    const newMessage = `${type === 'photo' ? '写真' : 'テキスト'}投稿をありがとうございます！今日も一日、本当にお疲れ様でした。`;
    
    // 投稿時の演出
    setShowCelebration(true);
    
    // 初回投稿の場合は手紙演出も表示
    if (isFirstPost) {
      setTimeout(() => {
        // 手紙用の実データを準備
        setSelectedFruit({
          id: '4',
          x: 50,
          y: 30,
          type: 'encouragement',
          aiRole: currentAIRole,
          message: newMessage,
          createdAt: '2025-07-23',
          isGlowing: false // まだ光らせない
        });
        setShowLetter(true);
        setIsFirstPost(false);
      }, 3000); // お祝い演出の後に表示
    }
  };

  // 手紙を閉じる際の処理
  const handleLetterClose = () => {
    setShowLetter(false);
    
    // 手紙を閉じる際に実を光らせる
    setTimeout(() => {
      const updatedFruits = fruits.map(fruit => {
        if (fruit.id === '4') {
          return {
            ...fruit,
            aiRole: currentAIRole,
            message: selectedFruit?.message || '',
            isGlowing: true
          };
        }
        return fruit;
      });
      setFruits(updatedFruits);
      
      // 新しく追加された実として記録
      setNewlyAddedFruit('4');
      
      // 3秒後に特別エフェクトを終了
      setTimeout(() => {
        setNewlyAddedFruit(null);
      }, 3000);
    }, 300); // 手紙が閉じるアニメーションの後
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50">
      <div className="flex flex-col items-center space-y-8 p-4">
        

        {/* AIロール選択 */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-green-100 mb-6">
          <h3 className="font-zen-maru-gothic text-lg font-bold text-green-700 mb-4 text-center">AIキャラクター選択</h3>
          <div className="flex justify-center gap-4">
            {Object.values(AI_ROLES).map((role) => {
              const isSelected = currentAIRole === role.name;
              const style = getAIRoleStyle(role.name);
              return (
                <button
                  key={role.name}
                  onClick={() => setCurrentAIRole(role.name)}
                  className={`font-zen-maru-gothic px-4 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg border-2 ${
                    isSelected 
                      ? `bg-gradient-to-br ${style.iconBg} ${style.textColor} border-white/70 shadow-xl scale-105` 
                      : 'bg-white/80 text-gray-600 border-gray-200/50 hover:bg-white hover:shadow-md hover:scale-102'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <div className="text-lg mb-1">{role.displayName.charAt(0)}</div>
                    <div className="text-xs">{role.displayName}</div>
                    <div className="text-[10px] opacity-70">({role.personality})</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 成長段階コントロール */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-green-100">
          <h3 className="font-zen-maru-gothic text-lg font-bold text-green-700 mb-4 text-center">成長段階をお試しください</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-4xl">
            <button
              onClick={() => setParentingDays(5)}
              className={`font-zen-maru-gothic px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                parentingDays <= 7 
                  ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                  : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              🌱 芽
            </button>
            <button
              onClick={() => setParentingDays(20)}
              className={`font-zen-maru-gothic px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                parentingDays > 7 && parentingDays <= 30 
                  ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                  : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              🌿 苗
            </button>
            <button
              onClick={() => setParentingDays(60)}
              className={`font-zen-maru-gothic px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                parentingDays > 30 && parentingDays <= 90 
                  ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                  : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              🌱 若木
            </button>
            <button
              onClick={() => setParentingDays(120)}
              className={`font-zen-maru-gothic px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                parentingDays > 90 && parentingDays <= 180 
                  ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                  : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              🌿 中木
            </button>
            <button
              onClick={() => setParentingDays(200)}
              className={`font-zen-maru-gothic px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                parentingDays > 180 && parentingDays <= 365 
                  ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                  : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              🌳 大木
            </button>
            <button
              onClick={() => setParentingDays(800)}
              className={`font-zen-maru-gothic px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
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
        {/* 木の説明文 */}
        <div className="text-center mb-8 px-4">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 max-w-lg mx-auto">
            <p className="font-zen-maru-gothic text-slate-700 text-sm md:text-base leading-relaxed">
              木は今日も静かに育っています<br />
              <span className="text-emerald-600 font-bold">あなたの育児の頑張りが小さな実になっていきます</span>
            </p>
            
            {/* 装飾的なライン */}
            <div className="flex items-center justify-center mt-4 space-x-2">
              <span className="w-6 h-px bg-gradient-to-r from-transparent to-emerald-300"></span>
              <span className="text-emerald-400 text-xs">🌱</span>
              <span className="w-6 h-px bg-gradient-to-l from-transparent to-emerald-300"></span>
            </div>
          </div>
        </div>
        
        <WatercolorTree
          ageInDays={parentingDays}
          fruits={fruits}
          childrenNames={childrenNames}
          onFruitClick={handleFruitClick}
          newlyAddedFruitId={newlyAddedFruit}
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
        aiRole={currentAIRole}
        onClose={() => setShowCelebration(false)}
      />
      
      {selectedFruit && (
        <LetterModal
          isVisible={showLetter}
          message={selectedFruit.message}
          aiRole={selectedFruit.aiRole}
          onClose={handleLetterClose}
        />
      )}
      </div>
    </div>
  );
}
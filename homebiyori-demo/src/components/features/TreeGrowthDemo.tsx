'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import AiIcon, { getAiRoleName } from '@/components/ui/AiIcon';
import WatercolorTree from '@/components/ui/WatercolorTree';
import PremiumPostButtons from '@/components/ui/PremiumPostButtons';
import FloatingMessage from '@/components/ui/FloatingMessage';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import LetterModal from '@/components/ui/LetterModal';
import AiRoleSelector, { AiRole } from '@/components/ui/AiRoleSelector';
import PostForm from '@/components/ui/PostForm';
import TreeShadeChat from '@/components/ui/TreeShadeChat';
import { DemoStorage, DemoPost } from '@/lib/demoStorage';

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
  // ローカルストレージから状態を読み込み
  const [selectedAiRole, setSelectedAiRole] = useState<AiRole | null>(null);
  const [posts, setPosts] = useState<DemoPost[]>([]);
  const [treeData, setTreeData] = useState({ totalDays: 1, totalPosts: 0, fruits: { tama: 0, madoka: 0, hide: 0 } });
  
  // UI状態管理
  const [currentView, setCurrentView] = useState<'setup' | 'tree' | 'post'>('setup');
  const [postType, setPostType] = useState<'photo' | 'text' | null>(null);
  const [showTreeShadeChat, setShowTreeShadeChat] = useState(false);
  
  // 演出状態管理
  const [showFloatingMessage, setShowFloatingMessage] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const [selectedFruit, setSelectedFruit] = useState<MockFruit | null>(null);
  const [floatingPosition, setFloatingPosition] = useState({ x: 0, y: 0 });
  
  // デモ用の育児日数コントロール
  const [demoParentingDays, setDemoParentingDays] = useState<number | null>(null);
  
  // 子供の名前（モック）
  const [childrenNames] = useState(['たろう', 'はなこ']);
  
  // データの初期化
  useEffect(() => {
    const userData = DemoStorage.load();
    setSelectedAiRole(userData.selectedAiRole);
    setPosts(DemoStorage.getPosts());
    setTreeData(DemoStorage.getTreeData());
    
    // 初回起動時はセットアップ画面、既に設定済みならツリー画面
    if (userData.selectedAiRole) {
      setCurrentView('tree');
    }
  }, []);
  
  // 実のデータを生成（投稿データから）
  const generateFruits = (): MockFruit[] => {
    return posts.slice(0, 20).map((post, index) => ({
      id: post.id,
      x: 40 + (index % 5) * 5 + Math.random() * 20,
      y: 30 + Math.floor(index / 5) * 15 + Math.random() * 10,
      type: 'encouragement' as const,
      aiRole: post.aiRole === 'tama' ? 'たまさん' : post.aiRole === 'madoka' ? 'まどか姉さん' : 'ヒデじい',
      message: post.praise,
      createdAt: new Date(post.timestamp).toLocaleDateString(),
      isGlowing: true
    }));
  };

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
    }
  };

  // AIロール選択処理
  const handleRoleSelect = (role: AiRole) => {
    setSelectedAiRole(role);
    DemoStorage.setAiRole(role);
    setCurrentView('tree');
  };

  // 投稿ボタンクリック処理
  const handlePostClick = (type: 'photo' | 'text') => {
    if (!selectedAiRole) {
      alert('まずAIキャラクターを選択してください');
      setCurrentView('setup');
      return;
    }
    setPostType(type);
    setCurrentView('post');
  };

  // 投稿送信処理
  const handlePostSubmit = (content: string, type: 'photo' | 'text', imageFile?: File) => {
    if (!selectedAiRole) return;

    const newPost = DemoStorage.addPost(content, type, selectedAiRole, imageFile);
    setPosts(DemoStorage.getPosts());
    setTreeData(DemoStorage.getTreeData());
    setCurrentView('tree');
    
    // 投稿時の演出
    setShowCelebration(true);
    
    // 毎回の投稿で手紙演出を表示
    setTimeout(() => {
      const mockFruit: MockFruit = {
        id: newPost.id,
        x: 50,
        y: 40,
        type: 'encouragement',
        aiRole: newPost.aiRole === 'tama' ? 'たまさん' : newPost.aiRole === 'madoka' ? 'まどか姉さん' : 'ヒデじい',
        message: newPost.praise,
        createdAt: new Date(newPost.timestamp).toLocaleDateString(),
        isGlowing: true
      };
      setSelectedFruit(mockFruit);
      setShowLetter(true);
    }, 3000); // お祝い演出の後に表示
  };

  const currentAgeInDays = demoParentingDays || treeData.totalDays;
  const fruits = generateFruits();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50">
      <div className="flex flex-col items-center space-y-8 p-4">
        
        {/* ナビゲーション */}
        {currentView !== 'setup' && (
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setCurrentView('setup')}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              AIキャラクター変更
            </button>
            <button
              onClick={() => DemoStorage.clear()}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              データリセット
            </button>
          </div>
        )}

        {currentView === 'setup' && (
          <AiRoleSelector
            selectedRole={selectedAiRole}
            onRoleSelect={handleRoleSelect}
          />
        )}

        {currentView === 'tree' && (
          <>
            {/* 統計表示 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-green-100">
              <h3 className="font-noto-sans-jp text-lg font-bold text-green-700 mb-4 text-center">育児の記録</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-700">{treeData.totalDays}</div>
                  <div className="text-sm text-gray-600">育児日数</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700">{treeData.totalPosts}</div>
                  <div className="text-sm text-gray-600">投稿数</div>
                </div>
                <div>
                  <div className="text-2xl">🌸💙⭐</div>
                  <div className="text-sm text-gray-600">
                    {treeData.fruits.tama + treeData.fruits.madoka + treeData.fruits.hide} 個の実
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <AiIcon 
                    aiRole={selectedAiRole} 
                    size={48} 
                    className="border-2 border-white shadow-md mb-2" 
                  />
                  <div className="text-sm font-medium text-gray-800">
                    {getAiRoleName(selectedAiRole)}
                  </div>
                  <div className="text-xs text-gray-600">選択中</div>
                </div>
              </div>
            </div>

            {/* 成長段階コントロール */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-green-100">
              <h3 className="font-noto-sans-jp text-lg font-bold text-green-700 mb-4 text-center">成長段階をお試しください</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-4xl">
                <button
                  onClick={() => setDemoParentingDays(5)}
                  className={`font-noto-sans-jp px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                    currentAgeInDays <= 7 
                      ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                      : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  🌱 芽
                </button>
                <button
                  onClick={() => setDemoParentingDays(20)}
                  className={`font-noto-sans-jp px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                    currentAgeInDays > 7 && currentAgeInDays <= 30 
                      ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                      : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  🌿 苗
                </button>
                <button
                  onClick={() => setDemoParentingDays(60)}
                  className={`font-noto-sans-jp px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                    currentAgeInDays > 30 && currentAgeInDays <= 90 
                      ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                      : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  🌱 若木
                </button>
                <button
                  onClick={() => setDemoParentingDays(120)}
                  className={`font-noto-sans-jp px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                    currentAgeInDays > 90 && currentAgeInDays <= 180 
                      ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                      : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  🌿 中木
                </button>
                <button
                  onClick={() => setDemoParentingDays(200)}
                  className={`font-noto-sans-jp px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                    currentAgeInDays > 180 && currentAgeInDays <= 365 
                      ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                      : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  🌳 大木
                </button>
                <button
                  onClick={() => setDemoParentingDays(800)}
                  className={`font-noto-sans-jp px-3 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                    currentAgeInDays > 365 
                      ? 'bg-green-200 text-green-800 shadow-green-200/50' 
                      : 'bg-white/80 text-green-600 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  🌳 巨木
                </button>
              </div>
              <button
                onClick={() => setDemoParentingDays(null)}
                className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                実際の日数に戻す ({treeData.totalDays}日)
              </button>
            </div>

            {/* 木の成長UI */}
            <div className="w-full">
              <WatercolorTree
                ageInDays={currentAgeInDays}
                fruits={fruits}
                childrenNames={childrenNames}
                onFruitClick={handleFruitClick}
                onTreeShadeClick={() => setShowTreeShadeChat(true)}
              />
            </div>

            {/* 投稿ボタン */}
            <PremiumPostButtons onPost={handlePostClick} />
          </>
        )}

        {currentView === 'post' && postType && (
          <PostForm
            aiRole={selectedAiRole}
            onSubmit={handlePostSubmit}
            onClose={() => setCurrentView('tree')}
            type={postType}
          />
        )}
        
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

        {/* 木陰チャット */}
        {selectedAiRole && (
          <TreeShadeChat
            isVisible={showTreeShadeChat}
            onClose={() => setShowTreeShadeChat(false)}
            aiRole={selectedAiRole}
          />
        )}
      </div>
    </div>
  );
}
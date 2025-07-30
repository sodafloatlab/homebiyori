'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, RotateCcw } from 'lucide-react';
import WatercolorTree from '@/components/ui/WatercolorTree';
import { AppScreen, Fruit } from './MainApp';

interface TreeViewProps {
  totalCharacters: number;
  fruits: Fruit[];
  onNavigate: (screen: AppScreen) => void;
  previousScreen: AppScreen | null;
}


const TreeView = ({ totalCharacters, fruits, onNavigate, previousScreen }: TreeViewProps) => {
  const [selectedFruit, setSelectedFruit] = useState<Fruit | null>(null);

  // 文字数から木の成長段階を計算（6段階、テスト用に低い閾値）
  const calculateTreeStage = (characters: number): number => {
    if (characters < 20) return 1;    // 芽
    if (characters < 50) return 2;    // 小さな苗
    if (characters < 100) return 3;   // 若木
    if (characters < 180) return 4;   // 中木
    if (characters < 300) return 5;   // 大木
    return 6;                         // 完全成長
  };

  const treeStage = calculateTreeStage(totalCharacters);

  // 成長段階の情報（6段階、画像ファイルと一致）
  const getGrowthStageInfo = (stage: number) => {
    switch (stage) {
      case 1: return { stage: 1, name: '芽', description: 'あなたの育児の旅が始まりました' };
      case 2: return { stage: 2, name: '小さな苗', description: '小さな努力が積み重なっています' };
      case 3: return { stage: 3, name: '若木', description: '確実に成長を続けています' };
      case 4: return { stage: 4, name: '中木', description: 'しっかりとした土台ができました' };
      case 5: return { stage: 5, name: '大木', description: '立派に成長した証です' };
      case 6: return { stage: 6, name: '完全成長', description: 'あなたの愛情が結実しました' };
      default: return { stage: 1, name: '芽', description: 'あなたの育児の旅が始まりました' };
    }
  };

  const stageInfo = getGrowthStageInfo(treeStage);

  const handleFruitClick = (fruit: Fruit) => {
    setSelectedFruit(fruit);
  };

  const handleResetDemo = () => {
    // デモ用のリセット機能
    alert('実際のアプリでは、木の成長はリセットされません。これはデモンストレーション用の機能です。');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50" style={{
      backgroundColor: '#fdfdf8',
      backgroundImage: 'linear-gradient(135deg, #f0f9f0 0%, #fefffe 35%, #f8fcf0 100%)'
    }}>
      {/* ヘッダー */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 p-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => onNavigate(previousScreen === 'group-chat' ? 'group-chat' : 'chat')}
            className="flex items-center text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {previousScreen === 'group-chat' ? 'グループチャットに戻る' : 'チャットに戻る'}
          </button>
          
          <div className="text-center">
            <h1 className="text-xl font-bold text-emerald-800">あなたの成長の木</h1>
            <p className="text-sm text-emerald-600">{stageInfo.name}</p>
          </div>

          <button
            onClick={handleResetDemo}
            className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            title="デモリセット"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* 成長情報カード */}
        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-6 border border-emerald-100 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center">
            <h2 className="text-lg font-bold text-emerald-800 mb-2">{stageInfo.description}</h2>
            <p className="text-emerald-600 mb-4">{stageInfo.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm max-w-lg mx-auto">
              <div className="bg-emerald-50 p-3 rounded-lg">
                <div className="font-bold text-emerald-800">成長段階</div>
                <div className="text-emerald-600">{stageInfo.name}</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg">
                <div className="font-bold text-emerald-800">ほめの実</div>
                <div className="text-emerald-600">{fruits.length}個</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 木の表示エリア */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <WatercolorTree 
            ageInDays={treeStage * 100} 
            fruits={fruits}
            onFruitClick={handleFruitClick}
          />
        </motion.div>

        {/* ほめの実の一覧（直近3つのみ） */}
        {fruits.length > 0 && (
          <motion.div 
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-emerald-100 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center">
              <span className="mr-2">✨</span>
              最近のほめの実の記録
              {fruits.length > 3 && (
                <span className="text-sm text-emerald-600 ml-2">
                  （直近3つ表示 - ほめの実をクリックして全て見る）
                </span>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fruits.slice(-3).reverse().map((fruit, index) => (
                <motion.button
                  key={fruit.id}
                  onClick={() => handleFruitClick(fruit)}
                  className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 text-left transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center mb-2">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      fruit.aiRole === 'tama' ? 'bg-pink-400' :
                      fruit.aiRole === 'madoka' ? 'bg-blue-400' :
                      'bg-yellow-400'
                    }`}></div>
                    <span className="text-sm font-medium text-emerald-800">
                      {fruit.aiRole === 'tama' ? 'たまさん' : 
                       fruit.aiRole === 'madoka' ? 'まどか姉さん' : 'ヒデじい'}
                    </span>
                    <span className="text-xs text-emerald-500 ml-2">({fruit.emotion})</span>
                  </div>
                  <p className="text-sm text-emerald-700 mb-2 line-clamp-2">{fruit.aiResponse}</p>
                  <p className="text-xs text-emerald-500">{fruit.createdAt}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ほめの実の詳細モーダル */}
        {selectedFruit && (
          <motion.div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedFruit(null)}
          >
            <motion.div 
              className="bg-white rounded-xl p-6 max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className={`w-8 h-8 rounded-full mx-auto mb-2 ${
                  selectedFruit.aiRole === 'tama' ? 'bg-pink-400' :
                  selectedFruit.aiRole === 'madoka' ? 'bg-blue-400' :
                  'bg-yellow-400'
                }`}></div>
                <h3 className="text-lg font-bold text-emerald-800">
                  ほめの実の記録
                </h3>
                <p className="text-sm text-emerald-600">{selectedFruit.createdAt} • {selectedFruit.emotion}</p>
              </div>
              
              {/* ユーザーのメッセージ */}
              <div className="mb-4">
                <h4 className="text-sm font-bold text-gray-700 mb-2">あなたのメッセージ</h4>
                <div className="bg-emerald-500 text-white p-3 rounded-lg">
                  <p className="leading-relaxed">{selectedFruit.userMessage}</p>
                </div>
              </div>

              {/* AIからの返答 */}
              <div className="mb-4">
                <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-2 ${
                    selectedFruit.aiRole === 'tama' ? 'bg-pink-400' :
                    selectedFruit.aiRole === 'madoka' ? 'bg-blue-400' :
                    'bg-yellow-400'
                  }`}></div>
                  {selectedFruit.aiRole === 'tama' ? 'たまさん' : 
                   selectedFruit.aiRole === 'madoka' ? 'まどか姉さん' : 'ヒデじい'}からの返答
                </h4>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <p className="text-emerald-800 leading-relaxed">{selectedFruit.aiResponse}</p>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedFruit(null)}
                className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
              >
                閉じる
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* チャットへ戻るボタン */}
        <motion.div 
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={() => onNavigate(previousScreen === 'group-chat' ? 'group-chat' : 'chat')}
            className="flex items-center justify-center mx-auto px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            {previousScreen === 'group-chat' ? 'グループチャットを続ける' : 'チャットを続ける'}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default TreeView;
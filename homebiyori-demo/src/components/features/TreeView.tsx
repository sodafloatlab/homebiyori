'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, RotateCcw } from 'lucide-react';
import WatercolorTree from '@/components/ui/WatercolorTree';
import NavigationHeader from '../layout/NavigationHeader';
import TouchTarget from '../ui/TouchTarget';
import Typography from '../ui/Typography';
import Button from '../ui/Button';
import { AppScreen, Fruit, UserPlan } from './MainApp';

interface TreeViewProps {
  totalCharacters: number;
  fruits: Fruit[];
  onNavigate: (screen: AppScreen) => void;
  previousScreen: AppScreen | null;
  userPlan: UserPlan;
}


const TreeView = ({ totalCharacters, fruits, onNavigate, previousScreen, userPlan }: TreeViewProps) => {
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
      {/* NavigationHeader */}
      <NavigationHeader
        currentScreen="tree"
        title="あなたの成長の木"
        subtitle={stageInfo.name}
        onNavigate={onNavigate}
        previousScreen={previousScreen}
        userPlan={userPlan}
      />

      <div className="p-4">
        {/* 成長情報カード */}
        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-6 border border-emerald-100 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center">
            <Typography variant="h3" color="primary" className="mb-2">
              {stageInfo.description}
            </Typography>
            <Typography variant="body" color="secondary" className="mb-4">
              あなたの育児努力が形になった証です
            </Typography>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm max-w-lg mx-auto">
              <div className="bg-emerald-50 p-3 rounded-lg text-center">
                <Typography variant="small" weight="bold" color="primary" align="center">成長段階</Typography>
                <Typography variant="body" color="secondary" align="center">{stageInfo.name}</Typography>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg text-center">
                <Typography variant="small" weight="bold" color="primary" align="center">ほめの実</Typography>
                <Typography variant="body" color="secondary" align="center">{fruits.length}個</Typography>
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
            <Typography variant="h3" color="primary" className="mb-4 flex items-center">
              <span className="mr-2">✨</span>
              最近のほめの実の記録
              {fruits.length > 3 && (
                <Typography variant="caption" color="secondary" className="ml-2">
                  （直近3つ表示 - ほめの実をクリックして全て見る）
                </Typography>
              )}
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fruits.slice(-3).reverse().map((fruit, index) => (
                <TouchTarget
                  key={fruit.id}
                  variant="card"
                  onClick={() => handleFruitClick(fruit)}
                  className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 text-left transition-colors"
                >
                  <motion.div
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
                    <Typography variant="small" weight="medium" color="primary">
                      {fruit.aiRole === 'tama' ? 'たまさん' : 
                       fruit.aiRole === 'madoka' ? 'まどか姉さん' : 'ヒデじい'}
                    </Typography>
                    <Typography variant="small" color="secondary" className="ml-2">({fruit.emotion})</Typography>
                  </div>
                  <Typography variant="small" color="secondary" className="mb-2 line-clamp-2">{fruit.aiResponse}</Typography>
                  <Typography variant="small" color="secondary">{fruit.createdAt}</Typography>
                  </motion.div>
                </TouchTarget>
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
                <Typography variant="h3" color="primary">
                  ほめの実の記録
                </Typography>
                <Typography variant="caption" color="secondary">{selectedFruit.createdAt} • {selectedFruit.emotion}</Typography>
              </div>
              
              {/* ユーザーのメッセージ */}
              <div className="mb-4">
                <Typography variant="small" weight="bold" color="secondary" className="mb-2">あなたのメッセージ</Typography>
                <div className="bg-emerald-500 text-white p-3 rounded-lg">
                  <Typography variant="body" className="leading-relaxed text-white">{selectedFruit.userMessage}</Typography>
                </div>
              </div>

              {/* AIからの返答 */}
              <div className="mb-4">
                <Typography variant="small" weight="bold" color="secondary" className="mb-2 flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-2 ${
                    selectedFruit.aiRole === 'tama' ? 'bg-pink-400' :
                    selectedFruit.aiRole === 'madoka' ? 'bg-blue-400' :
                    'bg-yellow-400'
                  }`}></div>
                  {selectedFruit.aiRole === 'tama' ? 'たまさん' : 
                   selectedFruit.aiRole === 'madoka' ? 'まどか姉さん' : 'ヒデじい'}からの返答
                </Typography>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <Typography variant="body" color="primary" className="leading-relaxed">{selectedFruit.aiResponse}</Typography>
                </div>
              </div>
              
              <Button
                variant="primary"
                fullWidth
                onClick={() => setSelectedFruit(null)}
              >
                閉じる
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* アクションボタン */}
        <motion.div 
          className="text-center mt-6 space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <TouchTarget
              onClick={() => onNavigate(previousScreen === 'group-chat' ? 'group-chat' : 'chat')}
              className="flex items-center justify-center px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              {previousScreen === 'group-chat' ? 'グループチャットを続ける' : 'チャットを続ける'}
            </TouchTarget>
            
            <TouchTarget
              onClick={handleResetDemo}
              className="flex items-center justify-center px-4 py-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-200"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              デモリセット
            </TouchTarget>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TreeView;
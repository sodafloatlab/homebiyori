'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ArrowLeft, Flower, Calendar, Heart, RefreshCw } from 'lucide-react';
import { AppScreen, TreeStage, Fruit } from '@/types';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import TouchTarget from '@/components/ui/TouchTarget';
import Toast from '@/components/ui/Toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth, useTree, useMaintenance } from '@/lib/hooks';
import { useTreeService } from '@/lib/api/treeService';

interface TreeViewProps {
  onNavigate: (screen: AppScreen) => void;
  previousScreen?: AppScreen;
}

const TreeView = ({ onNavigate, previousScreen = 'chat' }: TreeViewProps) => {
  const [selectedFruit, setSelectedFruit] = useState<Fruit | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ type: 'success' as const, title: '', message: '' });

  const auth = useAuth();
  const tree = useTree();
  const maintenance = useMaintenance();
  const treeService = useTreeService();

  // コンポーネントマウント時にデータを読み込み
  useEffect(() => {
    if (auth.user) {
      tree.loadTreeStatus();
    }
  }, [auth.user, tree]);

  // 成長段階の情報を取得
  const getGrowthStageInfo = (stage: TreeStage) => {
    switch (stage) {
      case 1: return { 
        stage: 1, 
        name: '芽', 
        description: 'あなたの育児の旅が始まりました',
        emoji: '🌱',
        color: 'text-green-600'
      };
      case 2: return { 
        stage: 2, 
        name: '小さな苗', 
        description: '小さな努力が積み重なっています',
        emoji: '🌿',
        color: 'text-green-600'
      };
      case 3: return { 
        stage: 3, 
        name: '若木', 
        description: '確実に成長を続けています',
        emoji: '🌲',
        color: 'text-green-700'
      };
      case 4: return { 
        stage: 4, 
        name: '中木', 
        description: 'しっかりとした土台ができました',
        emoji: '🌳',
        color: 'text-green-800'
      };
      case 5: return { 
        stage: 5, 
        name: '大木', 
        description: '立派に成長した証です',
        emoji: '🌳',
        color: 'text-green-900'
      };
      case 6: return { 
        stage: 6, 
        name: '完全成長', 
        description: 'あなたの愛情が結実しました',
        emoji: '🌳',
        color: 'text-emerald-900'
      };
      default: return { 
        stage: 1, 
        name: '芽', 
        description: 'あなたの育児の旅が始まりました',
        emoji: '🌱',
        color: 'text-green-600'
      };
    }
  };

  const currentStage = tree.treeStatus?.current_stage || 1;
  const stageInfo = getGrowthStageInfo(currentStage);

  // AIキャラクターの情報
  const getCharacterInfo = (aiCharacter: string) => {
    switch (aiCharacter) {
      case 'tama':
        return { name: 'たまさん', color: 'bg-rose-400', textColor: 'text-rose-700' };
      case 'madoka':
        return { name: 'まどか姉さん', color: 'bg-sky-400', textColor: 'text-sky-700' };
      case 'hide':
        return { name: 'ヒデじい', color: 'bg-amber-400', textColor: 'text-amber-700' };
      default:
        return { name: 'AI', color: 'bg-gray-400', textColor: 'text-gray-700' };
    }
  };

  // 実をクリックした時の処理
  const handleFruitClick = (fruit: Fruit) => {
    setSelectedFruit(fruit);
  };

  // 木の成長状況を更新
  const handleRefreshTree = async () => {
    if (maintenance.isMaintenanceMode) {
      setToastMessage({
        type: 'error',
        title: 'メンテナンス中',
        message: 'メンテナンス中のため、更新できません。'
      });
      setShowToast(true);
      return;
    }

    try {
      await tree.loadTreeStatus();
      setToastMessage({
        type: 'success',
        title: '更新完了',
        message: '木の状態を最新に更新しました。'
      });
      setShowToast(true);
    } catch (error) {
      setToastMessage({
        type: 'error',
        title: '更新エラー',
        message: '木の状態の更新に失敗しました。'
      });
      setShowToast(true);
    }
  };

  // 日付のフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      {/* ナビゲーションヘッダー */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => onNavigate(previousScreen)}
          >
            戻る
          </Button>

          <div className="text-center">
            <Typography variant="h4" color="primary">
              あなたの成長の木
            </Typography>
            <Typography variant="caption" color="secondary">
              {stageInfo.name}
            </Typography>
          </div>

          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRefreshTree}
            disabled={tree.isLoading}
          >
            更新
          </Button>
        </div>
      </div>

      {tree.isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" color="emerald" />
        </div>
      ) : (
        <div className="p-4 pb-32">
          {/* 成長情報カード */}
          <motion.div 
            className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-6">
              <div className="text-8xl mb-4">
                {stageInfo.emoji}
              </div>
              <Typography variant="h2" color="primary" className="mb-2">
                {stageInfo.description}
              </Typography>
              <Typography variant="body" color="secondary">
                あなたの育児努力が形になった証です
              </Typography>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50 p-4 rounded-xl text-center">
                <Typography variant="small" weight="bold" color="primary">成長段階</Typography>
                <Typography variant="h3" color="primary" className={stageInfo.color}>
                  {stageInfo.name}
                </Typography>
                <Typography variant="caption" color="secondary">
                  {currentStage}/6
                </Typography>
              </div>
              
              <div className="bg-green-50 p-4 rounded-xl text-center">
                <Typography variant="small" weight="bold" color="primary">ほめの実</Typography>
                <Typography variant="h3" color="primary">
                  {tree.treeStatus?.fruits_count || 0}個
                </Typography>
                <Typography variant="caption" color="secondary">
                  感情が実になった数
                </Typography>
              </div>

              <div className="bg-lime-50 p-4 rounded-xl text-center">
                <Typography variant="small" weight="bold" color="primary">会話数</Typography>
                <Typography variant="h3" color="primary">
                  {tree.treeStatus?.total_messages || 0}回
                </Typography>
                <Typography variant="caption" color="secondary">
                  AIとの対話回数
                </Typography>
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
            <div className="bg-gradient-to-b from-sky-100 to-emerald-100 rounded-2xl p-8 text-center relative overflow-hidden">
              {/* 背景装飾 */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 left-4 text-4xl">☀️</div>
                <div className="absolute top-8 right-8 text-2xl">☁️</div>
                <div className="absolute bottom-4 left-8 text-3xl">🌸</div>
                <div className="absolute bottom-8 right-4 text-2xl">🦋</div>
              </div>
              
              {/* メインツリー */}
              <div className="relative z-10">
                <div className="text-9xl mb-4">
                  {stageInfo.emoji}
                </div>
                
                {/* 実の表示 */}
                <div className="flex justify-center flex-wrap gap-2 mb-4">
                  {Array.from({ length: Math.min(tree.treeStatus?.fruits_count || 0, 12) }).map((_, index) => (
                    <motion.div
                      key={index}
                      className="text-2xl cursor-pointer hover:scale-110 transition-transform"
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      onClick={() => {
                        if (tree.fruits && tree.fruits[index]) {
                          handleFruitClick(tree.fruits[index]);
                        }
                      }}
                    >
                      🍎
                    </motion.div>
                  ))}
                </div>
                
                <Typography variant="body" color="secondary" className="opacity-75">
                  実をクリックして思い出を振り返ってみましょう
                </Typography>
              </div>
            </div>
          </motion.div>

          {/* ほめの実の一覧 */}
          {tree.fruits && tree.fruits.length > 0 && (
            <motion.div 
              className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Typography variant="h3" color="primary" className="mb-6 flex items-center">
                <Flower className="w-6 h-6 mr-2" />
                最近のほめの実の記録
                {tree.fruits.length > 6 && (
                  <Typography variant="caption" color="secondary" className="ml-2">
                    （最新6個表示）
                  </Typography>
                )}
              </Typography>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tree.fruits.slice(-6).reverse().map((fruit, index) => {
                  const characterInfo = getCharacterInfo(fruit.ai_character);
                  return (
                    <TouchTarget
                      key={fruit.fruit_id}
                      variant="card"
                      onClick={() => handleFruitClick(fruit)}
                      className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 rounded-xl border border-emerald-200 text-left transition-all duration-300"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center mb-3">
                          <div className={`w-4 h-4 rounded-full mr-2 ${characterInfo.color}`}></div>
                          <Typography variant="small" weight="medium" color="primary">
                            {characterInfo.name}
                          </Typography>
                          <div className="ml-auto text-lg">🍎</div>
                        </div>
                        
                        <Typography variant="small" color="secondary" className="mb-2 line-clamp-3">
                          {fruit.ai_response}
                        </Typography>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(fruit.created_at)}
                          </span>
                          {fruit.emotion_detected && (
                            <span className="flex items-center">
                              <Heart className="w-3 h-3 mr-1" />
                              {fruit.emotion_detected}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    </TouchTarget>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* アクションボタン */}
          <motion.div 
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<MessageCircle className="w-5 h-5" />}
              onClick={() => onNavigate('chat')}
              className="max-w-md mx-auto"
            >
              {previousScreen === 'group-chat' ? 'グループチャットを続ける' : 'チャットを続ける'}
            </Button>
          </motion.div>
        </div>
      )}

      {/* ほめの実の詳細モーダル */}
      <AnimatePresence>
        {selectedFruit && (
          <motion.div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedFruit(null)}
          >
            <motion.div 
              className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-3">🍎</div>
                <Typography variant="h3" color="primary" className="mb-2">
                  ほめの実の記録
                </Typography>
                <Typography variant="caption" color="secondary">
                  {formatDate(selectedFruit.created_at)}
                </Typography>
              </div>
              
              {/* ユーザーのメッセージ */}
              <div className="mb-6">
                <Typography variant="small" weight="bold" color="secondary" className="mb-2">
                  あなたのメッセージ
                </Typography>
                <div className="bg-emerald-500 text-white p-4 rounded-xl">
                  <Typography variant="body" className="leading-relaxed text-white">
                    {selectedFruit.user_message}
                  </Typography>
                </div>
              </div>

              {/* AIからの返答 */}
              <div className="mb-6">
                <Typography variant="small" weight="bold" color="secondary" className="mb-2 flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-2 ${getCharacterInfo(selectedFruit.ai_character).color}`}></div>
                  {getCharacterInfo(selectedFruit.ai_character).name}からの返答
                </Typography>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <Typography variant="body" color="primary" className="leading-relaxed">
                    {selectedFruit.ai_response}
                  </Typography>
                </div>
              </div>

              {/* 感情情報 */}
              {selectedFruit.emotion_detected && (
                <div className="mb-6">
                  <Typography variant="small" weight="bold" color="secondary" className="mb-2">
                    検出された感情
                  </Typography>
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                    <Typography variant="body" color="primary" className="flex items-center justify-center">
                      <Heart className="w-4 h-4 mr-2" />
                      {selectedFruit.emotion_detected}
                    </Typography>
                  </div>
                </div>
              )}
              
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => setSelectedFruit(null)}
              >
                閉じる
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* トースト通知 */}
      <Toast
        type={toastMessage.type}
        title={toastMessage.title}
        message={toastMessage.message}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        position="top-center"
      />
    </div>
  );
};

export default TreeView;
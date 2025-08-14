'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Crown, Users, ArrowLeft, RotateCcw, Settings } from 'lucide-react';
import Image from 'next/image';
import { AiRole, MoodType, AppScreen, ChatMessage, TreeStage, AICharacter, PraiseLevel } from '@/types';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import TouchTarget from '@/components/ui/TouchTarget';
import Toast from '@/components/ui/Toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AiIcon from '@/components/ui/AiIcon';
import { useAuth, useChat, useTree, useMaintenance, usePremiumFeatureGuard } from '@/lib/hooks';
import { useChatService } from '@/lib/api/chatService';
import { useTreeService } from '@/lib/api/treeService';

interface ChatScreenProps {
  selectedAiRole: AiRole;
  currentMood: MoodType;
  onNavigate: (screen: AppScreen) => void;
  onCharacterChange: () => void;
}

type EmotionType = '嬉しい' | '悲しい' | '困った' | '疲れた' | '愛情' | '不安';

const ChatScreen = ({ 
  selectedAiRole, 
  currentMood, 
  onNavigate,
  onCharacterChange
}: ChatScreenProps) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ type: 'success' as const, title: '', message: '' });
  const [currentPraiseLevel, setCurrentPraiseLevel] = useState<'normal' | 'deep'>('normal');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const auth = useAuth();
  const chat = useChat();
  const tree = useTree();
  const maintenance = useMaintenance();
  const chatService = useChatService();
  const treeService = useTreeService();
  const premiumGuard = usePremiumFeatureGuard(() => onNavigate('premium' as AppScreen));

  // AIキャラクター情報
  const characters = {
    'mittyan': {
      name: 'みっちゃん',
      image: '/images/icons/mittyan.png',
      color: 'from-rose-400 to-pink-500',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700'
    },
    'madokasan': {
      name: 'まどかさん', 
      image: '/images/icons/madokasan.png',
      color: 'from-sky-400 to-blue-500',
      bgColor: 'bg-sky-50',
      textColor: 'text-sky-700'
    },
    'hideji': {
      name: 'ヒデじい',
      image: '/images/icons/hideji.png', 
      color: 'from-amber-400 to-yellow-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700'
    }
  };

  const emotions = [
    { emoji: '😊', label: '嬉しい' },
    { emoji: '😢', label: '悲しい' },
    { emoji: '😵', label: '困った' },
    { emoji: '😴', label: '疲れた' },
    { emoji: '🥰', label: '愛情' },
    { emoji: '😰', label: '不安' }
  ];

  const currentCharacter = characters[selectedAiRole];

  // チャット履歴をロード
  useEffect(() => {
    if (auth.user) {
      chat.loadChatHistory();
      tree.loadTreeStatus();
    }
  }, [auth.user, chat, tree]);

  // メッセージが追加されたときに自動スクロール
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat.messages]);

  // メッセージ送信処理
  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping || maintenance.isMaintenanceMode) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsTyping(true);

    try {
      // ユーザーメッセージをローカルに追加
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        content: messageText,
        role: 'user',
        timestamp: new Date().toISOString(),
        metadata: {
          mood: currentMood,
          ai_character: selectedAiRole
        }
      };
      
      chat.addMessage(userMessage);

      // バックエンドAPIでAI応答を取得
      const aiCharacterMap: Record<AiRole, AICharacter> = {
        'mittyan': 'mittyan',
        'madokasan': 'madokasan',
        'hideji': 'hideji'
      };

      const praiseLevelMap: Record<MoodType, PraiseLevel> = {
        'praise': currentPraiseLevel as PraiseLevel,
        'listen': currentPraiseLevel as PraiseLevel
      };

      const response = await chatService.sendMessage({
        message: messageText,
        ai_character: aiCharacterMap[selectedAiRole],
        praise_level: praiseLevelMap[currentMood],
        conversation_context: chat.messages.slice(-5) // 最新5件のメッセージを文脈として送信
      });

      // AI応答をローカルに追加
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: response.ai_response,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        metadata: {
          mood: currentMood,
          ai_character: selectedAiRole,
          fruit_generated: response.fruit_generated,
          emotion_detected: response.emotion_detected
        }
      };
      
      chat.addMessage(aiMessage);

      // 木の成長状態を更新
      if (response.tree_updated) {
        await tree.loadTreeStatus();
      }

      // 実が生成された場合の通知
      if (response.fruit_generated) {
        setToastMessage({
          type: 'success',
          title: '🍎 ほめの実が生まれました！',
          message: response.emotion_detected ? `「${response.emotion_detected}」な気持ちが実になりました` : '素敵な気持ちが実になりました'
        });
        setShowToast(true);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setToastMessage({
        type: 'error',
        title: 'エラー',
        message: 'メッセージの送信に失敗しました。再度お試しください。'
      });
      setShowToast(true);
    } finally {
      setIsTyping(false);
    }
  };

  // 感情スタンプ送信
  const handleEmotionSend = async (emoji: string, label: EmotionType) => {
    if (isTyping || maintenance.isMaintenanceMode) return;

    setIsTyping(true);

    try {
      // 感情スタンプメッセージをローカルに追加
      const emotionMessage: ChatMessage = {
        id: `emotion-${Date.now()}`,
        content: emoji,
        role: 'user',
        timestamp: new Date().toISOString(),
        metadata: {
          mood: currentMood,
          ai_character: selectedAiRole,
          emotion_stamp: label
        }
      };
      
      chat.addMessage(emotionMessage);

      // バックエンドAPIで感情応答を取得
      const response = await chatService.sendMessage({
        message: `感情スタンプ: ${label} ${emoji}`,
        ai_character: selectedAiRole,
        praise_level: currentMood === 'praise' ? 'normal' : 'light',
        is_emotion_stamp: true,
        emotion_type: label
      });

      // AI応答をローカルに追加
      const aiMessage: ChatMessage = {
        id: `ai-emotion-${Date.now()}`,
        content: response.ai_response,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        metadata: {
          mood: currentMood,
          ai_character: selectedAiRole,
          emotion_response: true
        }
      };
      
      chat.addMessage(aiMessage);

    } catch (error) {
      console.error('Emotion send error:', error);
      setToastMessage({
        type: 'error',
        title: 'エラー',
        message: '感情スタンプの送信に失敗しました。'
      });
      setShowToast(true);
    } finally {
      setIsTyping(false);
    }
  };

  // タイムスタンプのフォーマット
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
  };

  // 木の成長段階の計算
  const getTreeStage = (): TreeStage => {
    if (!tree.treeStatus) return 1;
    const totalMessages = chat.messages.filter(m => m.role === 'user').length;
    
    if (totalMessages >= 50) return 6;
    if (totalMessages >= 40) return 5;
    if (totalMessages >= 30) return 4;
    if (totalMessages >= 20) return 3;
    if (totalMessages >= 10) return 2;
    return 1;
  };

  const treeStage = getTreeStage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      {/* ナビゲーションヘッダー */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => onNavigate('character-selection')}
            >
              戻る
            </Button>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <AiIcon
                  aiRole={selectedAiRole}
                  size={40}
                  className="shadow-md"
                  showBackground={true}
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <Typography variant="h4" color="primary">
                  {currentCharacter.name}
                </Typography>
                <Typography variant="caption" color="secondary">
                  {currentMood === 'praise' ? 'ほめほめモード' : '聞いてモード'}
                </Typography>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Settings className="w-4 h-4" />}
              onClick={onCharacterChange}
            >
              設定変更
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={() => chat.clearMessages()}
              disabled={chat.messages.length === 0}
            >
              リセット
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 pb-32">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* チャットエリア */}
          <div className="flex-1">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg h-[500px] md:h-[600px] lg:h-[700px] flex flex-col overflow-hidden border border-white/20">
              {/* メッセージエリア */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                  {chat.messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-end space-x-2 max-w-[80%]">
                          <div className="flex-shrink-0">
                            <AiIcon
                              aiRole={selectedAiRole}
                              size={32}
                              showBackground={true}
                            />
                          </div>
                          <div>
                            <div className={`text-xs ${currentCharacter.textColor} opacity-75 mb-1`}>
                              {currentCharacter.name} • {formatTimestamp(message.timestamp)}
                            </div>
                            <div className={`${currentCharacter.bgColor} p-3 rounded-2xl rounded-bl-sm border border-white/30 shadow-sm`}>
                              <span className="text-gray-800 font-medium">{message.content}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {message.role === 'user' && (
                        <div className="max-w-[80%]">
                          <div className="text-xs text-gray-500 text-right mb-1">
                            {formatTimestamp(message.timestamp)}
                          </div>
                          <div className="bg-emerald-600 text-white p-3 rounded-2xl rounded-br-sm border border-emerald-700 shadow-sm">
                            {message.metadata?.emotion_stamp ? (
                              <span className="text-2xl">{message.content}</span>
                            ) : (
                              <span className="font-medium">{message.content}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-end space-x-2">
                      <AiIcon
                        aiRole={selectedAiRole}
                        size={32}
                        showBackground={true}
                      />
                      <div className={`${currentCharacter.bgColor} p-3 rounded-2xl`}>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 入力エリア */}
              <div className="p-4 bg-gray-50 border-t">
                {/* 感情スタンプ */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {emotions.map((emotion) => (
                    <TouchTarget
                      key={emotion.label}
                      onClick={() => handleEmotionSend(emotion.emoji, emotion.label as EmotionType)}
                      className="flex items-center space-x-1 px-3 py-1 bg-white rounded-full text-sm hover:bg-gray-100 transition-colors"
                      disabled={isTyping || maintenance.isMaintenanceMode}
                    >
                      <span>{emotion.emoji}</span>
                      <span className="text-xs text-gray-600">{emotion.label}</span>
                    </TouchTarget>
                  ))}
                </div>

                {/* メッセージ入力 */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="メッセージを入力..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900 placeholder-gray-500"
                    disabled={isTyping || maintenance.isMaintenanceMode}
                  />
                  <TouchTarget
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isTyping || maintenance.isMaintenanceMode}
                    className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </TouchTarget>
                </div>

                {/* AI利用時の注意 */}
                <p className="text-xs text-gray-500 mt-2 text-center">
                  AIが生成した内容です。感情に寄り添うことを目的としており、医学的・専門的アドバイスではありません。
                </p>
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="lg:w-80 space-y-6">
            {/* 木の成長状態 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="text-center mb-4">
                <Typography variant="h3" color="primary" className="mb-2">
                  あなたの木
                </Typography>
                <Typography variant="caption" color="secondary">
                  成長段階: {treeStage}/6
                </Typography>
              </div>

              {/* 木の画像表示 */}
              <div className="flex justify-center mb-4">
                <div className="w-32 h-32 bg-gradient-to-b from-blue-100 to-green-100 rounded-full flex items-center justify-center">
                  <span className="text-6xl">
                    {treeStage >= 6 ? '🌳' : 
                     treeStage >= 4 ? '🌲' : 
                     treeStage >= 2 ? '🌱' : '🌰'}
                  </span>
                </div>
              </div>

              {/* 統計情報 */}
              <div className="space-y-2 text-center">
                <div>
                  <Typography variant="small" color="secondary">
                    総メッセージ数
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {chat.messages.filter(m => m.role === 'user').length}
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" color="secondary">
                    ほめの実
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {tree.treeStatus?.fruits_count || 0}個
                  </Typography>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => onNavigate('tree')}
                className="mt-4"
              >
                木を詳しく見る
              </Button>
            </div>

            {/* ディープモード切り替え */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
              <Typography variant="h4" color="primary" className="mb-3 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                褒めレベル設定
              </Typography>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <TouchTarget
                    onClick={() => setCurrentPraiseLevel('normal')}
                    className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                      currentPraiseLevel === 'normal'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-sm">ノーマル</div>
                    <div className="text-xs opacity-75">優しく簡潔に</div>
                  </TouchTarget>
                  <TouchTarget
                    onClick={() => {
                      if (premiumGuard.checkPremiumFeature('deep_mode')) {
                        setCurrentPraiseLevel('deep');
                      }
                    }}
                    className={`flex-1 p-3 rounded-lg border-2 text-center transition-all relative ${
                      currentPraiseLevel === 'deep' && premiumGuard.isPremiumUser
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-sm flex items-center justify-center">
                      ディープ
                      {!premiumGuard.isPremiumUser && (
                        <Crown className="w-3 h-3 ml-1 text-amber-500" />
                      )}
                    </div>
                    <div className="text-xs opacity-75">深く共感して</div>
                  </TouchTarget>
                </div>
                {!premiumGuard.isPremiumUser && (
                  <Typography variant="small" color="secondary" className="text-center">
                    ディープモードはプレミアム限定機能です
                  </Typography>
                )}
              </div>
            </div>

            {/* グループチャット案内 */}
            {premiumGuard.isPremiumUser ? (
              <div className="bg-gradient-to-r from-blue-100/90 to-indigo-100/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <Typography variant="h4" color="primary" className="mb-3 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  グループチャット
                </Typography>
                <Typography variant="small" color="secondary" className="mb-4">
                  3人のAIキャラクターと一緒にお話ししませんか？
                </Typography>
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => onNavigate('group-chat')}
                >
                  グループチャットを始める
                </Button>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-100/90 to-indigo-100/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <Typography variant="h4" color="primary" className="mb-3 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  グループチャット
                  <Crown className="w-4 h-4 ml-2 text-amber-500" />
                </Typography>
                <Typography variant="small" color="secondary" className="mb-4">
                  3人のAIキャラクターと同時にお話しできるプレミアム限定機能です
                </Typography>
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => premiumGuard.checkPremiumFeature('group_chat')}
                >
                  プレミアムで解除
                </Button>
              </div>
            )}

            {/* プレミアム案内 */}
            {!premiumGuard.isPremiumUser && (
              <div className="bg-gradient-to-r from-amber-100/90 to-yellow-100/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <Typography variant="h4" color="primary" className="mb-3 flex items-center">
                  <Crown className="w-5 h-5 mr-2" />
                  プレミアム機能
                </Typography>
                <div className="space-y-2 mb-4">
                  <Typography variant="small" color="secondary">
                    • グループチャット機能
                  </Typography>
                  <Typography variant="small" color="secondary">
                    • ディープモード
                  </Typography>
                  <Typography variant="small" color="secondary">
                    • チャット履歴180日保存
                  </Typography>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => onNavigate('premium')}
                >
                  詳細を見る
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* メンテナンス通知 */}
      {maintenance.isMaintenanceMode && (
        <div className="fixed bottom-4 left-4 right-4 bg-amber-100 border border-amber-300 rounded-xl p-4 text-center z-50">
          <Typography variant="small" color="warning" weight="medium">
            メンテナンス中のため、一部機能が制限されています
          </Typography>
        </div>
      )}

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

export default ChatScreen;
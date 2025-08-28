'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Heart, MessageCircle, Crown, Sparkles, Check, ChevronRight, User, Settings } from 'lucide-react';
import Image from 'next/image';
import { AiRole, MoodType, AppScreen, UserPlan, UserInfo, AICharacter, PraiseLevel } from '@/types';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import TouchTarget from '@/components/ui/TouchTarget';
import Toast from '@/components/ui/Toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AiIcon from '@/components/ui/AiIcon';
import { useAuth, useUserProfile, useMaintenance } from '@/lib/hooks';
import useChatStore from '@/stores/chatStore';

interface CharacterSelectionProps {
  onCharacterSelect: (role: AiRole, mood: MoodType) => void;
  onNavigate: (screen: AppScreen) => void;
}

type SelectionStep = 'mood' | 'character' | 'confirmation';

const CharacterSelection = ({ 
  onCharacterSelect, 
  onNavigate
}: CharacterSelectionProps) => {
  const [currentStep, setCurrentStep] = useState<SelectionStep>('mood');
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<AiRole | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ type: 'success', title: '', message: '' });

  const auth = useAuth();
  const userProfile = useUserProfile();
  const maintenance = useMaintenance();
  const chatStore = useChatStore();

  // ユーザープロフィールから初期設定を読み込み
  useEffect(() => {
    if (auth.profile) {
      // 既存の設定を復元
      const aiCharacterMap: Record<string, AiRole> = {
        'mittyan': 'mittyan',
        'madokasan': 'madokasan', 
        'hideji': 'hideji'
      };
      
      if (auth.profile.ai_character && aiCharacterMap[auth.profile.ai_character]) {
        const defaultMood: MoodType = auth.profile.praise_level === 'deep' ? 'praise' : 'praise';
        setSelectedMood(defaultMood);
        setSelectedCharacter(aiCharacterMap[auth.profile.ai_character]);
        
        // 既に設定済みの場合はconfirmationステップから開始
        if (auth.profile.onboarding_completed) {
          setCurrentStep('confirmation');
        }
      }
    }
  }, [auth.profile]);

  const moods = [
    {
      type: 'praise' as MoodType,
      title: '今日は褒めてほしい',
      description: '頑張っている自分を認めてもらいたい',
      icon: <Heart className="w-8 h-8" />,
      color: 'from-pink-400 to-rose-500',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
      textColor: 'text-pink-700',
      examples: ['子どもが初めて歩いた', '夜泣きに付き合った', '離乳食を作った']
    },
    {
      type: 'listen' as MoodType,
      title: '今日は聞いてほしい',
      description: '気持ちを受け止めてもらいたい',
      icon: <MessageCircle className="w-8 h-8" />,
      color: 'from-blue-400 to-indigo-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      examples: ['疲れがたまっている', '不安なことがある', '誰かと話したい']
    }
  ];

  const characters = [
    {
      role: 'mittyan' as AiRole,
      name: 'みっちゃん',
      shortDesc: '優しく包み込む温かさ',
      personality: 'いつも优しく寄り添うお母さんのような存在。悩んだり不安になったときも、温かい言葉で包み込んでくれます。',
      image: '/images/icons/mittyan.png',
      color: 'from-rose-400 to-pink-500',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-700',
      recommendedFor: ['praise', 'listen'],
      strengths: ['共感力抜群', '温かい励まし', '安心感']
    },
    {
      role: 'madokasan' as AiRole,
      name: 'まどかさん',
      shortDesc: 'お姉さん的な頼もしいサポート',
      personality: '明るくエネルギッシュなお姉さんタイプ。「大丈夫！」「一緒に頑張ろう！」と前向きなエールで背中を押してくれます。',
      image: '/images/icons/madokasan.png',
      color: 'from-sky-400 to-blue-500',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      textColor: 'text-sky-700',
      recommendedFor: ['praise'],
      strengths: ['ポジティブ思考', '行動力アップ', '元気をくれる']
    },
    {
      role: 'hideji' as AiRole,
      name: 'ヒデじい',
      shortDesc: '人生経験豊富な温かな励まし',
      personality: '人生経験豊富なおじいちゃん。「ふむふむ」とうなずきながらも、深い知恵と経験から的確なアドバイスをくれます。',
      image: '/images/icons/hideji.png',
      color: 'from-amber-400 to-yellow-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-700',
      recommendedFor: ['listen'],
      strengths: ['深い知恵', '人生経験', '落ち着きをくれる']
    }
  ];

  const getRecommendedCharacters = (): (typeof characters[0] & { isRecommended?: boolean })[] => {
    if (!selectedMood) return characters;
    return characters.map(char => ({
      ...char,
      isRecommended: char.recommendedFor.includes(selectedMood)
    }));
  };

  const handleMoodSelect = (mood: MoodType) => {
    setSelectedMood(mood);
    setCurrentStep('character');
  };

  const handleCharacterSelect = (role: AiRole) => {
    setSelectedCharacter(role);
    setCurrentStep('confirmation');
  };

  const handleConfirm = async () => {
    if (!selectedMood || !selectedCharacter) return;

    try {
      // AI設定をバックエンドに保存
      const aiCharacterMap: Record<AiRole, AICharacter> = {
        'mittyan': 'mittyan',
        'madokasan': 'madokasan',
        'hideji': 'hideji'
      };

      const praiseLevelMap: Record<MoodType, 'normal' | 'deep'> = {
        'praise': 'normal',
        'listen': 'normal'
      };

      await userProfile.updateAICharacter(aiCharacterMap[selectedCharacter]);
      await userProfile.updatePraiseLevel(praiseLevelMap[selectedMood]);

      // オンボーディング完了をマーク
      if (auth.profile && !auth.profile.onboarding_completed) {
        await userProfile.updateProfile({
          onboarding_completed: true
        });
      }

      // チャットストアに設定を反映
      chatStore.setSelectedAiRole(selectedCharacter);
      chatStore.setCurrentMood(selectedMood);
      chatStore.setAiCharacter(aiCharacterMap[selectedCharacter]);
      chatStore.setPraiseLevel(praiseLevelMap[selectedMood]);

      setToastMessage({
        type: 'success',
        title: '設定完了！',
        message: 'チャット画面に移動します'
      });
      setShowToast(true);

      setTimeout(() => {
        onCharacterSelect(selectedCharacter!, selectedMood!);
      }, 1500);

    } catch (error) {
      setToastMessage({
        type: 'error',
        title: '設定エラー',
        message: '設定の保存に失敗しました。再度お試しください。'
      });
      setShowToast(true);
    }
  };

  const handleBack = () => {
    if (currentStep === 'character') {
      setCurrentStep('mood');
      setSelectedCharacter(null);
    } else if (currentStep === 'confirmation') {
      setCurrentStep('character');
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'mood': return '今日の気分を選んでください';
      case 'character': return 'AIキャラクターを選んでください';
      case 'confirmation': return '設定を確認してください';
      default: return '';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 'mood': return 'あなたの今の気持ちに合わせて最適なサポートを提供します';
      case 'character': return `${selectedMood === 'praise' ? '褒める' : '聞く'}のが得意なキャラクターをおすすめしています`;
      case 'confirmation': return '選択した内容でチャットを始めましょう';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      {/* ナビゲーションヘッダー */}
      <div className="flex items-center justify-between p-6">
        <Button
          variant="ghost"
          size="md"
          leftIcon={<ArrowLeft className="w-5 h-5" />}
          onClick={currentStep !== 'mood' ? handleBack : () => onNavigate('auth')}
        >
          戻る
        </Button>

        {auth.user && (
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-emerald-600" />
            <Typography variant="small" color="secondary">
              {auth.profile?.nickname || auth.user.email}
            </Typography>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <Typography variant="h1" color="primary" className="mb-2">
            {getStepTitle()}
          </Typography>
          <Typography variant="body" color="secondary">
            {getStepSubtitle()}
          </Typography>
        </div>

        {/* プログレス指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {['mood', 'character', 'confirmation'].map((step, index) => (
              <div key={step} className="flex items-center">
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    currentStep === step || 
                    (['character', 'confirmation'].includes(currentStep) && step === 'mood') ||
                    (currentStep === 'confirmation' && step === 'character')
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                  animate={{ scale: currentStep === step ? 1.1 : 1 }}
                >
                  {(['character', 'confirmation'].includes(currentStep) && step === 'mood') ||
                   (currentStep === 'confirmation' && step === 'character') ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </motion.div>
                {index < 2 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    (['character', 'confirmation'].includes(currentStep) && step === 'mood') ||
                    (currentStep === 'confirmation' && step === 'character')
                      ? 'bg-emerald-500'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ステップコンテンツ */}
        <AnimatePresence mode="wait">
          {/* ムード選択 */}
          {currentStep === 'mood' && (
            <motion.div
              key="mood"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {moods.map((mood) => (
                <TouchTarget
                  key={mood.type}
                  onClick={() => handleMoodSelect(mood.type)}
                  variant="card"
                  className={`${mood.bgColor} border-2 ${mood.borderColor} p-8 hover:shadow-xl transition-all duration-300`}
                >
                  <div className="text-center space-y-4">
                    <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${mood.color} flex items-center justify-center text-white`}>
                      {mood.icon}
                    </div>
                    <Typography variant="h3" color="primary">
                      {mood.title}
                    </Typography>
                    <Typography variant="body" color="secondary">
                      {mood.description}
                    </Typography>
                    <div className="space-y-2">
                      <Typography variant="small" color="secondary" weight="medium">
                        こんなときにおすすめ：
                      </Typography>
                      {mood.examples.map((example, index) => (
                        <div key={index} className={`inline-block mx-1 px-2 py-1 rounded-full ${mood.bgColor} ${mood.textColor} text-xs`}>
                          {example}
                        </div>
                      ))}
                    </div>
                  </div>
                </TouchTarget>
              ))}
            </motion.div>
          )}

          {/* キャラクター選択 */}
          {currentStep === 'character' && (
            <motion.div
              key="character"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {getRecommendedCharacters().map((character) => (
                <TouchTarget
                  key={character.role}
                  onClick={() => handleCharacterSelect(character.role)}
                  variant="card"
                  className={`${character.bgColor} border-2 ${character.borderColor} p-6 hover:shadow-xl transition-all duration-300 relative ${
                    selectedCharacter === character.role ? 'ring-4 ring-emerald-300 scale-105' : ''
                  }`}
                >
                  {character.isRecommended && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
                      <Sparkles className="w-3 h-3 mr-1" />
                      おすすめ
                    </div>
                  )}

                  <div className="text-center space-y-4">
                    <div className="relative flex justify-center">
                      <AiIcon
                        aiRole={character.role}
                        size={80}
                        className="shadow-lg"
                        showBackground={true}
                      />
                    </div>

                    <Typography variant="h3" color="primary">
                      {character.name}
                    </Typography>

                    <Typography variant="caption" color="secondary">
                      {character.shortDesc}
                    </Typography>

                    <Typography variant="small" color="secondary">
                      {character.personality}
                    </Typography>

                    <div className="space-y-2">
                      <Typography variant="small" color="secondary" weight="medium">
                        得意分野：
                      </Typography>
                      <div className="flex flex-wrap justify-center gap-1">
                        {character.strengths.map((strength, index) => (
                          <span key={index} className={`px-2 py-1 rounded-full ${character.bgColor} ${character.textColor} text-xs`}>
                            {strength}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </TouchTarget>
              ))}
            </motion.div>
          )}

          {/* 確認画面 */}
          {currentStep === 'confirmation' && selectedMood && selectedCharacter && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
                <div className="text-center space-y-6">
                  <Typography variant="h2" color="primary">
                    設定確認
                  </Typography>

                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-4 p-4 bg-emerald-50 rounded-2xl">
                      <div>
                        <Typography variant="small" color="secondary">今日の気分</Typography>
                        <Typography variant="h4" color="primary">
                          {moods.find(m => m.type === selectedMood)?.title}
                        </Typography>
                      </div>
                      <ChevronRight className="w-5 h-5 text-emerald-600" />
                      <div className="flex items-center space-x-3">
                        <AiIcon
                          aiRole={selectedCharacter}
                          size={60}
                          className="shadow-lg"
                          showBackground={true}
                        />
                        <div>
                          <Typography variant="small" color="secondary">選択キャラクター</Typography>
                          <Typography variant="h4" color="primary">
                            {characters.find(c => c.role === selectedCharacter)?.name}
                          </Typography>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Typography variant="body" color="secondary">
                    この設定でチャットを始めましょう。いつでも変更できます。
                  </Typography>

                  <Button
                    variant="primary"
                    size="xl"
                    fullWidth
                    onClick={handleConfirm}
                    loading={userProfile.isLoading}
                    disabled={maintenance.isMaintenanceMode}
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    {userProfile.isLoading ? '設定中...' : 'チャットを始める'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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

export default CharacterSelection;
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Heart, MessageCircle, Crown, Sparkles, Check, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { AiRole, MoodType, AppScreen, UserPlan, UserInfo } from '@/types';
import NavigationHeader from '../layout/NavigationHeader';

interface CharacterSelectionProps {
  onCharacterSelect: (role: AiRole, mood: MoodType) => void;
  onNavigate: (screen: AppScreen) => void;
  userPlan: UserPlan;
  userInfo?: UserInfo;
  isLoggedIn?: boolean;
  onPlanChange?: (plan: UserPlan) => void;
  onPlanChangeRequest?: (plan: UserPlan) => void;
  onLogout?: () => void;
  onNicknameChange?: (nickname: string) => void;
  onEmailChange?: (email: string) => void;
}

type SelectionStep = 'mood' | 'character' | 'confirmation';

const CharacterSelection = ({ 
  onCharacterSelect, 
  onNavigate, 
  userPlan,
  userInfo,
  isLoggedIn,
  onPlanChange,
  onPlanChangeRequest,
  onLogout,
  onNicknameChange,
  onEmailChange
}: CharacterSelectionProps) => {
  const [currentStep, setCurrentStep] = useState<SelectionStep>('mood');
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<AiRole | null>(null);

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
      name: 'たまさん',
      shortDesc: '優しく包み込む温かさ',
      personality: 'いつも优しく寄り添うお母さんのような存在。疑ったり不安になったときも、温かい言葉で包み込んでくれます。',
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
      name: 'まどか姉さん',
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
    // すべてのキャラクターを表示し、推奨キャラクターにマークを付ける
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

  const handleConfirm = () => {
    if (selectedMood && selectedCharacter) {
      onCharacterSelect(selectedCharacter, selectedMood);
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
      <NavigationHeader
        currentScreen="character-selection"
        title={getStepTitle()}
        subtitle={getStepSubtitle()}
        onNavigate={onNavigate}
        canGoBack={currentStep !== 'mood'}
        previousScreen="auth"
        userPlan={userPlan}
        userInfo={userInfo}
        isLoggedIn={isLoggedIn}
        onPlanChange={onPlanChange}
        onPlanChangeRequest={onPlanChangeRequest}
        onLogout={onLogout}
        onNicknameChange={onNicknameChange}
        onEmailChange={onEmailChange}
      />

      <div className="max-w-4xl mx-auto p-6">
        {/* プログレス指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {['mood', 'character', 'confirmation'].map((step, index) => (
              <div key={step} className="flex items-center">
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    currentStep === step || (['character', 'confirmation'].includes(currentStep) && step === 'mood') ||
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
                    (['character', 'confirmation'].includes(currentStep) && index === 0) ||
                    (currentStep === 'confirmation' && index === 1)
                      ? 'bg-emerald-500' 
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: 気分選択 */}
          {currentStep === 'mood' && (
            <motion.div
              key="mood"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {moods.map((mood) => (
                  <motion.button
                    key={mood.type}
                    onClick={() => handleMoodSelect(mood.type)}
                    className={`p-6 rounded-2xl border-2 ${mood.bgColor} ${mood.borderColor} hover:shadow-lg transition-all duration-300 text-left group`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${mood.color} text-white`}>
                        {mood.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold ${mood.textColor} mb-2`}>
                          {mood.title}
                        </h3>
                        <p className="text-gray-600 mb-4 text-left">
                          {mood.description}
                        </p>
                        <div className="space-y-1 text-left">
                          <p className="text-sm font-medium text-gray-500">こんな時におすすめ：</p>
                          {mood.examples.map((example, index) => (
                            <p key={index} className="text-sm text-gray-500 flex items-start">
                              <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 mt-2 flex-shrink-0" />
                              {example}
                            </p>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${mood.textColor} group-hover:transform group-hover:translate-x-1 transition-transform`} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: キャラクター選択 */}
          {currentStep === 'character' && (
            <motion.div
              key="character"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {getRecommendedCharacters().map((character) => (
                  <motion.button
                    key={character.role}
                    onClick={() => handleCharacterSelect(character.role)}
                    className={`p-6 rounded-2xl border-2 ${character.bgColor} ${character.borderColor} hover:shadow-lg transition-all duration-300 text-left group relative`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {character.isRecommended && (
                      <div className="absolute -top-2 -right-2">
                        <div className="bg-gradient-to-r from-emerald-400 to-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center">
                          <Sparkles className="w-3 h-3 mr-1" />
                          おすすめ
                        </div>
                      </div>
                    )}
                    
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 relative">
                        <div className={`w-full h-full rounded-full bg-gradient-to-r ${character.color} p-1`}>
                          <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                            <Image
                              src={character.image}
                              alt={character.name}
                              width={60}
                              height={60}
                              className="rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <h3 className={`text-xl font-bold ${character.textColor} mb-2`}>
                        {character.name}
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm text-center">
                        {character.shortDesc}
                      </p>
                      
                      <div className="space-y-2 text-center">
                        <p className="text-xs font-medium text-gray-500">得意なこと：</p>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {character.strengths.map((strength) => (
                            <span key={strength} className={`px-2 py-1 ${character.bgColor} ${character.textColor} text-xs rounded-full`}>
                              {strength}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* 戻るボタン */}
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleBack}
                  className="flex items-center space-x-2 px-4 py-2 text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>気分を変更する</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: 確認画面 */}
          {currentStep === 'confirmation' && selectedMood && selectedCharacter && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-emerald-100">
                <div className="text-center space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-emerald-800">設定完了！</h3>
                    <p className="text-emerald-600">以下の設定でチャットを始めます</p>
                  </div>

                  <div className="space-y-4">
                    {/* 選択した気分 */}
                    <div className="p-4 bg-emerald-50 rounded-xl">
                      <p className="text-sm font-medium text-emerald-700 mb-1">今日の気分</p>
                      <p className="text-lg font-bold text-emerald-800">
                        {moods.find(m => m.type === selectedMood)?.title}
                      </p>
                    </div>

                    {/* 選択したキャラクター */}
                    <div className="p-4 bg-emerald-50 rounded-xl">
                      <p className="text-sm font-medium text-emerald-700 mb-2">AIキャラクター</p>
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          <Image
                            src={characters.find(c => c.role === selectedCharacter)?.image || ''}
                            alt={characters.find(c => c.role === selectedCharacter)?.name || ''}
                            width={48}
                            height={48}
                          />
                        </div>
                        <div>
                          <p className="font-bold text-emerald-800">
                            {characters.find(c => c.role === selectedCharacter)?.name}
                          </p>
                          <p className="text-sm text-emerald-600">
                            {characters.find(c => c.role === selectedCharacter)?.shortDesc}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* プレミアム機能の案内 */}
                  {userPlan === 'premium' && (
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Crown className="w-5 h-5 text-yellow-600" />
                        <p className="font-bold text-yellow-800">プレミアム機能</p>
                      </div>
                      <p className="text-sm text-yellow-700">
                        グループチャットやディープモードもお楽しみいただけます
                      </p>
                    </div>
                  )}

                  {/* アクションボタン */}
                  <div className="space-y-3">
                    <motion.button
                      onClick={handleConfirm}
                      className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      チャットを始める
                      <ArrowRight className="w-5 h-5 inline ml-2" />
                    </motion.button>

                    <button
                      onClick={handleBack}
                      className="w-full py-2 text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      キャラクターを変更する
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CharacterSelection;
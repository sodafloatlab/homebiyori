'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { AiRole, MoodType, AppScreen } from './MainApp';

interface CharacterSelectionProps {
  onCharacterSelect: (role: AiRole, mood: MoodType) => void;
  onNavigate: (screen: AppScreen) => void;
}

const CharacterSelection = ({ onCharacterSelect, onNavigate }: CharacterSelectionProps) => {
  const [selectedAiRole, setSelectedAiRole] = useState<AiRole>('tama');
  const [selectedMood, setSelectedMood] = useState<MoodType>('praise');

  const characters = [
    {
      role: 'tama' as AiRole,
      name: 'たまさん',
      description: '優しく包み込むような温かさ',
      personality: 'いつも優しく寄り添うお母さんのような存在。疑ったり不安になったときも、温かい言葉で包み込んでくれます。',
      image: '/images/icons/tamasan.png',
      color: 'bg-rose-50 border-rose-200',
      accent: 'rose'
    },
    {
      role: 'madoka' as AiRole,
      name: 'まどか姉さん',
      description: 'お姉さん的な頼もしいサポート',
      personality: '明るくエネルギッシュなお姉さんタイプ。「大丈夫！」「一緒に頑張ろう！」と前向きなエールで背中を押してくれます。',
      image: '/images/icons/madokanesan.png',
      color: 'bg-sky-50 border-sky-200',
      accent: 'sky'
    },
    {
      role: 'hide' as AiRole,
      name: 'ヒデじい',
      description: '人生経験豊富な温かな励まし',
      personality: '人生経験豊富なおじいちゃん。「ふむふむ」とうなずきながらも、深い知恵と経験から的確なアドバイスをくれます。',
      image: '/images/icons/hideji.png',
      color: 'bg-amber-50 border-amber-200',
      accent: 'amber'
    }
  ];

  const moods = [
    {
      type: 'praise' as MoodType,
      title: '褒めてほしい気分',
      description: '今日の頑張りを認めてもらいたい',
      icon: <Heart className="w-6 h-6" />,
      color: 'blue'
    },
    {
      type: 'listen' as MoodType,
      title: '話を聞いてほしい気分',
      description: '気持ちを受け止めてもらいたい',
      icon: <MessageCircle className="w-6 h-6" />,
      color: 'purple'
    }
  ];

  const selectedCharacter = characters.find(char => char.role === selectedAiRole);

  const handleStartChat = () => {
    onCharacterSelect(selectedAiRole, selectedMood);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50" style={{
      backgroundColor: '#fdfdf8',
      backgroundImage: 'linear-gradient(135deg, #f0f9f0 0%, #fefffe 35%, #f8fcf0 100%)'
    }}>
      {/* ヘッダー */}
      <div className="p-4">
        <button 
          onClick={() => onNavigate('landing')}
          className="flex items-center text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          戻る
        </button>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-green-100 max-w-4xl w-full">
          
          {/* タイトル */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-emerald-800 mb-4">
              AIキャラクターを選択
            </h1>
            <p className="text-emerald-600">
              あなたに寄り添ってくれるAIキャラクターと今日の気分を選んでください
            </p>
          </div>

          {/* AIキャラクター選択 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-emerald-800 mb-6 text-center">
              AIキャラクター
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {characters.map((character) => (
                <motion.button
                  key={character.role}
                  onClick={() => setSelectedAiRole(character.role)}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    selectedAiRole === character.role
                      ? 'border-emerald-400 bg-emerald-50 shadow-lg scale-105'
                      : 'border-gray-200 bg-white/70 hover:border-emerald-200 hover:shadow-md'
                  }`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 border-2 ${character.color} overflow-hidden`}>
                      <Image
                        src={character.image}
                        alt={character.name}
                        width={80}
                        height={80}
                        className="object-cover rounded-full"
                      />
                    </div>
                    <h3 className="text-lg font-bold text-emerald-800 mb-2">
                      {character.name}
                    </h3>
                    <p className="text-sm text-emerald-600 mb-3">
                      {character.description}
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {character.personality}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* 気分選択 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-emerald-800 mb-6 text-center">
              今日の気分
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {moods.map((mood) => (
                <motion.button
                  key={mood.type}
                  onClick={() => setSelectedMood(mood.type)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    selectedMood === mood.type
                      ? (mood.color === 'blue' ? 'border-blue-400 bg-blue-50 shadow-lg' : 'border-purple-400 bg-purple-50 shadow-lg')
                      : 'border-gray-200 bg-white/70 hover:border-gray-300 hover:shadow-md'
                  }`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
                      selectedMood === mood.type 
                        ? (mood.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600')
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {mood.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      {mood.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {mood.description}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* 選択確認とスタートボタン */}
          <div className="text-center">
            <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-emerald-800">
                <span className="font-bold">{selectedCharacter?.name}</span> と 
                <span className="font-bold"> {moods.find(m => m.type === selectedMood)?.title}</span> でスタートします
              </p>
            </div>
            
            <motion.button
              onClick={handleStartChat}
              className="px-8 py-4 bg-emerald-500 text-white rounded-xl font-bold text-lg hover:bg-emerald-600 transition-colors shadow-lg mb-4"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              チャットを始める
            </motion.button>
            
            {/* プレミアム機能ボタン */}
            <div className="pt-4 border-t border-emerald-100">
              <p className="text-sm text-emerald-600 mb-3 flex items-center justify-center">
                <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold rounded-full mr-2">
                  PREMIUM
                </span>
                課金ユーザー限定機能
              </p>
              <motion.button
                onClick={() => onNavigate('group-chat')}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🎭 グループチャット（全キャラクター）
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterSelection;
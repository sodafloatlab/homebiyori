'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import NavigationHeader from '../../layout/NavigationHeader';
import TouchTarget from '../../ui/TouchTarget';
import Typography from '../../ui/Typography';
import { GroupChatScreenProps, AiRole, MoodType, ChatMessage } from '../../../types';
// Zustandストアは直接プロパティから取得するため、importを削除

// AI_CHARACTERS定数定義（demo版から移植）
const AI_CHARACTERS = {
  tama: {
    name: 'たまさん',
    image: '/images/icons/tamasan.png',
    color: 'rose'
  },
  madoka: {
    name: 'まどか姉さん',
    image: '/images/icons/madoka.png',
    color: 'sky'
  },
  hide: {
    name: 'ヒデじい',
    image: '/images/icons/hidejii.png',
    color: 'amber'
  }
} as const;

// EMOTIONS定数定義（demo版から移植）
const EMOTIONS = [
  { emoji: '😊', label: '嬉しい' },
  { emoji: '😢', label: '悲しい' },
  { emoji: '😟', label: '困った' }
] as const;

const GroupChatScreen = ({
  currentMood,
  onNavigate,
  onAddCharacters,
  onAddFruit,
  onAddChatHistory,
  totalCharacters,
  fruits,
  userPlan,
  chatMode,
  chatHistory,
  onChatModeChange,
  globalMessages,
  onAddGlobalMessage,
  selectedAiRole,
  onMoodChange,
  userInfo,
  isLoggedIn,
  onPlanChange,
  onPlanChangeRequest,
  onLogout,
  onNicknameChange,
  onEmailChange
}: GroupChatScreenProps) => {
  const [selectedMoodState, setSelectedMoodState] = useState(currentMood);
  const [activeAIs, setActiveAIs] = useState<AiRole[]>(['tama', 'madoka', 'hide']);
  const [messages, setMessages] = useState<ChatMessage[]>(globalMessages || []);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // クライアント側のハイドレーション対応
  useEffect(() => {
    setIsMounted(true);
    
    // 無料ユーザーのアクセス制御
    if (userPlan === 'free') {
      console.log('Free user accessing group chat, redirecting to premium');
      onNavigate('premium');
      return;
    }
  }, [userPlan, onNavigate]);

  // メッセージ自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMoodChange = (mood: MoodType) => {
    setSelectedMoodState(mood);
    if (onMoodChange) {
      onMoodChange(mood);
    }
  };

  // ユーティリティ関数群（demo版から移植）
  const generateMessageId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateTreeStage = (characters: number): number => {
    if (characters < 100) return 1;
    if (characters < 500) return 2;
    if (characters < 1500) return 3;
    if (characters < 3000) return 4;
    if (characters < 5000) return 5;
    return 6;
  };

  const getCharacterThemeColor = (aiRole?: AiRole, type?: 'bg' | 'border' | 'text'): string => {
    if (!aiRole) return 'text-gray-600';
    
    const character = AI_CHARACTERS[aiRole];
    const colorMap = {
      rose: {
        bg: 'bg-rose-100',
        border: 'border-rose-300',
        text: 'text-rose-700'
      },
      sky: {
        bg: 'bg-sky-100',
        border: 'border-sky-300',
        text: 'text-sky-700'
      },
      amber: {
        bg: 'bg-amber-100',
        border: 'border-amber-300',
        text: 'text-amber-700'
      }
    };

    if (type) {
      return colorMap[character.color][type];
    }
    return colorMap[character.color].text;
  };

  // 感情検出関数（キーワードベース）
  const detectEmotion = (text: string): string | null => {
    const emotionalKeywords = {
      '疲れ': ['疲れ', 'つかれ', '疲労', 'くたくた', 'へとへと', 'だるい'],
      '嬉しい': ['嬉しい', 'うれしい', '幸せ', 'しあわせ', '楽しい', 'たのしい', '良かった', 'よかった'],
      '大変': ['大変', 'たいへん', '困った', 'きつい', '辛い', 'つらい', '難しい'],
      '愛情': ['愛', '愛情', 'かわいい', '可愛い', '大好き', 'だいすき', '大切', 'おもしろい', '面白い'],
      '不安': ['不安', 'ふあん', '心配', 'しんぱい', '悩み', 'なやみ', 'いらいら', 'イライラ']
    };

    for (const [emotion, keywords] of Object.entries(emotionalKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return emotion;
      }
    }
    return null;
  };

  // AI応答生成（複数キャラクター対応）
  const generateGroupAiResponse = (userMessage: string, activeAIs: AiRole[]): { aiRole: AiRole; response: string }[] => {
    const responses = {
      tama: [
        'そうですね。あなたのその気持ち、とても大切だと思います。',
        'いつも頑張っているあなたを見ていて、本当に素晴らしいと感じています。',
        'その優しい心が、いつも周りを温かくしてくれているのですね。'
      ],
      madoka: [
        'すごくよくわかります！あなたの気持ち、私にも伝わってきますよ！',
        'その考え方、本当に素敵だと思います！',
        'あなたの頑張り、ちゃんと見えていますからね！'
      ],
      hide: [
        'ふむふむ、なるほどのう。あなたの心の内がよくわかるぞ。',
        'その経験、わしにも身に覚えがあるわい。人生いろいろじゃからな。',
        'あなたのようなしっかりした考えを持つ人は、なかなかおらんぞ。'
      ]
    };

    return activeAIs.map((aiRole, index) => {
      const aiResponses = responses[aiRole];
      // SSR/クライアント間の一貫性のため、時間ベースの疑似ランダムを使用
      const pseudoRandom = ((Date.now() + index) % aiResponses.length);
      return {
        aiRole,
        response: aiResponses[pseudoRandom]
      };
    });
  };

  // メッセージ送信処理
  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping || activeAIs.length === 0) {
      if (activeAIs.length === 0) {
        alert('参加するAIキャラクターを選択してください');
      }
      return;
    }

    const newMessage: ChatMessage = {
      id: generateMessageId('user'),
      text: inputText,
      sender: 'user',
      timestamp: Date.now()
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    onAddGlobalMessage(newMessage);

    setIsTyping(true);
    const currentMessage = inputText;
    setInputText('');

    // 文字数追加
    onAddCharacters(currentMessage.length);
    const newTotalCharacters = totalCharacters + currentMessage.length;

    setTimeout(async () => {
      // 複数AI応答生成
      const aiResponses = generateGroupAiResponse(currentMessage, activeAIs);
      
      // 順次応答を表示（間隔をあけて）
      for (let i = 0; i < aiResponses.length; i++) {
        const { aiRole, response } = aiResponses[i];
        
        setTimeout(() => {
          const aiResponse: ChatMessage = {
            id: generateMessageId('ai'),
            text: response,
            sender: 'ai',
            timestamp: Date.now() + i * 100,
            aiRole,
            mood: selectedMoodState
          };

          setMessages(prev => [...prev, aiResponse]);
          onAddGlobalMessage(aiResponse);

          // チャット履歴に追加（最後のAIの応答のみ）
          if (i === aiResponses.length - 1) {
            onAddChatHistory(currentMessage, response, aiRole);
            
            // 感情検出と実の生成
            const detectedEmotion = detectEmotion(currentMessage);
            if (detectedEmotion) {
              onAddFruit(currentMessage, response, detectedEmotion);
            }
          }
        }, i * 800);
      }

      setIsTyping(false);
    }, 1000);
  };

  // 感情スタンプ送信
  const handleEmotionSend = (emoji: string, label: string) => {
    if (activeAIs.length === 0) {
      alert('参加するAIキャラクターを選択してください');
      return;
    }

    const emotionMessage: ChatMessage = {
      id: generateMessageId('emotion'),
      text: emoji,
      sender: 'user',
      timestamp: Date.now(),
      emotion: label
    };

    const updatedMessages = [...messages, emotionMessage];
    setMessages(updatedMessages);
    onAddGlobalMessage(emotionMessage);

    // 代表一名（最初のアクティブAI）が応答
    const respondingAI = activeAIs[0];
    
    setTimeout(() => {
      const emotionResponses = {
        '嬉しい': {
          tama: 'その笑顔が見えるようです。嬉しい気持ち、大切にしてくださいね。',
          madoka: 'わあ！嬉しそうですね！私も一緒に嬉しいです！',
          hide: 'ほほほ、その嬉しそうな顔が目に浮かぶわい。'
        },
        '悲しい': {
          tama: '悲しい時は無理をしないでくださいね。あなたの気持ち、わかりますよ。',
          madoka: '大丈夫ですか？悲しい時は一人で抱え込まないでくださいね。',
          hide: '悲しい時もあるさ。それも人生の一部じゃ。'
        },
        '困った': {
          tama: '困ったことがあるのですね。一緒に考えましょう。きっと解決策が見つかりますよ。',
          madoka: '困ったときは一人で抱え込まないでくださいね。何か手伝えることがあるかもしれません！',
          hide: '困ったときは知恵を絞ることじゃ。わしの経験も役に立つかもしれんぞ。'
        }
      };

      const responseKey = label as keyof typeof emotionResponses;
      const emotionResponse = emotionResponses[responseKey]?.[respondingAI] || 
        `その${label}な気持ち、とても大切ですね。`;

      const aiEmotionResponse: ChatMessage = {
        id: generateMessageId('ai-emotion'),
        text: emotionResponse,
        sender: 'ai',
        timestamp: Date.now() + 100,
        aiRole: respondingAI,
        emotion: label
      };

      setMessages(prev => [...prev, aiEmotionResponse]);
      onAddGlobalMessage(aiEmotionResponse);
    }, 800);
  };

  // AIキャラクター選択トグル
  const toggleAI = (aiRole: AiRole) => {
    setActiveAIs(prev => 
      prev.includes(aiRole) 
        ? prev.filter(ai => ai !== aiRole)
        : [...prev, aiRole]
    );
  };

  if (!isMounted) {
    return <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <NavigationHeader
        currentScreen="group-chat"
        title="グループチャット"
        subtitle="3人のAIキャラクターと一緒にお話し"
        onNavigate={onNavigate}
        previousScreen="character-selection"
        userPlan={userPlan}
        userInfo={userInfo}
        isLoggedIn={isLoggedIn}
        onPlanChange={onPlanChange}
        onPlanChangeRequest={onPlanChangeRequest}
        onLogout={onLogout}
        onNicknameChange={onNicknameChange}
        onEmailChange={onEmailChange}
      />

      <div className="max-w-6xl mx-auto p-4 pb-32">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* チャットエリア */}
          <div className="flex-1">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg h-[500px] md:h-[600px] lg:h-[700px] flex flex-col overflow-hidden border border-white/20">
              {/* AI選択エリア（チャットコンテナ内上部） */}
              <div className="bg-emerald-50 border-b border-emerald-100 p-4">
                <Typography variant="small" weight="medium" color="primary" className="mb-3">
                  参加するAIキャラクター
                </Typography>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(AI_CHARACTERS).map(([key, character]) => (
                    <TouchTarget
                      key={key}
                      onClick={() => toggleAI(key as AiRole)}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border-2 transition-all text-sm
                        ${activeAIs.includes(key as AiRole)
                          ? `${getCharacterThemeColor(key as AiRole, 'bg')} ${getCharacterThemeColor(key as AiRole, 'border')} ${getCharacterThemeColor(key as AiRole)}`
                          : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden">
                        <Image
                          src={character.image}
                          alt={character.name}
                          width={24}
                          height={24}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs font-medium">{character.name}</span>
                    </TouchTarget>
                  ))}
                </div>
              </div>

              {/* メッセージエリア */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'ai' && (
                        <div className="flex items-end space-x-2 max-w-[80%]">
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                              src={AI_CHARACTERS[msg.aiRole!]?.image || '/images/icons/tamasan.png'}
                              alt={AI_CHARACTERS[msg.aiRole!]?.name || 'AI'}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className={`text-xs ${getCharacterThemeColor(msg.aiRole)} opacity-75 mb-1`}>
                              {AI_CHARACTERS[msg.aiRole!]?.name} • {formatTimestamp(msg.timestamp)}
                            </div>
                            <div className={`${getCharacterThemeColor(msg.aiRole, 'bg')} p-3 rounded-2xl rounded-bl-sm border border-white/30 shadow-sm`}>
                              <span className="text-gray-800 font-medium">{msg.text}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {msg.sender === 'user' && (
                        <div className="max-w-[80%]">
                          <div className="text-xs text-gray-500 text-right mb-1">
                            {formatTimestamp(msg.timestamp)}
                          </div>
                          <div className="bg-emerald-600 text-white p-3 rounded-2xl rounded-br-sm border border-emerald-700 shadow-sm">
                            {msg.emotion ? (
                              <span className="text-2xl">{msg.text}</span>
                            ) : (
                              <span className="font-medium">{msg.text}</span>
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
                    className="flex justify-start space-x-4"
                  >
                    {activeAIs.slice(0, 2).map((aiRole, index) => (
                      <div key={aiRole} className="flex items-end space-x-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <Image
                            src={AI_CHARACTERS[aiRole].image}
                            alt={AI_CHARACTERS[aiRole].name}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className={`${getCharacterThemeColor(aiRole, 'bg')} p-3 rounded-2xl`}>
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: `${0.1 + index * 0.1}s`}}></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: `${0.2 + index * 0.1}s`}}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 入力エリア */}
              <div className="p-4 bg-gray-50 border-t">
                {/* 感情スタンプ */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {EMOTIONS.map((emotion) => (
                    <TouchTarget
                      key={emotion.label}
                      onClick={() => handleEmotionSend(emotion.emoji, emotion.label)}
                      className="flex items-center space-x-1 px-3 py-1 bg-white rounded-full text-sm hover:bg-gray-100 transition-colors"
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
                    disabled={isTyping}
                  />
                  <TouchTarget
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isTyping || activeAIs.length === 0}
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
            {/* Tree Growth Status */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <h3 className="text-lg font-bold text-emerald-800 mb-4">木の成長状況</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">文字数</span>
                  <span className="font-bold text-emerald-600">{totalCharacters}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">実の数</span>
                  <span className="font-bold text-emerald-600">{fruits.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((totalCharacters / 5000) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  レベル {calculateTreeStage(totalCharacters)}/6
                </p>
              </div>
            </div>

            {/* 1:1チャットへの案内 */}
            <div className="bg-gradient-to-r from-blue-100/90 to-indigo-100/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <h3 className="text-lg font-bold text-blue-800 mb-3 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                1:1チャット
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                一人のAIキャラクターとじっくりお話ししたい時は
              </p>
              <div className="space-y-2">
                <TouchTarget
                  onClick={() => {
                    console.log('Navigating to character-selection from group chat');
                    onNavigate('character-selection');
                  }}
                  className="w-full bg-blue-500 text-white py-2 rounded-lg text-center font-medium hover:bg-blue-600 transition-colors"
                >
                  キャラクターを選んで1:1チャット
                </TouchTarget>
                {selectedAiRole && (
                  <TouchTarget
                    onClick={() => {
                      console.log('Navigating to chat from group chat with selected AI:', selectedAiRole);
                      onNavigate('chat');
                    }}
                    className="w-full bg-blue-400 text-white py-2 rounded-lg text-center font-medium hover:bg-blue-500 transition-colors text-sm"
                  >
                    前回のキャラクターで1:1チャット
                  </TouchTarget>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupChatScreen;
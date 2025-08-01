'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Crown, Users } from 'lucide-react';
import Image from 'next/image';
import NavigationHeader from '../layout/NavigationHeader';
import TouchTarget from '../ui/TouchTarget';
import ChatHeader from './chat/ChatHeader';
import TreeGrowthStatus from './chat/TreeGrowthStatus';
import { ChatScreenProps, AiRole, MoodType } from '@/types';
import { useChat, useChatModeChange } from '@/lib/hooks';
import { AI_CHARACTERS, EMOTIONS } from '@/lib/constants';
import { getCharacterThemeColor, generateMessageId, formatTimestamp, calculateTreeStage } from '@/lib/utils';

const ChatScreen = ({ 
  selectedAiRole, 
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
  onMoodChange,
  userInfo,
  isLoggedIn,
  onPlanChange,
  onPlanChangeRequest,
  onLogout,
  onNicknameChange,
  onEmailChange
}: ChatScreenProps) => {
  const [selectedMoodState, setSelectedMoodState] = useState<MoodType>(currentMood);

  const handleMoodChange = (mood: MoodType) => {
    setSelectedMoodState(mood);
    if (onMoodChange) {
      onMoodChange(mood);
    }
  };

  // カスタムフックを使用
  const {
    messages,
    inputText,
    setInputText,
    isTyping,
    setIsTyping,
    isMounted,
    messagesEndRef,
    currentTreeStage,
    addMessage
  } = useChat(globalMessages, onAddGlobalMessage, totalCharacters);

  // チャットモード変更の検出
  useChatModeChange(chatMode, onAddGlobalMessage);

  const character = AI_CHARACTERS[selectedAiRole];

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

  // ほめの実の生成メッセージ生成関数
  const generateFruitMessage = (emotion: string, aiRole: AiRole): string => {
    const fruitMessages = {
      tama: {
        '疲れ': 'あなたが今感じている疲れ、それもとても大切なものですね。そんな正直な気持ちがほめの実になりました。',
        '嬉しい': 'その喜びが伝わってきました。あなたの嬉しさが、こうしてほめの実として形になってくれたのですね。',
        '大変': 'いろいろと大変なことがあるのですね。でも、そうやって向き合うあなたの姿がほめの実になりました。',
        '愛情': 'あなたの温かい愛情が、こんなに美しいほめの実を育ててくれました。素敵ですね。',
        '不安': '不安になることだってありますよね。その素直な気持ちも、ちゃんとほめの実として残してくれました。'
      },
      madoka: {
        '疲れ': 'お疲れ様！そんな時こそ素直な気持ちを話してくれて、それがほめの実になったんですね！',
        '嬉しい': 'わあ！その嬉しい気持ちがほめの実になりました！私も一緒に嬉しいです！',
        '大変': '大変な時でも頑張っているあなたの気持ち、ちゃんとほめの実として形になりましたよ！',
        '愛情': 'その愛情たっぷりな気持ち、ほめの実になって残ってくれました！素晴らしいです！',
        '不安': '不安な気持ちも大事にしてくれてありがとう。それも立派なほめの実になりました！'
      },
      hide: {
        '疲れ': 'ふむふむ、疲れを感じる時もあるものじゃ。そんな時の素直さが、ほめの実として残ったのじゃな。',
        '嬉しい': 'その嬉しい気持ち、よく分かるぞ。それが実を結んだのは、自然なことじゃ。',
        '大変': '人生には大変なこともあるものじゃ。それでも頑張るあなたの心が、ほめの実になったのじゃよ。',
        '愛情': 'その愛情深い心、わしにもよく伝わってくる。それがほめの実として形になったのじゃ。',
        '不安': '不安を感じることも、人として当たり前のことじゃ。その気持ちがほめの実になったのじゃな。'
      }
    };
    
    const messages = fruitMessages[aiRole];
    return messages[emotion as keyof typeof messages] || `今の会話で感じた気持ちが、ほめの実として残りました。`;
  };

  // 成長メッセージ生成関数
  const generateGrowthMessage = (stage: number, aiRole: AiRole): string => {
    const growthMessages = {
      tama: {
        2: 'あら、あなたの温かい言葉で木が少し大きくなったようですね。',
        3: 'ご覧になって。あなたの日々の頑張りが木を育てているのですよ。',
        4: '素晴らしいですね。木がこんなにしっかりと成長しています。',
        5: 'あなたの愛情深い言葉が、こんなに立派な木に育ててくれました。',
        6: '完全に成長しました。あなたの心の豊かさが形になったのですね。'
      },
      madoka: {
        2: 'あ！木が成長してる！あなたの言葉の力ですね！',
        3: 'すごいじゃないですか！木がどんどん大きくなってますよ！',
        4: 'わあ！立派な木になってきましたね。これも全部あなたの努力の賜物です！',
        5: 'こんなに大きく育って...あなたの愛情がしっかり届いているんですね！',
        6: '完全成長です！あなたの心の成長と一緒に木も最高の姿になりました！'
      },
      hide: {
        2: 'ほほう、木が少し大きくなったのう。あなたの言葉に力があるからじゃ。',
        3: 'なかなか立派になってきたではないか。日々の積み重ねが実を結んでおる。',
        4: 'ふむふむ、しっかりした木に育っておるな。あなたの心根の良さが現れておる。',
        5: 'これは見事な木じゃ。あなたの愛情の深さがよくわかるよ。',
        6: '完全な成長じゃな。長い人生でこれほど美しい成長を見るのは珍しいことじゃ。'
      }
    };
    
    const messages = growthMessages[aiRole];
    if (messages && stage >= 2 && stage <= 6) {
      return messages[stage as keyof typeof messages] || '';
    }
    return '';
  };

  // AI応答生成関数
  const generateAiResponse = (userMessage: string, aiRole: AiRole, mood: MoodType): string => {
    const responses = {
      tama: {
        praise: [
          'そうですね、今日も一日がんばられましたね。あなたの努力、きちんと見ていますよ。',
          'お疲れさまでした。自分を責めずに一息つけたあなた、ちゃんとえらいです。',
          'そんな風に子供のことを思えるあなたの気持ち、とても温かいです。',
          'その優しい心が、いつも周りを明るくしてくれているのですね。',
          'あなたが感じていること、すべて大切な気持ちです。',
        ],
        listen: [
          'そうでしたか。今日はどんな気持ちでしたか？',
          'お話しを聞かせてくださってありがとうございます。',
          'その気持ち、よくわかります。辛い時もありますものね。',
          'あなたの感じていること、すべて大切です。',  
          'いつでもあなたの味方でいますからね。',
        ]
      },
      madoka: {
        praise: [
          'お疲れ様です！今日もよく頑張りましたね！',
          'そんな風に思えるあなたって、本当に素敵だと思います！',
          'その気持ち、すごくよくわかります！あなたの優しさが伝わってきます！',
          'あなたの努力、ちゃんと見えていますよ！すごいじゃないですか！',
          'そうやって子供のことを大切に思うあなたの愛情、素晴らしいです！',
        ],
        listen: [
          '今日はお疲れ様でした。どんなことがありましたか？',
          'お話しを聞かせてくれてありがとうございます！',
          '大変でしたね。でも、あなたは頑張っていますよ！',
          'その気持ち、私にもよく伝わってきます。',
          '何でも話してくださいね。一緒に考えましょう！',
        ]
      },
      hide: {
        praise: [
          'ふむふむ、今日も一日お疲れじゃったな。よく頑張ったのう。',
          'その心がけ、なかなか立派じゃないか。見習いたいものじゃ。',
          'あなたのような親をもつ子供は幸せもんじゃな。',
          '人生いろいろあるが、そうやって向き合うあなたは偉いぞ。',
          'その愛情深さ、わしの長い人生でもなかなか見られるものではないぞ。',
        ],
        listen: [
          'ふむ、今日はどんな一日じゃったかな？',
          'そうか、話してくれてありがとうな。',
          '人生、山あり谷ありじゃ。そんな時もあるさ。',
          'その気持ち、よくわかるぞ。昔のわしもそうじゃった。',
          'いつでもわしがそばにおるからな、安心せい。',
        ]
      }
    };

    const roleResponses = responses[aiRole][mood];
    // SSR/クライアント間の一貫性のため、時間ベースの疑似ランダムを使用
    const pseudoRandom = (Date.now() % roleResponses.length);
    return roleResponses[pseudoRandom];
  };

  // メッセージ送信処理
  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const newMessage = {
      id: generateMessageId('user'),
      text: inputText,
      sender: 'user' as const,
      timestamp: Date.now()
    };
    addMessage(newMessage);

    setIsTyping(true);
    const currentMessage = inputText;
    setInputText('');

    // 文字数追加
    onAddCharacters(currentMessage.length);
    const newTotalCharacters = totalCharacters + currentMessage.length;

    setTimeout(async () => {
      // AI応答生成
      const response = generateAiResponse(currentMessage, selectedAiRole, selectedMoodState);
      
      const aiResponse = {
        id: generateMessageId('ai'),
        text: response,
        sender: 'ai' as const,
        timestamp: Date.now() + 1,
        aiRole: selectedAiRole,
        mood: selectedMoodState
      };
      addMessage(aiResponse);

      // チャット履歴に追加
      onAddChatHistory(currentMessage, response, selectedAiRole);

      // 木の成長チェック
      const previousTreeStage = currentTreeStage;
      const newTreeStage = calculateTreeStage(newTotalCharacters);
      
      // 感情検出と実の生成
      const detectedEmotion = detectEmotion(currentMessage);
      if (detectedEmotion) {
        const fruitMessage = generateFruitMessage(detectedEmotion, selectedAiRole);
        onAddFruit(currentMessage, fruitMessage, detectedEmotion);
        
        setTimeout(() => {
          const fruitNotification = {
            id: generateMessageId('fruit'),
            text: fruitMessage,
            sender: 'ai' as const,
            timestamp: Date.now(),
            aiRole: selectedAiRole
          };
          addMessage(fruitNotification);
        }, 1000);
      }

      // 木の成長通知
      if (newTreeStage > previousTreeStage && newTreeStage >= 2) {
        const growthMessage = generateGrowthMessage(newTreeStage, selectedAiRole);
        if (growthMessage) {
          setTimeout(() => {
            const growthNotification = {
              id: generateMessageId('growth'),
              text: `🌳 ${growthMessage}`,
              sender: 'ai' as const,
              timestamp: Date.now(),
              aiRole: selectedAiRole
            };
            addMessage(growthNotification);
          }, detectedEmotion ? 2000 : 1500);
        }
      }

      setIsTyping(false);
    }, 1500);
  };

  // 感情スタンプ送信
  const handleEmotionSend = (emoji: string, label: string) => {
    const emotionMessage = {
      id: generateMessageId('emotion'),
      text: emoji,
      sender: 'user' as const,
      timestamp: Date.now(),
      emotion: label
    };
    addMessage(emotionMessage);

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
      const emotionResponse = emotionResponses[responseKey]?.[selectedAiRole] || 
        `その${label}な気持ち、とても大切ですね。`;

      const aiEmotionResponse = {
        id: generateMessageId('ai-emotion'),
        text: emotionResponse,
        sender: 'ai' as const,
        timestamp: Date.now() + 100,
        aiRole: selectedAiRole,
        emotion: label
      };
      addMessage(aiEmotionResponse);
    }, 800);
  };

  if (!isMounted) {
    return <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <NavigationHeader
        currentScreen="chat"
        title={`${character.name}との1:1チャット`}
        subtitle={selectedMoodState === 'praise' ? 'ほめほめモード' : '聞いてモード'}
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
              {/* チャットヘッダー */}
              <ChatHeader
                selectedAiRole={selectedAiRole}
                currentMood={selectedMoodState}
                chatMode={chatMode}
                userPlan={userPlan}
                isGroupChat={false}
                onChatModeChange={onChatModeChange}
                onMoodChange={handleMoodChange}
              />

              {/* メッセージエリア */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                  {messages.map((msg, index) => (
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
                      {msg.sender === 'system' && (
                        <div className="w-full flex justify-center">
                          <div className={`${getCharacterThemeColor(msg.aiRole, 'bg')} px-4 py-2 rounded-full text-sm border border-white/30 shadow-sm`}>
                            <span className="text-gray-800 font-medium">{msg.text}</span>
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
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        <Image
                          src={character.image}
                          alt={character.name}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className={`${getCharacterThemeColor(selectedAiRole, 'bg')} p-3 rounded-2xl`}>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
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
                    disabled={!inputText.trim() || isTyping}
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
            <TreeGrowthStatus
              currentTreeStage={currentTreeStage}
              totalCharacters={totalCharacters}
              fruits={fruits}
              onNavigate={onNavigate}
            />

            {/* グループチャットへの案内 */}
            {userPlan === 'premium' && (
              <div className="bg-gradient-to-r from-blue-100/90 to-indigo-100/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <h3 className="text-lg font-bold text-blue-800 mb-3 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  グループチャット
                </h3>
                <p className="text-sm text-blue-700 mb-4">
                  3人のAIキャラクターと一緒にお話ししませんか？
                </p>
                <TouchTarget
                  onClick={() => onNavigate('group-chat')}
                  className="w-full bg-blue-500 text-white py-2 rounded-lg text-center font-medium hover:bg-blue-600 transition-colors"
                >
                  グループチャットを始める
                </TouchTarget>
              </div>
            )}

            {/* プレミアム案内 */}
            {userPlan === 'free' && (
              <div className="bg-gradient-to-r from-amber-100/90 to-yellow-100/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <h3 className="text-lg font-bold text-amber-800 mb-3 flex items-center">
                  <Crown className="w-5 h-5 mr-2" />
                  プレミアム機能
                </h3>
                <div className="space-y-2 text-sm text-amber-700 mb-4">
                  <p>• グループチャット機能</p>
                  <p>• ディープモード</p>
                  <p>• チャット履歴180日保存</p>
                </div>
                <TouchTarget
                  onClick={() => onNavigate('premium')}
                  className="w-full bg-amber-500 text-white py-2 rounded-lg text-center font-medium hover:bg-amber-600 transition-colors"
                >
                  詳細を見る
                </TouchTarget>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
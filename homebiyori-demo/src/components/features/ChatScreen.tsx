'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trees, Heart, MessageCircle, ArrowLeft, Zap, Crown } from 'lucide-react';
import Image from 'next/image';
import WatercolorTree from '@/components/ui/WatercolorTree';
import { AiRole, MoodType, AppScreen, UserPlan, ChatMode, ChatHistory } from './MainApp';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  aiRole?: AiRole;
  mood?: MoodType;
  emotion?: string;
}

interface ChatScreenProps {
  selectedAiRole: AiRole;
  currentMood: MoodType;
  onNavigate: (screen: AppScreen) => void;
  onAddCharacters: (count: number) => void;
  onAddFruit: (userMessage: string, aiResponse: string, emotion: string) => void;
  onAddChatHistory: (userMessage: string, aiResponse: string, aiRole: AiRole) => void;
  totalCharacters: number;
  fruits: Array<{
    id: string;
    userMessage: string;
    aiResponse: string;
    aiRole: AiRole;
    createdAt: string;
    emotion: string;
  }>;
  userPlan: UserPlan;
  chatMode: ChatMode;
  chatHistory: ChatHistory[];
  onChatModeChange: (mode: ChatMode) => void;
}

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
  onChatModeChange
}: ChatScreenProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // 文字数から木の成長段階を計算（6段階、テスト用に低い閾値）
  const calculateTreeStage = (characters: number): number => {
    if (characters < 20) return 1;    // 芽
    if (characters < 50) return 2;    // 小さな苗
    if (characters < 100) return 3;   // 若木
    if (characters < 180) return 4;   // 中木
    if (characters < 300) return 5;   // 大木
    return 6;                         // 完全成長
  };

  const [selectedMoodState, setSelectedMoodState] = useState<MoodType>(currentMood);
  const [currentTreeStage, setCurrentTreeStage] = useState(() => {
    // 初期化時に現在の文字数に基づいて正しい段階を設定（6段階、テスト用に低い閾値）
    return calculateTreeStage(totalCharacters);
  });
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const characters = {
    tama: {
      name: 'たまさん',
      image: '/images/icons/tamasan.png',
      color: 'rose'
    },
    madoka: {
      name: 'まどか姉さん',
      image: '/images/icons/madokanesan.png',
      color: 'sky'
    },
    hide: {
      name: 'ヒデじい',
      image: '/images/icons/hideji.png',
      color: 'amber'
    }
  };

  const character = characters[selectedAiRole];



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

  // ほめの実の生成メッセージ生成関数（会話ベース）
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
          '無理をせずに、今日できたことを認めてあげてくださいね。',
          '小さなことでも、それは大きな愛情の表れです。自信を持ってください。'
        ],
        listen: [
          'その気持ち、よくわかります。今日は大変だったのですね。',
          'そんな顔をして…何があったか、聞かせてもらえませんか？',
          '無理に話さなくても大丈夫ですよ。そばにいますから。',
          'つらい時は、つらいって言っていいんですよ。',
          'その重たい気持ち、一人で抱えなくていいですからね。'
        ]
      },
      madoka: {
        praise: [
          'その気持ち、よくわかります！育児って本当に予想外の連続ですよね。',
          'すごいじゃないですか！その調子で頑張っていきましょう。',
          '大丈夫、あなたなら必ずできます。私が応援していますから！',
          'そういう風に考えられるなんて、本当に素晴らしい視点ですね。',
          '一歩一歩でいいんです。確実に前に進んでいますよ。'
        ],
        listen: [
          'うんうん、そういうこともありますよね。今日は何があったんですか？',
          'わかります、私も同じような経験があります。',
          'そんな時は、無理しないことが一番です。',
          '話してくれてありがとう。きっといい方向に向かいますよ。',
          'その前向きな気持ち、とても素敵です。'
        ]
      },
      hide: {
        praise: [
          'ほほう、そういうことがあったのじゃな。よくやっておる。',
          'その気持ちが一番大切じゃよ。人間としての成長を感じるよ。',
          'わしの長い人生から言わせてもらうと、それは立派なことじゃ。',
          '昔も今も、親の愛は変わらんからのう。安心するがよい。',
          'そういう小さなことに喜びを見つけるのが、人生の秘訣じゃよ。'
        ],
        listen: [
          'ふむふむ、そういうこともあるものじゃ。',
          'その重たい気持ち…それだけ大事なことなんじゃな。',
          '人生にはいろいろあるもんじゃ。ゆっくりでよいぞ。',
          'わしは聞いているから、無理せず話すがよい。',
          '時には立ち止まることも大切じゃよ。'
        ]
      }
    };

    const roleResponses = responses[aiRole][mood];
    return roleResponses[Math.floor(Math.random() * roleResponses.length)];
  };

  // 初期挨拶メッセージ
  useEffect(() => {
    const greetings = {
      tama: {
        praise: 'こんにちは。今日はどんな一日でしたか？頑張ったこと、聞かせてください。',
        listen: 'こんにちは。今日はどんな気持ちですか？何でもお話しください。'
      },
      madoka: {
        praise: 'お疲れさまです！今日はどんなことを頑張りましたか？',
        listen: 'お疲れさまです！今日はどんなことがありましたか？'
      },
      hide: {
        praise: 'ほほう、今日も一日お疲れじゃったな。どんなことがあったのじゃ？',
        listen: 'ふむ、今日はどんな心持ちじゃな？話を聞かせてもらおうか。'
      }
    };

    const greeting: ChatMessage = {
      id: '1',
      text: greetings[selectedAiRole][selectedMoodState],
      sender: 'ai',
      timestamp: Date.now(),
      aiRole: selectedAiRole,
      mood: selectedMoodState
    };
    setMessages([greeting]);
  }, [selectedAiRole, selectedMoodState]);

  // メッセージスクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // メッセージ送信
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // 文字数をカウント
    const messageLength = inputText.length;
    const newTotalCharacters = totalCharacters + messageLength;
    onAddCharacters(messageLength);

    // 感情検出
    const detectedEmotion = detectEmotion(inputText);

    // 成長チェック
    const newStage = calculateTreeStage(newTotalCharacters);
    const hasGrown = newStage > currentTreeStage;
    
    if (hasGrown) {
      console.log(`Tree growth detected: ${currentTreeStage} -> ${newStage}, characters: ${newTotalCharacters}`);
      setCurrentTreeStage(newStage);
    }

    setInputText('');
    setIsTyping(true);

    // AI応答生成
    setTimeout(() => {
      // 通常の応答
      // パーソナライズされた応答を生成（履歴を考慮）
      const recentHistory = chatHistory.slice(-5);
      const aiResponseText = generateAiResponse(inputText, selectedAiRole, selectedMoodState);
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        sender: 'ai',
        timestamp: Date.now(),
        aiRole: selectedAiRole,
        mood: selectedMoodState
      };

      setMessages(prev => [...prev, aiResponse]);
      
      // チャット履歴に追加
      onAddChatHistory(inputText, aiResponseText, selectedAiRole);

      // 感情検出して実を追加
      if (detectedEmotion) {
        onAddFruit(inputText, aiResponseText, detectedEmotion);
        // 実の通知メッセージを追加
        setTimeout(() => {
          const fruitMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            text: `✨ ${generateFruitMessage(detectedEmotion, selectedAiRole)}`,
            sender: 'ai',
            timestamp: Date.now(),
            aiRole: selectedAiRole,
            mood: selectedMoodState
          };
          setMessages(prev => [...prev, fruitMessage]);
        }, 600);
      }

      // 成長した場合は、少し遅れて成長通知を追加
      if (hasGrown) {
        setTimeout(() => {
          const growthMessage: ChatMessage = {
            id: (Date.now() + 3).toString(),
            text: `🌱 ${generateGrowthMessage(newStage, selectedAiRole)}`,
            sender: 'ai',
            timestamp: Date.now(),
            aiRole: selectedAiRole,
            mood: selectedMoodState
          };
          setMessages(prev => [...prev, growthMessage]);
        }, detectedEmotion ? 1200 : 800); // 実の通知がある場合は少し遅らせる
      }

      setIsTyping(false);
    }, 1000);
  };

  // 感情アイコン送信
  const handleEmotionSend = (emotion: string) => {
    const emotionMessage: ChatMessage = {
      id: Date.now().toString(),
      text: '',
      sender: 'user',
      timestamp: Date.now(),
      emotion
    };

    setMessages(prev => [...prev, emotionMessage]);
    setIsTyping(true);

    const emotionResponses = {
      '😔': 'その顔…今日はたいへんだったね。',
      '😠': 'むっとした気持ち、よくわかります。',
      '🥲': 'いまは、なにも言わなくても大丈夫だよ。',
      '😴': 'お疲れのようですね。ゆっくり休んでください。',
      '😊': 'いい表情ですね。何か嬉しいことがあったのかな？'
    };

    setTimeout(() => {
      const response = emotionResponses[emotion as keyof typeof emotionResponses] || 'その気持ち、受け取りました。';
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'ai',
        timestamp: Date.now(),
        aiRole: selectedAiRole,
        mood: selectedMoodState
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enterで改行
        return;
      } else {
        // Enterで送信
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 relative">
      {/* バックグラウンドの木 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* デバッグ用の背景確認 */}
        <div className="absolute top-4 left-4 text-xs text-emerald-600 opacity-50">
          Tree Stage: {currentTreeStage}, Characters: {totalCharacters}
        </div>
        
        {/* メインの木（画面中央） */}
        {isMounted && (
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-60">
            <motion.div
              key={`tree-${currentTreeStage}`}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1.3, opacity: 0.6 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="w-[500px] h-[500px]"
              style={{
                filter: 'contrast(1.1) brightness(1.1) saturate(0.8)'
              }}
            >
              <WatercolorTree ageInDays={currentTreeStage * 100} isBackground={true} fruits={fruits} />
            </motion.div>
          </div>
        )}
      </div>

      {/* ヘッダー */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 p-4 relative z-10">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => onNavigate('character-selection')}
            className="flex items-center text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            戻る
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-200">
              <Image
                src={character.image}
                alt={character.name}
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="font-bold text-emerald-800">{character.name}</h1>
              <p className="text-sm text-emerald-600">
                {selectedMoodState === 'praise' ? '褒めてほしい気分' : '話を聞いてほしい気分'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* ディープモード切り替え（プレミアム限定） */}
            {userPlan === 'premium' && (
              <button
                onClick={() => onChatModeChange(chatMode === 'normal' ? 'deep' : 'normal')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  chatMode === 'deep'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>{chatMode === 'deep' ? 'ディープ' : 'ノーマル'}</span>
                {chatMode === 'deep' && <Crown className="w-3 h-3" />}
              </button>
            )}
            
            <button
              onClick={() => onNavigate('tree')}
              className="flex items-center px-3 py-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors text-sm font-medium"
            >
              <Trees className="w-4 h-4 mr-1" />
              木を見る
            </button>
          </div>
        </div>

        {/* 気分切り替え */}
        <div className="mt-4 flex justify-center">
          <div className="flex bg-emerald-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedMoodState('praise')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedMoodState === 'praise'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-emerald-600 hover:text-emerald-700'
              }`}
            >
              <Heart className="w-4 h-4 mr-2" />
              褒めてほしい
            </button>
            <button
              onClick={() => setSelectedMoodState('listen')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedMoodState === 'listen'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-emerald-600 hover:text-emerald-700'
              }`}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              聞いてほしい
            </button>
          </div>
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md ${
                message.sender === 'user' ? 'order-1' : 'order-2'
              }`}>
                {message.sender === 'ai' && (
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-200 mr-2">
                      <Image
                        src={character.image}
                        alt={character.name}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                    <span className="text-sm text-emerald-700 font-medium">{character.name}</span>
                  </div>
                )}
                
                <div className={`px-4 py-3 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-gray-800 border border-emerald-100'
                }`}>
                  {message.emotion ? (
                    <span className="text-2xl">{message.emotion}</span>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                  )}
                </div>
                
                <div className={`mt-1 text-xs text-gray-500 ${
                  message.sender === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 入力中表示 */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-200">
                <Image
                  src={character.image}
                  alt={character.name}
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </div>
              <div className="bg-white border border-emerald-100 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-emerald-100 p-4 relative z-10">
        {/* AI注意喚起 */}
        <div className="mb-3 text-center">
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ AIは誤った情報を提供する可能性があります。重要な判断の際は専門家にご相談ください。
          </p>
        </div>

        {/* 感情アイコン */}
        <div className="flex justify-center space-x-4 mb-4">
          {['😊', '😔', '😠', '🥲', '😴'].map((emotion) => (
            <button
              key={emotion}
              onClick={() => handleEmotionSend(emotion)}
              className="text-2xl hover:scale-110 transition-transform"
            >
              {emotion}
            </button>
          ))}
        </div>

        {/* テキスト入力 */}
        <div className="flex items-end space-x-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力... (Shift+Enterで改行)"
            className="flex-1 px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent text-gray-800 resize-none min-h-[48px] max-h-32"
            rows={1}
            style={{
              height: 'auto',
              minHeight: '48px',
              maxHeight: '128px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChatScreen;
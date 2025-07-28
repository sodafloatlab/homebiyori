'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AiIcon, { getAiRoleName, AiRole } from '@/components/ui/AiIcon';
import WatercolorTree from '@/components/ui/WatercolorTree';
import { DemoStorage } from '@/lib/demoStorage';

// 今日の気分の型定義
type MoodType = 'praise' | 'listen';

// チャットメッセージの型定義
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  aiRole?: AiRole;
  mood?: MoodType;
  emotion?: string; // 感情アイコン
}

// 実のデータ型
interface MockFruit {
  id: string;
  x: number;
  y: number;
  type: 'encouragement' | 'reflection';
  aiRole: 'たまさん' | 'まどか姉さん' | 'ヒデじい';
  message: string;
  createdAt: string;
  isGlowing: boolean;
}

// AI応答生成関数（気分別）
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

// 文字数から実生成を判定する関数
const shouldGenerateFruit = (message: string): boolean => {
  // 感情が込められた内容かを簡易判定
  const emotionalKeywords = ['疲れたけど', '頑張った', '嬉しかった', '大変だった', '辛かった', '楽しかった'];
  const hasEmotion = emotionalKeywords.some(keyword => message.includes(keyword));
  const hasLength = message.length >= 20; // 一定の文字数
  
  return hasEmotion && hasLength;
};

export default function IntegratedChatDemo() {
  // 基本状態管理
  const [currentView, setCurrentView] = useState<'welcome' | 'setup' | 'chat' | 'tree'>('welcome');
  const [selectedAiRole, setSelectedAiRole] = useState<AiRole | null>('tama');
  const [currentMood, setCurrentMood] = useState<MoodType>('praise');
  
  // チャット状態管理
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [totalCharacters, setTotalCharacters] = useState(0);
  const [fruits, setFruits] = useState<MockFruit[]>([]);
  
  // 子供の名前（モック）
  const [childrenNames] = useState(['たろう', 'はなこ']);
  
  // UI参照
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初期化
  useEffect(() => {
    const userData = DemoStorage.load();
    if (userData.selectedAiRole) {
      setSelectedAiRole(userData.selectedAiRole);
    }
    setTotalCharacters(userData.totalCharacters || 0);
  }, []);

  // メッセージスクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // AIロール + 気分選択
  const handleSetupComplete = (role: AiRole, mood: MoodType) => {
    setSelectedAiRole(role);
    setCurrentMood(mood);
    DemoStorage.setAiRole(role);
    setCurrentView('chat');

    // 初回挨拶メッセージ
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

    setTimeout(() => {
      const greeting: ChatMessage = {
        id: '1',
        text: greetings[role][mood],
        sender: 'ai',
        timestamp: Date.now(),
        aiRole: role,
        mood
      };
      setMessages([greeting]);
    }, 500);
  };

  // 気分変更
  const handleMoodChange = (newMood: MoodType) => {
    setCurrentMood(newMood);
  };

  // メッセージ送信
  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedAiRole) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // 文字数をカウント（木の成長）
    const messageLength = inputText.length;
    setTotalCharacters(prev => prev + messageLength);
    DemoStorage.addCharacters(messageLength);

    // 実の生成判定
    const shouldGenerate = shouldGenerateFruit(inputText);
    if (shouldGenerate) {
      generateNewFruit();
    }

    setInputText('');
    setIsTyping(true);

    // AI応答生成
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: generateAiResponse(inputText, selectedAiRole, currentMood),
        sender: 'ai',
        timestamp: Date.now(),
        aiRole: selectedAiRole,
        mood: currentMood
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);

      // 木の成長をAIが補足
      if (messageLength > 10) {
        setTimeout(() => {
          const growthMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            text: 'さっきのあなたの言葉が木を成長させたみたいですよ。✨',
            sender: 'ai',
            timestamp: Date.now(),
            aiRole: selectedAiRole
          };
          setMessages(prev => [...prev, growthMessage]);
        }, 2000);
      }
    }, 1000 + Math.random() * 1000);
  };

  // 感情アイコン送信
  const handleEmotionSend = (emotion: string) => {
    if (!selectedAiRole) return;

    const emotionMessage: ChatMessage = {
      id: Date.now().toString(),
      text: '',
      sender: 'user',
      timestamp: Date.now(),
      emotion
    };

    setMessages(prev => [...prev, emotionMessage]);
    setIsTyping(true);

    // 感情アイコンへの応答
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
        mood: currentMood
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 800);
  };

  // 実の生成
  const generateNewFruit = () => {
    if (!selectedAiRole) return;

    const newFruit: MockFruit = {
      id: Date.now().toString(),
      x: 40 + Math.random() * 20,
      y: 30 + Math.random() * 20,
      type: 'encouragement',
      aiRole: selectedAiRole === 'tama' ? 'たまさん' : selectedAiRole === 'madoka' ? 'まどか姉さん' : 'ヒデじい',
      message: `${new Date().toLocaleDateString()}の頑張りを実にしました`,
      createdAt: new Date().toLocaleDateString(),
      isGlowing: true
    };

    setFruits(prev => [...prev, newFruit]);
  };

  // 実タップ処理
  const handleFruitClick = (fruit: MockFruit) => {
    if (!selectedAiRole) return;

    const praiseMessage: ChatMessage = {
      id: Date.now().toString(),
      text: `${fruit.createdAt}のあなたの頑張り、しっかり覚えていますよ。素晴らしかったです。`,
      sender: 'ai',
      timestamp: Date.now(),
      aiRole: selectedAiRole
    };

    setMessages(prev => [...prev, praiseMessage]);
  };

  // キーボードイベント
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // AIキャラクター情報取得
  const getAiCharacterInfo = () => {
    const info = {
      tama: { name: 'たまさん', emoji: '🌸', color: 'pink' },
      madoka: { name: 'まどか姉さん', emoji: '💙', color: 'blue' },
      hide: { name: 'ヒデじい', emoji: '⭐', color: 'yellow' }
    };
    return selectedAiRole ? info[selectedAiRole] : null;
  };

  const characterInfo = getAiCharacterInfo();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50">
      {currentView === 'welcome' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-green-100 max-w-3xl">
            <div className="text-center mb-8">
              <h1 className="font-noto-sans-jp text-4xl font-bold text-green-700 mb-4">
                ほめびより
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed">
                ～育児中の親をAIが優しく褒めてくれるWebアプリケーション～
              </p>
            </div>

            {/* 共感を誘うメッセージ */}
            <div className="text-center mb-8 p-6 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl border border-orange-100">
              <p className="font-noto-sans-jp text-lg text-gray-700 leading-relaxed">
                子育ての努力は見えづらい。<br />
                でも誰かに褒めてもらえると救われる事もある。<br /><br />

                <span className="text-green-700 font-bold">「今日もお疲れさまでした」「あなたはよくやっています」</span><br />
                そんな言葉をかけてもらえたら、明日も頑張れそうですね。<br /><br />
                子育てを頑張るあなたの為に<br /><br /><span className="text-green-700 font-bold text-4xl">「ほめびより」</span><br /><br />は生まれました。<br /><br />
                あなたに寄り添う個性豊かなAIが頑張るあなたを応援します。
              </p>
            </div>

            <div className="space-y-6 mb-8">
              <div className="bg-gradient-to-r from-pink-50 to-blue-50 p-6 rounded-xl border border-pink-100">
                <h3 className="font-noto-sans-jp text-lg font-bold text-gray-800 mb-3 flex items-center justify-center text-center">
                  <span className="text-2xl mr-2">🌸</span>
                  主役は子供ではなく、頑張っているあなたです
                </h3>
                <p className="text-center text-gray-700 text-sm leading-relaxed">
                  あなたの小さな努力も、しっかりと認めて褒めてくれます。<br />
                  育児のやる気や自己肯定感を高めます。
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl border border-blue-100">
                <h3 className="font-noto-sans-jp text-lg font-bold text-gray-800 mb-3 flex items-center justify-center text-center">
                  <span className="text-2xl mr-2">🤖</span>
                  3人のAIキャラクターがあなたをサポート
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center bg-pink-50 p-4 rounded-lg border border-pink-200">
                    <div className="mb-3">
                      <img src="/images/icons/tamasan.png" alt="たまさん" className="w-16 h-16 mx-auto rounded-full bg-white border-2 border-pink-300 shadow-md" />
                    </div>
                    <div className="font-bold text-pink-700 mb-2">たまさん</div>
                    <div className="text-gray-700 text-xs leading-relaxed">
                      いつも優しく寄り添うお母さんのような存在。疑ったり不安になったときも、
                      温かい言葉で包み込んでくれます。あなたの気持ちを一番に考えてくれるパートナーです。
                    </div>
                  </div>
                  <div className="text-center bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="mb-3">
                      <img src="/images/icons/madokanesan.png" alt="まどか姉さん" className="w-16 h-16 mx-auto rounded-full bg-white border-2 border-blue-300 shadow-md" />
                    </div>
                    <div className="font-bold text-blue-700 mb-2">まどか姉さん</div>
                    <div className="text-gray-700 text-xs leading-relaxed">
                      明るくエネルギッシュなお姉さんタイプ。「大丈夫！」「一緒に頑張ろう！」と
                      前向きなエールで背中を押してくれます。落ち込んでいるときこそ元気づけてくれる存在です。
                    </div>
                  </div>
                  <div className="text-center bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="mb-3">
                      <img src="/images/icons/hideji.png" alt="ヒデじい" className="w-16 h-16 mx-auto rounded-full bg-white border-2 border-yellow-300 shadow-md" />
                    </div>
                    <div className="font-bold text-yellow-700 mb-2">ヒデじい</div>
                    <div className="text-gray-700 text-xs leading-relaxed">
                      人生経験豊富なおじいちゃん。「ふむふむ」とうなずきながらも、
                      深い知恵と経験から的確なアドバイスをくれます。今の状況を大きな視点で見てくれる存在です。
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-yellow-50 p-6 rounded-xl border border-green-100">
                <h3 className="font-noto-sans-jp text-lg font-bold text-gray-800 mb-3 flex items-center justify-center text-center">
                  <span className="text-2xl mr-2">🌳</span>
                  育児の努力を木の成長として可視化
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed text-center mb-4">
                  あなたの日々の頑張りが、美しい木の成長として表現されます。<br />
                  特別な瞬間や感情は光る実となって木に宿り、育児の旅路を美しく彩ります。
                </p>
                
                {/* デモ用の木の成長表示 */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mt-4">
                  {/* 小さな木（育児開始時） */}
                  <div className="md:col-span-2 relative h-[40rem] bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50 rounded-xl border border-green-200">
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 rounded-full px-4 py-2 text-sm font-bold text-green-700">
                      アプリ開始時
                    </div>
                    <div className="absolute inset-0 flex items-end justify-center pb-8">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="relative w-48 h-48"
                      >
                        <img
                          src="/images/trees/tree_2.png"
                          alt="小さな木"
                          className="w-full h-full object-contain drop-shadow-lg"
                        />
                      </motion.div>
                    </div>
                    
                  </div>

                  {/* 大きな木（育児継続後） */}
                  <div className="md:col-span-3 relative h-[40rem] bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50 rounded-xl border border-green-200 overflow-hidden -mx-4">
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 rounded-full px-4 py-2 text-sm font-bold text-green-700">
                      育児を頑張ると
                    </div>
                    <div className="absolute inset-0 flex items-end justify-center pb-[-4rem]">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1.5 }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                        className="relative w-96 h-96"
                      >
                        <img
                          src="/images/trees/tree_5.png"
                          alt="成長した木"
                          className="w-full h-full object-contain drop-shadow-lg"
                        />
                      </motion.div>
                    </div>

                    {/* 多数の光る実 */}
                    {[
                      { id: '1', x: 25, y: 25, aiRole: 'たまさん' },
                      { id: '2', x: 75, y: 35, aiRole: 'まどか姉さん' },
                      { id: '3', x: 15, y: 40, aiRole: 'ヒデじい' },
                      { id: '4', x: 80, y: 20, aiRole: 'たまさん' },
                      { id: '5', x: 20, y: 30, aiRole: 'まどか姉さん' },
                      { id: '6', x: 85, y: 45, aiRole: 'ヒデじい' },
                      { id: '7', x: 50, y: 15, aiRole: 'たまさん' },
                      { id: '8', x: 10, y: 25, aiRole: 'まどか姉さん' },
                      { id: '9', x: 90, y: 30, aiRole: 'ヒデじい' },
                      { id: '10', x: 22, y: 45, aiRole: 'たまさん' },
                      { id: '11', x: 78, y: 50, aiRole: 'まどか姉さん' },
                      { id: '12', x: 12, y: 15, aiRole: 'ヒデじい' },
                      { id: '13', x: 45, y: 35, aiRole: 'たまさん' },
                      { id: '14', x: 55, y: 40, aiRole: 'まどか姉さん' },
                      { id: '15', x: 35, y: 20, aiRole: 'ヒデじい' },
                      { id: '16', x: 65, y: 25, aiRole: 'たまさん' }
                    ].map((fruit, index) => {
                      const getFruitColors = (aiRole: string) => {
                        switch (aiRole) {
                          case 'たまさん':
                            return {
                              gradient: 'radial-gradient(circle, rgba(255, 182, 193, 0.8), rgba(255, 148, 179, 0.7), rgba(255, 105, 180, 0.6))',
                              shadow: '0 0 15px rgba(255, 182, 193, 0.6), 0 0 25px rgba(255, 182, 193, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.4)'
                            };
                          case 'まどか姉さん':
                            return {
                              gradient: 'radial-gradient(circle, rgba(135, 206, 235, 0.8), rgba(103, 171, 225, 0.7), rgba(70, 130, 180, 0.6))',
                              shadow: '0 0 15px rgba(135, 206, 235, 0.6), 0 0 25px rgba(135, 206, 235, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.4)'
                            };
                          case 'ヒデじい':
                            return {
                              gradient: 'radial-gradient(circle, rgba(255, 215, 0, 0.8), rgba(255, 190, 83, 0.7), rgba(255, 165, 0, 0.6))',
                              shadow: '0 0 15px rgba(255, 215, 0, 0.6), 0 0 25px rgba(255, 215, 0, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.4)'
                            };
                          default:
                            return {
                              gradient: 'radial-gradient(circle, rgba(255, 215, 0, 0.8), rgba(255, 190, 83, 0.7), rgba(255, 165, 0, 0.6))',
                              shadow: '0 0 15px rgba(255, 215, 0, 0.6), 0 0 25px rgba(255, 215, 0, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.4)'
                            };
                        }
                      };

                      const colors = getFruitColors(fruit.aiRole);
                      
                      return (
                        <motion.div
                          key={fruit.id}
                          className="absolute"
                          style={{
                            left: `${fruit.x}%`,
                            top: `${fruit.y}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ 
                            scale: 1, 
                            opacity: 1,
                            y: [0, -5, 0],
                          }}
                          transition={{ 
                            scale: { delay: 2.5 + index * 0.2, duration: 0.8 },
                            opacity: { delay: 2.5 + index * 0.2, duration: 0.8 },
                            y: { 
                              delay: 3 + index * 0.3,
                              duration: 3 + Math.random() * 2, 
                              repeat: Infinity, 
                              ease: "easeInOut" 
                            }
                          }}
                        >
                          <motion.div
                            className="absolute w-5 h-5 cursor-pointer transition-all duration-300 ease-in-out"
                            style={{
                              animationDelay: `${2.5 + index * 0.2}s`
                            }}
                            animate={{
                              y: [0, -15, -8, 0],
                              opacity: [0.8, 1, 0.8],
                              filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)']
                            }}
                            transition={{ 
                              y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                              opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                              filter: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                            }}
                            whileHover={{ scale: 1.1, filter: "brightness(1.2)" }}
                          >
                            <div
                              className="w-full h-full rounded-full relative overflow-hidden"
                              style={{
                                background: colors.gradient,
                                boxShadow: colors.shadow,
                                filter: 'blur(0.3px)'
                              }}
                            >
                              {/* 内側のハイライト */}
                              <div 
                                className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full"
                                style={{
                                  background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.2), transparent)'
                                }}
                              />
                            </div>
                          </motion.div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            <button
              onClick={() => setCurrentView('setup')}
              className="w-full py-4 bg-green-500 text-white rounded-xl font-noto-sans-jp font-bold text-lg hover:bg-green-600 transition-colors shadow-lg"
            >
              ほめびよりを始める
            </button>
          </div>
        </div>
      )}

      {currentView === 'setup' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-green-100 max-w-2xl">
            <h2 className="font-noto-sans-jp text-2xl font-bold text-green-700 mb-6 text-center">
              AIキャラクターを選択してください
            </h2>
            <p className="text-gray-600 text-center mb-8">
              あなたに寄り添ってくれるAIキャラクターと今日の気分を選んでください
            </p>

            {/* AIロール選択 */}
            <div className="mb-8">
              <h3 className="font-noto-sans-jp text-lg font-bold text-gray-700 mb-4">AIキャラクターを選択</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['tama', 'madoka', 'hide'] as AiRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedAiRole(role)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedAiRole === role
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-white/50 hover:border-green-200'
                    }`}
                  >
                    <AiIcon aiRole={role} size={64} className="mx-auto mb-2" />
                    <div className="font-noto-sans-jp font-bold text-gray-800">
                      {role === 'tama' ? 'たまさん' :
                       role === 'madoka' ? 'まどか姉さん' :
                       role === 'hide' ? 'ヒデじい' : 'たまさん'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {role === 'tama' ? '優しく包み込むような温かさ' :
                       role === 'madoka' ? '明るく前向きなお姉さん的サポート' :
                       '人生経験豊富なおじいちゃんの知恵'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 今日の気分選択 */}
            <div className="mb-8">
              <h3 className="font-noto-sans-jp text-lg font-bold text-gray-700 mb-4">今日の気分</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setCurrentMood('praise')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    currentMood === 'praise'
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white/50 hover:border-blue-200'
                  }`}
                >
                  <div className="text-2xl mb-2">🌟</div>
                  <div className="font-noto-sans-jp font-bold text-gray-800">褒めてほしい気分</div>
                  <div className="text-sm text-gray-600">今日の頑張りを認めてもらいたい</div>
                </button>
                <button
                  onClick={() => setCurrentMood('listen')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    currentMood === 'listen'
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200 bg-white/50 hover:border-purple-200'
                  }`}
                >
                  <div className="text-2xl mb-2">💝</div>
                  <div className="font-noto-sans-jp font-bold text-gray-800">話を聞いてほしい気分</div>
                  <div className="text-sm text-gray-600">気持ちを受け止めてもらいたい</div>
                </button>
              </div>
            </div>

            {/* 開始ボタン */}
            <button
              onClick={() => selectedAiRole && handleSetupComplete(selectedAiRole, currentMood)}
              disabled={!selectedAiRole}
              className={`w-full py-3 rounded-xl font-noto-sans-jp font-bold transition-all ${
                selectedAiRole
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              チャットを始める
            </button>
          </div>
        </div>
      )}

      {currentView === 'tree' && selectedAiRole && (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 via-green-50 to-yellow-50">
          <div className="flex flex-col items-center space-y-8 p-4">
            {/* ヘッダー */}
            <div className="w-full max-w-4xl bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AiIcon aiRole={selectedAiRole} size={48} className="border-2 border-white shadow-md" />
                  <div>
                    <h3 className="font-noto-sans-jp text-lg font-bold text-green-700">育児の努力を可視化</h3>
                    <p className="text-sm text-gray-600">
                      {characterInfo?.name}と一緒に育んだ成長の記録
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentView('chat')}
                    className="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                  >
                    💬 チャットに戻る
                  </button>
                  <button
                    onClick={() => setCurrentView('setup')}
                    className="px-3 py-1 text-sm bg-gray-800/80 text-white rounded-full hover:bg-gray-900/90 transition-colors shadow-md"
                  >
                    設定
                  </button>
                </div>
              </div>
            </div>


            {/* メインの木の表示 */}
            <div className="w-full max-w-4xl">
              <WatercolorTree
                ageInDays={Math.min(Math.floor(totalCharacters / 10) + 1, 1000)}
                fruits={fruits}
                childrenNames={childrenNames}
                onFruitClick={handleFruitClick}
                onTreeShadeClick={() => setCurrentView('chat')}
              />
            </div>

            {/* リセットボタン */}
            <div className="w-full max-w-4xl text-center">
              <button
                onClick={() => {
                  DemoStorage.clear();
                  setCurrentView('setup');
                  setMessages([]);
                  setFruits([]);
                  setTotalCharacters(0);
                }}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                デモデータをリセット
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'chat' && selectedAiRole && characterInfo && (
        <div className="relative min-h-screen">
          {/* 背景の木（半透明） */}
          <div className="absolute inset-0 opacity-75">
            <WatercolorTree
              ageInDays={Math.min(Math.floor(totalCharacters / 10) + 1, 1000)}
              fruits={fruits}
              childrenNames={childrenNames}
              onFruitClick={handleFruitClick}
            />
          </div>

          {/* 前景のチャット */}
          <div className="relative z-10 flex flex-col h-screen">
            {/* ヘッダー */}
            <div className={`p-4 backdrop-blur-sm border-b border-gray-200 ${
              characterInfo.color === 'pink' ? 'bg-pink-100/80' :
              characterInfo.color === 'blue' ? 'bg-blue-100/80' : 'bg-yellow-100/80'
            }`}>
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <div className="flex items-center space-x-3">
                  <AiIcon aiRole={selectedAiRole} size={48} className="border-2 border-white shadow-md" />
                  <div>
                    <h3 className="font-noto-sans-jp font-bold text-gray-800">{characterInfo.name}</h3>
                    <p className="text-sm text-gray-600">
                      {currentMood === 'praise' ? '褒めてほしい気分' : '話を聞いてほしい気分'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentView('tree')}
                    className="px-3 py-1 text-sm bg-gray-800/80 text-white rounded-full hover:bg-gray-900/90 transition-colors shadow-md"
                  >
                    🌳 木を見る
                  </button>
                  <button
                    onClick={() => handleMoodChange(currentMood === 'praise' ? 'listen' : 'praise')}
                    className="px-3 py-1 text-sm bg-gray-800/80 text-white rounded-full hover:bg-gray-900/90 transition-colors shadow-md"
                  >
                    気分変更
                  </button>
                  <button
                    onClick={() => setCurrentView('setup')}
                    className="px-3 py-1 text-sm bg-gray-800/80 text-white rounded-full hover:bg-gray-900/90 transition-colors shadow-md"
                  >
                    設定
                  </button>
                </div>
              </div>
            </div>

            {/* メッセージエリア */}
            <div className="flex-1 overflow-y-auto p-4 bg-white/20 backdrop-blur-sm">
              <div className="max-w-4xl mx-auto space-y-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] ${message.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                        {message.sender === 'ai' && (
                          <div className="flex items-center space-x-2 mb-2">
                            <AiIcon aiRole={selectedAiRole} size={24} />
                            <span className="text-xs font-medium text-gray-600">{characterInfo.name}</span>
                          </div>
                        )}
                        <div
                          className={`p-3 rounded-2xl ${
                            message.sender === 'user'
                              ? 'bg-gray-200 text-gray-900'
                              : characterInfo.color === 'pink' ? 'bg-pink-200 text-pink-900 border border-pink-300' :
                                characterInfo.color === 'blue' ? 'bg-blue-200 text-blue-900 border border-blue-300' :
                                'bg-yellow-200 text-yellow-900 border border-yellow-300'
                          }`}
                        >
                          {message.emotion ? (
                            <div className="text-2xl">{message.emotion}</div>
                          ) : (
                            <p className="text-sm leading-relaxed">{message.text}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className={`p-3 rounded-2xl border ${
                      characterInfo.color === 'pink' ? 'bg-pink-200 border-pink-300' :
                      characterInfo.color === 'blue' ? 'bg-blue-200 border-blue-300' : 'bg-yellow-200 border-yellow-300'
                    }`}>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 感情アイコンエリア */}
            <div className="p-4 bg-white/40 backdrop-blur-sm border-t border-gray-200">
              <div className="max-w-4xl mx-auto">
                <div className="flex justify-center space-x-4 mb-4">
                  {['😔', '😠', '🥲', '😴', '😊'].map((emotion) => (
                    <button
                      key={emotion}
                      onClick={() => handleEmotionSend(emotion)}
                      className="text-2xl p-2 rounded-full hover:bg-white/70 transition-colors"
                      disabled={isTyping}
                    >
                      {emotion}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 入力エリア */}
            <div className="p-4 bg-white/50 backdrop-blur-sm border-t border-gray-200">
              <div className="max-w-4xl mx-auto flex space-x-2">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="今日のことや気持ちを話してみませんか..."
                  className="flex-1 p-3 border border-gray-300 rounded-xl resize-none h-12 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white/90 placeholder-gray-500"
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isTyping}
                  className={`px-4 py-2 rounded-xl text-white font-medium transition-colors ${
                    !inputText.trim() || isTyping
                      ? 'bg-gray-300 cursor-not-allowed'
                      : characterInfo.color === 'pink' ? 'bg-pink-500 hover:bg-pink-600' :
                        characterInfo.color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' :
                        'bg-yellow-500 hover:bg-yellow-600'
                  }`}
                >
                  送信
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center max-w-4xl mx-auto">
                Enterで送信・Shift+Enterで改行 | AIの回答は必ずしも正しくない場合があります
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
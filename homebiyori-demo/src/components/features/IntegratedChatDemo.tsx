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
  const [currentView, setCurrentView] = useState<'setup' | 'chat' | 'tree'>('setup');
  const [selectedAiRole, setSelectedAiRole] = useState<AiRole | null>(null);
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
      {currentView === 'setup' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-green-100 max-w-2xl">
            <h2 className="font-noto-sans-jp text-2xl font-bold text-green-700 mb-6 text-center">
              つぶやきの木陰へようこそ
            </h2>
            <p className="text-gray-600 text-center mb-8">
              AIキャラクターと今日の気分を選んで、統合チャット体験を始めましょう
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
                      {getAiRoleName(role)}
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
                    className="px-3 py-1 text-sm bg-white/70 rounded-full hover:bg-white/90 transition-colors"
                  >
                    設定
                  </button>
                </div>
              </div>
            </div>

            {/* 統計表示 */}
            <div className="w-full max-w-4xl bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-green-100">
              <h3 className="font-noto-sans-jp text-lg font-bold text-green-700 mb-4 text-center">育児の記録</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-green-700">{DemoStorage.getTreeData().totalDays}</div>
                  <div className="text-sm text-gray-600">育児日数</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-700">{totalCharacters}</div>
                  <div className="text-sm text-gray-600">チャット文字数</div>
                </div>
                <div>
                  <div className="text-3xl">✨</div>
                  <div className="text-sm text-gray-600">{fruits.length} 個の実</div>
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

            {/* 成長段階の説明 */}
            <div className="w-full max-w-4xl bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-green-100">
              <h3 className="font-noto-sans-jp text-lg font-bold text-green-700 mb-4 text-center">木は今日も静かに育っています</h3>
              <p className="text-center text-gray-600 mb-4">
                あなたの育児の頑張りが小さな実になっていきます
              </p>
              <div className="text-center text-sm text-gray-500 mb-4">
                チャットで文字を入力すると木が成長し、感情が込められた内容では実が生まれます。<br />
                {characterInfo?.name}との会話を通じて、育児の努力を可視化していきましょう。
              </div>
              <div className="text-center">
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
        </div>
      )}

      {currentView === 'chat' && selectedAiRole && characterInfo && (
        <div className="relative min-h-screen">
          {/* 背景の木（半透明） */}
          <div className="absolute inset-0 opacity-40">
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
                    className="px-3 py-1 text-sm bg-white/70 rounded-full hover:bg-white/90 transition-colors"
                  >
                    🌳 木を見る
                  </button>
                  <button
                    onClick={() => handleMoodChange(currentMood === 'praise' ? 'listen' : 'praise')}
                    className="px-3 py-1 text-sm bg-white/70 rounded-full hover:bg-white/90 transition-colors"
                  >
                    気分変更
                  </button>
                  <button
                    onClick={() => setCurrentView('setup')}
                    className="px-3 py-1 text-sm bg-white/70 rounded-full hover:bg-white/90 transition-colors"
                  >
                    設定
                  </button>
                </div>
              </div>
            </div>

            {/* メッセージエリア */}
            <div className="flex-1 overflow-y-auto p-4 bg-white/30 backdrop-blur-sm">
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
            <div className="p-4 bg-white/50 backdrop-blur-sm border-t border-gray-200">
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
            <div className="p-4 bg-white/70 backdrop-blur-sm border-t border-gray-200">
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
                Enterで送信・Shift+Enterで改行 | 文字数: {totalCharacters} | 
                AIの回答は必ずしも正しくない場合があります
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
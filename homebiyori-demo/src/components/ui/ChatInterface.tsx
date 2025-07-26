'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAIRoleStyle, AI_ROLES } from '@/lib/aiRoleStyles';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  emotionIcon?: string;
  timestamp: Date;
  aiRole?: string;
}

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onSuggestPost?: (message: string) => void;
}

const ChatInterface = ({ isVisible, onClose, onSuggestPost }: Props) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: 'つぶやきの木陰へようこそ。今日はどんな気持ちですか？言葉にならない時は、感情アイコンだけでも大丈夫です。',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedAIRole, setSelectedAIRole] = useState('tama');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const emotionIcons = [
    { emoji: '😔', label: '落ち込んでいる' },
    { emoji: '😠', label: '怒っている' },
    { emoji: '🥲', label: '複雑な気持ち' },
    { emoji: '😴', label: '疲れている' },
    { emoji: '😰', label: '不安' },
    { emoji: '🤗', label: '甘えたい' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = (userMessage: string, isEmotion: boolean = false) => {
    const roleStyle = getAIRoleStyle(selectedAIRole);
    const role = AI_ROLES[selectedAIRole];
    
    let response = '';
    
    if (isEmotion) {
      // 感情アイコンへの応答
      switch (userMessage) {
        case '😔':
          response = role.name === 'tama' 
            ? 'その顔…今日はたいへんだったのね。大丈夫よ、あなたは一人じゃないから。'
            : role.name === 'madoka'
            ? '落ち込む日もあるよね。でも、そんな自分も受け入れて。あなたはよくやってる。'
            : 'その表情から、心の重さが伝わってくるよ。今は、何も言わなくても大丈夫だからね。';
          break;
        case '😠':
          response = role.name === 'tama'
            ? 'イライラしちゃったのね。そんな時もあるわよ。怒ってもいいのよ、人間だもの。'
            : role.name === 'madoka'
            ? '怒りを感じてるんだね。その感情も大切。無理に抑える必要はないよ。'
            : '怒りという感情も、あなたの心の大切な一部。それを否定する必要はないんだ。';
          break;
        case '🥲':
          response = role.name === 'tama'
            ? '複雑な気持ちなのね。泣きたいような、笑いたいような…そんな日もあるものよ。'
            : role.name === 'madoka'
            ? 'なんとも言えない気持ち、よくわかるよ。そういう時は無理しないで。'
            : '心の中が混沌としている時もある。それもまた、人生の一部なんだよね。';
          break;
        case '😴':
          response = role.name === 'tama'
            ? 'お疲れさま。疲れた時は、ちゃんと休んでいいのよ。がんばりすぎちゃダメよ。'
            : role.name === 'madoka'
            ? '疲れているんだね。休息も大切な仕事の一つ。自分を労わって。'
            : '疲れは、あなたががんばった証拠。今日はゆっくり休んでくださいな。';
          break;
        case '😰':
          response = role.name === 'tama'
            ? '不安なのね。大丈夫、きっと大丈夫よ。一歩ずつ、ゆっくりでいいからね。'
            : role.name === 'madoka'
            ? '不安になる気持ち、理解できるよ。でも、あなたには乗り越える力がある。'
            : '不安という雲が心を覆っているね。でも、雲の向こうには必ず青空があるよ。';
          break;
        case '🤗':
          response = role.name === 'tama'
            ? 'よしよし、甘えたい時は甘えていいのよ。そんなあなたも愛おしいわ。'
            : role.name === 'madoka'
            ? '甘えたい気持ち、素直でいいね。誰かに支えてもらいたい時もあるよ。'
            : '甘えたいという気持ちも、人間らしくて美しい。遠慮しなくていいんだよ。';
          break;
        default:
          response = 'その気持ち、受け取りました。今は、何も言わなくても大丈夫ですよ。';
      }
    } else {
      // テキストメッセージへの応答（モック）
      const responses = role.name === 'tama' ? [
        'そうなのね、大変だったでしょう。でも、あなたなりによくがんばってるじゃない。',
        'その気持ち、よくわかるわ。一人で抱え込まないで、話してくれてありがとう。',
        'あなたの正直な気持ち、ちゃんと受け取ったわよ。大丈夫、大丈夫。',
      ] : role.name === 'madoka' ? [
        'その状況、理解できるよ。でも、あなたの対応は適切だと思う。',
        'そんな中でも前向きに考えようとするあなた、すごいね。',
        '完璧である必要はないよ。今のあなたで十分素晴らしい。',
      ] : [
        'そんな体験をされたのですね。人生には、様々な季節があるものです。',
        'その心の動き、とても人間らしくて美しいと思います。',
        'あなたの言葉から、深い思いやりを感じます。それは素晴らしい資質ですね。',
      ];
      
      response = responses[Math.floor(Math.random() * responses.length)];
    }

    return response;
  };

  const sendMessage = (content: string, isEmotion: boolean = false) => {
    if (!content.trim() && !isEmotion) return;

    // ユーザーメッセージを追加
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: content,
      emotionIcon: isEmotion ? content : undefined,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // AI応答をシミュレート
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: generateAIResponse(content, isEmotion),
        timestamp: new Date(),
        aiRole: selectedAIRole,
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);

      // ランダムで投稿誘導メッセージを表示
      if (Math.random() < 0.3) {
        setTimeout(() => {
          const suggestionMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            type: 'system',
            content: 'その気持ちも記録に残しておく？今日の頑張りとして投稿してみませんか。',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, suggestionMessage]);
        }, 2000);
      }
    }, 1000 + Math.random() * 2000);
  };

  const handleEmotionClick = (emoji: string) => {
    sendMessage(emoji, true);
  };

  const handleTextSend = () => {
    sendMessage(inputText);
  };

  const roleStyle = getAIRoleStyle(selectedAIRole);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-6 border-b border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-noto-sans-jp text-2xl font-bold text-green-800">
                  つぶやきの木陰
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-green-600 hover:bg-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* AIロール選択 */}
              <div className="flex gap-2">
                {Object.values(AI_ROLES).map((role) => {
                  const isSelected = selectedAIRole === role.name;
                  const style = getAIRoleStyle(role.name);
                  return (
                    <button
                      key={role.name}
                      onClick={() => setSelectedAIRole(role.name)}
                      className={`font-noto-sans-jp px-3 py-2 rounded-full text-xs font-bold transition-all ${
                        isSelected 
                          ? `${style.iconBg} ${style.textColor} shadow-lg` 
                          : 'bg-white/80 text-gray-600 hover:bg-white'
                      }`}
                    >
                      {role.displayName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* メッセージエリア */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl font-noto-sans-jp text-sm ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : message.type === 'system'
                        ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                        : `${roleStyle.bubbleStyle} text-white`
                    }`}
                  >
                    {message.emotionIcon ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{message.emotionIcon}</span>
                        <span className="text-xs opacity-80">感情を送信しました</span>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className={`${roleStyle.bubbleStyle} text-white p-3 rounded-2xl`}>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 感情アイコン */}
            <div className="px-4 py-2 border-t border-gray-100">
              <div className="flex gap-2 overflow-x-auto">
                {emotionIcons.map((emotion) => (
                  <button
                    key={emotion.emoji}
                    onClick={() => handleEmotionClick(emotion.emoji)}
                    className="flex-shrink-0 p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
                    title={emotion.label}
                  >
                    <span className="text-xl">{emotion.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 入力エリア */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTextSend()}
                  placeholder="気持ちを聞かせてください..."
                  className="flex-1 px-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 font-noto-sans-jp"
                />
                <button
                  onClick={handleTextSend}
                  disabled={!inputText.trim()}
                  className="px-6 py-3 bg-green-500 text-white rounded-full font-noto-sans-jp font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  送信
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center font-noto-sans-jp">
                AIの回答は必ずしも正しくない場合があります
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatInterface;
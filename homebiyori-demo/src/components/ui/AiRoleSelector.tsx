'use client';

import { useState } from 'react';
import AiIcon from './AiIcon';

export type AiRole = 'tama' | 'madoka' | 'hide';

interface AiRoleData {
  id: AiRole;
  name: string;
  description: string;
  emoji: string;
  color: string;
  fruitColor: string;
  sampleMessage: string;
}

const aiRoles: AiRoleData[] = [
  {
    id: 'tama',
    name: 'たまさん',
    description: '優しく包み込むような褒め方をしてくれます',
    emoji: '🌸',
    color: 'bg-pink-100 border-pink-300',
    fruitColor: 'ピンク色の実',
    sampleMessage: 'お疲れさまでした。今日も一日、本当にがんばりましたね。'
  },
  {
    id: 'madoka',
    name: 'まどか姉さん',
    description: 'お姉さんのように頼りがいのある褒め方をしてくれます',
    emoji: '💙',
    color: 'bg-blue-100 border-blue-300',
    fruitColor: '青色の実',
    sampleMessage: 'さすがですね！その調子で続けていけば、きっと素敵な毎日になりますよ。'
  },
  {
    id: 'hide',
    name: 'ヒデじい',
    description: 'おじいちゃんのような温かい褒め方をしてくれます',
    emoji: '⭐',
    color: 'bg-yellow-100 border-yellow-300',
    fruitColor: '金色の実',
    sampleMessage: 'ほほう、よくやったのう。その気持ちが一番大切じゃ。'
  }
];


interface AiRoleSelectorProps {
  selectedRole: AiRole | null;
  onRoleSelect: (role: AiRole) => void;
}

export default function AiRoleSelector({ selectedRole, onRoleSelect }: AiRoleSelectorProps) {
  const [previewRole, setPreviewRole] = useState<AiRole | null>(null);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          AIキャラクターを選んでください
        </h2>
        <p className="text-gray-600">
          あなたを褒めてくれるAIキャラクターを選びましょう。木に実る実の色も変わります。
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {aiRoles.map((role) => (
          <div
            key={role.id}
            className={`
              relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300
              ${selectedRole === role.id ? role.color + ' ring-4 ring-offset-2 ring-opacity-50' : 'bg-white border-gray-200 hover:border-gray-300'}
              ${selectedRole === role.id ? 'ring-current' : ''}
              transform hover:scale-105
            `}
            onClick={() => onRoleSelect(role.id)}
            onMouseEnter={() => setPreviewRole(role.id)}
            onMouseLeave={() => setPreviewRole(null)}
          >
            {selectedRole === role.id && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                ✓
              </div>
            )}
            
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <AiIcon 
                  aiRole={role.id} 
                  size={80} 
                  className="border-4 border-white shadow-lg" 
                />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{role.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{role.description}</p>
              <div className="text-xs text-gray-500 mb-4">
                木には<span className="font-semibold">{role.fruitColor}</span>が実ります
              </div>
              
              {(previewRole === role.id || selectedRole === role.id) && (
                <div className="bg-gray-50 p-3 rounded-lg border mt-4">
                  <p className="text-xs text-gray-500 mb-1">サンプルメッセージ:</p>
                  <p className="text-sm text-gray-700 italic">"{role.sampleMessage}"</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedRole && (
        <div className="text-center bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-green-800">
            <span className="font-semibold">
              {aiRoles.find(r => r.id === selectedRole)?.name}
            </span>
            を選択しました！投稿すると褒めメッセージが届きます。
          </p>
        </div>
      )}
    </div>
  );
}
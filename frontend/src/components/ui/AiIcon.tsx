'use client';

import Image from 'next/image';

export type AiRole = 'mittyan' | 'madokasan' | 'hideji';

interface AiIconProps {
  aiRole: AiRole | string;
  size?: number;
  className?: string;
  showBackground?: boolean; // 背景表示の制御
}

// AIロールのアイコン画像パスを取得
const getAiRoleIcon = (roleString: string | AiRole): string => {
  if (typeof roleString === 'string') {
    if (roleString.includes('みっちゃん') || roleString === 'mittyan') {
      return '/images/icons/mittyan.png';
    } else if (roleString.includes('まどかさん') || roleString === 'madokasan') {
      return '/images/icons/madokasan.png';
    } else if (roleString.includes('ヒデじい') || roleString === 'hideji') {
      return '/images/icons/hideji.png';
    }
  } else {
    switch (roleString) {
      case 'mittyan':
        return '/images/icons/mittyan.png';
      case 'madokasan':
        return '/images/icons/madokasan.png';
      case 'hideji':
        return '/images/icons/hideji.png';
    }
  }
  return '/images/icons/mittyan.png';
};

// AIロールのテーマカラーを取得
const getAiRoleThemeColor = (roleString: string | AiRole) => {
  if (typeof roleString === 'string') {
    if (roleString.includes('みっちゃん') || roleString === 'mittyan') {
      return {
        background: 'bg-gradient-to-br from-pink-100 via-rose-50 to-pink-200',
        border: 'border-pink-200',
        shadow: 'shadow-pink-100'
      };
    } else if (roleString.includes('まどかさん') || roleString === 'madokasan') {
      return {
        background: 'bg-gradient-to-br from-sky-100 via-blue-50 to-sky-200',
        border: 'border-sky-200',
        shadow: 'shadow-sky-100'
      };
    } else if (roleString.includes('ヒデじい') || roleString === 'hideji') {
      return {
        background: 'bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-200',
        border: 'border-amber-200',
        shadow: 'shadow-amber-100'
      };
    }
  } else {
    switch (roleString) {
      case 'mittyan':
        return {
          background: 'bg-gradient-to-br from-pink-100 via-rose-50 to-pink-200',
          border: 'border-pink-200',
          shadow: 'shadow-pink-100'
        };
      case 'madokasan':
        return {
          background: 'bg-gradient-to-br from-sky-100 via-blue-50 to-sky-200',
          border: 'border-sky-200',
          shadow: 'shadow-sky-100'
        };
      case 'hideji':
        return {
          background: 'bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-200',
          border: 'border-amber-200',
          shadow: 'shadow-amber-100'
        };
    }
  }
  // デフォルト（みっちゃん）
  return {
    background: 'bg-gradient-to-br from-pink-100 via-rose-50 to-pink-200',
    border: 'border-pink-200',
    shadow: 'shadow-pink-100'
  };
};

// AIロールの表示名を取得
export const getAiRoleName = (roleString: string | AiRole): string => {
  if (typeof roleString === 'string') {
    if (roleString.includes('みっちゃん')) return 'みっちゃん';
    if (roleString.includes('まどかさん')) return 'まどかさん';
    if (roleString.includes('ヒデじい')) return 'ヒデじい';
  } else {
    switch (roleString) {
      case 'mittyan': return 'みっちゃん';
      case 'madokasan': return 'まどかさん';
      case 'hideji': return 'ヒデじい';
    }
  }
  return 'みっちゃん';
};

export default function AiIcon({ aiRole, size = 40, className = '', showBackground = true }: AiIconProps) {
  const roleName = getAiRoleName(aiRole);
  const themeColor = getAiRoleThemeColor(aiRole);
  
  const baseClasses = 'relative rounded-full overflow-hidden border-2 transition-all duration-300 hover:scale-105';
  const backgroundClasses = showBackground 
    ? `${themeColor.background} ${themeColor.border} ${themeColor.shadow} shadow-lg`
    : 'bg-white border-gray-200';
    
  return (
    <div 
      className={`${baseClasses} ${backgroundClasses} ${className}`} 
      style={{ width: size, height: size }}
    >
      <div className="w-full h-full flex items-center justify-center p-1">
        <Image
          src={getAiRoleIcon(aiRole)}
          alt={`${roleName}のアイコン`}
          width={size * 0.8}
          height={size * 0.8}
          className="object-contain drop-shadow-sm"
          priority
        />
      </div>
    </div>
  );
}
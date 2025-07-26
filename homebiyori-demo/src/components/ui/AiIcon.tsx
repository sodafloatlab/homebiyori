'use client';

import Image from 'next/image';

export type AiRole = 'tama' | 'madoka' | 'hide';

interface AiIconProps {
  aiRole: AiRole | string;
  size?: number;
  className?: string;
}

// AIロールのアイコン画像パスを取得
const getAiRoleIcon = (roleString: string | AiRole): string => {
  if (typeof roleString === 'string') {
    if (roleString.includes('たまさん') || roleString === 'tama') {
      return '/images/icons/tamasan.png';
    } else if (roleString.includes('まどか姉さん') || roleString === 'madoka') {
      return '/images/icons/madokanesan.png';
    } else if (roleString.includes('ヒデじい') || roleString === 'hide') {
      return '/images/icons/hideji.png';
    }
  } else {
    switch (roleString) {
      case 'tama':
        return '/images/icons/tamasan.png';
      case 'madoka':
        return '/images/icons/madokanesan.png';
      case 'hide':
        return '/images/icons/hideji.png';
    }
  }
  return '/images/icons/tamasan.png';
};

// AIロールの表示名を取得
export const getAiRoleName = (roleString: string | AiRole): string => {
  if (typeof roleString === 'string') {
    if (roleString.includes('たまさん')) return 'たまさん';
    if (roleString.includes('まどか姉さん')) return 'まどか姉さん';
    if (roleString.includes('ヒデじい')) return 'ヒデじい';
  } else {
    switch (roleString) {
      case 'tama': return 'たまさん';
      case 'madoka': return 'まどか姉さん';
      case 'hide': return 'ヒデじい';
    }
  }
  return 'たまさん';
};

export default function AiIcon({ aiRole, size = 40, className = '' }: AiIconProps) {
  const roleName = getAiRoleName(aiRole);
  
  return (
    <div className={`relative rounded-full overflow-hidden bg-white ${className}`} style={{ width: size, height: size }}>
      <Image
        src={getAiRoleIcon(aiRole)}
        alt={`${roleName}のアイコン`}
        width={size * 1.2}
        height={size * 1.2}
        className="object-cover"
      />
    </div>
  );
}
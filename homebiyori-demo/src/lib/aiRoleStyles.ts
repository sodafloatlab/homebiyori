// AIロールごとのスタイル定義

export interface AIRoleStyle {
  name: string;
  displayName: string;
  personality: string;
  bubbleColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  gradientStyle: string;
  iconBg: string;
  textColor: string;
}

export const AI_ROLES: Record<string, AIRoleStyle> = {
  tama: {
    name: 'tama',
    displayName: 'たまさん',
    personality: '優しい',
    bubbleColors: {
      primary: 'rgba(34, 197, 94, 0.6)', // 明るい緑系
      secondary: 'rgba(22, 163, 74, 0.8)',
      accent: 'rgba(255, 255, 255, 0.9)',
    },
    gradientStyle: `radial-gradient(circle at 30% 30%, 
      rgba(255, 255, 255, 0.9) 0%, 
      rgba(34, 197, 94, 0.5) 40%, 
      rgba(22, 163, 74, 0.8) 100%)`,
    iconBg: 'from-green-200 via-blue-200 to-yellow-200',
    textColor: 'text-green-800'
  },
  madoka: {
    name: 'madoka',
    displayName: 'まどか姉さん',
    personality: 'お姉さん的',
    bubbleColors: {
      primary: 'rgba(236, 72, 153, 0.6)', // 明るいピンク系
      secondary: 'rgba(219, 39, 119, 0.8)',
      accent: 'rgba(255, 255, 255, 0.9)',
    },
    gradientStyle: `radial-gradient(circle at 30% 30%, 
      rgba(255, 255, 255, 0.9) 0%, 
      rgba(236, 72, 153, 0.5) 40%, 
      rgba(219, 39, 119, 0.8) 100%)`,
    iconBg: 'from-pink-200 via-rose-200 to-purple-200',
    textColor: 'text-pink-800'
  },
  hidejii: {
    name: 'hidejii',
    displayName: 'ヒデじい',
    personality: 'おじいちゃん的',
    bubbleColors: {
      primary: 'rgba(249, 115, 22, 0.6)', // 明るいオレンジ系
      secondary: 'rgba(234, 88, 12, 0.8)',
      accent: 'rgba(255, 255, 255, 0.9)',
    },
    gradientStyle: `radial-gradient(circle at 30% 30%, 
      rgba(255, 255, 255, 0.9) 0%, 
      rgba(249, 115, 22, 0.5) 40%, 
      rgba(234, 88, 12, 0.8) 100%)`,
    iconBg: 'from-orange-200 via-amber-200 to-yellow-200',
    textColor: 'text-orange-800'
  }
};

export const getAIRoleStyle = (roleName: string): AIRoleStyle => {
  return AI_ROLES[roleName] || AI_ROLES.tama;
};
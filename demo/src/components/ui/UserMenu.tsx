'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Crown, 
  LogOut, 
  Settings, 
  Edit,
  ChevronDown,
  Mail,
  UserCheck
} from 'lucide-react';
import Image from 'next/image';
import TouchTarget from './TouchTarget';
import Typography from './Typography';
import { UserPlan, UserInfo } from '@/types';

interface UserMenuProps {
  userInfo: UserInfo;
  onPlanChange?: (plan: UserPlan) => void;
  onPlanChangeRequest?: (plan: UserPlan) => void;
  onLogout: () => void;
  onNicknameChange: (nickname: string) => void;
  onEmailChange: (email: string) => void;
}

const UserMenu = ({ 
  userInfo, 
  onPlanChange, 
  onPlanChangeRequest,
  onLogout, 
  onNicknameChange, 
  onEmailChange 
}: UserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNicknameEdit, setShowNicknameEdit] = useState(false);
  const [showEmailEdit, setShowEmailEdit] = useState(false);
  const [tempNickname, setTempNickname] = useState(userInfo.nickname);
  const [tempEmail, setTempEmail] = useState(userInfo.email);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowNicknameEdit(false);
        setShowEmailEdit(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNicknameSubmit = () => {
    if (tempNickname.trim() && tempNickname !== userInfo.nickname) {
      onNicknameChange(tempNickname.trim());
    }
    setShowNicknameEdit(false);
  };

  const handleEmailSubmit = () => {
    if (tempEmail.trim() && tempEmail !== userInfo.email) {
      onEmailChange(tempEmail.trim());
    }
    setShowEmailEdit(false);
  };

  const togglePlan = () => {
    const newPlan: UserPlan = userInfo.plan === 'free' ? 'premium' : 'free';
    if (onPlanChangeRequest) {
      onPlanChangeRequest(newPlan);
    } else if (onPlanChange) {
      onPlanChange(newPlan);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* ユーザーアバター・トリガー */}
      <TouchTarget
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-full hover:bg-emerald-50 transition-colors"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-200">
            {userInfo.avatar ? (
              <Image
                src={userInfo.avatar}
                alt={userInfo.nickname}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          {userInfo.plan === 'premium' && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
              <Crown className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-emerald-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </TouchTarget>

      {/* ドロップダウンメニュー */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden z-50"
          >
            {/* ユーザー情報セクション */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
              <div className="flex items-center space-x-3 mb-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-200">
                    {userInfo.avatar ? (
                      <Image
                        src={userInfo.avatar}
                        alt={userInfo.nickname}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  {userInfo.plan === 'premium' && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  {/* ニックネーム編集 */}
                  {showNicknameEdit ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={tempNickname}
                        onChange={(e) => setTempNickname(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNicknameSubmit();
                          if (e.key === 'Escape') {
                            setShowNicknameEdit(false);
                            setTempNickname(userInfo.nickname);
                          }
                        }}
                        className="flex-1 px-2 py-1 text-sm text-gray-800 bg-white border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      />
                      <TouchTarget
                        onClick={handleNicknameSubmit}
                        className="p-1 text-emerald-600 hover:text-emerald-700"
                      >
                        <UserCheck className="w-4 h-4" />
                      </TouchTarget>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Typography variant="small" weight="semibold" color="primary">
                        {userInfo.nickname}
                      </Typography>
                      <TouchTarget
                        onClick={() => setShowNicknameEdit(true)}
                        className="p-1 text-emerald-600 hover:text-emerald-700"
                      >
                        <Edit className="w-3 h-3" />
                      </TouchTarget>
                    </div>
                  )}
                  
                  {/* メールアドレス編集 */}
                  {showEmailEdit ? (
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="email"
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEmailSubmit();
                          if (e.key === 'Escape') {
                            setShowEmailEdit(false);
                            setTempEmail(userInfo.email);
                          }
                        }}
                        className="flex-1 px-2 py-1 text-xs text-gray-800 bg-white border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      />
                      <TouchTarget
                        onClick={handleEmailSubmit}
                        className="p-1 text-emerald-600 hover:text-emerald-700"
                      >
                        <UserCheck className="w-3 h-3" />
                      </TouchTarget>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Typography variant="tiny" color="secondary" className="truncate">
                        {userInfo.email}
                      </Typography>
                      <TouchTarget
                        onClick={() => setShowEmailEdit(true)}
                        className="p-1 text-emerald-600 hover:text-emerald-700"
                      >
                        <Edit className="w-3 h-3" />
                      </TouchTarget>
                    </div>
                  )}
                </div>
              </div>

              {/* プランバッジ */}
              <div className="flex items-center justify-between">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  userInfo.plan === 'premium'
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {userInfo.plan === 'premium' ? 'プレミアムユーザー' : '一般ユーザー'}
                </div>
              </div>
            </div>

            {/* メニューアイテム */}
            <div className="p-2">
              {/* プラン切り替え */}
              <TouchTarget
                onClick={togglePlan}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-emerald-50 transition-colors text-left"
              >
                <div className={`p-2 rounded-lg ${
                  userInfo.plan === 'premium' 
                    ? 'bg-gray-100 text-gray-600' 
                    : 'bg-yellow-100 text-yellow-600'
                }`}>
                  <Crown className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <Typography variant="small" weight="medium">
                    {userInfo.plan === 'premium' ? '一般プランに変更' : 'プレミアムプランに変更'}
                  </Typography>
                </div>
              </TouchTarget>

              {/* 設定（将来の拡張用） */}
              <TouchTarget
                onClick={() => {
                  // 将来的に設定画面への遷移を実装
                  console.log('設定画面への遷移（未実装）');
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-emerald-50 transition-colors text-left"
              >
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <Typography variant="small" weight="medium">
                    設定
                  </Typography>
                </div>
              </TouchTarget>

              {/* 区切り線 */}
              <hr className="my-2 border-emerald-100" />

              {/* ログアウト */}
              <TouchTarget
                onClick={onLogout}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-left group"
              >
                <div className="p-2 rounded-lg bg-red-100 text-red-600 group-hover:bg-red-200">
                  <LogOut className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <Typography variant="small" weight="medium" className="text-red-600">
                    ログアウト
                  </Typography>
                </div>
              </TouchTarget>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;
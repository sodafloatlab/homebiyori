'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Heart, 
  MessageCircle, 
  Crown, 
  ArrowLeft,
  CheckCircle,
  X
} from 'lucide-react';
import NavigationHeader from '../layout/NavigationHeader';
import TouchTarget from '../ui/TouchTarget';
import Typography from '../ui/Typography';
import Button from '../ui/Button';
import ResponsiveContainer from '../layout/ResponsiveContainer';
import Footer from '../layout/Footer';
import { AppScreen, UserInfo, UserPlan } from '@/types';

interface SubscriptionCancelPageProps {
  onNavigate: (screen: AppScreen) => void;
  onClose: () => void;
  userInfo?: UserInfo;
  isLoggedIn?: boolean;
  onPlanChange?: (plan: UserPlan) => void;
  onLogout?: () => void;
  onNicknameChange?: (nickname: string) => void;
  onEmailChange?: (email: string) => void;
}

type CancelStep = 'reason' | 'confirmation' | 'complete';

const SubscriptionCancelPage = ({ 
  onNavigate, 
  onClose,
  userInfo,
  isLoggedIn,
  onPlanChange,
  onLogout,
  onNicknameChange,
  onEmailChange
}: SubscriptionCancelPageProps) => {
  const [currentStep, setCurrentStep] = useState<CancelStep>('reason');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');

  const cancelReasons = [
    {
      id: 'cost',
      title: '料金が高い',
      description: '月額料金を見直したい'
    },
    {
      id: 'features',
      title: '機能を使わない',
      description: 'プレミアム機能をあまり利用していない'
    },
    {
      id: 'temporary',
      title: '一時的に利用停止',
      description: 'しばらく利用する予定がない'
    },
    {
      id: 'dissatisfied',
      title: '期待と違った',
      description: 'サービス内容が期待と異なっていた'
    },
    {
      id: 'other',
      title: 'その他',
      description: '上記以外の理由'
    }
  ];


  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
  };

  const handleCancel = () => {
    setCurrentStep('confirmation');
  };

  const handleFinalCancel = () => {
    if (onPlanChange) {
      onPlanChange('free');
    }
    setCurrentStep('complete');
  };

  const renderReasonStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-orange-600" />
        </div>
        <Typography variant="h2" color="primary" className="mb-2">
          プレミアムプランを解約しますか？
        </Typography>
        <Typography variant="body" color="secondary">
          解約理由をお聞かせください（任意）
        </Typography>
      </div>

      <div className="space-y-3">
        {cancelReasons.map((reason) => (
          <TouchTarget
            key={reason.id}
            onClick={() => handleReasonSelect(reason.id)}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
              selectedReason === reason.id
                ? 'bg-orange-100 border-orange-500'
                : 'bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50'
            }`}
          >
            <Typography variant="small" weight="medium" className="mb-1">
              {reason.title}
            </Typography>
            <Typography variant="tiny" color="secondary">
              {reason.description}
            </Typography>
          </TouchTarget>
        ))}
      </div>

      <div className="mt-6">
        <label className="block mb-2">
          <Typography variant="small" weight="medium">
            追加のご意見・ご要望（任意）
          </Typography>
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="サービス改善のため、ご意見をお聞かせください..."
          className="w-full p-3 text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
          rows={3}
        />
      </div>

      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          戻る
        </Button>
        <Button
          variant="primary"
          onClick={handleCancel}
          className="flex-1 bg-orange-500 hover:bg-orange-600"
        >
          解約手続きを続ける
        </Button>
      </div>
    </motion.div>
  );


  const renderConfirmationStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <Typography variant="h2" color="primary" className="mb-2">
          解約の確認
        </Typography>
        <Typography variant="body" color="secondary">
          プレミアムプランを解約すると以下の機能がご利用いただけなくなります
        </Typography>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <Typography variant="small" weight="semibold" className="text-red-800 mb-4">
          利用できなくなる機能：
        </Typography>
        <div className="space-y-2">
          <div className="flex items-center text-red-700">
            <X className="w-4 h-4 mr-2" />
            <Typography variant="small">グループチャット機能</Typography>
          </div>
          <div className="flex items-center text-red-700">
            <X className="w-4 h-4 mr-2" />
            <Typography variant="small">ディープモード</Typography>
          </div>
          <div className="flex items-center text-red-700">
            <X className="w-4 h-4 mr-2" />
            <Typography variant="small">チャット履歴180日保存（30日間に変更）</Typography>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <Typography variant="small" weight="semibold" className="text-green-800 mb-4">
          引き続きご利用いただける機能：
        </Typography>
        <div className="space-y-2">
          <div className="flex items-center text-green-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            <Typography variant="small">1:1チャット機能</Typography>
          </div>
          <div className="flex items-center text-green-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            <Typography variant="small">成長の木機能</Typography>
          </div>
          <div className="flex items-center text-green-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            <Typography variant="small">ほめの実機能</Typography>
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={() => setCurrentStep('reason')}
          className="flex-1"
        >
          戻る
        </Button>
        <Button
          variant="primary"
          onClick={handleFinalCancel}
          className="flex-1 bg-red-500 hover:bg-red-600"
        >
          解約を確定する
        </Button>
      </div>
    </motion.div>
  );

  const renderCompleteStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      
      <Typography variant="h2" color="primary" className="mb-2">
        解約が完了しました
      </Typography>
      
      <Typography variant="body" color="secondary" className="mb-6">
        プレミアムプランを解約いたしました。<br />
        現在の課金期間終了まではプレミアム機能をお使いいただけます。
      </Typography>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <Typography variant="small" weight="semibold" className="text-blue-800 mb-2">
          今後について
        </Typography>
        <Typography variant="small" color="secondary">
          いつでもプレミアムプランに再加入していただけます。<br />
          ほめびよりをご利用いただき、ありがとうございました。
        </Typography>
      </div>

      <Button
        variant="primary"
        onClick={onClose}
        className="w-full"
      >
        完了
      </Button>
    </motion.div>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 'reason': return 'プレミアムプラン解約';
      case 'confirmation': return '解約確認';
      case 'complete': return '解約完了';
      default: return 'プレミアムプラン解約';
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'reason': return renderReasonStep();
      case 'confirmation': return renderConfirmationStep();
      case 'complete': return renderCompleteStep();
      default: return renderReasonStep();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50">
      <NavigationHeader
        currentScreen="subscription-cancel"
        title={getStepTitle()}
        subtitle="プレミアムプランの解約手続き"
        onNavigate={onNavigate}
        previousScreen="landing"
        userInfo={userInfo}
        isLoggedIn={isLoggedIn}
        onPlanChange={onPlanChange}
        onLogout={onLogout}
        onNicknameChange={onNicknameChange}
        onEmailChange={onEmailChange}
      />

      <ResponsiveContainer maxWidth="2xl" padding="lg" className="py-8">
        <AnimatePresence mode="wait">
          {renderCurrentStep()}
        </AnimatePresence>
      </ResponsiveContainer>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default SubscriptionCancelPage;
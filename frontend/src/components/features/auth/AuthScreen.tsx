'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogIn, ArrowLeft, Shield, UserCheck, AlertCircle } from 'lucide-react';
import { AppScreen } from '@/types';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth, useMaintenance } from '@/lib/hooks';

interface AuthScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onAuthSuccess: (userProfile: any) => void;
}

const AuthScreen = ({ onNavigate, onAuthSuccess }: AuthScreenProps) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info', title: string, message: string }>({ type: 'success', title: '', message: '' });

  const auth = useAuth();
  const maintenance = useMaintenance();

  // 認証状態が変更された時の処理
  useEffect(() => {
    if (auth.isAuthenticated) {
      setToastMessage({
        type: 'success',
        title: 'ログイン成功！',
        message: auth.profile ? 'キャラクター選択画面に移動します' : 'プロフィール設定画面に移動します'
      });
      setShowToast(true);

      setTimeout(() => {
        onAuthSuccess(auth.profile);
      }, 1500);
    }
  }, [auth.isAuthenticated, auth.profile, onAuthSuccess]);

  // Google OAuth ログイン処理
  const handleGoogleLogin = async () => {
    if (maintenance.isMaintenanceMode) {
      setToastMessage({
        type: 'error',
        title: 'メンテナンス中',
        message: 'システムメンテナンス中のため、ログインできません。'
      });
      setShowToast(true);
      return;
    }

    try {
      await auth.signInWithGoogle();
      // 成功処理はuseEffectで行う
    } catch (error) {
      setToastMessage({
        type: 'error',
        title: 'ログインエラー',
        message: 'Googleログインに失敗しました。しばらく時間をおいてから再度お試しください。'
      });
      setShowToast(true);
    }
  };

  // 認証コールバック処理（OAuth完了後）
  useEffect(() => {
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        try {
          // OAuth認証完了後の処理
          await auth.handleAuthCallback();
        } catch (error) {
          console.error('Auth callback error:', error);
        }
      }
    };

    handleAuthCallback();
  }, [auth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 relative">
      {/* ナビゲーションヘッダー */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between p-6">
          <Button
            variant="ghost"
            size="md"
            leftIcon={<ArrowLeft className="w-5 h-5" />}
            onClick={() => onNavigate('landing')}
          >
            戻る
          </Button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* 認証カード */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden">
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-full flex items-center justify-center">
                <LogIn className="w-8 h-8 text-emerald-600" />
              </div>
              <Typography variant="h2" color="neutral" className="text-white mb-2">
                ログイン
              </Typography>
              <Typography variant="body" color="neutral" className="text-emerald-50">
                Googleアカウントで簡単にログイン
              </Typography>
            </div>

            {/* ボディ */}
            <div className="p-8 space-y-6">
              {/* メンテナンス警告 */}
              {maintenance.isMaintenanceMode && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center space-x-3"
                >
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <Typography variant="small" color="warning" weight="medium">
                      システムメンテナンス中
                    </Typography>
                    <Typography variant="tiny" color="warning">
                      現在ログインはご利用いただけません
                    </Typography>
                  </div>
                </motion.div>
              )}

              {/* エラー表示 */}
              {auth.error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <Typography variant="small" color="error" weight="medium">
                      認証エラー
                    </Typography>
                    <Typography variant="tiny" color="error">
                      {auth.error}
                    </Typography>
                  </div>
                </motion.div>
              )}

              {/* Googleログインボタン */}
              <Button
                variant="primary"
                size="xl"
                fullWidth
                onClick={handleGoogleLogin}
                loading={auth.isLoading}
                disabled={maintenance.isMaintenanceMode}
                leftIcon={
                  <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
                    <span className="text-xs">G</span>
                  </div>
                }
              >
                {auth.isLoading ? 'ログイン中...' : 'Googleアカウントでログイン'}
              </Button>

              {/* セキュリティ情報 */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <Typography variant="small" color="primary" weight="medium">
                      安全な認証
                    </Typography>
                    <Typography variant="tiny" color="secondary">
                      GoogleのOAuth 2.0を使用した安全な認証システム
                    </Typography>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <UserCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <Typography variant="small" color="primary" weight="medium">
                      プライバシー保護
                    </Typography>
                    <Typography variant="tiny" color="secondary">
                      個人情報は最小限のみ利用し、適切に保護されます
                    </Typography>
                  </div>
                </div>
              </div>

              {/* 利用規約リンク */}
              <div className="text-center space-y-2">
                <Typography variant="tiny" color="secondary">
                  ログインすることで、以下に同意したものとみなします
                </Typography>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => onNavigate('terms-of-service')}
                    className="text-emerald-600 hover:text-emerald-700 text-xs underline"
                  >
                    利用規約
                  </button>
                  <button
                    onClick={() => onNavigate('privacy-policy')}
                    className="text-emerald-600 hover:text-emerald-700 text-xs underline"
                  >
                    プライバシーポリシー
                  </button>
                </div>
              </div>

              {/* デモ用ボタン（開発環境のみ） */}
              {process.env.NODE_ENV === 'development' && (
                <div className="border-t pt-6 space-y-3">
                  <Typography variant="small" color="secondary" align="center">
                    開発用デモログイン
                  </Typography>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        // デモ用のダミーログイン処理
                        const dummyProfile = {
                          user_id: 'demo-user',
                          nickname: 'デモユーザー',
                          ai_character: 'mittyan',
                          praise_level: 'normal',
                          onboarding_completed: false
                        };
                        onAuthSuccess(dummyProfile);
                      }}
                    >
                      デモログイン
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 補足情報 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-center"
          >
            <Typography variant="caption" color="secondary">
              初回ログイン時は自動的にアカウントが作成されます
            </Typography>
          </motion.div>
        </motion.div>
      </div>

      {/* ローディングオーバーレイ */}
      {auth.isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <LoadingSpinner size="lg" color="emerald" />
            <Typography variant="body" color="neutral" className="mt-4">
              認証中...
            </Typography>
            <Typography variant="caption" color="secondary" className="mt-2">
              Googleでの認証処理を行っています
            </Typography>
          </div>
        </div>
      )}

      {/* トースト通知 */}
      <Toast
        type={toastMessage.type}
        title={toastMessage.title}
        message={toastMessage.message}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        position="top-center"
      />
    </div>
  );
};

export default AuthScreen;
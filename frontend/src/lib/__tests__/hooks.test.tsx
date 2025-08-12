import React from 'react';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { usePremiumFeatureGuard } from '../hooks';

// Mock the auth hook
jest.mock('../hooks', () => ({
  ...jest.requireActual('../hooks'),
  useAuth: () => ({
    profile: {
      subscription_plan: 'free'
    }
  }),
  useSubscription: () => ({
    createSubscription: jest.fn(),
    loading: false,
    error: null
  })
}));

describe('usePremiumFeatureGuard', () => {
  const mockOnPremiumRequired = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('無料ユーザーの場合', () => {
    test('isPremiumUserがfalseを返す', () => {
      const { result } = renderHook(() => usePremiumFeatureGuard());
      
      expect(result.current.isPremiumUser).toBe(false);
    });

    test('ディープモード機能チェック時にプレミアム誘導が表示される', () => {
      const { result } = renderHook(() => usePremiumFeatureGuard(mockOnPremiumRequired));
      
      act(() => {
        const canUse = result.current.checkPremiumFeature('deep_mode');
        expect(canUse).toBe(false);
      });

      expect(window.confirm).toHaveBeenCalledWith(
        'ディープモードはプレミアム限定機能です。より深い褒めと共感を体験してみませんか？\n\nプレミアムプランの詳細を確認しますか？'
      );
      expect(mockOnPremiumRequired).toHaveBeenCalledTimes(1);
    });

    test('グループチャット機能チェック時にプレミアム誘導が表示される', () => {
      const { result } = renderHook(() => usePremiumFeatureGuard(mockOnPremiumRequired));
      
      act(() => {
        const canUse = result.current.checkPremiumFeature('group_chat');
        expect(canUse).toBe(false);
      });

      expect(window.confirm).toHaveBeenCalledWith(
        'グループチャットはプレミアム限定機能です。3人のAIキャラクターと同時にお話しできます。\n\nプレミアムプランの詳細を確認しますか？'
      );
      expect(mockOnPremiumRequired).toHaveBeenCalledTimes(1);
    });

    test('履歴保存機能チェック時にプレミアム誘導が表示される', () => {
      const { result } = renderHook(() => usePremiumFeatureGuard(mockOnPremiumRequired));
      
      act(() => {
        const canUse = result.current.checkPremiumFeature('long_history');
        expect(canUse).toBe(false);
      });

      expect(window.confirm).toHaveBeenCalledWith(
        'チャット履歴長期保存はプレミアム限定機能です。大切な会話を180日間保存できます。\n\nプレミアムプランの詳細を確認しますか？'
      );
      expect(mockOnPremiumRequired).toHaveBeenCalledTimes(1);
    });

    test('カスタムメッセージが適用される', () => {
      const { result } = renderHook(() => usePremiumFeatureGuard(mockOnPremiumRequired));
      const customMessage = 'カスタムプレミアムメッセージ';
      
      act(() => {
        const canUse = result.current.checkPremiumFeature('deep_mode', {
          customMessage
        });
        expect(canUse).toBe(false);
      });

      expect(window.confirm).toHaveBeenCalledWith(
        `${customMessage}\n\nプレミアムプランの詳細を確認しますか？`
      );
    });

    test('アラート表示を無効にできる', () => {
      const { result } = renderHook(() => usePremiumFeatureGuard(mockOnPremiumRequired));
      
      act(() => {
        const canUse = result.current.checkPremiumFeature('deep_mode', {
          showAlert: false
        });
        expect(canUse).toBe(false);
      });

      expect(window.confirm).not.toHaveBeenCalled();
      expect(mockOnPremiumRequired).toHaveBeenCalledTimes(1);
    });

    test('ユーザーが確認ダイアログでキャンセルした場合、onPremiumRequiredが呼ばれない', () => {
      window.confirm = jest.fn(() => false);
      const { result } = renderHook(() => usePremiumFeatureGuard(mockOnPremiumRequired));
      
      act(() => {
        const canUse = result.current.checkPremiumFeature('deep_mode');
        expect(canUse).toBe(false);
      });

      expect(window.confirm).toHaveBeenCalled();
      expect(mockOnPremiumRequired).not.toHaveBeenCalled();
    });
  });

  describe('プレミアムユーザーの場合', () => {
    beforeEach(() => {
      jest.doMock('../hooks', () => ({
        ...jest.requireActual('../hooks'),
        useAuth: () => ({
          profile: {
            subscription_plan: 'premium'
          }
        }),
        useSubscription: () => ({
          createSubscription: jest.fn(),
          loading: false,
          error: null
        })
      }));
    });

    test('isPremiumUserがtrueを返す（premium）', () => {
      // モックを再設定
      const mockUseAuth = jest.fn(() => ({
        profile: { subscription_plan: 'premium' }
      }));
      const mockUseSubscription = jest.fn(() => ({
        createSubscription: jest.fn(),
        loading: false,
        error: null
      }));

      jest.doMock('../hooks', () => ({
        useAuth: mockUseAuth,
        useSubscription: mockUseSubscription,
        usePremiumFeatureGuard: jest.requireActual('../hooks').usePremiumFeatureGuard
      }));

      const { usePremiumFeatureGuard: MockedGuard } = require('../hooks');
      const { result } = renderHook(() => MockedGuard());
      
      expect(result.current.isPremiumUser).toBe(true);
    });

    test('isPremiumUserがtrueを返す（premium_yearly）', () => {
      // モックを再設定
      const mockUseAuth = jest.fn(() => ({
        profile: { subscription_plan: 'premium_yearly' }
      }));
      const mockUseSubscription = jest.fn(() => ({
        createSubscription: jest.fn(),
        loading: false,
        error: null
      }));

      jest.doMock('../hooks', () => ({
        useAuth: mockUseAuth,
        useSubscription: mockUseSubscription,
        usePremiumFeatureGuard: jest.requireActual('../hooks').usePremiumFeatureGuard
      }));

      const { usePremiumFeatureGuard: MockedGuard } = require('../hooks');
      const { result } = renderHook(() => MockedGuard());
      
      expect(result.current.isPremiumUser).toBe(true);
    });

    test('プレミアム機能チェック時に制限なく利用できる', () => {
      // モックを再設定
      const mockUseAuth = jest.fn(() => ({
        profile: { subscription_plan: 'premium' }
      }));

      jest.doMock('../hooks', () => ({
        useAuth: mockUseAuth,
        useSubscription: jest.fn(() => ({
          createSubscription: jest.fn(),
          loading: false,
          error: null
        })),
        usePremiumFeatureGuard: jest.requireActual('../hooks').usePremiumFeatureGuard
      }));

      const { usePremiumFeatureGuard: MockedGuard } = require('../hooks');
      const { result } = renderHook(() => MockedGuard(mockOnPremiumRequired));
      
      act(() => {
        const canUseDeep = result.current.checkPremiumFeature('deep_mode');
        const canUseGroup = result.current.checkPremiumFeature('group_chat');
        const canUseHistory = result.current.checkPremiumFeature('long_history');
        
        expect(canUseDeep).toBe(true);
        expect(canUseGroup).toBe(true);
        expect(canUseHistory).toBe(true);
      });

      expect(window.confirm).not.toHaveBeenCalled();
      expect(mockOnPremiumRequired).not.toHaveBeenCalled();
    });
  });

  describe('サブスクリプション処理', () => {
    test('startPremiumSubscriptionが月額プランで動作する', async () => {
      const mockCreateSubscription = jest.fn();
      
      jest.doMock('../hooks', () => ({
        ...jest.requireActual('../hooks'),
        useAuth: () => ({ profile: { subscription_plan: 'free' } }),
        useSubscription: () => ({
          createSubscription: mockCreateSubscription,
          loading: false,
          error: null
        })
      }));

      const { usePremiumFeatureGuard: MockedGuard } = require('../hooks');
      const { result } = renderHook(() => MockedGuard());
      
      await act(async () => {
        await result.current.startPremiumSubscription('monthly');
      });

      expect(mockCreateSubscription).toHaveBeenCalledWith({ plan: 'monthly' });
    });

    test('startPremiumSubscriptionが年額プランで動作する', async () => {
      const mockCreateSubscription = jest.fn();
      
      jest.doMock('../hooks', () => ({
        ...jest.requireActual('../hooks'),
        useAuth: () => ({ profile: { subscription_plan: 'free' } }),
        useSubscription: () => ({
          createSubscription: mockCreateSubscription,
          loading: false,
          error: null
        })
      }));

      const { usePremiumFeatureGuard: MockedGuard } = require('../hooks');
      const { result } = renderHook(() => MockedGuard());
      
      await act(async () => {
        await result.current.startPremiumSubscription('yearly');
      });

      expect(mockCreateSubscription).toHaveBeenCalledWith({ plan: 'yearly' });
    });

    test('サブスクリプションエラーが適切にハンドリングされる', async () => {
      const subscriptionError = new Error('Subscription failed');
      const mockCreateSubscription = jest.fn().mockRejectedValue(subscriptionError);
      
      jest.doMock('../hooks', () => ({
        ...jest.requireActual('../hooks'),
        useAuth: () => ({ profile: { subscription_plan: 'free' } }),
        useSubscription: () => ({
          createSubscription: mockCreateSubscription,
          loading: false,
          error: null
        })
      }));

      const { usePremiumFeatureGuard: MockedGuard } = require('../hooks');
      const { result } = renderHook(() => MockedGuard());
      
      await act(async () => {
        try {
          await result.current.startPremiumSubscription('monthly');
        } catch (error) {
          expect(error).toBe(subscriptionError);
        }
      });

      expect(mockCreateSubscription).toHaveBeenCalledWith({ plan: 'monthly' });
    });
  });

  describe('ローディング状態とエラー状態', () => {
    test('サブスクリプションローディング状態が正しく返される', () => {
      jest.doMock('../hooks', () => ({
        ...jest.requireActual('../hooks'),
        useAuth: () => ({ profile: { subscription_plan: 'free' } }),
        useSubscription: () => ({
          createSubscription: jest.fn(),
          loading: true,
          error: null
        })
      }));

      const { usePremiumFeatureGuard: MockedGuard } = require('../hooks');
      const { result } = renderHook(() => MockedGuard());
      
      expect(result.current.subscriptionLoading).toBe(true);
    });

    test('サブスクリプションエラー状態が正しく返される', () => {
      const subscriptionError = 'サブスクリプションエラー';
      
      jest.doMock('../hooks', () => ({
        ...jest.requireActual('../hooks'),
        useAuth: () => ({ profile: { subscription_plan: 'free' } }),
        useSubscription: () => ({
          createSubscription: jest.fn(),
          loading: false,
          error: subscriptionError
        })
      }));

      const { usePremiumFeatureGuard: MockedGuard } = require('../hooks');
      const { result } = renderHook(() => MockedGuard());
      
      expect(result.current.subscriptionError).toBe(subscriptionError);
    });
  });
});
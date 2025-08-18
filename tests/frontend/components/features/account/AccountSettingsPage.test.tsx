import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AccountSettingsPage } from '@/components/features/account/AccountSettingsPage';

// window.location is already mocked in jest.setup.js

describe('AccountSettingsPage', () => {
  const mockOnProfileUpdate = jest.fn();
  const mockOnAccountDeletion = jest.fn();
  const mockOnSubscriptionCancel = jest.fn();
  const mockOnBack = jest.fn();

  const defaultUserProfile = {
    userId: '12345',
    nickname: 'テストユーザー',
    aiCharacter: 'mittyan' as const,
    praiseLevel: 'normal' as const,
    interactionMode: 'praise' as const,
    createdAt: '2024-01-01T00:00:00Z'
  };

  const freeSubscriptionStatus = {
    status: 'inactive' as const,
    currentPlan: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false
  };

  const premiumSubscriptionStatus = {
    status: 'active' as const,
    currentPlan: 'premium_monthly',
    currentPeriodEnd: '2024-09-12T00:00:00Z',
    cancelAtPeriodEnd: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <AccountSettingsPage
        userProfile={defaultUserProfile}
        subscriptionStatus={freeSubscriptionStatus}
        onProfileUpdate={mockOnProfileUpdate}
        onAccountDeletion={mockOnAccountDeletion}
        onSubscriptionCancel={mockOnSubscriptionCancel}
        onBack={mockOnBack}
        {...props}
      />
    );
  };

  describe('基本的なレンダリング', () => {
    test('アカウント設定画面が正しくレンダリングされる', () => {
      renderComponent();
      
      expect(screen.getByText('アカウント設定')).toBeInTheDocument();
      expect(screen.getByText('プロフィール情報')).toBeInTheDocument();
      expect(screen.getByText('サブスクリプション')).toBeInTheDocument();
      expect(screen.getByText('アカウント管理')).toBeInTheDocument();
    });

    test('ユーザープロフィール情報が表示される', () => {
      renderComponent();
      
      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      expect(screen.getByText('たまさん')).toBeInTheDocument();
      expect(screen.getByText('ノーマル')).toBeInTheDocument();
      expect(screen.getByText('褒めて欲しい気分')).toBeInTheDocument();
    });

    test('戻るボタンがある', () => {
      renderComponent();
      
      const backButton = screen.getByLabelText('戻る');
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('プロフィール編集機能', () => {
    test('編集ボタンをクリックすると編集モードになる', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const editButton = screen.getByText('編集');
      await user.click(editButton);
      
      expect(screen.getByDisplayValue('テストユーザー')).toBeInTheDocument();
      expect(screen.getByText('更新')).toBeInTheDocument();
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
    });

    test('編集モードでプロフィールを更新できる', async () => {
      const user = userEvent.setup();
      mockOnProfileUpdate.mockResolvedValue(undefined);
      
      renderComponent();
      
      const editButton = screen.getByText('編集');
      await user.click(editButton);
      
      const nicknameInput = screen.getByDisplayValue('テストユーザー');
      await user.clear(nicknameInput);
      await user.type(nicknameInput, '新しいニックネーム');
      
      const updateButton = screen.getByText('更新');
      await user.click(updateButton);
      
      await waitFor(() => {
        expect(mockOnProfileUpdate).toHaveBeenCalledWith({
          nickname: '新しいニックネーム',
          aiCharacter: 'mittyan',
          praiseLevel: 'normal',
          interactionMode: 'praise'
        });
      });
    });

    test('キャンセルボタンで編集をキャンセルできる', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const editButton = screen.getByText('編集');
      await user.click(editButton);
      
      const nicknameInput = screen.getByDisplayValue('テストユーザー');
      await user.clear(nicknameInput);
      await user.type(nicknameInput, '変更されたニックネーム');
      
      const cancelButton = screen.getByText('キャンセル');
      await user.click(cancelButton);
      
      // 編集モードが終了し、元の値に戻っていることを確認
      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      expect(screen.getByText('編集')).toBeInTheDocument();
    });
  });

  describe('ディープモード制限（無料ユーザー）', () => {
    test('無料ユーザーの場合、ディープモード選択時にプレミアム誘導が表示される', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const editButton = screen.getByText('編集');
      await user.click(editButton);
      
      const praiseLevelSelect = screen.getByDisplayValue('ノーマル');
      await user.selectOptions(praiseLevelSelect, 'deep');
      
      // プレミアム誘導ダイアログが表示されることを期待
      await waitFor(() => {
        expect(screen.getByText('プレミアムプランでさらに深い褒めを')).toBeInTheDocument();
      });
    });

    test('プレミアム誘導ダイアログで登録ボタンをクリックするとプレミアムページに遷移する', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const editButton = screen.getByText('編集');
      await user.click(editButton);
      
      const praiseLevelSelect = screen.getByDisplayValue('ノーマル');
      await user.selectOptions(praiseLevelSelect, 'deep');
      
      await waitFor(() => {
        expect(screen.getByText('プレミアムに登録')).toBeInTheDocument();
      });
      
      const premiumButton = screen.getByText('プレミアムに登録');
      await user.click(premiumButton);
      
      expect(mockLocationHref).toHaveBeenCalledWith('/premium');
    });

    test('プレミアム誘導ダイアログでキャンセルするとダイアログが閉じる', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const editButton = screen.getByText('編集');
      await user.click(editButton);
      
      const praiseLevelSelect = screen.getByDisplayValue('ノーマル');
      await user.selectOptions(praiseLevelSelect, 'deep');
      
      await waitFor(() => {
        expect(screen.getByText('無料版を続ける')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByText('無料版を続ける');
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('プレミアムプランでさらに深い褒めを')).not.toBeInTheDocument();
      });
    });

    test('無料ユーザーの場合、ディープモード選択肢に制限表示がある', () => {
      renderComponent();
      
      expect(screen.getByText('ディープはプレミアム限定')).toBeInTheDocument();
    });
  });

  describe('サブスクリプション管理（無料ユーザー）', () => {
    test('無料ユーザーの場合、プレミアムプランに登録ボタンが表示される', () => {
      renderComponent();
      
      expect(screen.getByText('プレミアムプランに登録')).toBeInTheDocument();
      expect(screen.getByText('無料プラン')).toBeInTheDocument();
    });

    test('プレミアムプランに登録ボタンをクリックするとプレミアムページに遷移する', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const premiumButton = screen.getByText('プレミアムプランに登録');
      await user.click(premiumButton);
      
      expect(mockLocationHref).toHaveBeenCalledWith('/premium');
    });
  });

  describe('サブスクリプション管理（プレミアムユーザー）', () => {
    test('プレミアムユーザーの場合、プラン変更と解約ボタンが表示される', () => {
      renderComponent({
        subscriptionStatus: premiumSubscriptionStatus
      });
      
      expect(screen.getByText('プラン変更')).toBeInTheDocument();
      expect(screen.getByText('解約')).toBeInTheDocument();
      expect(screen.getByText('premium_monthly')).toBeInTheDocument();
      expect(screen.getByText('アクティブ')).toBeInTheDocument();
    });

    test('解約ボタンをクリックすると確認ダイアログが表示される', async () => {
      const user = userEvent.setup();
      renderComponent({
        subscriptionStatus: premiumSubscriptionStatus
      });
      
      const cancelButton = screen.getByText('解約');
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.getByText('サブスクリプション解約')).toBeInTheDocument();
        expect(screen.getByText('解約する')).toBeInTheDocument();
      });
    });

    test('解約確認ダイアログで解約を確定するとonSubscriptionCancelが呼ばれる', async () => {
      const user = userEvent.setup();
      renderComponent({
        subscriptionStatus: premiumSubscriptionStatus
      });
      
      const cancelButton = screen.getByText('解約');
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.getByText('解約する')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByText('解約する');
      await user.click(confirmButton);
      
      expect(mockOnSubscriptionCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('アカウント削除機能', () => {
    test('サブスクリプションがない場合、アカウント削除ボタンが有効', () => {
      renderComponent();
      
      const deleteButton = screen.getByText('アカウントを削除');
      expect(deleteButton).toBeEnabled();
    });

    test('アクティブなサブスクリプションがある場合、アカウント削除ボタンが無効', () => {
      renderComponent({
        subscriptionStatus: premiumSubscriptionStatus
      });
      
      const deleteButton = screen.getByText('アカウントを削除');
      expect(deleteButton).toBeDisabled();
      expect(screen.getByText('アカウント削除をご希望の場合は、まずサブスクリプションの解約を完了してください。')).toBeInTheDocument();
    });

    test('アカウント削除ボタンをクリックすると確認ダイアログが表示される', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const deleteButton = screen.getByText('アカウントを削除');
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('アカウント削除')).toBeInTheDocument();
        expect(screen.getByText('削除手続きに進む')).toBeInTheDocument();
      });
    });

    test('アカウント削除確認でonAccountDeletionが呼ばれる', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const deleteButton = screen.getByText('アカウントを削除');
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('削除手続きに進む')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByText('削除手続きに進む');
      await user.click(confirmButton);
      
      expect(mockOnAccountDeletion).toHaveBeenCalledTimes(1);
    });
  });

  describe('解約予定サブスクリプション', () => {
    const cancelledSubscriptionStatus = {
      status: 'active' as const,
      currentPlan: 'premium_monthly',
      currentPeriodEnd: '2024-12-31T23:59:59Z',
      cancelAtPeriodEnd: true
    };

    test('解約予定のサブスクリプションの場合、警告メッセージが表示される', () => {
      renderComponent({
        subscriptionStatus: cancelledSubscriptionStatus
      });
      
      expect(screen.getByText(/解約予定：.*まで利用可能/)).toBeInTheDocument();
    });

    test('解約予定でも期間内の場合、アカウント削除時に注意メッセージが表示される', async () => {
      const user = userEvent.setup();
      renderComponent({
        subscriptionStatus: cancelledSubscriptionStatus
      });
      
      // アカウント削除が有効であることを確認
      const deleteButton = screen.getByText('アカウントを削除');
      expect(deleteButton).toBeEnabled();
      
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText(/プレミアム利用権も失われます/)).toBeInTheDocument();
      });
    });
  });

  describe('ローディング状態', () => {
    test('ローディング中はスピナーが表示される', () => {
      renderComponent({ loading: true });
      
      // LoadingSpinnerが表示されることを確認
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('ナビゲーション', () => {
    test('戻るボタンをクリックするとonBackが呼ばれる', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const backButton = screen.getByLabelText('戻る');
      await user.click(backButton);
      
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('日付フォーマット', () => {
    test('日付が日本語形式でフォーマットされる', () => {
      renderComponent();
      
      expect(screen.getByText('2024年1月1日')).toBeInTheDocument();
    });
  });

  describe('プロフィール更新エラーハンドリング', () => {
    test('プロフィール更新エラー時でもUIが正常に動作する', async () => {
      const user = userEvent.setup();
      mockOnProfileUpdate.mockRejectedValue(new Error('Update failed'));
      
      renderComponent();
      
      const editButton = screen.getByText('編集');
      await user.click(editButton);
      
      const updateButton = screen.getByText('更新');
      await user.click(updateButton);
      
      // エラーが発生してもコンポーネントは引き続き表示される
      await waitFor(() => {
        expect(screen.getByText('アカウント設定')).toBeInTheDocument();
      });
    });
  });
});
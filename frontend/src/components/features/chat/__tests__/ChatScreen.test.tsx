import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ChatScreen from '../ChatScreen';

// Mock the hooks
jest.mock('@/lib/hooks', () => ({
  useAuth: jest.fn(),
  useChat: jest.fn(),
  useTree: jest.fn(),
  useMaintenance: jest.fn(),
  usePremiumFeatureGuard: jest.fn(),
}));

// Mock the API services
jest.mock('@/lib/api/chatService', () => ({
  useChatService: jest.fn(),
}));

jest.mock('@/lib/api/treeService', () => ({
  useTreeService: jest.fn(),
}));

// Import the mocked hooks
import { useAuth, useChat, useTree, useMaintenance, usePremiumFeatureGuard } from '@/lib/hooks';
import { useChatService } from '@/lib/api/chatService';
import { useTreeService } from '@/lib/api/treeService';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseChat = useChat as jest.MockedFunction<typeof useChat>;
const mockUseTree = useTree as jest.MockedFunction<typeof useTree>;
const mockUseMaintenance = useMaintenance as jest.MockedFunction<typeof useMaintenance>;
const mockUsePremiumFeatureGuard = usePremiumFeatureGuard as jest.MockedFunction<typeof usePremiumFeatureGuard>;
const mockUseChatService = useChatService as jest.MockedFunction<typeof useChatService>;
const mockUseTreeService = useTreeService as jest.MockedFunction<typeof useTreeService>;

describe('ChatScreen', () => {
  const mockOnNavigate = jest.fn();
  const mockOnCharacterChange = jest.fn();
  const mockCheckPremiumFeature = jest.fn();
  const mockSendMessage = jest.fn();
  const mockLoadChatHistory = jest.fn();
  const mockLoadTreeStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: { id: '1', plan: 'free' },
      profile: { subscription_plan: 'free' },
      isLoggedIn: true,
      loading: false,
      error: null,
    } as any);

    mockUseChat.mockReturnValue({
      messages: [],
      selectedAiRole: 'mittyan',
      currentMood: 'praise',
      loadChatHistory: mockLoadChatHistory,
      addMessage: jest.fn(),
      clearMessages: jest.fn(),
      loading: false,
      error: null,
    } as any);

    mockUseTree.mockReturnValue({
      treeStatus: { experience: 100, fruits_count: 5 },
      fruits: [],
      loadTreeStatus: mockLoadTreeStatus,
      loading: false,
      error: null,
    } as any);

    mockUseMaintenance.mockReturnValue({
      isMaintenanceMode: false,
    } as any);

    mockUsePremiumFeatureGuard.mockReturnValue({
      isPremiumUser: false,
      checkPremiumFeature: mockCheckPremiumFeature,
      subscriptionLoading: false,
      subscriptionError: null,
    } as any);

    mockUseChatService.mockReturnValue({
      sendMessage: mockSendMessage,
    } as any);

    mockUseTreeService.mockReturnValue({
      getTreeStatus: jest.fn(),
    } as any);

    mockCheckPremiumFeature.mockReturnValue(false);
  });

  const renderChatScreen = (props = {}) => {
    return render(
      <ChatScreen
        selectedAiRole="mittyan"
        currentMood="praise"
        onNavigate={mockOnNavigate}
        onCharacterChange={mockOnCharacterChange}
        {...props}
      />
    );
  };

  describe('基本的なレンダリング', () => {
    test('チャット画面が正しくレンダリングされる', () => {
      renderChatScreen();
      
      expect(screen.getByText('たまさん')).toBeInTheDocument();
      expect(screen.getByText('ほめほめモード')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('メッセージを入力...')).toBeInTheDocument();
    });

    test('褒めレベル設定セクションが表示される', () => {
      renderChatScreen();
      
      expect(screen.getByText('褒めレベル設定')).toBeInTheDocument();
      expect(screen.getByText('ノーマル')).toBeInTheDocument();
      expect(screen.getByText('ディープ')).toBeInTheDocument();
    });

    test('木の成長状態が表示される', () => {
      renderChatScreen();
      
      expect(screen.getByText('あなたの木')).toBeInTheDocument();
      expect(screen.getByText('5個')).toBeInTheDocument(); // fruits_count
    });
  });

  describe('ディープモード制限 - 無料ユーザー', () => {
    test('無料ユーザーの場合、ディープモードボタンにクラウンアイコンが表示される', () => {
      renderChatScreen();
      
      const deepModeButton = screen.getByText('ディープ').closest('button');
      expect(deepModeButton).toBeInTheDocument();
      
      // クラウンアイコンの存在確認（SVGアイコンのテスト）
      const crownIcon = deepModeButton?.querySelector('svg');
      expect(crownIcon).toBeInTheDocument();
    });

    test('無料ユーザーがディープモードをクリックするとプレミアム機能チェックが呼ばれる', async () => {
      const user = userEvent.setup();
      renderChatScreen();
      
      const deepModeButton = screen.getByText('ディープ').closest('button');
      await user.click(deepModeButton!);
      
      expect(mockCheckPremiumFeature).toHaveBeenCalledWith('deep_mode');
    });

    test('プレミアム機能チェックで拒否されると、ディープモードが選択されない', async () => {
      const user = userEvent.setup();
      mockCheckPremiumFeature.mockReturnValue(false); // プレミアム機能利用不可
      
      renderChatScreen();
      
      const normalButton = screen.getByText('ノーマル').closest('button');
      const deepModeButton = screen.getByText('ディープ').closest('button');
      
      // 初期状態でノーマルが選択されていることを確認
      expect(normalButton).toHaveClass('border-emerald-500');
      
      await user.click(deepModeButton!);
      
      // ディープモードが選択されていないことを確認
      expect(deepModeButton).not.toHaveClass('border-amber-500');
      expect(normalButton).toHaveClass('border-emerald-500');
    });

    test('無料ユーザー向けの制限説明が表示される', () => {
      renderChatScreen();
      
      expect(screen.getByText('ディープモードはプレミアム限定機能です')).toBeInTheDocument();
    });
  });

  describe('ディープモード機能 - プレミアムユーザー', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', plan: 'premium' },
        profile: { subscription_plan: 'premium' },
        isLoggedIn: true,
        loading: false,
        error: null,
      } as any);

      mockUsePremiumFeatureGuard.mockReturnValue({
        isPremiumUser: true,
        checkPremiumFeature: mockCheckPremiumFeature,
        subscriptionLoading: false,
        subscriptionError: null,
      } as any);

      mockCheckPremiumFeature.mockReturnValue(true);
    });

    test('プレミアムユーザーの場合、ディープモードが選択できる', async () => {
      const user = userEvent.setup();
      renderChatScreen();
      
      const deepModeButton = screen.getByText('ディープ').closest('button');
      await user.click(deepModeButton!);
      
      expect(mockCheckPremiumFeature).toHaveBeenCalledWith('deep_mode');
      
      // ディープモードが選択された状態になることを確認
      await waitFor(() => {
        expect(deepModeButton).toHaveClass('border-amber-500');
      });
    });

    test('プレミアムユーザーの場合、制限説明が表示されない', () => {
      renderChatScreen();
      
      expect(screen.queryByText('ディープモードはプレミアム限定機能です')).not.toBeInTheDocument();
    });

    test('プレミアムユーザーの場合、ディープモードボタンにクラウンアイコンが表示されない', () => {
      renderChatScreen();
      
      const deepModeButton = screen.getByText('ディープ').closest('button');
      
      // クラウンアイコンが存在しないことを確認
      const crownIcon = deepModeButton?.querySelector('svg');
      expect(crownIcon).not.toBeInTheDocument();
    });
  });

  describe('グループチャット制限', () => {
    test('無料ユーザーの場合、グループチャット制限版が表示される', () => {
      renderChatScreen();
      
      expect(screen.getByText('プレミアム限定機能です')).toBeInTheDocument();
      expect(screen.getByText('プレミアムで解除')).toBeInTheDocument();
    });

    test('無料ユーザーがプレミアムで解除ボタンをクリックするとプレミアム機能チェックが呼ばれる', async () => {
      const user = userEvent.setup();
      renderChatScreen();
      
      const unlockButton = screen.getByText('プレミアムで解除');
      await user.click(unlockButton);
      
      expect(mockCheckPremiumFeature).toHaveBeenCalledWith('group_chat');
    });

    test('プレミアムユーザーの場合、通常のグループチャット案内が表示される', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', plan: 'premium' },
        profile: { subscription_plan: 'premium' },
        isLoggedIn: true,
        loading: false,
        error: null,
      } as any);

      mockUsePremiumFeatureGuard.mockReturnValue({
        isPremiumUser: true,
        checkPremiumFeature: mockCheckPremiumFeature,
        subscriptionLoading: false,
        subscriptionError: null,
      } as any);

      renderChatScreen();
      
      expect(screen.getByText('グループチャットを始める')).toBeInTheDocument();
      expect(screen.queryByText('プレミアムで解除')).not.toBeInTheDocument();
    });
  });

  describe('プレミアム案内セクション', () => {
    test('無料ユーザーの場合、プレミアム案内が表示される', () => {
      renderChatScreen();
      
      expect(screen.getByText('プレミアム機能')).toBeInTheDocument();
      expect(screen.getByText('詳細を見る')).toBeInTheDocument();
    });

    test('プレミアム案内の詳細を見るボタンをクリックするとpremium画面に遷移する', async () => {
      const user = userEvent.setup();
      renderChatScreen();
      
      const detailButton = screen.getByText('詳細を見る');
      await user.click(detailButton);
      
      expect(mockOnNavigate).toHaveBeenCalledWith('premium');
    });

    test('プレミアムユーザーの場合、プレミアム案内が表示されない', () => {
      mockUsePremiumFeatureGuard.mockReturnValue({
        isPremiumUser: true,
        checkPremiumFeature: mockCheckPremiumFeature,
        subscriptionLoading: false,
        subscriptionError: null,
      } as any);

      renderChatScreen();
      
      expect(screen.queryByText('プレミアム機能')).not.toBeInTheDocument();
    });
  });

  describe('メッセージ送信', () => {
    test('ノーマルモードでメッセージを送信するとcurrentPraiseLevelがnormalになる', async () => {
      const user = userEvent.setup();
      mockSendMessage.mockResolvedValue({
        ai_response: 'テスト応答',
        emotion_detected: '嬉しい',
        fruit_generated: true,
        tree_updated: true
      });

      renderChatScreen();
      
      const input = screen.getByPlaceholderText('メッセージを入力...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'テストメッセージ');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'テストメッセージ',
            praise_level: 'normal'
          })
        );
      });
    });

    test('ディープモード選択後のメッセージ送信でcurrentPraiseLevelがdeepになる（プレミアムユーザー）', async () => {
      // プレミアムユーザーのセットアップ
      mockUsePremiumFeatureGuard.mockReturnValue({
        isPremiumUser: true,
        checkPremiumFeature: jest.fn().mockReturnValue(true),
        subscriptionLoading: false,
        subscriptionError: null,
      } as any);

      mockSendMessage.mockResolvedValue({
        ai_response: 'ディープな応答',
        emotion_detected: '感動',
        fruit_generated: true,
        tree_updated: true
      });

      const user = userEvent.setup();
      renderChatScreen();
      
      // ディープモードを選択
      const deepModeButton = screen.getByText('ディープ').closest('button');
      await user.click(deepModeButton!);
      
      // メッセージを送信
      const input = screen.getByPlaceholderText('メッセージを入力...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'ディープなメッセージ');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'ディープなメッセージ',
            praise_level: 'deep'
          })
        );
      });
    });
  });

  describe('初期化処理', () => {
    test('コンポーネントマウント時にチャット履歴と木の状態が読み込まれる', () => {
      renderChatScreen();
      
      expect(mockLoadChatHistory).toHaveBeenCalledTimes(1);
      expect(mockLoadTreeStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('ナビゲーション', () => {
    test('戻るボタンをクリックするとcharacter-selectionに遷移する', async () => {
      const user = userEvent.setup();
      renderChatScreen();
      
      const backButton = screen.getByText('戻る');
      await user.click(backButton);
      
      expect(mockOnNavigate).toHaveBeenCalledWith('character-selection');
    });

    test('設定変更ボタンをクリックするとonCharacterChangeが呼ばれる', async () => {
      const user = userEvent.setup();
      renderChatScreen();
      
      const settingsButton = screen.getByText('設定変更');
      await user.click(settingsButton);
      
      expect(mockOnCharacterChange).toHaveBeenCalledTimes(1);
    });
  });
});
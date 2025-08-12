import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PremiumLandingPage } from '../PremiumLandingPage';

describe('PremiumLandingPage', () => {
  const mockOnClose = jest.fn();
  const mockOnSubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <PremiumLandingPage
        onClose={mockOnClose}
        onSubscribe={mockOnSubscribe}
        {...props}
      />
    );
  };

  describe('基本的なレンダリング', () => {
    test('プレミアムランディングページが正しくレンダリングされる', () => {
      renderComponent();
      
      expect(screen.getByText('プレミアムプラン')).toBeInTheDocument();
      expect(screen.getByText('育児をもっと')).toBeInTheDocument();
      expect(screen.getByText('特別な時間に')).toBeInTheDocument();
    });

    test('閉じるボタンが表示される', () => {
      renderComponent();
      
      const closeButton = screen.getByLabelText('閉じる');
      expect(closeButton).toBeInTheDocument();
    });

    test('プレミアム機能の説明が表示される', () => {
      renderComponent();
      
      expect(screen.getByText('グループチャット機能')).toBeInTheDocument();
      expect(screen.getByText('高品質AI対話')).toBeInTheDocument();
      expect(screen.getByText('ディープモード')).toBeInTheDocument();
      expect(screen.getByText('チャット履歴180日保存')).toBeInTheDocument();
    });
  });

  describe('AI対話品質比較セクション', () => {
    test('無料プランとプレミアムプランの比較が表示される', () => {
      renderComponent();
      
      expect(screen.getByText('無料プラン')).toBeInTheDocument();
      expect(screen.getByText('応答速度重視のAI')).toBeInTheDocument();
      expect(screen.getByText('プレミアムプラン')).toBeInTheDocument();
      expect(screen.getByText('感情理解特化AI')).toBeInTheDocument();
    });

    test('応答例が適切に表示される', () => {
      renderComponent();
      
      // 無料プランの応答例
      expect(screen.getByText(/育児お疲れさまです。夜泣きで大変な時期ですが/)).toBeInTheDocument();
      
      // プレミアムプランの応答例
      expect(screen.getByText(/本当にお疲れさまです。夜泣きが続いて眠れない日々/)).toBeInTheDocument();
    });
  });

  describe('機能比較表', () => {
    test('詳しい機能比較表が表示される', () => {
      renderComponent();
      
      expect(screen.getByText('詳しい機能比較')).toBeInTheDocument();
      expect(screen.getByText('対話の自然さ')).toBeInTheDocument();
      expect(screen.getByText('感情理解度')).toBeInTheDocument();
      expect(screen.getByText('チャット履歴')).toBeInTheDocument();
      expect(screen.getByText('グループチャット')).toBeInTheDocument();
    });

    test('無料プランとプレミアムプランの比較項目が適切に表示される', () => {
      renderComponent();
      
      // 無料プランの機能
      expect(screen.getByText('迅速で適切な応答')).toBeInTheDocument();
      expect(screen.getByText('30日間保存')).toBeInTheDocument();
      expect(screen.getByText('利用不可')).toBeInTheDocument();
      
      // プレミアムプランの機能
      expect(screen.getByText('人間らしく自然な対話')).toBeInTheDocument();
      expect(screen.getByText('180日間保存')).toBeInTheDocument();
      expect(screen.getByText('3人同時チャット可能')).toBeInTheDocument();
    });
  });

  describe('料金プラン', () => {
    test('月額プランと年額プランが表示される', () => {
      renderComponent();
      
      expect(screen.getByText('月額プラン')).toBeInTheDocument();
      expect(screen.getByText('¥580')).toBeInTheDocument();
      expect(screen.getByText('/月')).toBeInTheDocument();
      
      expect(screen.getByText('年額プラン')).toBeInTheDocument();
      expect(screen.getByText('¥5,800')).toBeInTheDocument();
      expect(screen.getByText('/年')).toBeInTheDocument();
    });

    test('年額プランに割引表示がある', () => {
      renderComponent();
      
      expect(screen.getByText('約17%お得')).toBeInTheDocument();
      expect(screen.getByText('おすすめ')).toBeInTheDocument();
    });

    test('各プランの機能リストが表示される', () => {
      renderComponent();
      
      expect(screen.getByText('グループチャット機能')).toBeInTheDocument();
      expect(screen.getByText('高品質AI対話システム')).toBeInTheDocument();
      expect(screen.getByText('ディープモード使い放題')).toBeInTheDocument();
      expect(screen.getByText('いつでもキャンセル可能')).toBeInTheDocument();
    });
  });

  describe('ユーザーインタラクション', () => {
    test('閉じるボタンをクリックするとonCloseが呼ばれる', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const closeButton = screen.getByLabelText('閉じる');
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('月額プラン選択ボタンをクリックするとonSubscribeが呼ばれる', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const monthlyButton = screen.getByText('月額プランを選択');
      await user.click(monthlyButton);
      
      expect(mockOnSubscribe).toHaveBeenCalledWith('monthly');
    });

    test('年額プラン選択ボタンをクリックするとonSubscribeが呼ばれる', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const yearlyButton = screen.getByText('年額プランを選択');
      await user.click(yearlyButton);
      
      expect(mockOnSubscribe).toHaveBeenCalledWith('yearly');
    });

    test('CTAセクションの年額プランボタンが機能する', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const yearlyCtaButton = screen.getByText('年額プランで始める');
      await user.click(yearlyCtaButton);
      
      expect(mockOnSubscribe).toHaveBeenCalledWith('yearly');
    });

    test('CTAセクションの月額プランボタンが機能する', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const monthlyCtaButton = screen.getByText('月額プランで始める');
      await user.click(monthlyCtaButton);
      
      expect(mockOnSubscribe).toHaveBeenCalledWith('monthly');
    });
  });

  describe('スクロールとレスポンシブ', () => {
    test('スクロール可能なページが適切な高さで表示される', () => {
      renderComponent();
      
      const pageContainer = screen.getByText('プレミアムプラン').closest('div');
      expect(pageContainer).toHaveClass('min-h-screen');
    });

    test('ヘッダーがstickyポジションで表示される', () => {
      renderComponent();
      
      const header = screen.getByText('プレミアムプラン').closest('.sticky');
      expect(header).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    test('閉じるボタンに適切なaria-labelがある', () => {
      renderComponent();
      
      const closeButton = screen.getByLabelText('閉じる');
      expect(closeButton).toHaveAttribute('aria-label', '閉じる');
    });

    test('重要な見出しが適切なレベルで構造化されている', () => {
      renderComponent();
      
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
    });

    test('ボタンが適切なroleを持っている', () => {
      renderComponent();
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('エラーハンドリング', () => {
    test('onSubscribeでエラーが発生してもコンポーネントが正常に動作する', async () => {
      const user = userEvent.setup();
      const mockOnSubscribeError = jest.fn().mockRejectedValue(new Error('Payment error'));
      
      renderComponent({ onSubscribe: mockOnSubscribeError });
      
      const monthlyButton = screen.getByText('月額プランを選択');
      await user.click(monthlyButton);
      
      expect(mockOnSubscribeError).toHaveBeenCalledWith('monthly');
      // コンポーネントは引き続き表示されている
      expect(screen.getByText('プレミアムプラン')).toBeInTheDocument();
    });
  });
});
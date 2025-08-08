'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // エラー報告
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 開発環境でのみ詳細ログ出力
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error Info:', errorInfo);
    }

    // 本番環境では外部エラー追跡サービスに送信
    if (process.env.NODE_ENV === 'production') {
      this.reportErrorToService(error, errorInfo);
    }
  }

  private reportErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    try {
      // Sentryやその他のエラー追跡サービスに送信
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // TODO: 実際のエラー追跡サービス統合
      console.warn('Error report prepared:', errorReport);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center px-4">
          <div className="max-w-lg w-full">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* ヘッダー */}
              <div className="bg-gradient-to-r from-red-500 to-pink-600 p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <Typography variant="h2" color="neutral" className="text-white mb-2">
                  エラーが発生しました
                </Typography>
                <Typography variant="body" color="neutral" className="text-red-50">
                  申し訳ございません。予期しない問題が発生しました。
                </Typography>
              </div>

              {/* エラー詳細 */}
              <div className="p-8 space-y-6">
                {/* 基本情報 */}
                <div className="text-center">
                  <Typography variant="body" color="secondary" className="leading-relaxed">
                    この問題は一時的なものである可能性があります。<br />
                    画面を更新するか、しばらく時間をおいてから再度お試しください。
                  </Typography>
                </div>

                {/* 開発環境での詳細情報 */}
                {isDevelopment && this.state.error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <Typography variant="small" weight="bold" color="error" className="mb-2 flex items-center">
                      <Bug className="w-4 h-4 mr-1" />
                      開発者向けエラー情報
                    </Typography>
                    <div className="text-xs text-red-700 font-mono bg-white p-3 rounded border overflow-auto max-h-32">
                      <div className="mb-2">
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong>Stack:</strong>
                          <pre className="text-xs whitespace-pre-wrap mt-1">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* エラー解決のヒント */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <Typography variant="small" weight="bold" color="primary" className="mb-2">
                    解決方法をお試しください：
                  </Typography>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• ページを更新してみる</li>
                    <li>• しばらく時間をおいてからアクセスする</li>
                    <li>• ブラウザのキャッシュをクリアする</li>
                    <li>• 異なるブラウザで試してみる</li>
                  </ul>
                </div>

                {/* アクションボタン */}
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={this.handleRetry}
                    leftIcon={<RefreshCw className="w-5 h-5" />}
                  >
                    もう一度試す
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="md"
                      fullWidth
                      onClick={this.handleReload}
                      leftIcon={<RefreshCw className="w-4 h-4" />}
                    >
                      ページ更新
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="md"
                      fullWidth
                      onClick={this.handleGoHome}
                      leftIcon={<Home className="w-4 h-4" />}
                    >
                      ホームへ
                    </Button>
                  </div>
                </div>

                {/* 問題が続く場合の案内 */}
                <div className="text-center pt-4 border-t border-gray-200">
                  <Typography variant="caption" color="secondary">
                    問題が解決しない場合は、お手数ですが
                    <button 
                      onClick={() => window.open('mailto:support@homebiyori.com', '_blank')}
                      className="text-emerald-600 hover:text-emerald-700 underline mx-1"
                    >
                      サポート
                    </button>
                    までご連絡ください。
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
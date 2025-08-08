'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, CheckCircle, XCircle, Clock, Wifi, WifiOff, Bug } from 'lucide-react';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import NetworkStatus from '@/components/network/NetworkStatus';
import { runAPITest, APITestResult } from '@/lib/test/apiTest';
import { useNetworkStatus } from '@/lib/network/networkMonitor';

const TestPage = () => {
  const [testResults, setTestResults] = useState<APITestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testStartTime, setTestStartTime] = useState<Date | null>(null);
  const [testEndTime, setTestEndTime] = useState<Date | null>(null);
  const networkStatus = useNetworkStatus();

  useEffect(() => {
    // デバッグ情報をコンソールに出力
    console.log('🧪 Test Page Loaded');
    console.log('Network Status:', networkStatus);
  }, [networkStatus]);

  const handleRunTests = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setTestStartTime(new Date());
    setTestEndTime(null);
    setTestResults([]);

    try {
      console.log('🚀 Starting API Integration Tests...');
      const results = await runAPITest();
      setTestResults(results);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
      setTestEndTime(new Date());
    }
  };

  const getTestStats = () => {
    const total = testResults.length;
    const successful = testResults.filter(r => r.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? ((successful / total) * 100) : 0;

    const avgResponseTime = testResults
      .filter(r => r.success && r.responseTime > 0)
      .reduce((sum, r, _, arr) => sum + r.responseTime / arr.length, 0);

    return {
      total,
      successful,
      failed,
      successRate,
      avgResponseTime: Math.round(avgResponseTime)
    };
  };

  const stats = getTestStats();

  const getStatusIcon = (result: APITestResult) => {
    if (result.success) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusColor = (result: APITestResult) => {
    if (result.success) {
      return 'border-green-200 bg-green-50';
    } else {
      return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="h2" color="primary" className="mb-2">
                🧪 API統合テスト
              </Typography>
              <Typography variant="body" color="secondary">
                フロントエンドとバックエンドの統合テストを実行します
              </Typography>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* ネットワーク状態表示 */}
              <div className="flex items-center space-x-2 px-3 py-2 rounded-lg border bg-white">
                {networkStatus.online ? (
                  <Wifi className="w-5 h-5 text-green-600" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-600" />
                )}
                <Typography variant="small" color={networkStatus.online ? 'primary' : 'error'}>
                  {networkStatus.online ? 'オンライン' : 'オフライン'}
                </Typography>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleRunTests}
                disabled={isRunning || !networkStatus.online}
                leftIcon={isRunning ? <Clock className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              >
                {isRunning ? 'テスト実行中...' : 'テスト開始'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* ネットワーク詳細状態 */}
        <NetworkStatus showDetails={true} />

        {/* テスト統計 */}
        {testResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <Typography variant="h3" color="primary" className="mb-4">
              📊 テスト結果サマリー
            </Typography>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <Typography variant="h2" color="primary">{stats.total}</Typography>
                <Typography variant="small" color="secondary">総テスト数</Typography>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <Typography variant="h2" color="primary" className="text-green-600">
                  {stats.successful}
                </Typography>
                <Typography variant="small" color="secondary">成功</Typography>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <Typography variant="h2" color="primary" className="text-red-600">
                  {stats.failed}
                </Typography>
                <Typography variant="small" color="secondary">失敗</Typography>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <Typography variant="h2" color="primary" className="text-purple-600">
                  {stats.successRate.toFixed(1)}%
                </Typography>
                <Typography variant="small" color="secondary">成功率</Typography>
              </div>
            </div>

            {stats.avgResponseTime > 0 && (
              <div className="flex items-center justify-center space-x-6 p-4 bg-gray-50 rounded-xl">
                <div className="text-center">
                  <Typography variant="body" weight="bold" color="primary">
                    平均レスポンス時間
                  </Typography>
                  <Typography variant="body" color="secondary">
                    {stats.avgResponseTime}ms
                  </Typography>
                </div>
                
                {testStartTime && testEndTime && (
                  <div className="text-center">
                    <Typography variant="body" weight="bold" color="primary">
                      総実行時間
                    </Typography>
                    <Typography variant="body" color="secondary">
                      {Math.round((testEndTime.getTime() - testStartTime.getTime()) / 1000)}秒
                    </Typography>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* テスト結果詳細 */}
        {testResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <Typography variant="h3" color="primary" className="mb-4">
              🔍 詳細テスト結果
            </Typography>
            
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <motion.div
                  key={`${result.service}-${result.endpoint}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl border-2 ${getStatusColor(result)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(result)}
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <Typography variant="body" weight="bold" color="primary">
                            {result.service}
                          </Typography>
                          <Typography variant="small" color="secondary" className="font-mono">
                            {result.endpoint}
                          </Typography>
                        </div>
                        
                        {result.error && (
                          <Typography variant="small" color="error" className="flex items-center mt-1">
                            <Bug className="w-3 h-3 mr-1" />
                            {result.error}
                          </Typography>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-4">
                        {result.statusCode && (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            result.statusCode < 300 
                              ? 'bg-green-100 text-green-800'
                              : result.statusCode < 400
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {result.statusCode}
                          </span>
                        )}
                        
                        {result.responseTime > 0 && (
                          <Typography variant="small" color="secondary" className="font-mono">
                            {result.responseTime}ms
                          </Typography>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* レスポンスデータ表示（成功時のみ） */}
                  {result.success && result.data && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                        レスポンスデータを表示
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 実行ログ */}
        {(isRunning || testResults.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-900 text-green-400 rounded-2xl shadow-lg p-6 font-mono text-sm"
          >
            <Typography variant="h4" color="neutral" className="text-green-400 mb-4">
              🖥️ 実行ログ
            </Typography>
            
            <div className="h-64 overflow-y-auto space-y-1">
              <div>$ Starting API Integration Test Suite...</div>
              <div>$ Environment: {process.env.NODE_ENV}</div>
              <div>$ Network Status: {networkStatus.online ? 'ONLINE' : 'OFFLINE'}</div>
              {testStartTime && (
                <div>$ Test Started: {testStartTime.toLocaleString('ja-JP')}</div>
              )}
              
              {testResults.map((result, index) => (
                <div key={index} className={result.success ? 'text-green-400' : 'text-red-400'}>
                  {result.success ? '✓' : '✗'} {result.service} {result.endpoint} - {result.responseTime}ms
                </div>
              ))}
              
              {testEndTime && (
                <div className="text-yellow-400">
                  $ Test Completed: {testEndTime.toLocaleString('ja-JP')}
                </div>
              )}
              
              {isRunning && (
                <div className="text-blue-400 animate-pulse">
                  $ Running tests... Please wait.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 使用方法 */}
        {testResults.length === 0 && !isRunning && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <Typography variant="h3" color="primary" className="mb-4">
              🚀 テストの実行方法
            </Typography>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <Typography variant="body" weight="bold" color="primary" className="mb-2">
                  1. ネットワーク接続を確認
                </Typography>
                <Typography variant="small" color="secondary">
                  オンライン状態であることを確認してからテストを実行してください。
                </Typography>
              </div>
              
              <div className="p-4 bg-green-50 rounded-xl">
                <Typography variant="body" weight="bold" color="primary" className="mb-2">
                  2. 「テスト開始」ボタンをクリック
                </Typography>
                <Typography variant="small" color="secondary">
                  バックエンドのLambdaサービスとの接続テストが開始されます。
                </Typography>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-xl">
                <Typography variant="body" weight="bold" color="primary" className="mb-2">
                  3. 結果を確認
                </Typography>
                <Typography variant="small" color="secondary">
                  各APIエンドポイントの接続状況、レスポンス時間、エラー情報を確認できます。
                </Typography>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <Typography variant="small" color="secondary">
                <strong>注意:</strong> このテストページは開発用です。本番環境では利用できません。
                バックエンドAPIが未デプロイの場合、すべてのテストが失敗する可能性があります。
              </Typography>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestPage;
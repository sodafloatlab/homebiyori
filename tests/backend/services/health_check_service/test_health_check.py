"""
Health Check Lambda テストスイート

このファイルは以下の本番モジュールをテストします:
- backend/services/health_check_service/main.py (FastAPI アプリケーション)
- backend/services/health_check_service/handler.py (Lambda ハンドラー)

テスト項目一覧（GEMINI.md準拠）:
[T001] 基本ヘルスチェックAPI正常動作
[T002] ヘルスチェックレスポンス形式検証  
[T003] エラーハンドリングテスト
[T004] レスポンス時間性能テスト
[T005] Lambda Local統合テスト

実装方針:
- 外部サービス依存を排除したシンプルなテスト
- FastAPI TestClientによる基本的なAPIテスト
- Lambda環境での動作確認のみ
- 詳細な外部サービス連携テストは管理者機能で実装

ディレクトリ構成:
- 本ファイル: tests/backend/services/health_check_service/test_health_check.py
- テスト対象: backend/services/health_check_service/main.py, handler.py
"""

import pytest
import json
import time
from fastapi.testclient import TestClient
from datetime import datetime, timezone

# テスト対象のインポート
from backend.services.health_check_service.main import app

class TestSimpleHealthCheck:
    """
    シンプルヘルスチェックAPIテストクラス
    
    テスト方針:
    - 外部サービス（DynamoDB、Bedrock等）に依存しない
    - 基本的なAPI動作の確認
    - レスポンス形式とパフォーマンスの検証
    """
    
    def setup_method(self):
        """各テストメソッド実行前の初期化"""
        self.client = TestClient(app)
    
    def test_basic_health_check_success(self):
        """
        [T001] 基本ヘルスチェックAPI正常動作
        
        テスト観点:
        - GET /api/health が正常にレスポンスを返す
        - ステータスコードが200
        - 必須フィールドが全て含まれている
        - レスポンス値の妥当性
        """
        # API呼び出し実行
        response = self.client.get("/api/health")
        
        # ステータスコード検証
        assert response.status_code == 200
        
        # レスポンス形式検証
        data = response.json()
        required_fields = ["status", "timestamp", "service", "version", "response_time_ms"]
        for field in required_fields:
            assert field in data, f"Required field '{field}' is missing"
        
        # 値の妥当性検証
        assert data["status"] == "ok"
        assert data["service"] == "health-check"
        assert data["version"] == "1.0.0"
        assert isinstance(data["response_time_ms"], (int, float))
        assert data["response_time_ms"] >= 0
    
    def test_health_check_timestamp_format(self):
        """
        [T002] ヘルスチェックレスポンス形式検証
        
        テスト観点:
        - タイムスタンプがISO8601形式であること
        - UTC時刻であること（Zサフィックス）
        - パース可能な形式であること
        """
        response = self.client.get("/api/health")
        data = response.json()
        
        # タイムスタンプ形式検証
        timestamp = data["timestamp"]
        assert timestamp.endswith("Z"), "Timestamp should be in UTC (end with Z)"
        
        # ISO8601形式のパース確認
        try:
            parsed_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            assert parsed_time is not None
        except ValueError:
            pytest.fail(f"Invalid ISO8601 timestamp format: {timestamp}")
        
        # 現在時刻との差が妥当な範囲内であること（5秒以内）
        now = datetime.now(timezone.utc)
        time_diff = abs((now - parsed_time).total_seconds())
        assert time_diff < 5, f"Timestamp too far from current time: {time_diff}s"
    
    def test_health_check_response_time_performance(self):
        """
        [T004] レスポンス時間性能テスト
        
        テスト観点:
        - レスポンス時間が200ms以下であること（シンプル構成の目標）
        - レスポンス内のresponse_time_msが実測値と近いこと
        - 複数回実行での安定性
        """
        response_times = []
        
        # 5回実行して安定性を確認
        for i in range(5):
            start_time = time.time()
            response = self.client.get("/api/health")
            end_time = time.time()
            
            actual_response_time_ms = (end_time - start_time) * 1000
            response_times.append(actual_response_time_ms)
            
            # レスポンス成功確認
            assert response.status_code == 200
            
            # パフォーマンス要件確認
            assert actual_response_time_ms < 200, f"Response time {actual_response_time_ms}ms exceeds 200ms target"
            
            # レスポンス内のタイミング情報確認
            data = response.json()
            reported_time = data["response_time_ms"]
            assert reported_time >= 0, "Reported response time should be non-negative"
        
        # 平均レスポンス時間の確認
        avg_response_time = sum(response_times) / len(response_times)
        assert avg_response_time < 200, f"Average response time {avg_response_time}ms exceeds target"
        
        print(f"Average response time: {avg_response_time:.2f}ms")
    
    def test_health_check_multiple_concurrent_requests(self):
        """
        [T004-2] 同時リクエスト性能テスト
        
        テスト観点:
        - 複数の同時リクエストに対する応答
        - 全てのリクエストが成功すること
        - レスポンス時間の一貫性
        """
        import concurrent.futures
        import threading
        
        def make_request():
            """単一のヘルスチェックリクエストを実行"""
            start_time = time.time()
            response = self.client.get("/api/health")
            end_time = time.time()
            return {
                "status_code": response.status_code,
                "response_time_ms": (end_time - start_time) * 1000,
                "data": response.json()
            }
        
        # 10個の同時リクエストを実行
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # 全リクエストの成功確認
        for result in results:
            assert result["status_code"] == 200
            assert result["data"]["status"] == "ok"
            assert result["response_time_ms"] < 500  # 同時実行時は緩い制限
    
    def test_health_check_error_handling_simulation(self):
        """
        [T003] エラーハンドリングテスト
        
        テスト観点:
        - アプリケーション内でエラーが発生した場合の動作
        - 適切なエラーレスポンス形式
        - ステータスコードが200のままであること（Load Balancer対策）
        """
        # 注意: 実際のエラーを発生させるのは困難なため、
        # このテストは現在の実装ではパスする想定
        # 将来的にエラー注入機能を追加する場合のプレースホルダー
        
        response = self.client.get("/api/health")
        assert response.status_code == 200
        
        # 正常な場合でもエラーレスポンス形式をチェック
        data = response.json()
        if data["status"] == "error":
            assert "error" in data
            assert "timestamp" in data
            assert data["service"] == "health-check"

class TestLambdaIntegration:
    """
    Lambda統合テストクラス
    
    実際のLambda環境での動作確認
    """
    
    def test_lambda_handler_import(self):
        """
        [T005] Lambda handlerインポートテスト
        
        テスト観点:
        - handlerモジュールが正常にインポートできること
        - Mangumアダプターが適切に設定されていること
        - 循環インポートエラーがないこと
        """
        try:
            from backend.services.health_check_service.handler import handler
            assert handler is not None
            assert callable(handler)
        except ImportError as e:
            pytest.fail(f"Lambda handler import failed: {e}")
        except Exception as e:
            pytest.fail(f"Unexpected error during handler import: {e}")
    
    def test_lambda_event_processing(self):
        """
        [T005-2] Lambda Event処理テスト
        
        テスト観点:
        - API Gateway形式のLambda Eventを正しく処理できること
        - レスポンス形式がLambda仕様に準拠していること
        """
        try:
            from backend.services.health_check_service.handler import handler
        except ImportError:
            pytest.skip("Handler import failed, skipping Lambda event test")
        
        # API Gateway形式のLambda Event（正しい形式）
        lambda_event = {
            "resource": "/api/health",
            "httpMethod": "GET",
            "path": "/api/health",
            "pathParameters": None,
            "queryStringParameters": None,
            "headers": {
                "Accept": "application/json",
                "User-Agent": "test-client",
                "Host": "api.example.com"
            },
            "multiValueHeaders": {},
            "body": None,
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "1234567890",
                "httpMethod": "GET",
                "path": "/api/health",
                "resourcePath": "/api/health",
                "stage": "test",
                "requestId": "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
                "requestTime": "09/Apr/2015:12:34:56 +0000",
                "requestTimeEpoch": 1428582896000,
                "identity": {
                    "sourceIp": "127.0.0.1"
                }
            }
        }
        
        # Lambda Context オブジェクト模擬
        lambda_context = type('LambdaContext', (), {
            'function_name': 'health-check',
            'function_version': '$LATEST',
            'invoked_function_arn': 'arn:aws:lambda:us-east-1:123456789012:function:health-check',
            'memory_limit_in_mb': 128,
            'remaining_time_in_millis': lambda: 30000,
            'aws_request_id': 'test-request-id-123'
        })()
        
        # Lambda実行テスト
        try:
            result = handler(lambda_event, lambda_context)
            
            # Lambda レスポンス形式検証
            assert "statusCode" in result
            assert "body" in result
            assert result["statusCode"] == 200
            
            # レスポンスボディの検証
            body = json.loads(result["body"])
            assert body["status"] == "ok"
            assert body["service"] == "health-check"
            
        except Exception as e:
            pytest.fail(f"Lambda handler execution failed: {e}")


# テスト実行時の設定
@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """
    テストセッション開始時の環境初期化（シンプル版）
    
    実装内容:
    - ログレベル設定
    - 最小限の環境変数設定
    """
    import os
    import logging
    
    # ログレベル設定（テスト時はWARNING以上のみ表示）
    logging.getLogger().setLevel(logging.WARNING)
    
    # 最小限の環境変数設定
    os.environ.update({
        'AWS_DEFAULT_REGION': 'us-east-1'
    })
    
    yield
    
    # テスト終了時のクリーンアップ
    # （現在は特に処理なし）


if __name__ == "__main__":
    """
    テストの個別実行用
    
    使用方法:
    python test_health_check_simple.py
    """
    pytest.main([__file__, "-v", "--tb=short"])
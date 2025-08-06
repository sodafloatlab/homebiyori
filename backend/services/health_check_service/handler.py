"""
Homebiyori Health Check Lambda Handler

このファイルはAWS Lambdaのエントリーポイントです。

実装方針:
- FastAPIアプリケーションをMangumでLambda対応に変換
- Lambda環境でのHTTPリクエスト/レスポンス処理
- CloudWatchへの自動ログ出力
- エラーハンドリングとパフォーマンス監視

使用方法:
- AWS Lambda関数のhandler設定: handler.handler
- API Gatewayとの統合でHTTPエンドポイントとして動作
- ヘルスチェック専用サービスとして独立動作

関連ファイル:
- main.py: FastAPIアプリケーション本体
- requirements.txt: 依存関係定義
"""

from mangum import Mangum
from backend.services.health_check_service.main import app

# Lambda関数ハンドラー
# Mangum: FastAPI（ASGI）をAWS Lambda（イベント駆動）に変換するアダプター
# 
# 変更履歴:
# - パッケージ名修正: health-check → health_check (Pythonパッケージ命名規則準拠)
# - コメント追加: 初心者でも理解できるよう詳細説明を追加
handler = Mangum(
    app,
    lifespan="off",          # Lambda環境ではlifespanイベント不要
    api_gateway_base_path="/"  # API Gatewayのベースパス設定
)

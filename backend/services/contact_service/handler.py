"""
Contact Service - AWS Lambda Handler

AWS Lambda エントリーポイント。
Mangum アダプターを使用してFastAPIアプリケーションをLambda環境で実行。
"""

from .main import handler

# Lambdaハンドラー関数
# handler は main.py で定義済み（Mangum adapter）
__all__ = ['handler']
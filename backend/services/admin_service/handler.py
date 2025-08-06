"""
admin_service Lambda Handler

管理者ダッシュボード用Lambda関数のエントリーポイント
"""

from main import lambda_handler

# Lambda Runtime がこのファイルから lambda_handler を呼び出す
__all__ = ['lambda_handler']
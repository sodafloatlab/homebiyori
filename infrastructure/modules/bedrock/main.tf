# Amazon Bedrock Configuration
# 
# 重要事項:
# - Amazon Bedrock のモデルは AWS コンソールで手動有効化が必要です
# - 現在の利用LLMは Amazon Nova です（Claude-3-Haiku から移行済み）
# - ガードレール機能はコスト面から採用を見送りました
# - メトリクスフィルター、アラーム、ダッシュボードは operation スタックに移行しました

# Amazon Nova モデルの手動有効化が必要
# AWS Console > Amazon Bedrock > Model access で以下モデルを有効化:
# - amazon.nova-lite-v1:0

# Bedrock Model Invocation Logging Configuration
# S3への直接ログ出力（CloudWatchLogsは不使用）
resource "aws_bedrock_model_invocation_logging_configuration" "main" {
  logging_config {
    # S3バケットへのログ出力設定（AWS公式ドキュメント準拠パス）
    s3_config {
      bucket_name = var.logs_bucket_name
      key_prefix  = "bedrock-invocation-logs"
    }

    # テキストデータのみログ出力、埋め込み/画像/ビデオは除外
    text_data_delivery_enabled       = true
    image_data_delivery_enabled      = false
    embedding_data_delivery_enabled  = false
    video_data_delivery_enabled      = false
  }
}  


#!/bin/bash

# Homebiyori Frontend Deploy Script
# フロントエンドビルドからS3デプロイ、CloudFrontキャッシュ無効化まで一括実行

set -e  # エラー時に停止

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定
S3_BUCKET="prod-homebiyori-static"
CLOUDFRONT_DISTRIBUTION_ID="E22TP9AN132KYS"

echo -e "${BLUE}🚀 Homebiyori フロントエンドデプロイ開始${NC}"
echo "=================================="

# Step 1: ビルド実行
echo -e "${YELLOW}📦 Step 1: Next.js ビルド実行中...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ ビルド完了${NC}"
else
    echo -e "${RED}❌ ビルドに失敗しました${NC}"
    exit 1
fi

# Step 2: S3同期（CloudFrontキャッシュ優先戦略）
echo -e "${YELLOW}🔄 Step 2: S3へのデプロイ実行中...${NC}"
echo "バケット: ${S3_BUCKET}"
echo "キャッシュ戦略: CloudFrontキャッシュ優先（ブラウザキャッシュ無効化）"

aws s3 sync out/ s3://${S3_BUCKET} \
    --delete \
    --cache-control "public,max-age=0,must-revalidate"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ S3デプロイ完了${NC}"
else
    echo -e "${RED}❌ S3デプロイに失敗しました${NC}"
    exit 1
fi

# # Step 3: CloudFrontキャッシュ無効化
# echo -e "${YELLOW}🔄 Step 3: CloudFrontキャッシュ無効化実行中...${NC}"
# echo "Distribution ID: ${CLOUDFRONT_DISTRIBUTION_ID}"

# aws cloudfront create-invalidation \
#     --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
#     --paths "/*"

# if [ $? -eq 0 ]; then
#     echo -e "${GREEN}✅ CloudFrontキャッシュ無効化開始${NC}"
#     echo "CloudFrontキャッシュ無効化が開始されました。完了まで1-3分お待ちください。"
# else
#     echo -e "${RED}❌ CloudFrontキャッシュ無効化に失敗しました${NC}"
#     exit 1
# fi

# 完了メッセージ
echo ""
echo -e "${GREEN}🎉 デプロイが完了しました！${NC}"
echo "=================================="
echo -e "${BLUE}🌐 アプリケーションURL: https://homebiyori.com${NC}"
# echo -e "${YELLOW}⏳ CloudFrontキャッシュ無効化完了まで1-3分お待ちください${NC}"
echo ""
echo "📊 デプロイサマリー:"
echo "  • ビルド: ✅ 完了"
echo "  • S3アップロード: ✅ 完了"  
# echo "  • CloudFrontキャッシュ無効化: ⏳ 進行中"
echo ""
echo -e "${BLUE}💡 Tips:${NC}"
# echo "  • キャッシュ戦略: ブラウザキャッシュ無効化、CloudFrontキャッシュ優先"
# echo "  • CloudFrontキャッシュ無効化リスト確認: aws cloudfront list-invalidations --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID}"
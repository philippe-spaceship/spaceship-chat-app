#!/bin/bash

# Deploy script for S3 + CloudFront
# Usage: ./deploy-to-s3.sh your-bucket-name your-cloudfront-id

set -e

BUCKET_NAME=$1
CLOUDFRONT_ID=$2

if [ -z "$BUCKET_NAME" ]; then
    echo "Error: Bucket name is required"
    echo "Usage: ./deploy-to-s3.sh your-bucket-name [cloudfront-id]"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building project..."
npm run build

echo "📤 Uploading to S3 bucket: $BUCKET_NAME..."
aws s3 sync dist/ s3://$BUCKET_NAME/ --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "index.html" \
    --exclude "*.map"

# Upload index.html separately with no-cache
aws s3 cp dist/index.html s3://$BUCKET_NAME/index.html \
    --cache-control "no-cache"

echo "✅ Upload complete!"

if [ -n "$CLOUDFRONT_ID" ]; then
    echo "🔄 Invalidating CloudFront cache: $CLOUDFRONT_ID..."
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_ID \
        --paths "/*"
    echo "✅ CloudFront invalidation started!"
fi

echo "🎉 Deployment complete!"
echo "Your site should be live at: https://$BUCKET_NAME"







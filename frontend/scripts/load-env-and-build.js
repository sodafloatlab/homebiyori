#!/usr/bin/env node

/**
 * 環境変数を.env.productionから読み込んでNext.jsビルドを実行
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// .env.productionファイルを読み込み
const envPath = path.join(__dirname, '..', '.env.production');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.production file not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

// 環境変数をパース
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

// 環境変数を設定
Object.assign(process.env, envVars);

console.log('✅ Loaded environment variables:');
Object.keys(envVars).forEach(key => {
  if (key.startsWith('NEXT_PUBLIC_')) {
    const value = envVars[key];
    const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
    console.log(`  ${key}: ${displayValue}`);
  }
});

// Next.jsビルドを実行
console.log('\n🚀 Running Next.js build...');
exec('npx next build', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
  
  if (stderr) {
    console.error('Build warnings/errors:', stderr);
  }
  
  console.log(stdout);
  console.log('✅ Build completed successfully');
});
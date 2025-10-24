#!/usr/bin/env npx tsx

/**
 * 生成试用API Key加密密钥脚本
 * 
 * 生成一个安全的32字节（256位）加密密钥，用于AES-256-GCM加密
 * 
 * 使用方法：
 * npm run generate-encryption-key
 * 或
 * npx tsx scripts/generate-encryption-key.ts
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * 生成32字节的安全加密密钥
 */
function generateEncryptionKey(): string {
  const key = crypto.randomBytes(32);
  return key.toString('base64');
}

/**
 * 验证生成的密钥
 */
function validateGeneratedKey(keyBase64: string): boolean {
  try {
    const key = Buffer.from(keyBase64, 'base64');
    return key.length === 32;
  } catch {
    return false;
  }
}

/**
 * 检查环境文件是否存在
 */
function checkEnvFiles(): { envLocal: boolean; env: boolean } {
  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envPath = path.join(process.cwd(), '.env');
  
  return {
    envLocal: fs.existsSync(envLocalPath),
    env: fs.existsSync(envPath),
  };
}

/**
 * 读取现有环境文件内容
 */
function readEnvFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

/**
 * 更新环境文件中的加密密钥
 */
function updateEnvFile(filePath: string, newKey: string): void {
  const content = readEnvFile(filePath);
  const keyLine = `TRIAL_KEY_ENCRYPTION_KEY=${newKey}`;
  
  // 检查是否已存在该配置
  const lines = content.split('\n');
  const existingKeyIndex = lines.findIndex(line => 
    line.startsWith('TRIAL_KEY_ENCRYPTION_KEY=')
  );
  
  if (existingKeyIndex >= 0) {
    // 更新现有配置
    lines[existingKeyIndex] = keyLine;
  } else {
    // 添加新配置
    if (content && !content.endsWith('\n')) {
      lines.push('');
    }
    lines.push('# Trial API Key Encryption');
    lines.push(keyLine);
  }
  
  fs.writeFileSync(filePath, lines.join('\n'));
}

/**
 * 主函数
 */
function main(): void {
  console.log('🔑 生成试用API Key加密密钥...\n');
  
  // 1. 生成密钥
  const encryptionKey = generateEncryptionKey();
  
  // 2. 验证密钥
  if (!validateGeneratedKey(encryptionKey)) {
    console.error('❌ 生成的密钥验证失败');
    process.exit(1);
  }
  
  console.log('✅ 成功生成32字节加密密钥');
  console.log(`📋 密钥: ${encryptionKey}\n`);
  
  // 3. 检查环境文件
  const envFiles = checkEnvFiles();
  
  if (!envFiles.envLocal && !envFiles.env) {
    console.log('📝 未找到环境文件，创建 .env.local...');
    const envLocalPath = path.join(process.cwd(), '.env.local');
    updateEnvFile(envLocalPath, encryptionKey);
    console.log('✅ 已创建 .env.local 并添加加密密钥');
  } else {
    // 优先使用 .env.local
    const targetFile = envFiles.envLocal ? '.env.local' : '.env';
    const targetPath = path.join(process.cwd(), targetFile);
    
    console.log(`📝 更新 ${targetFile} 中的加密密钥...`);
    
    // 检查是否已存在密钥
    const existingContent = readEnvFile(targetPath);
    if (existingContent.includes('TRIAL_KEY_ENCRYPTION_KEY=')) {
      console.log('⚠️  检测到现有的加密密钥配置');
      console.log('   如果您确定要替换，请手动更新以下配置：');
      console.log(`   TRIAL_KEY_ENCRYPTION_KEY=${encryptionKey}`);
      console.log('\n   或者删除现有配置后重新运行此脚本');
    } else {
      updateEnvFile(targetPath, encryptionKey);
      console.log(`✅ 已更新 ${targetFile} 并添加加密密钥`);
    }
  }
  
  // 4. 提供使用说明
  console.log('\n📚 使用说明：');
  console.log('1. 确保环境变量 TRIAL_KEY_ENCRYPTION_KEY 已正确设置');
  console.log('2. 重启开发服务器以加载新的环境变量');
  console.log('3. 运行测试验证加密功能：npm test -- crypto');
  console.log('4. 客户端需要使用相同的密钥进行解密');
  
  console.log('\n🔒 安全提醒：');
  console.log('- 请妥善保管此密钥，不要提交到版本控制系统');
  console.log('- 生产环境请使用不同的密钥');
  console.log('- 定期轮换密钥以提高安全性');
  console.log('- 客户端更新时需要同步更新解密密钥');
  
  console.log('\n🧪 测试加密功能：');
  console.log('npx tsx -e "');
  console.log('import { validateEncryption } from \'./lib/crypto/trial-key-encryption\';');
  console.log('console.log(\'加密功能测试:\', validateEncryption() ? \'✅ 通过\' : \'❌ 失败\');');
  console.log('"');
}

// 运行脚本
if (require.main === module) {
  main();
}

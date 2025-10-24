/**
 * 试用API Key加密/解密工具
 * 
 * 使用AES-256-GCM算法对试用API Key进行加密，确保在传输过程中的安全性
 * 
 * 特性：
 * - AES-256-GCM认证加密
 * - 随机IV确保每次加密结果不同
 * - Base64编码适合URL传输
 * - 包含完整性验证
 */

import * as crypto from 'crypto';
import { ENCRYPTION_CONFIG, getEncryptionKey } from './encryption-config';

/**
 * 加密数据结构
 */
export interface EncryptedTrialKey {
  iv: string;      // Base64编码的初始化向量
  tag: string;     // Base64编码的认证标签
  data: string;    // Base64编码的加密数据
}

/**
 * 加密试用API Key
 * 
 * @param plainKey 明文试用API Key
 * @returns Base64编码的加密数据字符串
 * @throws Error 如果加密失败
 */
export function encryptTrialKey(plainKey: string): string {
  try {
    // 1. 验证输入
    if (!plainKey || typeof plainKey !== 'string') {
      throw new Error('Invalid trial key: must be a non-empty string');
    }
    
    // 2. 获取加密密钥
    const key = getEncryptionKey();
    
    // 3. 生成随机IV
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    
    // 4. 创建加密器
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);

    // 5. 加密数据
    let encrypted = cipher.update(plainKey, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // 6. 获取认证标签
    const tag = cipher.getAuthTag();
    
    // 7. 组装加密数据结构
    const encryptedData: EncryptedTrialKey = {
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      data: encrypted.toString('base64'),
    };
    
    // 8. JSON序列化并Base64编码
    const jsonString = JSON.stringify(encryptedData);
    const result = Buffer.from(jsonString, 'utf8').toString('base64');
    
    console.log(`[Encryption] Successfully encrypted trial key (length: ${plainKey.length} → ${result.length})`);
    
    return result;
    
  } catch (error) {
    console.error('[Encryption] Failed to encrypt trial key:', error);
    throw new Error(`Trial key encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 解密试用API Key（主要用于测试验证）
 * 
 * @param encryptedKey Base64编码的加密数据字符串
 * @returns 明文试用API Key
 * @throws Error 如果解密失败
 */
export function decryptTrialKey(encryptedKey: string): string {
  try {
    // 1. 验证输入
    if (!encryptedKey || typeof encryptedKey !== 'string') {
      throw new Error('Invalid encrypted key: must be a non-empty string');
    }
    
    // 2. Base64解码并解析JSON
    const jsonString = Buffer.from(encryptedKey, 'base64').toString('utf8');
    const encryptedData: EncryptedTrialKey = JSON.parse(jsonString);
    
    // 3. 验证数据结构
    if (!encryptedData.iv || !encryptedData.tag || !encryptedData.data) {
      throw new Error('Invalid encrypted data structure');
    }
    
    // 4. 提取组件
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const data = Buffer.from(encryptedData.data, 'base64');
    
    // 5. 验证组件长度
    if (iv.length !== ENCRYPTION_CONFIG.ivLength) {
      throw new Error(`Invalid IV length: expected ${ENCRYPTION_CONFIG.ivLength}, got ${iv.length}`);
    }
    if (tag.length !== ENCRYPTION_CONFIG.tagLength) {
      throw new Error(`Invalid tag length: expected ${ENCRYPTION_CONFIG.tagLength}, got ${tag.length}`);
    }
    
    // 6. 获取解密密钥
    const key = getEncryptionKey();
    
    // 7. 创建解密器
    const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    // 8. 解密数据
    let decrypted = decipher.update(data, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log(`[Decryption] Successfully decrypted trial key (length: ${encryptedKey.length} → ${decrypted.length})`);
    
    return decrypted;
    
  } catch (error) {
    console.error('[Decryption] Failed to decrypt trial key:', error);
    throw new Error(`Trial key decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 验证加密/解密功能是否正常工作
 * 
 * @param testKey 用于测试的API Key（可选）
 * @returns true 如果加密/解密功能正常
 */
export function validateEncryption(testKey: string = 'sk-or-v1-test-key-for-validation'): boolean {
  try {
    const encrypted = encryptTrialKey(testKey);
    const decrypted = decryptTrialKey(encrypted);
    
    const isValid = decrypted === testKey;
    
    if (isValid) {
      console.log('[Validation] Encryption/decryption validation passed');
    } else {
      console.error('[Validation] Encryption/decryption validation failed: decrypted value does not match original');
    }
    
    return isValid;
  } catch (error) {
    console.error('[Validation] Encryption/decryption validation failed:', error);
    return false;
  }
}

/**
 * 获取加密统计信息（用于调试）
 */
export function getEncryptionStats(plainKey: string): {
  originalLength: number;
  encryptedLength: number;
  compressionRatio: number;
  estimatedUrlIncrease: number;
} {
  const encrypted = encryptTrialKey(plainKey);
  
  return {
    originalLength: plainKey.length,
    encryptedLength: encrypted.length,
    compressionRatio: encrypted.length / plainKey.length,
    estimatedUrlIncrease: encrypted.length - plainKey.length,
  };
}

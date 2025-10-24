/**
 * 试用API Key加密配置
 * 
 * 使用AES-256-GCM算法进行对称加密
 * - 提供认证加密（同时保证机密性和完整性）
 * - 使用随机IV确保每次加密结果不同
 * - 支持Base64编码用于URL传输
 */

export const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,      // 256位密钥
  ivLength: 12,       // 96位IV（GCM推荐长度）
  tagLength: 16,      // 128位认证标签
} as const;

/**
 * 从环境变量获取加密密钥
 * @returns 32字节的加密密钥
 * @throws Error 如果密钥未配置或格式无效
 */
export function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.TRIAL_KEY_ENCRYPTION_KEY;
  
  if (!keyBase64) {
    throw new Error(
      'TRIAL_KEY_ENCRYPTION_KEY environment variable is not set. ' +
      'Please generate a key using: npm run generate-encryption-key'
    );
  }
  
  try {
    const key = Buffer.from(keyBase64, 'base64');
    
    if (key.length !== ENCRYPTION_CONFIG.keyLength) {
      throw new Error(
        `Invalid encryption key length. Expected ${ENCRYPTION_CONFIG.keyLength} bytes, ` +
        `got ${key.length} bytes.`
      );
    }
    
    return key;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid encryption key length')) {
      throw error;
    }
    throw new Error(
      'Invalid TRIAL_KEY_ENCRYPTION_KEY format. Expected base64-encoded 32-byte key.'
    );
  }
}

/**
 * 验证加密密钥是否正确配置
 * @returns true 如果密钥配置正确
 */
export function validateEncryptionKey(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取加密配置信息（用于调试和测试）
 */
export function getEncryptionInfo() {
  return {
    algorithm: ENCRYPTION_CONFIG.algorithm,
    keyLength: ENCRYPTION_CONFIG.keyLength,
    ivLength: ENCRYPTION_CONFIG.ivLength,
    tagLength: ENCRYPTION_CONFIG.tagLength,
    keyConfigured: validateEncryptionKey(),
  };
}

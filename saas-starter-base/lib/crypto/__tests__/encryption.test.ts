/**
 * 试用API Key加密功能单元测试
 */

import { encryptTrialKey, decryptTrialKey, validateEncryption, getEncryptionStats } from '../trial-key-encryption';
import { getEncryptionKey, validateEncryptionKey, getEncryptionInfo } from '../encryption-config';

// 模拟环境变量
const mockEncryptionKey = 'dGVzdC1rZXktZm9yLXRyaWFsLWtleS1lbmNyeXB0aW9uLXRlc3RpbmctMzItYnl0ZXM='; // 32字节测试密钥

describe('Encryption Configuration', () => {
  const originalEnv = process.env.TRIAL_KEY_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.TRIAL_KEY_ENCRYPTION_KEY = mockEncryptionKey;
  });

  afterEach(() => {
    process.env.TRIAL_KEY_ENCRYPTION_KEY = originalEnv;
  });

  test('should get encryption key from environment', () => {
    const key = getEncryptionKey();
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  test('should validate encryption key correctly', () => {
    expect(validateEncryptionKey()).toBe(true);
  });

  test('should throw error when encryption key is not set', () => {
    delete process.env.TRIAL_KEY_ENCRYPTION_KEY;
    expect(() => getEncryptionKey()).toThrow('TRIAL_KEY_ENCRYPTION_KEY environment variable is not set');
  });

  test('should throw error when encryption key has invalid length', () => {
    process.env.TRIAL_KEY_ENCRYPTION_KEY = 'c2hvcnQta2V5'; // 短密钥
    expect(() => getEncryptionKey()).toThrow('Invalid encryption key length');
  });

  test('should throw error when encryption key has invalid format', () => {
    process.env.TRIAL_KEY_ENCRYPTION_KEY = 'invalid-base64-!!!';
    expect(() => getEncryptionKey()).toThrow('Invalid TRIAL_KEY_ENCRYPTION_KEY format');
  });

  test('should return encryption info', () => {
    const info = getEncryptionInfo();
    expect(info).toHaveProperty('algorithm', 'aes-256-gcm');
    expect(info).toHaveProperty('keyLength', 32);
    expect(info).toHaveProperty('ivLength', 12);
    expect(info).toHaveProperty('tagLength', 16);
    expect(info).toHaveProperty('keyConfigured', true);
  });
});

describe('Trial Key Encryption', () => {
  const originalEnv = process.env.TRIAL_KEY_ENCRYPTION_KEY;
  const testApiKey = 'sk-or-v1-test-api-key-for-encryption-testing';

  beforeEach(() => {
    process.env.TRIAL_KEY_ENCRYPTION_KEY = mockEncryptionKey;
  });

  afterEach(() => {
    process.env.TRIAL_KEY_ENCRYPTION_KEY = originalEnv;
  });

  test('should encrypt trial key successfully', () => {
    const encrypted = encryptTrialKey(testApiKey);
    
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);
    expect(encrypted).not.toBe(testApiKey);
    
    // 验证是有效的Base64
    expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
  });

  test('should decrypt trial key successfully', () => {
    const encrypted = encryptTrialKey(testApiKey);
    const decrypted = decryptTrialKey(encrypted);
    
    expect(decrypted).toBe(testApiKey);
  });

  test('should produce different encrypted results for same input', () => {
    const encrypted1 = encryptTrialKey(testApiKey);
    const encrypted2 = encryptTrialKey(testApiKey);
    
    expect(encrypted1).not.toBe(encrypted2);
    
    // 但解密后应该相同
    expect(decryptTrialKey(encrypted1)).toBe(testApiKey);
    expect(decryptTrialKey(encrypted2)).toBe(testApiKey);
  });

  test('should handle empty string input', () => {
    expect(() => encryptTrialKey('')).toThrow('Invalid trial key: must be a non-empty string');
  });

  test('should handle null input', () => {
    expect(() => encryptTrialKey(null as any)).toThrow('Invalid trial key: must be a non-empty string');
  });

  test('should handle undefined input', () => {
    expect(() => encryptTrialKey(undefined as any)).toThrow('Invalid trial key: must be a non-empty string');
  });

  test('should handle invalid encrypted data', () => {
    expect(() => decryptTrialKey('invalid-encrypted-data')).toThrow('Trial key decryption failed');
  });

  test('should handle corrupted encrypted data', () => {
    const encrypted = encryptTrialKey(testApiKey);
    const corrupted = encrypted.slice(0, -5) + 'XXXXX'; // 破坏最后5个字符
    
    expect(() => decryptTrialKey(corrupted)).toThrow('Trial key decryption failed');
  });

  test('should validate encryption functionality', () => {
    expect(validateEncryption()).toBe(true);
  });

  test('should validate encryption with custom test key', () => {
    const customKey = 'sk-or-v1-custom-test-key';
    expect(validateEncryption(customKey)).toBe(true);
  });

  test('should return encryption stats', () => {
    const stats = getEncryptionStats(testApiKey);
    
    expect(stats).toHaveProperty('originalLength', testApiKey.length);
    expect(stats).toHaveProperty('encryptedLength');
    expect(stats).toHaveProperty('compressionRatio');
    expect(stats).toHaveProperty('estimatedUrlIncrease');
    
    expect(stats.encryptedLength).toBeGreaterThan(stats.originalLength);
    expect(stats.compressionRatio).toBeGreaterThan(1);
    expect(stats.estimatedUrlIncrease).toBeGreaterThan(0);
  });
});

describe('Performance Tests', () => {
  const originalEnv = process.env.TRIAL_KEY_ENCRYPTION_KEY;
  const testApiKey = 'sk-or-v1-performance-test-key';

  beforeEach(() => {
    process.env.TRIAL_KEY_ENCRYPTION_KEY = mockEncryptionKey;
  });

  afterEach(() => {
    process.env.TRIAL_KEY_ENCRYPTION_KEY = originalEnv;
  });

  test('encryption should complete within 10ms', () => {
    const start = Date.now();
    encryptTrialKey(testApiKey);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(10);
  });

  test('decryption should complete within 10ms', () => {
    const encrypted = encryptTrialKey(testApiKey);
    
    const start = Date.now();
    decryptTrialKey(encrypted);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(10);
  });

  test('URL length increase should be reasonable', () => {
    const stats = getEncryptionStats(testApiKey);
    
    // 根据实现文档，预期增加约57字符
    expect(stats.estimatedUrlIncrease).toBeLessThan(100);
    expect(stats.compressionRatio).toBeLessThan(3); // 不超过3倍
  });
});

describe('Security Tests', () => {
  const originalEnv = process.env.TRIAL_KEY_ENCRYPTION_KEY;
  const testApiKey = 'sk-or-v1-security-test-key';

  beforeEach(() => {
    process.env.TRIAL_KEY_ENCRYPTION_KEY = mockEncryptionKey;
  });

  afterEach(() => {
    process.env.TRIAL_KEY_ENCRYPTION_KEY = originalEnv;
  });

  test('encrypted data should not contain original key', () => {
    const encrypted = encryptTrialKey(testApiKey);
    
    expect(encrypted).not.toContain(testApiKey);
    expect(encrypted).not.toContain('sk-or-v1');
  });

  test('encrypted data should not be recognizable as API key format', () => {
    const encrypted = encryptTrialKey(testApiKey);
    
    expect(encrypted).not.toMatch(/^sk-or-v1-/);
    expect(encrypted).not.toMatch(/sk-[a-zA-Z0-9-]+/);
  });

  test('should use different IV for each encryption', () => {
    const encrypted1 = encryptTrialKey(testApiKey);
    const encrypted2 = encryptTrialKey(testApiKey);
    
    // 解析加密数据获取IV
    const data1 = JSON.parse(Buffer.from(encrypted1, 'base64').toString('utf8'));
    const data2 = JSON.parse(Buffer.from(encrypted2, 'base64').toString('utf8'));
    
    expect(data1.iv).not.toBe(data2.iv);
  });
});

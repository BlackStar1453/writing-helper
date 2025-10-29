# 试用API Key加密传输实现文档

## 📋 实现概述

基于需求文档，使用AES-256-GCM算法实现试用API Key的加密传输，确保简单、安全、高效。

## 🔧 技术实现方案

### 加密算法选择
- **算法**: AES-256-GCM
- **密钥长度**: 256位 (32字节)
- **IV长度**: 96位 (12字节) - GCM推荐长度
- **Tag长度**: 128位 (16字节) - 认证标签
- **编码**: Base64 URL-safe编码

### 数据格式设计
```typescript
// 加密数据结构
interface EncryptedData {
  iv: string;      // 12字节IV，Base64编码
  tag: string;     // 16字节认证标签，Base64编码  
  data: string;    // 加密数据，Base64编码
}

// 最终传输格式（JSON字符串再Base64编码）
encryptedTrialKey: string = Base64(JSON.stringify(EncryptedData))
```

### 伪代码实现

#### 服务器端加密
```typescript
function encryptTrialKey(plainKey: string): string {
  // 1. 生成随机IV (12字节)
  iv = generateRandomBytes(12)
  
  // 2. 从环境变量获取密钥
  key = getEncryptionKeyFromEnv() // 32字节
  
  // 3. AES-256-GCM加密
  cipher = createCipher('aes-256-gcm', key, iv)
  encrypted = cipher.update(plainKey, 'utf8') + cipher.final()
  tag = cipher.getAuthTag() // 16字节
  
  // 4. 组装数据结构
  encryptedData = {
    iv: base64Encode(iv),
    tag: base64Encode(tag),
    data: base64Encode(encrypted)
  }
  
  // 5. JSON序列化并Base64编码
  return base64Encode(JSON.stringify(encryptedData))
}
```

#### 客户端解密
```typescript
function decryptTrialKey(encryptedKey: string): string {
  // 1. Base64解码并JSON解析
  encryptedData = JSON.parse(base64Decode(encryptedKey))
  
  // 2. 提取组件
  iv = base64Decode(encryptedData.iv)
  tag = base64Decode(encryptedData.tag)
  data = base64Decode(encryptedData.data)
  
  // 3. 获取解密密钥（客户端内置）
  key = getBuiltInDecryptionKey() // 32字节
  
  // 4. AES-256-GCM解密
  decipher = createDecipher('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  decrypted = decipher.update(data) + decipher.final('utf8')
  
  return decrypted
}
```

## 📁 文件结构

### 新增文件
```
lib/crypto/
├── trial-key-encryption.ts     # 加密工具主文件
├── encryption-config.ts        # 加密配置
└── __tests__/
    ├── encryption.test.ts       # 加密功能测试
    └── integration.test.ts      # 集成测试
```

### 修改文件
```
lib/user-sync-notification.ts           # Deep Link生成
src/app/api/tauri-auth/initiate/route.ts # Tauri认证API
CLIENT_INTEGRATION_GUIDE.md             # 客户端集成指南
```

## 🔨 具体实现步骤

### 步骤1: 创建加密工具模块
```typescript
// lib/crypto/trial-key-encryption.ts
export interface EncryptedTrialKey {
  iv: string;
  tag: string;
  data: string;
}

export function encryptTrialKey(plainKey: string): string {
  // 实现加密逻辑
}

export function decryptTrialKey(encryptedKey: string): string {
  // 实现解密逻辑（用于测试）
}

export function validateEncryptionKey(): boolean {
  // 验证环境变量中的密钥
}
```

### 步骤2: 创建配置模块
```typescript
// lib/crypto/encryption-config.ts
export const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,      // 256位
  ivLength: 12,       // 96位
  tagLength: 16,      // 128位
} as const;

export function getEncryptionKey(): Buffer {
  // 从环境变量获取密钥
}
```

### 步骤3: 修改Deep Link生成
```typescript
// lib/user-sync-notification.ts
import { encryptTrialKey } from './crypto/trial-key-encryption';

// 替换原有逻辑
if (trialApiKey) {
  userData.encryptedTrialKey = encryptTrialKey(trialApiKey);
}
// 移除: userData.trialApiKey = trialApiKey;
```

### 步骤4: 修改Tauri认证API
```typescript
// src/app/api/tauri-auth/initiate/route.ts
import { encryptTrialKey } from '@/lib/crypto/trial-key-encryption';

// 替换原有逻辑
if (trialApiKey) {
  userData.encryptedTrialKey = encryptTrialKey(trialApiKey);
}
// 移除: userData.trialApiKey = trialApiKey;
```

### 步骤5: 创建测试文件
```typescript
// lib/crypto/__tests__/encryption.test.ts
describe('Trial Key Encryption', () => {
  test('encrypt and decrypt should return original value')
  test('different encryptions should produce different results')
  test('invalid encrypted data should throw error')
  test('encryption key validation')
})
```

## 🔐 环境配置

### 环境变量
```bash
# .env.local
TRIAL_KEY_ENCRYPTION_KEY=your-32-byte-base64-encoded-key-here

# 生成密钥示例（开发时使用）
TRIAL_KEY_ENCRYPTION_KEY="YourSecure32ByteKeyForTrialKeyEncryption=="
```

### 密钥生成脚本
```typescript
// scripts/generate-encryption-key.ts
function generateEncryptionKey(): string {
  const key = crypto.randomBytes(32);
  return key.toString('base64');
}
```

## 🧪 测试策略

### 单元测试
1. **加密功能测试**
   - 验证加密结果不等于原文
   - 验证相同输入产生不同加密结果（随机IV）
   - 验证解密结果等于原文

2. **错误处理测试**
   - 无效密钥测试
   - 损坏数据测试
   - 格式错误测试

### 集成测试
1. **Deep Link生成测试**
   - 验证生成的Deep Link包含加密Key
   - 验证Deep Link不包含明文Key

2. **端到端测试**
   - 模拟完整的加密传输流程
   - 验证客户端能正确解密

### 性能测试
```typescript
// 性能基准测试
describe('Performance Tests', () => {
  test('encryption should complete within 10ms')
  test('decryption should complete within 10ms')
  test('URL length should not exceed reasonable limits')
})
```

## 📚 客户端集成指南

### JavaScript/TypeScript示例
```typescript
// 客户端解密实现示例
import crypto from 'crypto';

const DECRYPTION_KEY = 'YourSecure32ByteKeyForTrialKeyEncryption==';

function decryptTrialKey(encryptedKey: string): string {
  try {
    // 1. Base64解码并解析JSON
    const encryptedData = JSON.parse(
      Buffer.from(encryptedKey, 'base64').toString('utf8')
    );
    
    // 2. 提取组件
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const data = Buffer.from(encryptedData.data, 'base64');
    const key = Buffer.from(DECRYPTION_KEY, 'base64');
    
    // 3. 解密
    const decipher = crypto.createDecipherGCM('aes-256-gcm', key);
    decipher.setIV(iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(data, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt trial key: ' + error.message);
  }
}
```

### Rust示例（Tauri）
```rust
// Rust解密实现示例
use aes_gcm::{Aes256Gcm, Key, Nonce, aead::{Aead, NewAead}};
use base64;
use serde_json;

const DECRYPTION_KEY: &str = "YourSecure32ByteKeyForTrialKeyEncryption==";

fn decrypt_trial_key(encrypted_key: &str) -> Result<String, Box<dyn std::error::Error>> {
    // 1. Base64解码并解析JSON
    let decoded = base64::decode(encrypted_key)?;
    let encrypted_data: serde_json::Value = serde_json::from_slice(&decoded)?;
    
    // 2. 提取组件
    let iv = base64::decode(encrypted_data["iv"].as_str().unwrap())?;
    let tag = base64::decode(encrypted_data["tag"].as_str().unwrap())?;
    let data = base64::decode(encrypted_data["data"].as_str().unwrap())?;
    
    // 3. 解密
    let key = base64::decode(DECRYPTION_KEY)?;
    let cipher = Aes256Gcm::new(Key::from_slice(&key));
    let nonce = Nonce::from_slice(&iv);
    
    let mut ciphertext = data;
    ciphertext.extend_from_slice(&tag);
    
    let plaintext = cipher.decrypt(nonce, ciphertext.as_ref())?;
    Ok(String::from_utf8(plaintext)?)
}
```

## 🔄 迁移计划

### 向后兼容性
1. **过渡期支持**：同时支持 `trialApiKey` 和 `encryptedTrialKey`
2. **客户端检测**：客户端优先使用 `encryptedTrialKey`，回退到 `trialApiKey`
3. **逐步迁移**：服务器端逐步移除明文支持

### 部署顺序
1. 部署服务器端加密功能（同时保留明文）
2. 更新客户端支持解密
3. 服务器端移除明文传输
4. 清理过渡代码

## ✅ 验收检查清单

### 功能验收
- [ ] 加密工具模块创建完成
- [ ] Deep Link生成使用加密Key
- [ ] Tauri认证API使用加密Key
- [ ] 所有测试通过
- [ ] 客户端集成文档更新

### 安全验收
- [ ] 明文API Key不出现在Deep Link中
- [ ] 加密Key格式无法直接识别
- [ ] 每次加密结果不同
- [ ] 解密失败时有适当错误处理

### 性能验收
- [ ] 加密时间 < 10ms
- [ ] 解密时间 < 10ms
- [ ] URL长度增加可接受
- [ ] 不影响现有API性能

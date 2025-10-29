# Tauri试用API Key解密指南

## 🔑 解密信息

### 加密算法
- **算法**: AES-256-GCM
- **密钥长度**: 32字节 (256位)
- **IV长度**: 12字节 (96位)
- **认证标签**: 16字节 (128位)
- **编码**: Base64

### 解密密钥
```
TRIAL_KEY_ENCRYPTION_KEY=YourSecure32ByteKeyForTrialKeyEncryption==
```
> 注意：替换为您的实际密钥（在 `.env.local` 中查看）

## 📦 数据格式

### Deep Link数据结构
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "encryptedTrialKey": "eyJpdiI6Ik4wOU9qQk1uZUM0QjBsZCIsInRhZyI6ImZyQkF1...",
  "trialApiKey": "sk-or-v1-xxx...", // 向后兼容，优先使用encryptedTrialKey
  "token": "jwt-token",
  "syncType": "subscription_update"
}
```

### 加密数据结构
```json
{
  "iv": "Base64编码的12字节IV",
  "tag": "Base64编码的16字节认证标签",
  "data": "Base64编码的加密数据"
}
```

## 🔄 解密流程

### 1. 解析Deep Link
```
Deep Link → 提取user_data参数 → JSON解析 → 获取encryptedTrialKey字段
```

### 2. 解密步骤
```
1. Base64解码encryptedTrialKey → JSON字符串
2. JSON解析 → {iv, tag, data}
3. Base64解码各组件 → 二进制数据
4. AES-256-GCM解密 → 明文API Key
```

### 3. 使用API Key
```
解密后的Key → 存储到安全位置 → 调用OpenRouter API
```

## 🛠️ 技术实现

### Rust依赖
```toml
[dependencies]
aes-gcm = "0.10"
base64 = "0.21"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

### 核心解密函数伪代码
```rust
fn decrypt_trial_key(encrypted_key: &str) -> Result<String, Error> {
    // 1. Base64解码
    let json_str = base64::decode(encrypted_key)?;
    
    // 2. JSON解析
    let encrypted_data: EncryptedData = serde_json::from_str(&json_str)?;
    
    // 3. 提取组件
    let iv = base64::decode(&encrypted_data.iv)?;
    let tag = base64::decode(&encrypted_data.tag)?;
    let data = base64::decode(&encrypted_data.data)?;
    
    // 4. 解密
    let key = base64::decode(DECRYPTION_KEY)?;
    let cipher = Aes256Gcm::new(&key);
    let nonce = Nonce::from_slice(&iv);
    
    // 5. 组合密文+标签并解密
    let mut ciphertext = data;
    ciphertext.extend_from_slice(&tag);
    let plaintext = cipher.decrypt(nonce, &ciphertext)?;
    
    Ok(String::from_utf8(plaintext)?)
}
```

## 🔒 安全要点

### 密钥管理
- 解密密钥与服务器端保持一致
- 不要在代码中硬编码密钥
- 考虑使用环境变量或配置文件

### 错误处理
- 解密失败时回退到明文Key（向后兼容）
- 记录错误但不暴露敏感信息
- 提供用户友好的错误提示

### 内存安全
- 使用后及时清理敏感数据
- 避免在日志中记录完整API Key
- 使用系统密钥链存储解密后的Key

## 📋 实现检查清单

- [ ] 添加必要的Rust依赖
- [ ] 实现解密函数
- [ ] 处理Deep Link数据解析
- [ ] 添加错误处理和向后兼容
- [ ] 实现安全存储
- [ ] 测试解密功能
- [ ] 集成到主应用流程

## 🧪 测试验证

### 测试用例
1. **正常解密**: 使用有效的加密Key测试解密
2. **错误处理**: 测试无效数据的处理
3. **向后兼容**: 测试明文Key的处理
4. **性能测试**: 确保解密速度 < 10ms

### 验证方法
```rust
// 测试解密功能
let test_encrypted = "eyJpdiI6Ik4wOU9qQk1uZUM0QjBsZCIsInRhZyI6ImZyQkF1...";
let decrypted = decrypt_trial_key(test_encrypted)?;
assert!(decrypted.starts_with("sk-or-v1-"));
```

## 🔗 相关文档

- **服务器端实现**: `lib/crypto/trial-key-encryption.ts`
- **客户端集成**: `CLIENT_INTEGRATION_GUIDE.md`
- **需求文档**: `TRIAL_API_KEY_ENCRYPTION_REQUIREMENTS.md`
- **实现文档**: `TRIAL_API_KEY_ENCRYPTION_IMPLEMENTATION.md`

## 📞 支持

如果在实现过程中遇到问题：
1. 检查解密密钥是否正确
2. 验证数据格式是否符合预期
3. 确认依赖版本兼容性
4. 查看错误日志获取详细信息

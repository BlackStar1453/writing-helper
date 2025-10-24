# 客户端试用API Key快速开始指南

## 🚀 5分钟快速集成

### 1. 升级Deep Link处理

在您现有的Deep Link处理代码中添加试用API Key支持：

```typescript
// 现有代码升级
const userData = JSON.parse(decodeURIComponent(userDataStr));

// 新增：保存试用API Key
if (userData.trialApiKey) {
  await secureStorage.setItem('trial_api_key', userData.trialApiKey);
  console.log('试用API Key已保存');
}
```

### 2. 安装依赖

```bash
npm install openai
# 或
yarn add openai
```

### 3. 创建AI客户端服务

```typescript
// services/ai-client.ts
import OpenAI from 'openai';

export class AIClient {
  private client: OpenAI | null = null;
  
  async initialize() {
    const apiKey = await secureStorage.getItem('trial_api_key');
    if (!apiKey) return false;
    
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://your-domain.com',
        'X-Title': 'Your App Name'
      }
    });
    
    return true;
  }
  
  async chat(message: string): Promise<string> {
    if (!this.client) throw new Error('AI客户端未初始化');
    
    const response = await this.client.chat.completions.create({
      model: 'openai/gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }],
      max_tokens: 150
    });
    
    // 记录使用次数
    await this.recordUsage();
    
    return response.choices[0]?.message?.content || '';
  }
  
  private async recordUsage() {
    const authToken = await secureStorage.getItem('auth_token');
    await fetch('/api/trial-key/usage', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
  }
}
```

### 4. 在应用中使用

```typescript
// 初始化
const aiClient = new AIClient();
await aiClient.initialize();

// 发送消息
try {
  const response = await aiClient.chat('你好，请介绍一下自己');
  console.log('AI回复:', response);
} catch (error) {
  console.error('AI请求失败:', error.message);
}
```

### 5. 添加使用状态监控

```typescript
// 检查使用状态
const checkUsageStatus = async () => {
  const authToken = await secureStorage.getItem('auth_token');
  const response = await fetch('/api/trial-key/status', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const status = await response.json();
  
  if (status.expired) {
    alert('试用已过期，请升级到付费版本');
    return;
  }
  
  console.log(`剩余使用次数: ${status.usage.remainingCount}`);
};
```

## ⚠️ 重要注意事项

1. **替换域名**：将 `https://your-domain.com` 替换为您的实际域名
2. **错误处理**：添加适当的错误处理和用户提示
3. **安全存储**：确保使用安全的存储方式保存API Key
4. **使用监控**：定期检查使用状态，提醒用户升级

## 🔧 测试验证

```typescript
// 测试代码
const testAIIntegration = async () => {
  console.log('🧪 测试AI集成...');
  
  // 1. 检查API Key
  const apiKey = await secureStorage.getItem('trial_api_key');
  console.log('API Key存在:', !!apiKey);
  
  // 2. 初始化客户端
  const aiClient = new AIClient();
  const initialized = await aiClient.initialize();
  console.log('客户端初始化:', initialized);
  
  // 3. 测试聊天
  if (initialized) {
    try {
      const response = await aiClient.chat('测试消息');
      console.log('✅ AI响应:', response);
    } catch (error) {
      console.error('❌ AI请求失败:', error);
    }
  }
};
```

## 📋 集成检查清单

- [ ] Deep Link处理已升级，可以接收 `trialApiKey`
- [ ] 已安装 `openai` 依赖
- [ ] AI客户端服务已创建并正确配置
- [ ] HTTP-Referer 和 X-Title 头部已设置
- [ ] 使用次数记录功能已实现
- [ ] 错误处理已添加
- [ ] 使用状态监控已实现
- [ ] 已进行基本测试验证

## 🚀 完成！

现在您的客户端已经支持试用API Key功能了！用户注册后将自动获得50次AI对话机会。

需要更详细的实现指南，请参考 `CLIENT_INTEGRATION_GUIDE.md`。

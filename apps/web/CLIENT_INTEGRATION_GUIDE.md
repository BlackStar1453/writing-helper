# 客户端试用API Key集成指南

## 概述

本指南将帮助您在客户端应用中集成OpenRouter试用API Key功能，实现用户注册后自动获得AI试用功能。

## 🔒 重要安全更新

**试用API Key现在以加密形式传输！**

为了提高安全性，试用API Key不再以明文形式在Deep Link中传输。客户端需要实现解密功能来获取实际的API Key。

### 主要变更：
- 🔑 **字段变更**：`trialApiKey` → `encryptedTrialKey`
- 🔒 **加密传输**：API Key以AES-256-GCM加密
- 🛠️ **需要解密**：客户端必须实现解密功能
- 📦 **向后兼容**：暂时支持旧格式，但建议尽快升级

## 系统架构

```
用户注册 → 服务器创建试用Key → 加密 → Deep Link传递 → 客户端解密 → 存储 → 直接调用OpenRouter API
```

## 🔑 试用API Key解密实现

### JavaScript/TypeScript解密函数

```typescript
import crypto from 'crypto';

// 解密配置（与服务器端保持一致）
const DECRYPTION_KEY = 'YourSecure32ByteKeyForTrialKeyEncryption=='; // 替换为实际密钥
const ALGORITHM = 'aes-256-gcm';

interface EncryptedTrialKey {
  iv: string;      // Base64编码的初始化向量
  tag: string;     // Base64编码的认证标签
  data: string;    // Base64编码的加密数据
}

/**
 * 解密试用API Key
 * @param encryptedKey 加密的试用API Key字符串
 * @returns 解密后的明文API Key
 */
export function decryptTrialKey(encryptedKey: string): string {
  try {
    // 1. Base64解码并解析JSON
    const jsonString = Buffer.from(encryptedKey, 'base64').toString('utf8');
    const encryptedData: EncryptedTrialKey = JSON.parse(jsonString);

    // 2. 提取组件
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const data = Buffer.from(encryptedData.data, 'base64');
    const key = Buffer.from(DECRYPTION_KEY, 'base64');

    // 3. 创建解密器
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // 4. 解密数据
    let decrypted = decipher.update(data, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt trial key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### Rust解密实现（适用于Tauri）

```rust
use aes_gcm::{Aes256Gcm, Key, Nonce, aead::{Aead, NewAead}};
use base64;
use serde_json;
use serde::{Deserialize, Serialize};

const DECRYPTION_KEY: &str = "YourSecure32ByteKeyForTrialKeyEncryption=="; // 替换为实际密钥

#[derive(Deserialize, Serialize)]
struct EncryptedTrialKey {
    iv: String,
    tag: String,
    data: String,
}

/// 解密试用API Key
pub fn decrypt_trial_key(encrypted_key: &str) -> Result<String, Box<dyn std::error::Error>> {
    // 1. Base64解码并解析JSON
    let decoded = base64::decode(encrypted_key)?;
    let encrypted_data: EncryptedTrialKey = serde_json::from_slice(&decoded)?;

    // 2. 提取组件
    let iv = base64::decode(&encrypted_data.iv)?;
    let tag = base64::decode(&encrypted_data.tag)?;
    let data = base64::decode(&encrypted_data.data)?;

    // 3. 准备解密
    let key_bytes = base64::decode(DECRYPTION_KEY)?;
    let cipher = Aes256Gcm::new(Key::from_slice(&key_bytes));
    let nonce = Nonce::from_slice(&iv);

    // 4. 组合密文和标签
    let mut ciphertext = data;
    ciphertext.extend_from_slice(&tag);

    // 5. 解密
    let plaintext = cipher.decrypt(nonce, ciphertext.as_ref())?;
    Ok(String::from_utf8(plaintext)?)
}
```

## 1. Deep Link处理升级

### 当前状态分析

您当前的Deep Link只处理用户信息，需要升级以支持试用API Key。

### 升级后的Deep Link格式

**新格式（加密）**：
```
elick://sync?user_data={"id":"user-id","email":"user@example.com","encryptedTrialKey":"eyJpdiI6Ik4wOU9...","token":"jwt-token"}&state=xxx
```

**旧格式（明文，即将废弃）**：
```
elick://sync?user_data={"id":"user-id","email":"user@example.com","trialApiKey":"sk-or-v1-xxx...","token":"jwt-token"}&state=xxx
```

### 客户端Deep Link处理代码

```typescript
// types/auth.ts
export interface UserSyncData {
  id: string;
  email: string;
  plan: string;
  subscriptionStatus: string;
  token: string;
  expiresDate: string;
  encryptedTrialKey?: string; // 新增：加密的试用API Key
  trialApiKey?: string; // 废弃：明文试用API Key（向后兼容）
  syncType: string;
}

// services/deep-link-handler.ts
export class DeepLinkHandler {
  async handleAuthCallback(url: string) {
    try {
      console.log('[DeepLink] 处理认证回调:', url);
      
      const params = new URLSearchParams(url.split('?')[1]);
      const userDataStr = params.get('user_data');
      const state = params.get('state');
      
      if (!userDataStr) {
        throw new Error('Missing user data in deep link');
      }
      
      const userData: UserSyncData = JSON.parse(decodeURIComponent(userDataStr));
      console.log('[DeepLink] 解析用户数据:', {
        id: userData.id,
        email: userData.email,
        hasTrialKey: !!userData.trialApiKey,
        trialKeyPrefix: userData.trialApiKey?.substring(0, 20)
      });
      
      // 保存用户认证信息
      await this.secureStorage.setItem('auth_token', userData.token);
      await this.secureStorage.setItem('user_id', userData.id);
      await this.secureStorage.setItem('user_email', userData.email);
      
      // 处理试用API Key（支持新旧格式）
      let trialApiKey: string | null = null;

      if (userData.encryptedTrialKey) {
        // 新格式：解密加密的试用Key
        try {
          trialApiKey = decryptTrialKey(userData.encryptedTrialKey);
          console.log('[DeepLink] 加密试用API Key解密成功');
        } catch (error) {
          console.error('[DeepLink] 试用API Key解密失败:', error);
        }
      } else if (userData.trialApiKey) {
        // 旧格式：直接使用明文Key（向后兼容）
        trialApiKey = userData.trialApiKey;
        console.log('[DeepLink] 使用明文试用API Key（建议升级到加密格式）');
      }

      if (trialApiKey) {
        await this.secureStorage.setItem('trial_api_key', trialApiKey);
        console.log('[DeepLink] 试用API Key已保存');

        // 初始化AI客户端
        await this.initializeAIClient(trialApiKey);
      } else {
        console.log('[DeepLink] 未找到有效的试用API Key');
      }
      
      // 跳转到主界面
      this.router.navigate('/dashboard');
      
    } catch (error) {
      console.error('[DeepLink] 处理认证回调失败:', error);
      this.showError('登录失败，请重试');
    }
  }
  
  private async initializeAIClient(trialApiKey: string) {
    try {
      // 初始化AI服务
      await this.aiService.initialize(trialApiKey);
      console.log('[DeepLink] AI客户端初始化成功');
    } catch (error) {
      console.error('[DeepLink] AI客户端初始化失败:', error);
    }
  }
}
```

## 2. AI客户端服务实现

### 创建AI客户端服务

```typescript
// services/ai-client.service.ts
import OpenAI from 'openai';

export interface TrialKeyStatus {
  expired: boolean;
  usage?: {
    count: number;
    maxCount: number;
    remainingCount: number;
    credits: number;
    creditLimit: number;
    remainingCredits: number;
  };
  expiresAt?: string;
}

export class AIClientService {
  private openRouterClient: OpenAI | null = null;
  private trialApiKey: string | null = null;
  private usageStatus: TrialKeyStatus | null = null;
  
  constructor(
    private secureStorage: SecureStorageService,
    private httpClient: HttpClient
  ) {}
  
  /**
   * 初始化AI客户端
   */
  async initialize(apiKey?: string): Promise<boolean> {
    try {
      // 获取API Key
      const key = apiKey || await this.secureStorage.getItem('trial_api_key');
      if (!key) {
        console.log('[AI Client] 未找到试用API Key');
        return false;
      }
      
      this.trialApiKey = key;
      
      // 初始化OpenRouter客户端
      this.openRouterClient = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: key,
        defaultHeaders: {
          'HTTP-Referer': 'https://elick.it.com', // 替换为您的域名
          'X-Title': 'Elick - AI Assistant'
        }
      });
      
      // 检查Key状态
      const isValid = await this.checkKeyStatus();
      if (!isValid) {
        console.log('[AI Client] 试用Key已过期或无效');
        return false;
      }
      
      console.log('[AI Client] 初始化成功');
      return true;
    } catch (error) {
      console.error('[AI Client] 初始化失败:', error);
      return false;
    }
  }
  
  /**
   * 发送AI聊天请求
   */
  async chat(messages: Array<{role: string, content: string}>): Promise<string> {
    if (!this.openRouterClient || !this.trialApiKey) {
      throw new Error('AI客户端未初始化');
    }
    
    // 检查使用限制
    if (this.usageStatus?.expired) {
      throw new Error('试用已过期，请升级到付费版本');
    }
    
    if (this.usageStatus?.usage && this.usageStatus.usage.remainingCount <= 0) {
      throw new Error('试用次数已用完，请升级到付费版本');
    }
    
    try {
      console.log('[AI Client] 发送聊天请求');
      
      const response = await this.openRouterClient.chat.completions.create({
        model: 'openai/gpt-3.5-turbo', // 使用便宜的模型
        messages: messages,
        max_tokens: 150, // 限制token数量以控制费用
        temperature: 0.7
      });
      
      const content = response.choices[0]?.message?.content || '';
      
      // 记录使用次数
      await this.recordUsage();
      
      // 更新使用状态
      await this.checkKeyStatus();
      
      console.log('[AI Client] 聊天请求成功');
      return content;
      
    } catch (error) {
      console.error('[AI Client] 聊天请求失败:', error);
      
      if (error.message?.includes('insufficient credits')) {
        await this.handleKeyExpired();
        throw new Error('试用费用已用完，请升级到付费版本');
      }
      
      throw new Error('AI请求失败，请稍后重试');
    }
  }
  
  /**
   * 检查Key状态
   */
  async checkKeyStatus(): Promise<boolean> {
    try {
      const authToken = await this.secureStorage.getItem('auth_token');
      if (!authToken) {
        return false;
      }
      
      const response = await this.httpClient.get('/api/trial-key/status', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      this.usageStatus = response.data;
      
      if (this.usageStatus?.expired) {
        await this.handleKeyExpired();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[AI Client] 检查Key状态失败:', error);
      return false;
    }
  }
  
  /**
   * 记录使用次数
   */
  private async recordUsage(): Promise<void> {
    try {
      const authToken = await this.secureStorage.getItem('auth_token');
      if (!authToken) return;
      
      await this.httpClient.post('/api/trial-key/usage', {}, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('[AI Client] 使用次数已记录');
    } catch (error) {
      console.error('[AI Client] 记录使用次数失败:', error);
    }
  }
  
  /**
   * 处理Key过期
   */
  private async handleKeyExpired(): Promise<void> {
    // 清除本地存储的Key
    await this.secureStorage.removeItem('trial_api_key');
    this.openRouterClient = null;
    this.trialApiKey = null;
    
    // 显示升级提示
    this.showUpgradePrompt();
  }
  
  /**
   * 显示升级提示
   */
  private showUpgradePrompt(): void {
    // 根据您的UI框架实现
    this.notificationService.show({
      title: '试用已结束',
      message: '您的AI试用已到期。升级到付费版本以继续使用AI功能。',
      type: 'info',
      actions: [
        {
          text: '立即升级',
          action: () => this.router.navigate('/pricing')
        },
        {
          text: '稍后提醒',
          action: () => {}
        }
      ]
    });
  }
  
  /**
   * 获取使用状态
   */
  getUsageStatus(): TrialKeyStatus | null {
    return this.usageStatus;
  }
  
  /**
   * 是否可用
   */
  isAvailable(): boolean {
    return !!this.openRouterClient && !!this.trialApiKey && !this.usageStatus?.expired;
  }
}
```

## 3. 使用监控组件

### React示例

```tsx
// components/TrialUsageMonitor.tsx
import React, { useState, useEffect } from 'react';
import { AIClientService } from '../services/ai-client.service';

interface Props {
  aiService: AIClientService;
}

export const TrialUsageMonitor: React.FC<Props> = ({ aiService }) => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUsage();
    
    // 每分钟检查一次使用情况
    const interval = setInterval(checkUsage, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkUsage = async () => {
    try {
      await aiService.checkKeyStatus();
      const status = aiService.getUsageStatus();
      setUsage(status?.usage || null);
      setLoading(false);
    } catch (error) {
      console.error('检查使用情况失败:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>加载中...</div>;
  if (!usage) return null;

  const progressPercentage = (usage.count / usage.maxCount) * 100;
  const isLowRemaining = usage.remainingCount <= 5;

  return (
    <div className="trial-usage-monitor">
      <div className="usage-header">
        <h3>AI试用状态</h3>
        <span className="usage-count">
          {usage.count}/{usage.maxCount} 次
        </span>
      </div>
      
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className={`progress-fill ${isLowRemaining ? 'warning' : ''}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="remaining-text">
          剩余 {usage.remainingCount} 次
        </span>
      </div>
      
      <div className="credits-info">
        <span>费用: ${usage.credits.toFixed(6)}/${usage.creditLimit}</span>
      </div>
      
      {isLowRemaining && (
        <div className="warning-message">
          ⚠️ 试用次数即将用完！
          <button onClick={() => window.location.href = '/pricing'}>
            立即升级
          </button>
        </div>
      )}
    </div>
  );
};
```

### Vue示例

```vue
<!-- components/TrialUsageMonitor.vue -->
<template>
  <div v-if="usage" class="trial-usage-monitor">
    <div class="usage-header">
      <h3>AI试用状态</h3>
      <span class="usage-count">{{ usage.count }}/{{ usage.maxCount }} 次</span>
    </div>
    
    <div class="progress-container">
      <div class="progress-bar">
        <div 
          class="progress-fill"
          :class="{ warning: isLowRemaining }"
          :style="{ width: progressPercentage + '%' }"
        />
      </div>
      <span class="remaining-text">剩余 {{ usage.remainingCount }} 次</span>
    </div>
    
    <div class="credits-info">
      <span>费用: ${{ usage.credits.toFixed(6) }}/${{ usage.creditLimit }}</span>
    </div>
    
    <div v-if="isLowRemaining" class="warning-message">
      ⚠️ 试用次数即将用完！
      <button @click="$router.push('/pricing')">立即升级</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TrialUsageMonitor',
  props: {
    aiService: Object
  },
  data() {
    return {
      usage: null,
      loading: true
    };
  },
  computed: {
    progressPercentage() {
      return this.usage ? (this.usage.count / this.usage.maxCount) * 100 : 0;
    },
    isLowRemaining() {
      return this.usage && this.usage.remainingCount <= 5;
    }
  },
  async mounted() {
    await this.checkUsage();
    
    // 每分钟检查一次
    this.interval = setInterval(this.checkUsage, 60000);
  },
  beforeUnmount() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  },
  methods: {
    async checkUsage() {
      try {
        await this.aiService.checkKeyStatus();
        const status = this.aiService.getUsageStatus();
        this.usage = status?.usage || null;
        this.loading = false;
      } catch (error) {
        console.error('检查使用情况失败:', error);
        this.loading = false;
      }
    }
  }
};
</script>
```

## 4. 聊天界面集成

### 聊天组件示例

```tsx
// components/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { AIClientService } from '../services/ai-client.service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Props {
  aiService: AIClientService;
}

export const ChatInterface: React.FC<Props> = ({ aiService }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAIAvailable, setIsAIAvailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAIAvailability();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAIAvailability = async () => {
    const available = aiService.isAvailable();
    setIsAIAvailable(available);

    if (!available) {
      // 尝试初始化
      const initialized = await aiService.initialize();
      setIsAIAvailable(initialized);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || !isAIAvailable) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // 准备消息历史
      const chatMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 发送AI请求
      const response = await aiService.chat(chatMessages);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('发送消息失败:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `抱歉，发生了错误：${error.message}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);

      // 重新检查AI可用性
      await checkAIAvailability();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isAIAvailable) {
    return (
      <div className="chat-unavailable">
        <div className="unavailable-message">
          <h3>AI功能不可用</h3>
          <p>您的试用可能已过期，或者需要重新登录。</p>
          <button onClick={() => window.location.href = '/pricing'}>
            查看付费计划
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-content">
              {message.content}
            </div>
            <div className="message-time">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入您的问题..."
          disabled={isLoading}
          rows={3}
        />
        <button
          onClick={sendMessage}
          disabled={!inputText.trim() || isLoading}
          className="send-button"
        >
          {isLoading ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
};
```

## 5. 应用初始化

### 主应用初始化代码

```typescript
// App.tsx 或 main.ts
import { AIClientService } from './services/ai-client.service';
import { DeepLinkHandler } from './services/deep-link-handler';

class App {
  private aiService: AIClientService;
  private deepLinkHandler: DeepLinkHandler;

  constructor() {
    this.aiService = new AIClientService(secureStorage, httpClient);
    this.deepLinkHandler = new DeepLinkHandler(this.aiService);
  }

  async initialize() {
    // 注册Deep Link处理器
    this.registerDeepLinkHandler();

    // 尝试从本地存储初始化AI客户端
    await this.initializeAIFromStorage();
  }

  private registerDeepLinkHandler() {
    // 根据您的平台注册Deep Link处理
    if (window.electronAPI) {
      // Electron
      window.electronAPI.onDeepLink((url: string) => {
        this.deepLinkHandler.handleAuthCallback(url);
      });
    } else if (window.tauriAPI) {
      // Tauri
      window.tauriAPI.listen('deep-link', (event: any) => {
        this.deepLinkHandler.handleAuthCallback(event.payload);
      });
    }
  }

  private async initializeAIFromStorage() {
    try {
      const initialized = await this.aiService.initialize();
      if (initialized) {
        console.log('[App] AI客户端从本地存储初始化成功');
      } else {
        console.log('[App] 未找到有效的试用API Key');
      }
    } catch (error) {
      console.error('[App] AI客户端初始化失败:', error);
    }
  }

  getAIService(): AIClientService {
    return this.aiService;
  }
}

export default App;
```

## 6. 错误处理和用户体验

### 错误处理最佳实践

```typescript
// utils/error-handler.ts
export class AIErrorHandler {
  static handleAIError(error: any): string {
    console.error('[AI Error]', error);

    if (error.message?.includes('insufficient credits')) {
      return '试用费用已用完，请升级到付费版本继续使用AI功能。';
    }

    if (error.message?.includes('rate limit')) {
      return '请求过于频繁，请稍后再试。';
    }

    if (error.message?.includes('trial expired') || error.message?.includes('已过期')) {
      return '试用已过期，请升级到付费版本继续使用。';
    }

    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return '网络连接失败，请检查网络后重试。';
    }

    if (error.message?.includes('unauthorized') || error.message?.includes('401')) {
      return '认证失败，请重新登录。';
    }

    return '发生未知错误，请稍后重试。';
  }

  static showUserFriendlyError(error: any, notificationService: any) {
    const message = this.handleAIError(error);

    notificationService.show({
      title: 'AI服务错误',
      message: message,
      type: 'error',
      duration: 5000
    });
  }
}
```

### 用户引导组件

```tsx
// components/TrialOnboarding.tsx
import React, { useState } from 'react';

export const TrialOnboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '欢迎使用AI试用',
      content: '您已获得50次免费AI对话机会，价值$0.0001的试用额度。',
      icon: '🎉'
    },
    {
      title: '如何使用',
      content: '在聊天界面输入问题，AI将为您提供智能回答。',
      icon: '💬'
    },
    {
      title: '试用限制',
      content: '试用期为7天，用完50次对话或费用后需要升级。',
      icon: '⏰'
    },
    {
      title: '开始体验',
      content: '现在就开始与AI对话，体验智能助手的强大功能！',
      icon: '🚀'
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const finishOnboarding = () => {
    localStorage.setItem('trial_onboarding_completed', 'true');
    // 跳转到聊天界面
    window.location.href = '/chat';
  };

  const step = steps[currentStep];

  return (
    <div className="trial-onboarding">
      <div className="onboarding-content">
        <div className="step-icon">{step.icon}</div>
        <h2>{step.title}</h2>
        <p>{step.content}</p>

        <div className="step-indicator">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`step-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
            />
          ))}
        </div>

        <div className="onboarding-actions">
          {currentStep > 0 && (
            <button onClick={prevStep} className="btn-secondary">
              上一步
            </button>
          )}

          {currentStep < steps.length - 1 ? (
            <button onClick={nextStep} className="btn-primary">
              下一步
            </button>
          ) : (
            <button onClick={finishOnboarding} className="btn-primary">
              开始使用
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

## 7. 样式和UI

### CSS样式示例

```css
/* styles/trial-components.css */

/* 试用使用监控器 */
.trial-usage-monitor {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.usage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.usage-header h3 {
  margin: 0;
  font-size: 16px;
  color: #495057;
}

.usage-count {
  font-weight: bold;
  color: #007bff;
}

.progress-container {
  margin-bottom: 8px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #28a745;
  transition: width 0.3s ease;
}

.progress-fill.warning {
  background-color: #ffc107;
}

.remaining-text {
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
  display: block;
}

.credits-info {
  font-size: 12px;
  color: #6c757d;
}

.warning-message {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
  font-size: 14px;
  color: #856404;
}

.warning-message button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  margin-left: 8px;
  cursor: pointer;
}

/* 聊天界面 */
.chat-interface {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 600px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background-color: #ffffff;
}

.message {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
}

.message.user {
  align-items: flex-end;
}

.message.assistant {
  align-items: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
}

.message.user .message-content {
  background-color: #007bff;
  color: white;
}

.message.assistant .message-content {
  background-color: #f1f3f4;
  color: #333;
}

.message-time {
  font-size: 11px;
  color: #6c757d;
  margin-top: 4px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  padding: 12px 16px;
}

.typing-indicator span {
  height: 8px;
  width: 8px;
  background-color: #6c757d;
  border-radius: 50%;
  display: inline-block;
  margin-right: 4px;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

.input-container {
  display: flex;
  padding: 16px;
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.input-container textarea {
  flex: 1;
  border: 1px solid #ced4da;
  border-radius: 20px;
  padding: 12px 16px;
  resize: none;
  outline: none;
  font-family: inherit;
}

.input-container textarea:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.send-button {
  margin-left: 8px;
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
}

.send-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.send-button:hover:not(:disabled) {
  background-color: #0056b3;
}

/* 不可用状态 */
.chat-unavailable {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  text-align: center;
}

.unavailable-message h3 {
  color: #6c757d;
  margin-bottom: 8px;
}

.unavailable-message p {
  color: #6c757d;
  margin-bottom: 16px;
}

.unavailable-message button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

/* 引导界面 */
.trial-onboarding {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.onboarding-content {
  background: white;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.step-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.onboarding-content h2 {
  color: #333;
  margin-bottom: 16px;
}

.onboarding-content p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
}

.step-indicator {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ddd;
  margin: 0 4px;
  transition: background-color 0.3s;
}

.step-dot.active {
  background-color: #007bff;
}

.step-dot.completed {
  background-color: #28a745;
}

.onboarding-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.btn-primary, .btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  flex: 1;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary:hover {
  background-color: #545b62;
}
```

## 8. 测试和调试

### 测试用例

```typescript
// tests/ai-client.test.ts
import { AIClientService } from '../services/ai-client.service';

describe('AIClientService', () => {
  let aiService: AIClientService;
  let mockSecureStorage: any;
  let mockHttpClient: any;

  beforeEach(() => {
    mockSecureStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };

    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn()
    };

    aiService = new AIClientService(mockSecureStorage, mockHttpClient);
  });

  test('should initialize with valid API key', async () => {
    mockSecureStorage.getItem.mockResolvedValue('sk-or-v1-test-key');
    mockHttpClient.get.mockResolvedValue({
      data: { expired: false, usage: { count: 0, maxCount: 50 } }
    });

    const result = await aiService.initialize();
    expect(result).toBe(true);
    expect(aiService.isAvailable()).toBe(true);
  });

  test('should handle expired key', async () => {
    mockSecureStorage.getItem.mockResolvedValue('sk-or-v1-test-key');
    mockHttpClient.get.mockResolvedValue({
      data: { expired: true }
    });

    const result = await aiService.initialize();
    expect(result).toBe(false);
    expect(aiService.isAvailable()).toBe(false);
  });

  test('should send chat message successfully', async () => {
    // Setup
    mockSecureStorage.getItem.mockResolvedValue('sk-or-v1-test-key');
    mockHttpClient.get.mockResolvedValue({
      data: { expired: false, usage: { count: 0, maxCount: 50, remainingCount: 50 } }
    });
    mockHttpClient.post.mockResolvedValue({ data: { success: true } });

    await aiService.initialize();

    // Mock OpenAI response
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Test response' } }]
          })
        }
      }
    };

    // Replace the OpenAI client
    (aiService as any).openRouterClient = mockOpenAI;

    const response = await aiService.chat([
      { role: 'user', content: 'Hello' }
    ]);

    expect(response).toBe('Test response');
    expect(mockHttpClient.post).toHaveBeenCalledWith('/api/trial-key/usage', {}, expect.any(Object));
  });
});
```

### 调试工具

```typescript
// utils/debug.ts
export class AIDebugger {
  private static logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }> = [];

  static log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      data
    };

    this.logs.push(logEntry);
    console[level](`[AI Debug] ${message}`, data || '');

    // 保持最近100条日志
    if (this.logs.length > 100) {
      this.logs.shift();
    }
  }

  static getLogs() {
    return this.logs;
  }

  static exportLogs() {
    const logsText = this.logs
      .map(log => `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`)
      .join('\n');

    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-debug-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static clearLogs() {
    this.logs = [];
  }
}

// 在AI服务中使用
// AIDebugger.log('info', 'AI client initialized', { hasKey: !!apiKey });
```

## 9. 部署和配置

### 环境配置

```typescript
// config/environment.ts
export const config = {
  development: {
    apiBaseUrl: 'http://localhost:3000',
    openRouterBaseUrl: 'https://openrouter.ai/api/v1',
    appReferer: 'http://localhost:3000',
    appTitle: 'Elick - Development'
  },
  production: {
    apiBaseUrl: 'https://your-domain.com',
    openRouterBaseUrl: 'https://openrouter.ai/api/v1',
    appReferer: 'https://your-domain.com',
    appTitle: 'Elick - AI Assistant'
  }
};

export const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return config[env as keyof typeof config];
};
```

### 构建配置

```json
// package.json
{
  "scripts": {
    "build": "npm run build:client && npm run build:electron",
    "build:client": "vite build",
    "build:electron": "electron-builder",
    "test": "jest",
    "test:ai": "jest --testPathPattern=ai-client"
  },
  "dependencies": {
    "openai": "^4.0.0",
    "axios": "^1.0.0"
  },
  "devDependencies": {
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0"
  }
}
```

## 10. 故障排除

### 常见问题和解决方案

#### 问题1：Deep Link中没有试用API Key

**症状**：用户登录后，Deep Link中的 `trialApiKey` 字段为空或未定义。

**解决方案**：
1. 检查服务器端是否正确创建了试用Key
2. 验证 `generateUserSyncDeepLink` 函数是否包含试用Key
3. 检查数据库中是否存在活跃的试用Key

```typescript
// 调试代码
console.log('Deep Link数据:', {
  hasTrialKey: !!userData.trialApiKey,
  trialKeyPrefix: userData.trialApiKey?.substring(0, 20),
  userId: userData.id
});
```

#### 问题2：OpenRouter API调用失败

**症状**：AI请求返回401或403错误。

**解决方案**：
1. 验证API Key格式是否正确
2. 检查HTTP-Referer和X-Title头部
3. 确认API Key未过期

```typescript
// 调试OpenRouter连接
const testConnection = async (apiKey: string) => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://your-domain.com',
        'X-Title': 'Your App Name'
      }
    });

    const data = await response.json();
    console.log('OpenRouter连接测试:', data);
  } catch (error) {
    console.error('OpenRouter连接失败:', error);
  }
};
```

#### 问题3：使用次数不同步

**症状**：客户端显示的使用次数与服务器不一致。

**解决方案**：
1. 确保每次AI调用后都记录使用次数
2. 定期同步使用状态
3. 处理网络失败的情况

```typescript
// 强制同步使用状态
const forceSyncUsage = async () => {
  try {
    await aiService.checkKeyStatus();
    const status = aiService.getUsageStatus();
    console.log('同步后的使用状态:', status);
  } catch (error) {
    console.error('同步失败:', error);
  }
};
```

#### 问题4：试用Key过期处理

**症状**：Key过期后用户界面没有正确更新。

**解决方案**：
1. 实现全局错误处理
2. 监听API错误并更新UI状态
3. 提供明确的升级路径

```typescript
// 全局错误处理
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('trial expired')) {
    // 处理试用过期
    showTrialExpiredDialog();
    event.preventDefault();
  }
});
```

### 调试检查清单

- [ ] Deep Link是否包含 `trialApiKey` 字段
- [ ] API Key格式是否正确（sk-or-v1-开头）
- [ ] OpenRouter请求头是否正确设置
- [ ] 使用次数记录是否正常工作
- [ ] 错误处理是否覆盖所有场景
- [ ] UI状态是否正确反映API状态
- [ ] 本地存储是否正确保存和读取Key
- [ ] 网络请求是否包含正确的认证头

### 性能优化建议

1. **缓存策略**：
   - 缓存使用状态，避免频繁请求
   - 使用防抖处理用户输入

2. **错误重试**：
   - 实现指数退避重试机制
   - 区分可重试和不可重试的错误

3. **用户体验**：
   - 显示加载状态和进度
   - 提供离线模式提示
   - 优化响应时间

## 11. 总结

### 集成步骤总结

1. **升级Deep Link处理**：添加 `trialApiKey` 字段处理
2. **实现AI客户端服务**：封装OpenRouter API调用
3. **添加使用监控**：实时显示试用状态
4. **集成聊天界面**：提供用户交互界面
5. **处理错误和过期**：优雅的错误处理和升级引导
6. **测试和调试**：确保功能正常工作

### 关键注意事项

- 🔐 **安全存储**：使用安全存储保存API Key
- 📊 **使用监控**：实时跟踪使用情况和费用
- 🚨 **错误处理**：优雅处理各种错误情况
- 🎯 **用户体验**：提供清晰的状态反馈和升级路径
- 🧪 **测试覆盖**：确保所有功能都经过测试

### 下一步

完成客户端集成后，建议：
1. 进行端到端测试
2. 收集用户反馈
3. 监控使用数据
4. 优化转化率

现在您可以开始实施这个集成方案了！🚀

## 11. 🔄 加密迁移指南

### 迁移步骤

1. **添加解密功能**：
   - 实现上述的 `decryptTrialKey` 函数
   - 确保解密密钥与服务器端一致

2. **更新Deep Link处理**：
   - 优先处理 `encryptedTrialKey` 字段
   - 保留对 `trialApiKey` 的向后兼容支持

3. **测试验证**：
   - 测试新格式的Deep Link解密
   - 验证旧格式仍然工作
   - 确认API Key功能正常

4. **逐步迁移**：
   - 部署支持两种格式的客户端
   - 服务器端切换到加密格式
   - 移除对明文格式的支持

### 迁移检查清单

- [ ] 实现解密函数
- [ ] 更新Deep Link处理逻辑
- [ ] 添加错误处理
- [ ] 测试加密格式
- [ ] 测试向后兼容性
- [ ] 更新错误日志
- [ ] 部署到生产环境

### 常见迁移问题

#### 问题：解密失败
**解决方案**：
- 检查解密密钥是否正确
- 验证加密数据格式
- 确认算法参数一致

#### 问题：性能影响
**解决方案**：
- 解密操作很快（< 1ms）
- 可以缓存解密结果
- 异步处理解密操作

## 12. 🔒 安全升级总结

通过本次升级，试用API Key系统现在具备：

### 安全优势
- **加密传输**：API Key不再以明文形式传输
- **认证完整性**：AES-256-GCM提供数据完整性验证
- **随机化**：每次加密结果不同，防止重放攻击
- **向后兼容**：平滑迁移，不影响现有用户

### 用户体验
用户现在可以：
1. 注册后自动获得试用API Key
2. 通过加密的Deep Link安全同步到客户端
3. 直接使用OpenRouter API进行AI对话
4. 监控使用情况和剩余额度
5. 在试用结束后升级到付费计划

这个安全升级为用户提供了更安全、流畅的试用体验，有助于提高转化率和用户满意度。🚀

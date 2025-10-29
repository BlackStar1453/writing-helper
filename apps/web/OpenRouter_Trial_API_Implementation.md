# OpenRouter 试用API Key实现方案

## 概述

本文档描述如何使用OpenRouter实现试用API Key功能，包括服务器端的Key管理和客户端的使用流程。

## 系统架构

```
用户注册 → 服务器创建试用Key → 数据库存储 → 客户端登录 → Deep Link传递Key → 客户端直接使用
```

## 功能需求

1. **试用Key配置**：
   - 费用限制：$0.0001
   - 有效期：7天
   - 使用次数：50次（通过应用层控制）

2. **生命周期管理**：
   - 注册时自动创建
   - 登录时通过Deep Link传递
   - 客户端直接使用，无需额外认证
   - 到期时自动失效

## 服务器端实现

### 1. 环境配置

```bash
# .env 文件
OPENROUTER_PROVISIONING_KEY=your-provisioning-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### 2. 数据库模型

```sql
-- 用户试用Key表
CREATE TABLE user_trial_keys (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    openrouter_key_hash VARCHAR(255) NOT NULL,
    openrouter_api_key TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    max_usage_count INTEGER DEFAULT 50,
    credit_limit DECIMAL(10,6) DEFAULT 0.0001,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id),
    INDEX idx_user_trial_keys_user_id (user_id),
    INDEX idx_user_trial_keys_expires_at (expires_at)
);
```

### 3. OpenRouter服务类

```typescript
// src/services/openrouter.service.ts
import axios from 'axios';

export class OpenRouterService {
  private readonly baseUrl = process.env.OPENROUTER_BASE_URL;
  private readonly provisioningKey = process.env.OPENROUTER_PROVISIONING_KEY;

  async createTrialApiKey(userId: string): Promise<{key: string, hash: string}> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/keys`,
        {
          name: `Trial Key for User ${userId}`,
          label: `trial-user-${userId}`,
          limit: 0.0001 // $0.0001 限制
        },
        {
          headers: {
            'Authorization': `Bearer ${this.provisioningKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        key: response.data.key,
        hash: response.data.data.hash
      };
    } catch (error) {
      console.error('Failed to create trial API key:', error);
      throw new Error('Failed to create trial API key');
    }
  }

  async getKeyUsage(apiKey: string): Promise<{usage: number, limit: number, remaining: number}> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/auth/key`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      const data = response.data.data;
      return {
        usage: data.usage,
        limit: data.limit,
        remaining: data.limit_remaining
      };
    } catch (error) {
      console.error('Failed to get key usage:', error);
      throw new Error('Failed to get key usage');
    }
  }

  async deleteApiKey(keyHash: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/keys/${keyHash}`,
        {
          headers: {
            'Authorization': `Bearer ${this.provisioningKey}`
          }
        }
      );
    } catch (error) {
      console.error('Failed to delete API key:', error);
      throw new Error('Failed to delete API key');
    }
  }

  async disableApiKey(keyHash: string): Promise<void> {
    try {
      await axios.patch(
        `${this.baseUrl}/keys/${keyHash}`,
        {
          disabled: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.provisioningKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Failed to disable API key:', error);
      throw new Error('Failed to disable API key');
    }
  }
}
```

### 4. 试用Key管理服务

```typescript
// src/services/trial-key.service.ts
import { OpenRouterService } from './openrouter.service';
import { Database } from '../database';

export class TrialKeyService {
  constructor(
    private openRouterService: OpenRouterService,
    private db: Database
  ) {}

  async createTrialKeyForUser(userId: string): Promise<string> {
    // 检查用户是否已有试用Key
    const existingKey = await this.db.query(
      'SELECT * FROM user_trial_keys WHERE user_id = ? AND is_active = true',
      [userId]
    );

    if (existingKey.length > 0) {
      throw new Error('User already has an active trial key');
    }

    // 创建OpenRouter API Key
    const { key, hash } = await this.openRouterService.createTrialApiKey(userId);

    // 计算过期时间（7天后）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 保存到数据库
    await this.db.query(
      `INSERT INTO user_trial_keys 
       (user_id, openrouter_key_hash, openrouter_api_key, expires_at) 
       VALUES (?, ?, ?, ?)`,
      [userId, hash, key, expiresAt]
    );

    return key;
  }

  async getTrialKeyForUser(userId: string): Promise<string | null> {
    const result = await this.db.query(
      `SELECT openrouter_api_key, expires_at, usage_count, max_usage_count 
       FROM user_trial_keys 
       WHERE user_id = ? AND is_active = true`,
      [userId]
    );

    if (result.length === 0) {
      return null;
    }

    const keyData = result[0];
    
    // 检查是否过期
    if (new Date() > new Date(keyData.expires_at)) {
      await this.expireTrialKey(userId);
      return null;
    }

    // 检查使用次数
    if (keyData.usage_count >= keyData.max_usage_count) {
      await this.expireTrialKey(userId);
      return null;
    }

    return keyData.openrouter_api_key;
  }

  async incrementUsageCount(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE user_trial_keys 
       SET usage_count = usage_count + 1, updated_at = NOW() 
       WHERE user_id = ? AND is_active = true`,
      [userId]
    );
  }

  async expireTrialKey(userId: string): Promise<void> {
    const keyData = await this.db.query(
      'SELECT openrouter_key_hash FROM user_trial_keys WHERE user_id = ? AND is_active = true',
      [userId]
    );

    if (keyData.length > 0) {
      // 禁用OpenRouter Key
      await this.openRouterService.disableApiKey(keyData[0].openrouter_key_hash);
      
      // 标记为非活跃
      await this.db.query(
        'UPDATE user_trial_keys SET is_active = false, updated_at = NOW() WHERE user_id = ?',
        [userId]
      );
    }
  }

  async checkAndExpireKeys(): Promise<void> {
    // 定时任务：检查并过期到期的Key
    const expiredKeys = await this.db.query(
      `SELECT user_id, openrouter_key_hash 
       FROM user_trial_keys 
       WHERE is_active = true AND (expires_at < NOW() OR usage_count >= max_usage_count)`
    );

    for (const keyData of expiredKeys) {
      await this.openRouterService.disableApiKey(keyData.openrouter_key_hash);
      await this.db.query(
        'UPDATE user_trial_keys SET is_active = false, updated_at = NOW() WHERE user_id = ?',
        [keyData.user_id]
      );
    }
  }
}
```

### 5. 用户注册时创建试用Key

```typescript
// src/controllers/auth.controller.ts
export class AuthController {
  constructor(
    private trialKeyService: TrialKeyService
  ) {}

  async register(req: Request, res: Response) {
    try {
      // 用户注册逻辑
      const user = await this.userService.createUser(req.body);
      
      // 创建试用API Key
      const trialKey = await this.trialKeyService.createTrialKeyForUser(user.id);
      
      res.json({
        success: true,
        user: user,
        message: 'Registration successful. Trial API key created.'
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
```

### 6. 登录时返回试用Key

```typescript
// src/controllers/auth.controller.ts
export class AuthController {
  async login(req: Request, res: Response) {
    try {
      // 用户认证逻辑
      const user = await this.userService.authenticate(req.body);
      
      // 获取试用Key
      const trialKey = await this.trialKeyService.getTrialKeyForUser(user.id);
      
      // 生成JWT token
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
      
      res.json({
        success: true,
        token: token,
        user: user,
        trialApiKey: trialKey // 返回试用Key给客户端
      });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }
}
```

### 7. API端点：检查Key状态

```typescript
// src/controllers/trial-key.controller.ts
export class TrialKeyController {
  constructor(
    private trialKeyService: TrialKeyService,
    private openRouterService: OpenRouterService
  ) {}

  async checkKeyStatus(req: Request, res: Response) {
    try {
      const userId = req.user.id; // 从JWT中获取

      // 获取用户的试用Key
      const trialKey = await this.trialKeyService.getTrialKeyForUser(userId);

      if (!trialKey) {
        return res.json({
          success: false,
          expired: true,
          message: 'Trial key has expired or reached usage limit'
        });
      }

      // 获取OpenRouter使用情况
      const usage = await this.openRouterService.getKeyUsage(trialKey);

      // 获取数据库中的使用次数
      const keyData = await this.db.query(
        'SELECT usage_count, max_usage_count, expires_at FROM user_trial_keys WHERE user_id = ? AND is_active = true',
        [userId]
      );

      res.json({
        success: true,
        expired: false,
        usage: {
          count: keyData[0].usage_count,
          maxCount: keyData[0].max_usage_count,
          remainingCount: keyData[0].max_usage_count - keyData[0].usage_count,
          credits: usage.usage,
          creditLimit: usage.limit,
          remainingCredits: usage.remaining
        },
        expiresAt: keyData[0].expires_at
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async recordUsage(req: Request, res: Response) {
    try {
      const userId = req.user.id;

      // 增加使用次数
      await this.trialKeyService.incrementUsageCount(userId);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

### 8. 定时任务：清理过期Key

```typescript
// src/jobs/cleanup-trial-keys.job.ts
import cron from 'node-cron';

export class CleanupTrialKeysJob {
  constructor(private trialKeyService: TrialKeyService) {}

  start() {
    // 每小时检查一次过期的Key
    cron.schedule('0 * * * *', async () => {
      console.log('Running trial keys cleanup job...');
      try {
        await this.trialKeyService.checkAndExpireKeys();
        console.log('Trial keys cleanup completed');
      } catch (error) {
        console.error('Trial keys cleanup failed:', error);
      }
    });
  }
}
```

## 客户端实现（伪代码）

### 1. Deep Link处理

```typescript
// client/src/auth/deep-link-handler.ts
export class DeepLinkHandler {
  async handleAuthCallback(url: string) {
    const params = new URLSearchParams(url.split('?')[1]);
    const token = params.get('token');
    const trialApiKey = params.get('trial_key');

    if (token && trialApiKey) {
      // 保存认证信息
      await this.secureStorage.setItem('auth_token', token);
      await this.secureStorage.setItem('trial_api_key', trialApiKey);

      // 初始化AI客户端
      this.initializeAIClient(trialApiKey);

      // 跳转到主界面
      this.router.navigate('/dashboard');
    }
  }
}
```

### 2. AI客户端初始化

```typescript
// client/src/services/ai-client.service.ts
export class AIClientService {
  private openRouterClient: OpenAI;
  private usageCount: number = 0;
  private maxUsage: number = 50;

  async initialize(apiKey: string) {
    this.openRouterClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'your-app-url',
        'X-Title': 'Your App Name'
      }
    });

    // 检查Key状态
    await this.checkKeyStatus();
  }

  async chat(messages: any[]) {
    // 检查使用次数限制
    if (this.usageCount >= this.maxUsage) {
      throw new Error('Trial usage limit reached');
    }

    try {
      const response = await this.openRouterClient.chat.completions.create({
        model: 'openai/gpt-3.5-turbo', // 选择便宜的模型
        messages: messages,
        max_tokens: 100 // 限制token数量以控制费用
      });

      // 增加使用次数
      this.usageCount++;
      await this.recordUsage();

      return response;
    } catch (error) {
      if (error.message.includes('insufficient credits')) {
        await this.handleKeyExpired();
        throw new Error('Trial credits exhausted');
      }
      throw error;
    }
  }

  async checkKeyStatus() {
    try {
      const response = await fetch('/api/trial-key/status', {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.expired) {
        await this.handleKeyExpired();
        return false;
      }

      this.usageCount = data.usage.count;
      this.maxUsage = data.usage.maxCount;

      return true;
    } catch (error) {
      console.error('Failed to check key status:', error);
      return false;
    }
  }

  async recordUsage() {
    try {
      await fetch('/api/trial-key/usage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });
    } catch (error) {
      console.error('Failed to record usage:', error);
    }
  }

  async handleKeyExpired() {
    // 清除本地存储的Key
    await this.secureStorage.removeItem('trial_api_key');

    // 显示升级提示
    this.showUpgradePrompt();
  }

  private showUpgradePrompt() {
    // 显示升级到付费版本的提示
    this.notificationService.show({
      title: 'Trial Expired',
      message: 'Your trial has expired. Please upgrade to continue using AI features.',
      actions: [
        { text: 'Upgrade Now', action: () => this.router.navigate('/upgrade') },
        { text: 'Later', action: () => {} }
      ]
    });
  }
}
```

### 3. 使用监控组件

```typescript
// client/src/components/trial-usage-monitor.tsx
export const TrialUsageMonitor: React.FC = () => {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUsage();

    // 每分钟检查一次使用情况
    const interval = setInterval(checkUsage, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkUsage = async () => {
    try {
      const response = await fetch('/api/trial-key/status', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });

      const data = await response.json();
      setUsage(data.usage);
      setLoading(false);

      if (data.expired) {
        // 处理过期情况
        handleExpired();
      }
    } catch (error) {
      console.error('Failed to check usage:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!usage) return null;

  return (
    <div className="trial-usage-monitor">
      <div className="usage-info">
        <span>Trial Usage: {usage.count}/{usage.maxCount}</span>
        <span>Credits: ${usage.credits.toFixed(6)}/${usage.creditLimit}</span>
      </div>

      {usage.remainingCount <= 5 && (
        <div className="warning">
          Only {usage.remainingCount} queries remaining!
        </div>
      )}

      <div className="progress-bar">
        <div
          className="progress"
          style={{ width: `${(usage.count / usage.maxCount) * 100}%` }}
        />
      </div>
    </div>
  );
};
```

## 部署配置

### 1. 环境变量

```bash
# 服务器端 .env
OPENROUTER_PROVISIONING_KEY=your-provisioning-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
JWT_SECRET=your-jwt-secret
DATABASE_URL=your-database-url
```

### 2. 路由配置

```typescript
// src/routes/trial-key.routes.ts
import { Router } from 'express';
import { TrialKeyController } from '../controllers/trial-key.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const trialKeyController = new TrialKeyController();

router.get('/status', authMiddleware, trialKeyController.checkKeyStatus);
router.post('/usage', authMiddleware, trialKeyController.recordUsage);

export default router;
```

## 注意事项

1. **安全性**：
   - 试用API Key应该有严格的限制
   - 客户端应该安全存储API Key
   - 定期检查和清理过期的Key

2. **费用控制**：
   - OpenRouter的$0.0001限制非常低，适合试用
   - 选择便宜的模型（如gpt-3.5-turbo）
   - 限制max_tokens以控制单次查询费用

3. **用户体验**：
   - 实时显示使用情况
   - 提前警告即将到期
   - 平滑的升级流程

4. **监控**：
   - 记录所有API调用
   - 监控异常使用模式
   - 定期清理过期数据

这个方案完全基于OpenRouter的原生功能，无需复杂的代理层，直接解决了您的需求。
```

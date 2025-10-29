# OpenRouter 试用API Key系统设置指南

## 概述

本系统实现了基于OpenRouter的试用API Key功能，允许用户在注册时自动获得限制费用和使用次数的试用API Key，用于直接调用AI模型。

## 功能特性

- ✅ 用户注册时自动创建试用API Key
- ✅ 费用限制：$0.0001
- ✅ 使用次数限制：50次
- ✅ 有效期限制：7天
- ✅ 登录时通过Deep Link传递API Key给客户端
- ✅ 实时使用情况监控
- ✅ 自动过期处理
- ✅ 定时清理任务

## 环境配置

### 1. 获取OpenRouter Provisioning API Key

1. 访问 [OpenRouter](https://openrouter.ai/)
2. 注册账户并登录
3. 进入API Keys页面
4. 创建一个Provisioning API Key
5. 复制API Key备用

### 2. 配置环境变量

在 `.env.local` 文件中添加以下配置：

```bash
# OpenRouter 试用API Key配置
OPENROUTER_PROVISIONING_KEY=your_openrouter_provisioning_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# 定时任务配置（可选）
CRON_SECRET=your_cron_secret_key
```

### 3. 数据库设置

运行数据库迁移创建试用Key表：

```bash
# 生成迁移文件
pnpm db:generate

# 应用迁移（如果失败，使用手动创建脚本）
pnpm db:migrate

# 或者手动创建表
npx tsx scripts/create-trial-keys-table.ts
```

## 系统测试

运行测试脚本验证系统是否正常工作：

```bash
npx tsx scripts/test-trial-key-system.ts
```

测试脚本会：
1. 检查环境变量配置
2. 查找测试用户
3. 创建试用API Key
4. 测试各种API功能
5. 清理测试数据

## API端点

### 1. 获取试用Key状态
```
GET /api/trial-key/status
```
返回用户试用Key的使用情况和状态。

### 2. 记录使用次数
```
POST /api/trial-key/usage
```
增加用户试用Key的使用次数。

### 3. 获取试用Key
```
GET /api/trial-key/get
```
获取用户的试用API Key（用于登录时返回）。

### 4. 清理过期Key（定时任务）
```
GET /api/cron/cleanup-trial-keys
```
清理过期的试用API Key。

## 客户端集成

### 1. 登录时获取试用Key

用户登录成功后，系统会通过Deep Link传递试用API Key：

```
elick://sync?user_data={"trialApiKey":"sk-or-xxx...","...":"..."}&state=xxx
```

### 2. 客户端使用示例

```typescript
// 初始化OpenRouter客户端
const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: trialApiKey,
  defaultHeaders: {
    'HTTP-Referer': 'your-app-url',
    'X-Title': 'Your App Name'
  }
});

// 发送AI请求
const response = await client.chat.completions.create({
  model: 'openai/gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
  max_tokens: 100
});

// 记录使用次数
await fetch('/api/trial-key/usage', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${authToken}` }
});
```

### 3. 使用监控

```typescript
// 检查使用状态
const status = await fetch('/api/trial-key/status', {
  headers: { 'Authorization': `Bearer ${authToken}` }
});

const data = await status.json();
if (data.expired) {
  // 处理过期情况
  showUpgradePrompt();
} else {
  // 显示使用情况
  console.log(`剩余次数: ${data.usage.remainingCount}`);
  console.log(`剩余费用: $${data.usage.remainingCredits}`);
}
```

## 定时任务设置

### Vercel Cron Jobs

在 `vercel.json` 中添加定时任务：

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-trial-keys",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 手动清理

也可以手动运行清理任务：

```bash
curl -X GET "https://your-domain.com/api/cron/cleanup-trial-keys" \
  -H "Authorization: Bearer your_cron_secret"
```

## 安全注意事项

1. **API Key安全**：
   - 试用API Key有严格的费用和次数限制
   - 客户端应安全存储API Key
   - 定期清理过期的Key

2. **费用控制**：
   - $0.0001的限制非常低，适合试用
   - 选择便宜的模型（如gpt-3.5-turbo）
   - 限制max_tokens控制单次查询费用

3. **滥用防护**：
   - 每个用户只能有一个活跃的试用Key
   - 使用次数和时间双重限制
   - 实时监控异常使用模式

## 故障排除

### 1. 环境变量问题
```bash
# 检查环境变量是否正确设置
echo $OPENROUTER_PROVISIONING_KEY
```

### 2. 数据库连接问题
```bash
# 测试数据库连接
npx tsx scripts/create-trial-keys-table.ts
```

### 3. OpenRouter API问题
```bash
# 测试OpenRouter API连接
npx tsx scripts/test-trial-key-system.ts
```

### 4. 常见错误

- **"User already has an active trial key"**：用户已有活跃的试用Key，需要先清理
- **"OpenRouter API error"**：检查Provisioning API Key是否正确
- **"Database connection failed"**：检查数据库连接配置

## 监控和日志

系统会在以下位置记录详细日志：
- 用户注册时的试用Key创建
- API Key使用情况检查
- 过期Key的清理过程
- 错误和异常情况

查看日志以监控系统运行状态和排查问题。

# 联系我们API端点使用指南

## 概述

本项目现在包含一个完整的联系我们API端点，支持邮件发送、用户认证和输入验证。

## 功能特点

### 🔒 安全功能
- **用户认证**：通过JWT token验证用户身份，防止DDOS攻击
- **输入验证**：使用Zod进行严格的数据验证
- **IP地址记录**：记录请求来源IP地址
- **CORS支持**：支持跨域请求，允许Authorization头

### 📧 邮件功能
- **SMTP邮件服务**：使用Nodemailer发送邮件
- **HTML邮件模板**：美观的邮件格式
- **分类和优先级**：支持消息分类和优先级设置
- **匿名和实名**：支持匿名和实名提交

### 💾 数据记录
- **日志记录**：详细的操作和用户信息日志
- **用户追踪**：记录消息发送者的用户ID
- **邮件追踪**：记录邮件发送状态和ID

## 设置步骤

### 1. SMTP邮件服务配置

本API使用SMTP服务发送邮件，支持各种邮件提供商，如阿里云、腾讯云、Gmail等。

### 2. 环境变量配置

在 `.env.local` 文件中添加以下环境变量：

```bash
# SMTP 邮件配置
SMTP_HOST=smtpdm.aliyun.com          # SMTP服务器地址
SMTP_PORT=465                        # SMTP端口（通常是465用于SSL，587用于TLS）
SMTP_USER=support@elick.it.com       # SMTP用户名
SMTP_PASSWORD=your_smtp_password     # SMTP密码
SMTP_FROM_NAME=Elick                 # 发件人名称
SMTP_FROM_EMAIL=support@elick.it.com # 发件人邮箱
CONTACT_EMAIL=support@elick.it.com   # 接收联系消息的邮箱

# 认证配置
AUTH_SECRET=your_jwt_secret_key      # JWT密钥，用于验证用户token
```

### 3. 常见SMTP提供商配置

#### 阿里云邮件推送
```bash
SMTP_HOST=smtpdm.aliyun.com
SMTP_PORT=465
SMTP_USER=your-email@your-domain.com
SMTP_PASSWORD=your-smtp-password
```

#### 腾讯企业邮箱
```bash
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=465
SMTP_USER=your-email@your-domain.com
SMTP_PASSWORD=your-email-password
```

#### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

#### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-email-password
```

## API使用

### 端点

```
POST /api/contact
```

### 认证

API需要用户认证，请在请求头中包含有效的JWT token：

```bash
Authorization: Bearer your_jwt_token
```

### 请求体

```typescript
interface ContactRequest {
  email?: string;              // 邮箱地址（非匿名用户必填）
  message: string;             // 消息内容（10-2000字符）
  anonymous?: boolean;         // 是否匿名（默认false）
  userAgent?: string;          // 用户代理字符串
  timestamp?: string;          // 时间戳
  category?: 'bug' | 'feature' | 'question' | 'other';  // 消息分类
  priority?: 'low' | 'medium' | 'high';                 // 优先级
}
```

### 响应示例

**成功响应：**
```json
{
  "success": true,
  "message": "您的消息已成功发送，我们会尽快回复您！",
  "requestId": "uuid-string"
}
```

**认证失败响应：**
```json
{
  "success": false,
  "error": "用户认证失败，请先登录",
  "details": "需要有效的认证令牌才能发送联系消息"
}
```

**验证错误响应：**
```json
{
  "success": false,
  "error": "输入数据无效",
  "details": [
    {
      "field": "message",
      "message": "消息内容至少需要10个字符"
    }
  ]
}
```

### 前端使用示例

```typescript
// React组件示例
const ContactForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    message: '',
    anonymous: false,
    category: 'other',
    priority: 'medium'
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 获取用户的JWT token（具体实现取决于你的认证系统）
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (!token) {
      alert('请先登录');
      return;
    }
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('消息发送成功！');
        setFormData({ email: '', message: '', anonymous: false, category: 'other', priority: 'medium' });
      } else {
        alert(`发送失败: ${data.error}`);
      }
    } catch (error) {
      alert('发送失败，请稍后重试');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="您的邮箱"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required={!formData.anonymous}
      />
      
      <textarea
        placeholder="请输入您的消息..."
        value={formData.message}
        onChange={(e) => setFormData({...formData, message: e.target.value})}
        required
        minLength={10}
        maxLength={2000}
      />
      
      <select
        value={formData.category}
        onChange={(e) => setFormData({...formData, category: e.target.value})}
      >
        <option value="other">其他</option>
        <option value="bug">Bug报告</option>
        <option value="feature">功能请求</option>
        <option value="question">问题咨询</option>
      </select>
      
      <select
        value={formData.priority}
        onChange={(e) => setFormData({...formData, priority: e.target.value})}
      >
        <option value="low">低优先级</option>
        <option value="medium">中优先级</option>
        <option value="high">高优先级</option>
      </select>
      
      <label>
        <input
          type="checkbox"
          checked={formData.anonymous}
          onChange={(e) => setFormData({...formData, anonymous: e.target.checked})}
        />
        匿名提交
      </label>
      
      <button type="submit">发送消息</button>
    </form>
  );
};
```

## 管理员功能

### 查看联系消息

管理员可以通过Redis客户端查看所有联系消息：

```bash
# 查看所有联系消息的键
redis-cli keys "contact_message:*"

# 查看特定消息
redis-cli get "contact_message:uuid-here"

# 查看最近的联系消息（需要自定义脚本）
redis-cli --scan --pattern "contact_message:*" | head -10
```

### 消息统计

查看消息统计信息：

```bash
# 查看每日消息统计
redis-cli get "contact_stats:2024-01-15"

# 查看最近7天的统计
redis-cli keys "contact_stats:*" | sort | tail -7

# 获取所有统计数据
redis-cli keys "contact_stats:*"
```

### 创建管理工具

你可以创建一个简单的管理脚本来查看消息：

```javascript
// scripts/view-contact-messages.js
const redis = require('@upstash/redis');

const client = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function viewRecentMessages(limit = 10) {
  const keys = await client.keys('contact_message:*');
  const recentKeys = keys.slice(-limit);
  
  for (const key of recentKeys) {
    const message = await client.get(key);
    console.log(JSON.parse(message));
  }
}

viewRecentMessages();
```

## 监控和维护

### 速率限制监控

在Redis中查看速率限制统计：

```bash
# 查看特定IP的请求次数
redis-cli get "contact_rate_limit:192.168.1.1"

# 查看每日统计
redis-cli keys "contact_stats:*"
```

### 错误监控

关键错误会记录到控制台，建议设置日志监控：

- 数据库连接失败
- 邮件发送失败
- 速率限制触发
- 验证错误

### 性能优化

1. **数据库索引**：已创建必要的索引
2. **Redis缓存**：用于速率限制
3. **错误处理**：优雅的错误处理和备用方案

## 故障排除

### 常见问题

1. **邮件发送失败**
   - 检查SMTP配置信息
   - 确认SMTP用户名和密码
   - 验证SMTP服务器地址和端口
   - 检查网络连接和防火墙设置

2. **SMTP认证失败**
   - 确认用户名和密码正确
   - 检查是否需要开启"安全性较低的应用访问权限"（Gmail）
   - 验证是否需要使用应用专用密码

3. **速率限制不工作**
   - 检查Redis连接
   - 确认环境变量配置
   - 查看Redis日志

4. **消息存储失败**
   - 检查Redis连接状态
   - 确认Redis权限设置
   - 查看Redis存储空间

### 日志查看

```bash
# 查看API日志
tail -f /var/log/your-app/api.log | grep "联系我们API"

# 查看Next.js开发日志
npm run dev

# 查看Redis连接状态
redis-cli ping

# 测试SMTP连接
telnet your-smtp-host 465
```

## 扩展功能

### 添加文件上传

可以扩展API以支持文件上传：

```typescript
// 添加文件字段
interface ContactRequest {
  // ... 现有字段
  attachments?: File[];
}
```

### 邮件模板自定义

可以在Supabase Dashboard中自定义邮件模板：

1. 进入 `Authentication` > `Email Templates`
2. 创建自定义模板
3. 修改API代码以使用自定义模板

### 实时通知

可以添加实时通知功能：

```typescript
// 使用WebSocket或Server-Sent Events
// 创建一个简单的通知系统

// 1. 在API中添加webhook通知
const notifyAdmin = async (message) => {
  // 发送到Slack、Discord或其他通知服务
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `新的联系消息: ${message.category} - ${message.priority}`,
        attachments: [{
          color: message.priority === 'high' ? 'danger' : 'good',
          fields: [
            { title: '发件人', value: message.email || '匿名' },
            { title: '分类', value: message.category },
            { title: '消息', value: message.message.substring(0, 100) + '...' }
          ]
        }]
      })
    });
  }
};

// 2. 邮件通知
// 在成功发送邮件后调用
await notifyAdmin(contactRecord);
```

## 总结

这个联系我们API端点提供了企业级的功能，包括：

- ✅ 完整的SMTP邮件发送功能
- ✅ Redis消息存储和管理
- ✅ 速率限制和安全防护
- ✅ 灵活的分类和优先级
- ✅ 匿名和实名支持
- ✅ 管理员查看工具
- ✅ 详细的监控和统计

该解决方案可以直接用于生产环境，并且具有良好的扩展性。

## 技术架构

```
前端表单 → API端点 → 速率检查 → 数据验证 → SMTP发送 → Redis存储
    ↓            ↓         ↓         ↓          ↓          ↓
  React      Next.js    Redis     Zod     Nodemailer   Redis
  组件       API路由    缓存      验证      邮件库      存储
``` 
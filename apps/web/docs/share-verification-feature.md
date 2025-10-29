# 转发获取使用次数功能

## 功能概述

这个功能允许用户通过在社交媒体平台上转发和点赞我们的内容来获得免费的基础模型使用次数。每个用户在每个平台只能完成一次，不同平台可以分别完成。

## 功能特点

- **多平台支持**: 支持 X (Twitter)、小红书、微博等平台
- **图片验证**: 用户需要上传转发和点赞的截图
- **自动验证**: 系统会在1-24小时内自动验证用户提交的截图
- **防重复**: 每个用户在每个平台只能完成一次验证
- **奖励机制**: 验证通过后自动增加用户的基础模型使用次数

## 技术实现

### 数据库表结构

```sql
CREATE TABLE "share_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "platform" varchar(50) NOT NULL,
  "image_url" text,
  "status" varchar(20) DEFAULT 'pending',
  "reward_amount" integer DEFAULT 0,
  "reward_type" varchar(20) DEFAULT 'fast',
  "submitted_at" timestamp DEFAULT now(),
  "verified_at" timestamp,
  "scheduled_verify_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
```

### 核心组件

1. **ShareVerification 组件** (`src/app/[locale]/(dashboard)/dashboard/share-verification.tsx`)
   - 用户界面，允许选择平台和上传截图
   - 显示已完成和待验证的记录状态

2. **UsageBooster 组件** (已修改)
   - 集成了转发获取功能的选项卡
   - 在购买加油包旁边添加了转发获取选项

3. **API 端点**
   - `POST /api/share-verification`: 提交转发验证
   - `GET /api/share-verification`: 获取用户转发记录
   - `POST /api/share-verification/verify`: 处理待验证记录
   - `POST /api/cron/share-verification`: 定时任务端点

### 验证流程

1. **用户提交**: 用户选择平台并上传截图
2. **记录创建**: 系统创建待验证记录，设置随机验证时间（1-24小时）
3. **定时验证**: 定时任务检查到期的记录并自动验证通过
4. **奖励发放**: 验证通过后自动增加用户的使用次数限制

## 使用方法

### 用户端使用

1. 在仪表板中点击"获取使用次数"
2. 选择"转发获取"选项卡
3. 选择要转发的社交媒体平台
4. 上传转发和点赞的截图
5. 等待系统验证（1-24小时）
6. 验证通过后自动获得100次基础模型使用次数

### 管理员操作

#### 手动触发验证任务
```bash
curl -X POST http://localhost:3001/api/cron/share-verification
```

#### 查看待验证记录
```bash
curl http://localhost:3001/api/share-verification/verify
```

#### 直接运行验证脚本
```bash
npx tsx lib/cron/share-verification.ts
```

## 定时任务设置和容错机制

### 使用 Vercel Cron Jobs (推荐)

在 `vercel.json` 中添加：
```json
{
  "crons": [
    {
      "path": "/api/cron/share-verification",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

### 使用系统 Cron Job

```bash
# 每2小时执行一次
0 */2 * * * curl -X POST https://your-domain.com/api/cron/share-verification

# 可选：添加监控检查（每小时）
0 * * * * npx tsx /path/to/scripts/monitor-share-verification.ts --auto-fix
```

### 容错机制

系统包含多层容错保护：

1. **应用启动检查**: 每次应用启动时自动检查并处理过期记录
2. **API请求检查**: 每次转发验证相关的API请求都会触发初始化检查
3. **健康检查端点**: `/api/share-verification/health` 提供系统状态监控
4. **监控脚本**: 可定期运行监控脚本检查系统状态

## 配置选项

### 平台配置

在 `share-verification.tsx` 中的 `PLATFORMS` 数组中配置支持的平台：

```typescript
const PLATFORMS: Platform[] = [
  {
    id: 'twitter',
    name: 'twitter',
    displayName: 'X (Twitter)',
    icon: <Share2 className="h-4 w-4" />,
    rewardAmount: 100,
    description: '转发我们的推文并点赞'
  },
  // 添加更多平台...
];
```

### 奖励配置

- `rewardAmount`: 验证通过后获得的使用次数
- `rewardType`: 奖励类型 ('fast' 或 'premium')

## 安全考虑

1. **文件上传安全**: 限制文件大小（5MB）和类型（仅图片）
2. **防重复提交**: 数据库唯一约束防止同一用户在同一平台重复验证
3. **随机验证时间**: 防止用户预测验证时间
4. **图片存储**: 图片存储在服务器本地，可以考虑使用云存储服务

## 扩展功能

### 可能的改进

1. **真实图片验证**: 集成图片识别API来验证截图内容
2. **人工审核**: 添加管理员审核界面
3. **更多平台**: 支持更多社交媒体平台
4. **奖励等级**: 根据平台影响力设置不同奖励
5. **统计分析**: 添加转发效果统计

### 监控和日志

- 所有操作都有详细的控制台日志
- 可以添加数据库日志表来跟踪操作历史
- 建议设置错误监控和告警

## 测试

访问 `/test-share` 页面可以测试所有功能：
- 创建转发记录
- 获取转发记录
- 验证记录
- 执行定时任务

## 监控和故障排除

### 系统监控

#### 1. 健康检查
```bash
# 检查系统状态
curl http://localhost:3001/api/share-verification/health

# 手动修复过期记录
curl -X POST http://localhost:3001/api/share-verification/health
```

#### 2. 监控脚本
```bash
# 基本监控检查
npx tsx scripts/monitor-share-verification.ts

# 详细输出
npx tsx scripts/monitor-share-verification.ts --verbose

# 自动修复过期记录
npx tsx scripts/monitor-share-verification.ts --auto-fix

# 自定义告警阈值（30小时）
npx tsx scripts/monitor-share-verification.ts --alert-threshold 30
```

#### 3. 定期监控建议
```bash
# 在 crontab 中添加监控任务
# 每小时检查一次，发现问题自动修复
0 * * * * npx tsx /path/to/scripts/monitor-share-verification.ts --auto-fix

# 每天发送状态报告
0 9 * * * npx tsx /path/to/scripts/monitor-share-verification.ts --verbose
```

### 故障排除

#### 常见问题

1. **验证任务不执行**
   - 检查定时任务配置
   - 查看健康检查端点状态
   - 手动触发验证任务

2. **记录长时间未验证**
   - 运行监控脚本检查过期记录
   - 使用 `--auto-fix` 参数自动修复
   - 检查数据库中的 `scheduledVerifyAt` 字段

3. **图片上传失败**
   - 检查文件大小和格式
   - 确保上传目录权限正确
   - 查看服务器错误日志

4. **数据库连接问题**
   - 检查数据库连接配置
   - 确保数据库表已正确创建
   - 查看数据库连接日志

#### 紧急修复步骤

如果发现大量过期记录：

1. **立即修复**:
   ```bash
   curl -X POST http://localhost:3001/api/cron/share-verification
   ```

2. **检查修复结果**:
   ```bash
   curl http://localhost:3001/api/share-verification/health
   ```

3. **如果API不可用，直接运行脚本**:
   ```bash
   npx tsx lib/cron/share-verification.ts
   ```

### 日志和调试

#### 日志级别
- `🚀` 任务开始
- `📊` 统计信息
- `✅` 成功操作
- `⚠️` 警告信息
- `❌` 错误信息
- `🔧` 修复操作

#### 调试技巧
1. 查看服务器控制台输出
2. 检查数据库记录状态
3. 使用健康检查端点获取详细状态
4. 运行监控脚本获取系统概览

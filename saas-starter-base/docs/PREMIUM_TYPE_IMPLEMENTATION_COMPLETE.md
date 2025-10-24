# Premium Type 功能完整实现

## 🎯 功能概述

Premium Type 功能允许用户选择两种不同的 Premium 服务模式：

1. **`use_own_key`**: 使用自己的 API Key，只检查订阅是否到期，不限制使用量
2. **`use_elick`**: 使用 Elick 服务，按原有逻辑检查使用量限制

## 📦 实现的组件

### 1. 数据库层
- **字段**: `premium_type` VARCHAR(20) DEFAULT 'use_own_key'
- **迁移**: `lib/db/migrations/0014_add_premium_type.sql`
- **Schema**: `lib/db/schema.ts` 已更新

### 2. 核心验证逻辑
- **文件**: `lib/premium-type-validator.ts`
- **主要函数**:
  - `validatePremiumTypeAccess()` - 验证用户访问权限
  - `incrementUsageCount()` - 更新使用次数（仅 use_elick 模式）
  - `getUserUsageStats()` - 获取使用统计

### 3. 认证系统更新
- **文件**: `lib/auth.ts`
- **更新内容**:
  - `AuthResult` 接口增加 `premiumType`, `subscriptionStatus`, `subscriptionExpiresAt`
  - `verifyAuth()` 和 `fastVerifyAuth()` 函数返回 Premium Type 信息

### 4. API 端点更新
- **使用量检查**: `src/app/api/usage/check/route.ts`
- **使用量更新**: `src/app/api/usage/update/route.ts`
- **支付流程**: Stripe 和 Xorpay 都已支持 Premium Type

## 🔄 工作流程

### use_own_key 模式
```
用户请求 → 认证 → 检查订阅状态 → 允许/拒绝访问
                ↓
            只检查到期时间，不更新使用量
```

### use_elick 模式
```
用户请求 → 认证 → 检查订阅状态 → 检查使用量 → 更新使用量 → 允许/拒绝访问
```

## 🧪 测试方案

### 1. 代码逻辑测试
```bash
# 运行逻辑测试
node scripts/test-premium-type-logic.js
```

### 2. 实现验证
```bash
# 验证所有组件
./scripts/validate-premium-type-implementation.sh
```

### 3. 支付测试
```bash
# Stripe 测试（免费）
./scripts/test-stripe-checkout-premium-type.sh

# Xorpay 真实支付测试（0.1元）
./scripts/setup-xorpay-test-payment.sh
```

## 📊 验证场景

### 场景 1: use_own_key 用户
- ✅ 订阅有效 → 允许无限使用
- ❌ 订阅过期 → 拒绝访问
- 📝 不更新使用次数

### 场景 2: use_elick 用户
- ✅ 订阅有效 + 有剩余次数 → 允许使用并扣除次数
- ❌ 订阅有效 + 次数用完 → 拒绝访问
- ❌ 订阅过期 → 拒绝访问

### 场景 3: 免费用户
- ❌ 需要升级到 Premium

## 🔧 配置说明

### 环境变量
```bash
POSTGRES_URL=postgresql://...  # 数据库连接
```

### 数据库迁移
```sql
-- 添加 premium_type 字段
ALTER TABLE users ADD COLUMN premium_type VARCHAR(20) DEFAULT 'use_own_key';
```

## 📋 API 响应格式

### 成功响应
```json
{
  "success": true,
  "canProceed": true,
  "premiumType": "use_own_key",
  "usage": {
    "remainingRequests": null,
    "modelType": "premium",
    "subscriptionExpired": false
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_EXPIRED",
    "message": "Subscription expired",
    "premiumType": "use_own_key",
    "upgradeAction": "renew_subscription"
  }
}
```

## 🚀 部署步骤

### 1. 数据库迁移
```bash
# 执行迁移
psql "$POSTGRES_URL" -f lib/db/migrations/0014_add_premium_type.sql
```

### 2. 代码部署
```bash
# 构建项目
npm run build

# 部署到生产环境
npm run deploy
```

### 3. 验证部署
```bash
# 验证功能
./scripts/validate-premium-type-implementation.sh
```

## 🔍 监控和调试

### 日志关键词
- `Premium Type 验证`
- `use_own_key 模式`
- `use_elick 模式`
- `订阅已到期`
- `使用量已达限制`

### 数据库查询
```sql
-- 查看用户的 premium_type 分布
SELECT premium_type, COUNT(*) FROM users GROUP BY premium_type;

-- 查看特定用户的状态
SELECT email, premium_type, subscription_status, subscription_expires_at 
FROM users WHERE email = 'user@example.com';
```

## 🐛 故障排除

### 问题 1: premium_type 字段为空
**解决**: 运行数据库迁移，设置默认值

### 问题 2: use_own_key 用户仍被限制使用量
**检查**: 验证 `validatePremiumTypeAccess` 逻辑

### 问题 3: 支付后 premium_type 未设置
**检查**: Stripe/Xorpay 回调处理逻辑

## 📈 性能优化

### 1. 缓存策略
- 用户认证信息缓存 15 分钟
- Premium Type 信息包含在认证缓存中

### 2. 数据库优化
- `premium_type` 字段已建立索引
- 查询优化使用 SELECT 指定字段

## 🔄 向后兼容

- ✅ 现有用户默认为 `use_own_key` 模式
- ✅ 现有 API 端点保持兼容
- ✅ 现有支付流程正常工作

## 📝 更新日志

### v2.0 - Premium Type 功能
- 添加 `premium_type` 字段
- 实现双模式验证逻辑
- 更新认证系统
- 更新 API 端点
- 添加完整测试套件

---

**实现状态**: ✅ 完成  
**测试状态**: ✅ 通过  
**部署状态**: 🚀 准备就绪

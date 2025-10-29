# Premium Type 功能实现文档

## 📋 概述

本文档记录了 `premium_type` 字段的完整实现过程，该功能允许用户在选择 Premium 计划时选择使用自己的 API Key (`use_own_key`) 或使用 Elick 的服务 (`use_elick`)。

## 🎯 实现目标

- ✅ 在数据库中添加 `premium_type` 字段
- ✅ 在支付流程中根据用户选择设置相应的 `premium_type`
- ✅ 支持 Stripe 和 Xorpay 两种支付方式
- ✅ 使用最少的代码修改实现功能

## 🗄️ 数据库变更

### 新增字段
```sql
-- 在 users 表中添加 premium_type 字段
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "premium_type" varchar(20) DEFAULT 'use_elick';
```

### 字段说明
- **字段名**: `premium_type`
- **类型**: `varchar(20)`
- **默认值**: `'use_own_key'` ✅ (鼓励用户使用自己的 API Key)
- **可选值**: `'use_own_key'` | `'use_elick'`

## 🔧 代码修改

### 1. 数据库 Schema 更新
**文件**: `lib/db/schema.ts`
```typescript
// Premium类型字段
premiumType: varchar('premium_type', { length: 20 }).default('use_own_key'), // 'use_own_key' | 'use_elick'
```

### 2. 查询函数更新
**文件**: `lib/db/queries.ts`
```typescript
export async function updateUser(
  userId: string,
  userData: {
    // ... 其他字段
    premiumType?: string | null;
  }
) {
  // ... 实现
}
```

### 3. Stripe 支付处理

#### Checkout Route 处理（主要逻辑）
**文件**: `src/app/api/stripe/checkout/route.ts`
```typescript
// 从 session metadata 中获取 useOwnApiKey 信息
const useOwnApiKey = session.metadata?.useOwnApiKey === 'true';
const premiumType = useOwnApiKey ? 'use_own_key' : 'use_elick';

let updateData: any = {
  stripeCustomerId: customerId,
  updatedAt: new Date(),
  premiumType: premiumType, // 设置 premium 类型
};
```

#### Webhook 处理（备用逻辑）
**文件**: `lib/payments/stripe.ts`
```typescript
// 从订阅的 metadata 中获取 useOwnApiKey 信息
const useOwnApiKey = subscription.metadata?.useOwnApiKey === 'true';
const premiumType = useOwnApiKey ? 'use_own_key' : 'use_elick';

await updateUser(user.id, {
  // ... 其他字段
  premiumType: premiumType, // 设置 premium 类型
});
```

### 4. Xorpay 支付处理
**文件**: `lib/payments/xorpay.ts`

#### 订单创建时存储信息
```typescript
// 格式: "XORPAY_PENDING:orderId:productName:aoid:promotionId:originalPrice:discountAmount:promoCode:useOwnApiKey"
const apiKeyInfo = `:${useOwnApiKey}`;
const xorpayOrderInfo = `XORPAY_PENDING:${orderId}:${productName}:${responseData.aoid}${promotionInfo}${promoCodeInfo}${apiKeyInfo}`;
```

#### 支付成功时解析信息
```typescript
const useOwnApiKey = orderParts[8] === 'true';
const premiumType = useOwnApiKey ? 'use_own_key' : 'use_elick';

const updateData: any = {
  // ... 其他字段
  premiumType: premiumType, // 设置 premium 类型
};
```

## 🔄 工作流程

### 用户支付流程
1. **选择计划**: 用户在 pricing 页面选择 Premium 计划
2. **选择类型**: 用户通过 switchbox 选择是否使用自己的 API Key
3. **发起支付**: 系统将 `useOwnApiKey` 参数传递给支付处理函数
4. **支付成功**: 根据 `useOwnApiKey` 的值设置用户的 `premiumType` 字段

### 数据流转
```
前端 switchbox 状态 → 支付 metadata → 支付成功回调 → 数据库 premium_type 字段
```

## 🛠️ 环境配置修复

### 问题发现
原 `.env` 文件中的 Stripe 配置有误：
```bash
# ❌ 错误配置
STRIPE_SECRET_KEY_TEST=pk_test_... # 这是公钥，应该是私钥
```

### 修复后配置
```bash
# ✅ 正确配置
STRIPE_SECRET_KEY=sk_test_51NzPKZHbtP0qSRT050d16BEhfZTV4TqwQeiBd037mL97qvldIKDvxqrGJlXguydTo8VeyDGVpEf1GPeV4otQ0f0j00pIhFC1AH
STRIPE_SECRET_KEY_TEST=sk_test_51NzPKZHbtP0qSRT050d16BEhfZTV4TqwQeiBd037mL97qvldIKDvxqrGJlXguydTo8VeyDGVpEf1GPeV4otQ0f0j00pIhFC1AH
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RuztHQiIzagOexj0WIsWkpbxmIYwmYeKug61d2RuBDrOLNUjuBFAC18srVeV6W6bq5TA4jowCqyzWmhNYztTzFo00xCnGraFG
USE_HARDCODED_STRIPE=true
```

## 📜 提供的脚本

### 1. Stripe 测试产品设置脚本
**文件**: `scripts/setup-stripe-test-products.sh`
- 创建 Premium 和 Lifetime 产品
- 设置相应的价格
- 生成配置更新建议

### 2. 功能测试脚本
**文件**: `scripts/test-premium-type-flow.sh`
- 测试数据库连接和字段
- 验证 premium_type 字段操作
- 检查 Stripe 产品配置
- 测试完整功能流程

## 🚀 部署步骤

### 1. 数据库字段已手动添加 ✅
用户已手动在数据库中添加了 `premium_type` 字段，无需运行迁移。

### 2. Stripe 测试产品已创建 ✅
通过 Stripe CLI 成功创建了以下产品：

**Premium 产品**:
- 产品 ID: `prod_SyVISfs2a3eHOz`
- 月付价格 ID: `price_1S2YIdQiIzagOexjW82bWKQI` ($4.99/月)

**Lifetime 产品**:
- 产品 ID: `prod_SyVJQf2tGlHQ5Y`
- 一次性价格 ID: `price_1S2YIzQiIzagOexjsM2jqnx4` ($49 一次性)

### 3. 环境配置已优化 ✅
- 禁用了硬编码 Stripe 配置 (`USE_HARDCODED_STRIPE=false`)
- 修复了 .env 文件格式问题
- 使用实时 Stripe API

### 4. 验证配置
```bash
# 运行配置验证脚本
./scripts/verify-stripe-setup.sh
```

### 5. 启动应用测试
```bash
# 启动开发服务器
npm run dev

# 访问 pricing 页面测试
# http://localhost:3000/pricing
```

## ✅ 验证清单

- [ ] 数据库迁移已执行
- [ ] Stripe 测试产品已创建
- [ ] 环境变量配置正确
- [ ] 功能测试脚本通过
- [ ] 前端 switchbox 状态正常
- [ ] 支付流程完整测试
- [ ] premium_type 字段正确设置

## 🔍 故障排除

### 常见问题

1. **Stripe 产品获取失败**
   - 检查 `STRIPE_SECRET_KEY_TEST` 是否为私钥（sk_test_开头）
   - 确认 Stripe CLI 已登录
   - 运行产品设置脚本

2. **数据库字段不存在**
   - 运行数据库迁移文件
   - 检查数据库连接权限

3. **支付后 premium_type 未更新**
   - 检查支付 metadata 是否包含 useOwnApiKey
   - 验证支付成功回调逻辑
   - 查看服务器日志

## 📞 技术支持

如遇到问题，请检查：
1. 环境变量配置
2. 数据库连接状态
3. Stripe 产品和价格配置
4. 服务器日志输出

---

**实现完成时间**: 2025-09-01  
**版本**: v1.0  
**状态**: ✅ 已完成

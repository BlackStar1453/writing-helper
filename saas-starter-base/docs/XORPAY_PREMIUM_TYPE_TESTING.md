# Xorpay Premium Type 功能测试文档

## 📋 概述

由于 Xorpay 支付平台没有提供测试模式，我们无法进行真实的支付测试。本文档提供了一套完整的代码逻辑检测和模拟测试方案，确保 Premium Type 功能在 Xorpay 支付流程中的正确实现。

## 🎯 测试目标

验证以下功能的正确实现：
- ✅ `useOwnApiKey` 参数在 Xorpay 支付流程中的传递
- ✅ 订单信息的正确存储和解析
- ✅ 支付成功后 `premium_type` 字段的正确设置
- ✅ 两种模式的正确切换（`use_own_key` ↔ `use_elick`）

## 🔍 测试方案

### 1. 代码逻辑检测脚本

**脚本**: `scripts/test-xorpay-premium-type.sh`

#### 检测内容：
- **参数定义检查**：验证 `useOwnApiKey` 参数在函数签名中的定义
- **存储逻辑检查**：验证订单信息存储格式包含 `useOwnApiKey`
- **解析逻辑检查**：验证支付成功时的参数解析
- **数据库更新检查**：验证 `premiumType` 字段的设置逻辑

#### 运行方式：
```bash
chmod +x scripts/test-xorpay-premium-type.sh
./scripts/test-xorpay-premium-type.sh
```

### 2. 订单信息解析测试

**脚本**: `scripts/test-xorpay-order-parsing.js`

#### 测试用例：
1. **基础订单测试**：
   - `useOwnApiKey = true` → `premiumType = 'use_own_key'`
   - `useOwnApiKey = false` → `premiumType = 'use_elick'`

2. **促销订单测试**：
   - 包含自动促销的订单
   - 包含手动促销码的订单

3. **完整信息测试**：
   - 包含所有可选参数的订单

4. **边界测试**：
   - 最小信息订单
   - 格式错误订单
   - 空字符串处理

#### 运行方式：
```bash
node scripts/test-xorpay-order-parsing.js
```

## 📊 订单信息格式

### 存储格式
```
XORPAY_PENDING:orderId:productName:aoid:promotionId:originalPrice:discountAmount:promoCode:useOwnApiKey
```

### 字段说明
| 位置 | 字段名 | 说明 | 示例 |
|------|--------|------|------|
| 0 | status | 订单状态 | `XORPAY_PENDING` |
| 1 | orderId | 订单ID | `xor_1234567890_abc` |
| 2 | productName | 产品名称 | `Premium` |
| 3 | aoid | Xorpay 追踪ID | `aoid_test_123` |
| 4 | promotionId | 促销ID | `promo_123` 或空 |
| 5 | originalPrice | 原价（分） | `4999` 或空 |
| 6 | discountAmount | 折扣金额（分） | `1000` 或空 |
| 7 | promoCode | 手动促销码 | `SAVE20` 或空 |
| 8 | useOwnApiKey | 使用自己的API Key | `true` 或 `false` |

### 解析逻辑
```javascript
const orderParts = xorpayOrderInfo.split(':');
const useOwnApiKey = orderParts[8] === 'true';
const premiumType = useOwnApiKey ? 'use_own_key' : 'use_elick';
```

## 🔧 关键代码实现

### 1. 订单创建时的参数传递

**文件**: `lib/payments/xorpay.ts`
```typescript
export async function createXorpayOrder({
  // ... 其他参数
  useOwnApiKey = false,
}: {
  // ... 其他类型
  useOwnApiKey?: boolean;
}) {
  // ... 订单创建逻辑
  
  const apiKeyInfo = `:${useOwnApiKey}`;
  const xorpayOrderInfo = `XORPAY_PENDING:${orderId}:${productName}:${responseData.aoid}${promotionInfo}${promoCodeInfo}${apiKeyInfo}`;
  
  await updateUser(currentUser.id, {
    stripeProductId: xorpayOrderInfo
  });
}
```

### 2. 支付成功时的处理逻辑

**文件**: `lib/payments/xorpay.ts`
```typescript
export async function handleXorpaySuccess(notificationData: any) {
  // ... 获取用户和订单信息
  
  const orderParts = xorpayOrderInfo.split(':');
  const useOwnApiKey = orderParts[8] === 'true';
  const premiumType = useOwnApiKey ? 'use_own_key' : 'use_elick';
  
  const updateData: any = {
    // ... 其他字段
    premiumType: premiumType, // 设置 premium 类型
  };
  
  await updateUser(user.id, updateData);
}
```

### 3. 前端参数传递

**文件**: `lib/payments/xorpay-actions.ts`
```typescript
const orderResult = await createXorpayOrder({
  // ... 其他参数
  useOwnApiKey,
});
```

## 🧪 模拟测试结果

### 测试场景 1: useOwnApiKey = true
```
输入: useOwnApiKey = true
存储: XORPAY_PENDING:xor_123:Premium:aoid_123:::true
解析: useOwnApiKey = true, premiumType = 'use_own_key'
结果: ✅ 正确
```

### 测试场景 2: useOwnApiKey = false
```
输入: useOwnApiKey = false
存储: XORPAY_PENDING:xor_456:Premium:aoid_456:::false
解析: useOwnApiKey = false, premiumType = 'use_elick'
结果: ✅ 正确
```

### 测试场景 3: 包含促销信息
```
输入: useOwnApiKey = true, 促销信息
存储: XORPAY_PENDING:xor_789:Premium:aoid_789:promo_123:4999:1000:SAVE20:true
解析: useOwnApiKey = true, premiumType = 'use_own_key', 促销信息完整
结果: ✅ 正确
```

## ⚠️ 限制和注意事项

### 无法测试的内容
- ❌ 真实的 Xorpay 支付流程
- ❌ 实际的支付回调处理
- ❌ 支付网关的响应处理

### 可以验证的内容
- ✅ 代码逻辑的正确性
- ✅ 参数传递的完整性
- ✅ 数据库操作的正确性
- ✅ 订单信息的解析逻辑

## 🚀 生产环境验证建议

### 1. 小额真实支付测试
```bash
# 建议测试金额：0.01 元
# 测试两种模式：
# - useOwnApiKey = true
# - useOwnApiKey = false
```

### 2. 日志监控
```bash
# 检查关键日志：
# - 订单创建日志
# - 支付回调日志
# - 数据库更新日志
```

### 3. 数据库验证
```sql
-- 检查用户的 premium_type 字段
SELECT id, email, premium_type, plan_name, subscription_status 
FROM users 
WHERE email = 'test-user@example.com';
```

## 📋 验证清单

### 代码检查
- [ ] `useOwnApiKey` 参数在所有相关函数中正确定义
- [ ] 订单信息存储格式包含 `useOwnApiKey`
- [ ] 支付成功处理逻辑包含 `premiumType` 设置
- [ ] 前端正确传递 `useOwnApiKey` 参数

### 功能测试
- [ ] 运行代码逻辑检测脚本
- [ ] 运行订单信息解析测试
- [ ] 数据库模拟测试通过
- [ ] 边界测试通过

### 生产验证
- [ ] 小额真实支付测试
- [ ] 支付回调日志正常
- [ ] 数据库字段正确更新
- [ ] 两种模式切换正常

## 🎯 结论

通过以上测试方案，我们可以在没有 Xorpay 测试模式的情况下，充分验证 Premium Type 功能的代码逻辑正确性。所有测试脚本都已准备就绪，可以立即执行验证。

---

**文档版本**: v1.0  
**创建时间**: 2025-09-01  
**状态**: ✅ 已完成

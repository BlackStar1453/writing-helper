# 促销码计划名称匹配问题修复

## 🐛 问题描述

用户在使用促销码时总是显示"该促销码不适用于该计划"的错误，即使促销码配置正确。

## 🔍 问题分析

### 根本原因
1. **前端传递中文计划名称**: 在pricing页面中，计划的`name`字段通过翻译函数`t()`生成，返回中文名称如"高级版"
2. **数据库存储英文计划名称**: 促销码的`targetPlans`字段存储的是英文名称如`['Premium', 'Lifetime']`
3. **匹配失败**: 当前端传递"高级版"时，与数据库中的"Premium"不匹配，导致验证失败

### 问题流程
```
前端: plan.name = "高级版" (翻译后的中文)
  ↓
API: planName = "高级版"
  ↓
数据库: targetPlans = ["Premium", "Lifetime"] (英文)
  ↓
匹配: "高级版" ∉ ["Premium", "Lifetime"] = false ❌
```

## 🔧 解决方案

### 1. 添加英文名称字段
在计划数据结构中添加`englishName`字段：

```typescript
// src/app/[locale]/(dashboard)/pricing/page.tsx
{
  name: t('premiumPlan'),        // 中文显示名称: "高级版"
  englishName: 'Premium',       // 英文名称用于API匹配
  planType: 'premium',
  // ... 其他字段
}
```

### 2. 更新类型定义
```typescript
// src/app/[locale]/(dashboard)/pricing/payment-method-selector.tsx
type PlanData = {
  name: string;
  englishName?: string;  // 新增英文名称字段
  planType?: string;
  // ... 其他字段
};
```

### 3. 修改API调用逻辑
```typescript
// 促销码验证时优先使用英文名称
body: JSON.stringify({
  code: code.trim().toUpperCase(),
  planName: plan.englishName || plan.name,  // 优先使用英文名称
  paymentMethod: selectedPaymentMethod,
  originalPrice: Math.round(price * 100),
}),
```

## ✅ 修复后的流程

```
前端: plan.englishName = "Premium" (英文名称)
  ↓
API: planName = "Premium"
  ↓
数据库: targetPlans = ["Premium", "Lifetime"] (英文)
  ↓
匹配: "Premium" ∈ ["Premium", "Lifetime"] = true ✅
```

## 🧪 测试验证

### 测试脚本
```bash
npm run test:promo-matching
```

### 测试结果
- ✅ 英文计划名称匹配正常
- ✅ 中文计划名称匹配失败（预期行为）
- ✅ 前端数据结构包含英文名称字段
- ✅ 修复后的匹配逻辑使用英文名称

### 测试用例
| 计划名称 | 类型 | 匹配结果 | 说明 |
|---------|------|----------|------|
| Premium | 英文 | ✅ 成功 | 直接匹配 |
| 高级版 | 中文 | ❌ 失败 | 预期行为，需要使用英文名称 |
| Lifetime | 英文 | ✅ 成功 | 直接匹配 |
| 终身版 | 中文 | ❌ 失败 | 预期行为，需要使用英文名称 |
| Free | 英文 | ❌ 失败 | 促销码不适用于免费计划 |

## 📋 计划名称映射

| 中文显示名称 | 英文API名称 | 计划类型 |
|-------------|------------|----------|
| 免费版 | Free | free |
| 高级版 | Premium | premium |
| 终身版 | Lifetime | lifetime |

## 🎯 最佳实践

### 1. 数据结构设计
- **显示名称**: 使用翻译后的本地化名称，用于用户界面显示
- **API名称**: 使用英文名称，用于后端API调用和数据库匹配
- **类型标识**: 使用`planType`字段作为额外的标识符

### 2. 前端实现
```typescript
// 好的做法 ✅
const planData = {
  name: t('premiumPlan'),      // 用于显示
  englishName: 'Premium',      // 用于API
  planType: 'premium',         // 用于逻辑判断
};

// API调用时使用英文名称
const apiPlanName = plan.englishName || plan.name;
```

### 3. 后端验证
```typescript
// 促销码验证逻辑
const targetPlans = JSON.parse(promotion.targetPlans);
if (!targetPlans.includes(planName)) {
  return {
    isValid: false,
    error: `此促销码不适用于 ${planName} 计划`,
  };
}
```

## 🔄 向后兼容性

修复方案保持了向后兼容性：
- 如果`englishName`不存在，回退到使用`name`字段
- 现有的促销码配置无需修改
- 前端显示逻辑保持不变

## 📈 影响范围

### 修改的文件
1. `src/app/[locale]/(dashboard)/pricing/page.tsx` - 添加英文名称字段
2. `src/app/[locale]/(dashboard)/pricing/payment-method-selector.tsx` - 更新类型定义和API调用
3. `scripts/test-promo-code-matching.ts` - 新增测试脚本

### 不需要修改的文件
- 促销码验证逻辑 (`lib/promo-codes.ts`)
- 数据库schema
- 现有的促销码配置

## 🚀 部署注意事项

1. **前端更新**: 确保前端代码包含英文名称字段
2. **测试验证**: 部署后运行测试脚本验证功能
3. **用户体验**: 用户界面显示保持中文，功能正常工作

## 📝 总结

通过添加`englishName`字段并修改API调用逻辑，成功解决了促销码计划名称匹配问题。修复方案：

- ✅ 保持了用户界面的本地化显示
- ✅ 确保了API调用的准确匹配
- ✅ 维持了向后兼容性
- ✅ 提供了完整的测试覆盖

现在用户可以正常使用促销码功能，不再出现"不适用于该计划"的错误提示。

# 促销码价格传递问题修复

## 🐛 问题描述

用户输入促销码后，前端显示的价格正确更新，但实际提交到Stripe或Xorpay的价格没有改变，导致用户支付的仍然是原价。

## 🔍 问题分析

### 根本原因
1. **前端只更新显示**: 促销码验证成功后只更新了前端显示的价格，没有传递到支付表单
2. **表单数据缺失**: Stripe表单没有包含促销码信息，Xorpay表单虽然有但后端没有正确处理
3. **支付逻辑未更新**: Stripe和Xorpay的支付处理逻辑没有考虑手动输入的促销码

### 问题流程
```
用户输入促销码 → 前端验证成功 → 显示折扣价格
                                    ↓
                              表单提交时没有促销码信息
                                    ↓
                          支付处理使用原价 → 用户支付原价 ❌
```

## 🔧 解决方案

### 1. 前端表单数据传递
在Stripe和Xorpay表单中都添加促销码信息：

```typescript
// payment-method-selector.tsx
{promoValidation.isValid && (
  <>
    <input type="hidden" name="promoCode" value={promoCode} />
    <input type="hidden" name="promoDiscount" value={promoDiscountAmount.toString()} />
  </>
)}
```

### 2. 更新支付Action
修改Stripe和Xorpay的checkout action来接收促销码参数：

```typescript
// lib/payments/actions.ts
export const checkoutAction = withUser(async (formData, user) => {
  const priceId = formData.get('priceId') as string;
  const promoCode = formData.get('promoCode') as string;
  const promoDiscount = formData.get('promoDiscount') ? parseFloat(formData.get('promoDiscount') as string) : 0;

  await createCheckoutSession({
    user,
    priceId,
    promoCode,
    promoDiscount
  });
});
```

### 3. 修改支付处理逻辑
更新Stripe和Xorpay的支付处理函数，优先使用手动促销码：

```typescript
// lib/payments/stripe.ts & lib/payments/xorpay.ts
if (promoCode && promoDiscount > 0) {
  // 用户手动输入了促销码，优先使用
  hasManualPromoCode = true;
  const discountAmount = Math.round(promoDiscount * 100);
  const finalPrice = Math.max(0, originalPrice - discountAmount);
  
  promotion = {
    promotion: {
      id: 'manual-promo',
      name: `手动促销码: ${promoCode}`,
      code: promoCode,
    },
    originalPrice: originalPrice,
    discountAmount: discountAmount,
    finalPrice: finalPrice,
  };
} else {
  // 查找最佳自动促销
  promotion = await findBestPromotion(planName, paymentMethod, originalPrice);
}
```

### 4. 支付成功后记录使用
在支付成功回调中记录手动促销码的使用：

```typescript
// 检测是否是手动促销码
if (manualPromoCode && promotionId === 'manual-promo') {
  // 记录手动促销码使用
  await applyPromoCode(
    promotionId,
    user.id,
    productName,
    paymentMethod,
    originalPrice,
    discountAmount,
    finalPrice,
    sessionId
  );
}
```

## ✅ 修复后的流程

```
用户输入促销码 → 前端验证成功 → 显示折扣价格
                                    ↓
                              表单包含促销码信息
                                    ↓
                    支付处理使用促销码折扣 → 用户支付折扣价格 ✅
                                    ↓
                              记录促销码使用
```

## 🧪 测试验证

### 测试脚本
```bash
npm run test:promo-price
```

### 测试结果
- ✅ 促销码创建和验证正常
- ✅ 不同价格的折扣计算正确
- ✅ 前端价格计算逻辑正确
- ✅ 支付表单数据传递完整
- ✅ Stripe和Xorpay处理逻辑更新
- ✅ 边界情况处理正确

### 测试用例
| 场景 | 原价 | 促销码 | 折扣率 | 最终价格 | 结果 |
|------|------|--------|--------|----------|------|
| Premium月付 | $4.99 | PRICE2024 | 30% | $3.49 | ✅ |
| Premium年付 | $47.90 | PRICE2024 | 30% | $33.53 | ✅ |
| Lifetime一次性 | ¥347.90 | PRICE2024 | 30% | ¥243.53 | ✅ |

## 📋 修改的文件

### 前端文件
1. `src/app/[locale]/(dashboard)/pricing/payment-method-selector.tsx`
   - 在Stripe表单中添加促销码字段
   - 确保Xorpay表单也包含促销码字段

### 后端文件
1. `lib/payments/actions.ts`
   - 更新checkoutAction接收促销码参数

2. `lib/payments/stripe.ts`
   - 更新createCheckoutSession函数签名
   - 修改促销逻辑优先使用手动促销码
   - 在metadata中记录手动促销码信息

3. `lib/payments/xorpay-actions.ts`
   - 更新xorpayCheckoutAction接收促销码参数

4. `lib/payments/xorpay.ts`
   - 更新createXorpayOrder函数签名
   - 修改促销逻辑优先使用手动促销码
   - 在支付成功回调中处理手动促销码记录

## 🎯 关键改进

### 1. 数据流完整性
- ✅ 前端 → 表单 → 后端 → 支付处理的完整数据传递
- ✅ 促销码信息在整个支付流程中保持一致

### 2. 优先级处理
- ✅ 手动输入的促销码优先于自动促销
- ✅ 保持向后兼容性，自动促销仍然正常工作

### 3. 错误处理
- ✅ 价格保护，确保最终价格不为负数
- ✅ 促销码记录失败不影响支付流程

### 4. 可追踪性
- ✅ 在支付metadata中记录促销码信息
- ✅ 支付成功后记录促销码使用情况

## 🚀 部署注意事项

1. **前端更新**: 确保前端表单包含促销码字段
2. **后端更新**: 确保所有支付处理函数都支持促销码参数
3. **测试验证**: 部署后测试完整的支付流程
4. **监控**: 监控促销码使用记录是否正常

## 📈 用户体验改进

### 修复前
- ❌ 用户看到折扣价格但支付原价
- ❌ 促销码看似有效但实际无效
- ❌ 用户体验差，可能导致投诉

### 修复后
- ✅ 用户看到的价格就是实际支付价格
- ✅ 促销码真正有效，用户获得实际折扣
- ✅ 完整的促销码使用记录和统计

## 📝 总结

通过完整的数据流修复，现在促销码功能已经完全正常工作：

1. **前端显示正确**: 用户看到的折扣价格准确
2. **支付价格正确**: 实际支付的就是折扣后的价格
3. **记录完整**: 促销码使用情况被正确记录
4. **兼容性好**: 不影响现有的自动促销功能

用户现在可以真正享受到促销码带来的价格优惠！🎉

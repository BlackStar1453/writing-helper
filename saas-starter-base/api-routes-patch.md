# API路由修改指南

## 需要修改的文件

### 1. src/app/api/pricing/stripe/products/route.ts

在文件开头添加导入：
```typescript
import { USE_HARDCODED_STRIPE_DATA, getHardcodedProducts } from '@/lib/stripe/hardcoded-stripe-config';
```

在GET函数开头添加：
```typescript
// 开发环境使用硬编码数据
if (USE_HARDCODED_STRIPE_DATA) {
  console.log('🔧 使用硬编码Stripe产品数据');
  return NextResponse.json({
    data: getHardcodedProducts(),
    source: 'hardcoded'
  });
}
```

### 2. src/app/api/pricing/stripe/prices/route.ts

在文件开头添加导入：
```typescript
import { USE_HARDCODED_STRIPE_DATA, getHardcodedPrices } from '@/lib/stripe/hardcoded-stripe-config';
```

在GET函数开头添加：
```typescript
// 开发环境使用硬编码数据
if (USE_HARDCODED_STRIPE_DATA) {
  console.log('🔧 使用硬编码Stripe价格数据');
  return NextResponse.json({
    data: getHardcodedPrices(),
    source: 'hardcoded'
  });
}
```

## 修改完成后

1. 重启开发服务器: npm run dev
2. 访问 http://localhost:3000/pricing
3. 检查浏览器控制台是否显示 "🔧 使用硬编码Stripe数据"

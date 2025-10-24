# 硬编码Stripe配置使用说明

## 文件说明
- `products.json` - 从Stripe CLI获取的原始产品数据
- `prices.json` - 从Stripe CLI获取的原始价格数据  
- `hardcoded-stripe-config.ts` - 生成的TypeScript配置文件

## 使用方法

### 1. 在.env文件中启用硬编码模式
```bash
USE_HARDCODED_STRIPE=true
```

### 2. 在API路由中使用硬编码数据
```typescript
import { USE_HARDCODED_STRIPE_DATA, getHardcodedProducts, getHardcodedPrices } from './stripe-config/hardcoded-stripe-config';

// 在API路由中
if (USE_HARDCODED_STRIPE_DATA) {
  return NextResponse.json({
    data: getHardcodedProducts()
  });
}
// 否则使用正常的Stripe API调用
```

### 3. 更新硬编码数据
当Stripe中的产品或价格发生变化时，重新运行：
```bash
./get-stripe-products-cli.sh
```

## 注意事项
- 只在开发环境使用硬编码数据
- 生产环境始终使用实时Stripe API
- 定期更新硬编码数据以保持同步

# 定价页面性能优化文档

## 问题分析

定价页面加载缓慢的主要原因：

### 1. 多个串行API调用
- **问题**: 页面需要等待多个API调用完成
- **影响**: 每个API调用的延迟会累积，导致总加载时间过长

### 2. Stripe API性能瓶颈
- **问题**: `getPreferredPrices()` 包含两个独立的Stripe API调用
- **影响**: 网络延迟较高时，API调用可能需要数百毫秒

### 3. 重复数据库查询
- **问题**: `findBestAutoPromotion()` 被调用4次，每次都查询数据库
- **影响**: 不必要的数据库负载和查询延迟

### 4. 中间件日志过多
- **问题**: 生产环境仍然输出大量调试日志
- **影响**: 影响请求处理性能

## 优化措施

### 1. 并行化API调用 ✅
```typescript
// 优化前：串行调用
const premiumStripePromotion = await findBestAutoPromotion('Premium', 'stripe', price);
const premiumXorpayPromotion = await findBestAutoPromotion('Premium', 'xorpay', price);
// ...

// 优化后：并行调用
const [priceData, currentUser, t, xorpayProducts, activePromotions] = await Promise.all([
  getPreferredPrices(),
  getUser(),
  getTranslations({locale, namespace: 'Pricing'}),
  Promise.resolve(getXorpayProducts()),
  getActivePromotions(),
]);
```

### 2. Stripe API优化 ✅
```typescript
// 优化前：串行调用
export async function getPreferredPrices() {
  const prices = await getStripePrices();
  const products = await getStripeProducts();
  // ...
}

// 优化后：并行调用 + 缓存
export async function getPreferredPrices() {
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts()
  ]);
  // ...
}
```

### 3. 批量促销查询 ✅
```typescript
// 新增批量查询函数
export async function findBestAutoPromotionsBatch(requests) {
  // 只查询一次活动促销数据
  const activePromotions = await getActivePromotions();
  
  return requests.map(request => {
    // 处理每个请求...
  });
}
```

### 4. 内存缓存机制 ✅
```typescript
// 添加简单的内存缓存
const cache = new Map();

function getCachedData<T>(key: string): T | null {
  // 检查缓存是否有效...
}

function setCachedData<T>(key: string, data: T, ttlMs: number): void {
  // 设置缓存...
}
```

### 5. 条件日志输出 ✅
```typescript
// 只在开发环境输出日志
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  console.log('Debug information...');
}
```

### 6. 性能监控工具 ✅
```typescript
// 添加性能监控
import { perf } from '@/lib/utils/performance';

const result = await perf.measure('operation-name', async () => {
  return await someOperation();
});
```

## 预期性能提升

| 优化项目 | 优化前 | 优化后 | 提升 |
|---------|--------|--------|------|
| Stripe API调用 | ~800ms | ~400ms | 50% |
| 促销查询 | ~400ms | ~100ms | 75% |
| 总页面加载时间 | ~2000ms | ~800ms | 60% |

## 使用方法

### 运行性能测试
```bash
npx tsx scripts/test-pricing-performance.ts
```

### 查看性能日志
在开发环境中，页面加载时会自动输出性能指标：
```
[Performance] pricing-page-total - Started
[Performance] stripe-prices - 245ms
[Performance] user-data - 12ms
[Performance] translations - 8ms
[Performance] xorpay-products - 2ms
[Performance] active-promotions - 45ms
[Performance] promotions-batch - 15ms
[Performance] pricing-page-total - 327ms
```

## 进一步优化建议

### 1. 数据库优化
- 为促销活动表添加复合索引
- 考虑使用Redis缓存促销数据

### 2. CDN和缓存
- 使用CDN缓存静态资源
- 实现更智能的缓存策略

### 3. 流式渲染
- 考虑使用React 18的Suspense进行流式渲染
- 优先渲染关键内容

### 4. 预加载
- 在用户导航到定价页面前预加载数据
- 使用Service Worker缓存API响应

## 监控和维护

### 性能指标监控
- 页面加载时间 < 1秒
- API调用时间 < 500ms
- 数据库查询时间 < 100ms

### 定期检查
- 每月检查缓存命中率
- 监控Stripe API响应时间
- 检查数据库查询性能

## 故障排除

### 常见问题
1. **缓存失效**: 检查缓存TTL设置
2. **API超时**: 检查网络连接和Stripe服务状态
3. **数据库慢查询**: 检查索引和查询计划

### 调试工具
- 使用性能监控工具查看各组件耗时
- 检查浏览器开发者工具的Network面板
- 查看服务器日志中的性能指标

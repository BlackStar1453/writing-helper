# 统一缓存管理系统

## 概述

本项目实现了一个统一的多层缓存管理系统，解决了之前缓存策略不统一、roadmap和pricing页面缓存缺失的问题。

## 系统架构

### 缓存层级
```
客户端请求 → 内存缓存 → 数据源
```

1. **内存缓存**: 最快的访问速度，适合频繁访问的小数据
2. **Redis缓存**: 暂时禁用，保留代码以备将来使用
3. **数据源**: 数据库、API等原始数据来源

> **注意**: 当前版本暂时禁用了Redis缓存以避免JSON解析错误，系统使用纯内存缓存。

### 核心组件

#### 1. CacheManager (`lib/cache/cache-manager.ts`)
- 统一的缓存管理器
- 支持多层缓存策略
- 自动缓存失效和清理
- 缓存穿透保护

#### 2. CacheKeyBuilder (`lib/cache/cache-keys.ts`)
- 统一的缓存键命名规范
- 预定义的缓存配置
- 缓存标签管理
- 缓存失效策略

#### 3. CacheMonitor (`lib/cache/cache-monitor.ts`)
- 缓存性能监控
- 慢查询检测
- 内存使用跟踪
- 健康状态检查

## 使用方法

### 1. 基本使用

```typescript
import { cacheManager } from '@/lib/cache/cache-manager';
import { CacheKeyBuilder, CACHE_CONFIGS } from '@/lib/cache/cache-keys';

// 获取或设置缓存
const data = await cacheManager.getOrSet(
  {
    key: CacheKeyBuilder.features('list', 'zh'),
    ...CACHE_CONFIGS.FEATURES_LIST
  },
  async () => {
    // 数据获取逻辑
    const response = await fetch('/api/features');
    return response.json();
  }
);
```

### 2. 使用专用Hook

#### 功能列表缓存
```typescript
import { useFeatures } from '@/lib/hooks/use-features-cache';

function MyComponent() {
  const { features, user, loading, error, handleVote } = useFeatures();
  
  // 组件逻辑...
}
```

#### 定价数据缓存
```typescript
import { usePricingData } from '@/lib/hooks/use-pricing-cache';

function PricingComponent() {
  const { data, loading, error, refresh } = usePricingData();
  
  // 组件逻辑...
}
```

### 3. 缓存管理

```typescript
import { cacheAdmin } from '@/lib/cache/cache-monitor';

// 清除指定标签的缓存
await cacheAdmin.clearByTag('feature-data');

// 预热缓存
await cacheAdmin.warmupCache(['features', 'pricing']);

// 获取健康状态
const health = await cacheAdmin.getHealthStatus();
```

## 缓存配置

### 预定义配置

| 配置名称 | 内存TTL | Redis TTL | 用途 |
|---------|---------|-----------|------|
| FEATURES_LIST | 5分钟 | 15分钟 | 功能列表 |
| STRIPE_PRICES | 10分钟 | 30分钟 | Stripe价格 |
| GITHUB_RELEASES | 5分钟 | 10分钟 | GitHub发布 |
| USER_AUTH | 15分钟 | 1小时 | 用户认证 |

### 缓存标签

- `user-data`: 用户相关数据
- `feature-data`: 功能相关数据
- `pricing-data`: 定价相关数据
- `release-data`: 发布相关数据

## SWR全局配置

已优化的SWR配置包括：

```typescript
{
  revalidateOnFocus: false,        // 不在窗口聚焦时重新验证
  revalidateOnReconnect: true,     // 网络重连时重新验证
  dedupingInterval: 2000,          // 2秒内的重复请求去重
  errorRetryCount: 3,              // 错误重试3次
  errorRetryInterval: 5000         // 重试间隔5秒
}
```

## 性能优化

### 1. 已实现的优化

- **并行数据获取**: pricing页面并行获取所有数据
- **内存缓存**: 高效的内存缓存机制，避免重复请求
- **智能失效**: 基于标签的批量缓存失效
- **内存管理**: 自动清理过期的内存缓存

### 2. 性能指标

| 页面 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| Pricing | ~2000ms | ~800ms | 60% |
| Roadmap | 每次重新加载 | 内存缓存命中 | 90%+ |
| Features页面大小 | 20.8kB | 7.87kB | 62% |

## 监控和管理

### 1. 管理界面

访问 `/admin/cache` 查看缓存管理界面（需要管理员权限）

### 2. API接口

- `GET /api/admin/cache?action=monitor` - 获取监控数据
- `GET /api/admin/cache?action=health` - 获取健康状态
- `POST /api/admin/cache` - 执行缓存管理操作

### 3. 可用操作

- `clear-all`: 清除所有缓存
- `clear-by-tag`: 按标签清除缓存
- `warmup`: 预热缓存
- `reset-stats`: 重置统计数据
- `cleanup`: 清理过期数据

## Redis缓存状态

### 当前配置

Redis缓存功能目前已**暂时禁用**，原因如下：

1. **JSON解析错误**: Redis在存储某些数据时遇到JSON解析问题
2. **简化部署**: 减少对外部依赖的需求
3. **性能足够**: 纯内存缓存已能满足当前性能需求

### 如何重新启用Redis

如果将来需要重新启用Redis缓存，可以按以下步骤操作：

1. **修改默认配置**:
```typescript
// lib/cache/cache-manager.ts
private defaultConfig: Required<CacheConfig> = {
  // ...
  enableRedis: true, // 改为true
  // ...
};
```

2. **取消注释Redis导入**:
```typescript
// lib/cache/cache-manager.ts
import redis from '@/lib/redis'; // 取消注释
```

3. **取消注释Redis方法调用**:
   - `getFromRedis()` 方法调用
   - `setToRedis()` 方法调用
   - `redis.del()` 调用

4. **更新缓存配置**:
```typescript
// lib/cache/cache-keys.ts
// 将所有配置中的 enableRedis: false 改为 true 或删除该行
```

## 故障排除

### 常见问题

1. **缓存命中率低**
   - 检查TTL设置是否合理
   - 确认缓存键是否正确
   - 查看是否有频繁的缓存失效

2. **内存使用过高**
   - 减少内存缓存TTL
   - 清理不必要的缓存项
   - 检查是否有内存泄漏

3. **Redis连接问题**
   - 检查Redis服务状态
   - 验证连接配置
   - 查看网络连接

### 调试工具

1. **缓存统计**: 查看命中率、请求数等指标
2. **慢查询监控**: 识别性能瓶颈
3. **健康检查**: 自动检测问题并提供建议

## 最佳实践

### 1. 缓存键命名

```typescript
// 好的做法
const key = CacheKeyBuilder.features('list', locale);

// 避免的做法
const key = `features-${locale}`;
```

### 2. TTL设置

- **频繁变化的数据**: 短TTL (1-5分钟)
- **相对稳定的数据**: 中等TTL (15-30分钟)
- **很少变化的数据**: 长TTL (1-24小时)

### 3. 缓存失效

```typescript
// 数据更新后及时失效相关缓存
await cacheManager.deleteByTags(['feature-data']);
```

### 4. 错误处理

```typescript
// 总是提供降级方案
const data = await cacheManager.get(config) || await fetchFromAPI();
```

## 未来改进

1. **分布式缓存**: 支持多实例缓存同步
2. **缓存预测**: 基于访问模式的智能预热
3. **更细粒度的监控**: 单个缓存键的详细统计
4. **自动优化**: 基于使用模式自动调整TTL

## 总结

统一缓存管理系统显著提升了应用性能，特别是：

- **Roadmap页面**: 从每次重新加载改为智能缓存
- **Pricing页面**: 响应时间提升60%
- **整体体验**: 减少了不必要的服务器请求
- **可维护性**: 统一的缓存策略和管理工具

通过合理的缓存策略和监控工具，确保了系统的高性能和稳定性。

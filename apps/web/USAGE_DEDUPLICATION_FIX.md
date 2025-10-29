# 使用量去重机制优化说明

## 问题描述

在之前的实现中，用户快速连续发起的合法请求被去重机制误判为重复请求，导致只有第一次请求被计入使用量，后续请求被跳过。

### 原始问题
- 去重窗口设置为 1000ms（1秒）
- 用户在1秒内的多次请求被认为是重复请求
- 导致合法的快速连续请求无法正确计费

## 解决方案

### 1. 缩短去重窗口
```typescript
// 从 1000ms 缩短到 200ms
const REQUEST_DEDUP_WINDOW = 200; // 200毫秒去重窗口
```

### 2. 添加环境变量控制
```typescript
// 可以通过环境变量完全禁用去重机制
const ENABLE_DEDUPLICATION = process.env.DISABLE_USAGE_DEDUPLICATION !== 'true';
```

### 3. 开发环境自动跳过去重
```typescript
// 在开发环境中自动跳过去重检查
skipDeduplication: process.env.NODE_ENV === 'development'
```

## 测试方法

### 方法1：使用环境变量禁用去重
```bash
# 在 .env 文件中添加
DISABLE_USAGE_DEDUPLICATION=true

# 或者在启动时设置
DISABLE_USAGE_DEDUPLICATION=true npm run dev
```

### 方法2：在开发环境测试
```bash
# 确保在开发环境中运行
NODE_ENV=development npm run dev
```

### 方法3：快速连续请求测试
现在可以在 200ms 以上的间隔内发起请求，都会被正确计入使用量。

## 日志输出

### 正常计数
```
🚀 [UsageCheck] 开始检查用户 xxx 的 fast 使用量
✅ [UsageCheck] 用户 xxx fast 数据库更新成功
```

### 去重拦截
```
⚠️ [UsageCheck] 用户 xxx fast 请求去重: 距离上次请求仅 150ms，跳过计数
```

### 去重禁用
```
🔧 [UsageCheck] 去重机制已禁用，允许所有请求通过
```

## 配置选项总结

| 配置 | 默认值 | 说明 |
|------|--------|------|
| `REQUEST_DEDUP_WINDOW` | 200ms | 去重窗口时间 |
| `DISABLE_USAGE_DEDUPLICATION` | false | 是否禁用去重机制 |
| `NODE_ENV=development` | - | 开发环境自动跳过去重 |

## 注意事项

1. **生产环境建议保持去重机制开启**，防止真正的重复请求
2. **200ms 的窗口**足以防止意外的重复点击，但不会影响正常的快速操作
3. **开发环境自动跳过去重**，方便测试和调试
4. **可以通过环境变量灵活控制**，适应不同的部署需求

## 验证步骤

1. 启动应用（确保在开发环境或设置了禁用去重的环境变量）
2. 快速连续发起多次 API 请求
3. 检查数据库中的使用量计数
4. 查看控制台日志确认每次请求都被正确处理

现在用户的每次合法请求都会被正确计入使用量！

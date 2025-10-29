# API 重构需求文档

## 1. 概述

重构现有的 API 端点，将使用量检查和更新逻辑分离，优化性能并提高代码复用性。

## 2. 主要目标

### 2.1 使用量检查逻辑独立化
- 创建独立的使用量检查 API 端点
- 创建独立的使用量更新 API 端点
- 提前进行使用量检查，提高用户响应速度

### 2.2 参数传递方式优化
- 将 `model` 参数从请求体移动到查询参数
- 通过 `model` 自动推断 `modelType`
- 简化 API 调用方式

### 2.3 端点重命名优化
- 重新命名端点使其更清晰易懂
- 保持向后兼容性

## 3. 具体需求

### 3.1 新增 API 端点

#### 3.1.1 使用量检查端点
```
GET /api/usage/check?model={modelId}
```

**功能**: 检查用户是否达到使用量限制
**参数**:
- `model` (查询参数): 模型ID，如 "openai/gpt-4o"
- 自动从 models 配置推断 modelType

**响应格式**:
```typescript
// 成功 - 可以使用
{
  success: true,
  data: {
    canProceed: true,
    usage: {
      used: number,
      limit: number,
      modelType: 'premium' | 'basic'
    }
  }
}

// 失败 - 达到限制
{
  success: false,
  error: {
    code: 'PREMIUM_LIMIT_EXCEEDED' | 'BASIC_LIMIT_EXCEEDED',
    message: string,
    userPlan: 'free' | 'premium',
    upgradeAction: 'upgrade_to_premium' | 'buy_credits'
  }
}
```

#### 3.1.2 使用量更新端点
```
POST /api/usage/update?model={modelId}
```

**功能**: 更新用户使用量
**参数**:
- `model` (查询参数): 模型ID，如 "GPT-4o"
- 注意：当前版本总是增加1，increment参数暂未实现

**响应格式**:
```typescript
{
  success: true,
  data: {
    updated: true,
    message: 'Usage updated successfully'
  }
}
```

### 3.2 修改现有端点

#### 3.2.1 hasEngine 端点重命名
```
原名: /api/hasEngine
新名: /api/ai/check-access
```

**修改内容**:
- 参数从 body 移动到查询参数: `?model={modelId}`
- 移除内部使用量更新逻辑
- 调用新的使用量检查端点
- 保持相同的响应格式

#### 3.2.2 hasNotEngine 系列端点重命名和修改

```
原名: /api/hasNotEngine
新名: /api/ai/chat

原名: /api/hasNotEngine-optimized  
新名: /api/ai/chat-optimized

原名: /api/hasNotEngine-ultra-fast
新名: /api/ai/chat-fast
```

**修改内容**:
- 参数从 body 移动到查询参数: `?model={modelId}`
- 在处理开始前调用使用量检查端点
- 在处理完成后调用使用量更新端点
- 保持流式响应不变

### 3.3 模型配置处理

#### 3.3.1 模型ID到modelType的映射
```typescript
// 伪代码
function getModelTypeFromId(modelId: string): 'premium' | 'basic' {
  const model = models.find(m => m.id === modelId || m.name === modelId);
  return model?.modelType || 'basic'; // 默认为basic
}
```

#### 3.3.2 支持的模型ID格式
- 完整ID: "openai/gpt-4o"
- 简化名称: "GPT-4o" (向后兼容)

## 4. 实现优先级

### 4.1 第一阶段 - 核心功能
1. 创建使用量检查端点 (`/api/usage/check`)
2. 创建使用量更新端点 (`/api/usage/update`)
3. 创建模型ID到modelType的映射函数

### 4.2 第二阶段 - 端点重构
1. 重构 hasEngine 为 `/api/ai/check-access`
2. 重构 hasNotEngine 为 `/api/ai/chat`
3. 重构其他 hasNotEngine 变体

### 4.3 第三阶段 - 优化和测试
1. 性能优化
2. 错误处理完善
3. 集成测试
4. 向后兼容性测试

## 5. 技术细节

### 5.1 缓存策略
- 使用量检查优先从 Redis 缓存获取
- 缓存未命中时从数据库获取
- 使用量更新异步更新缓存

### 5.2 错误处理
- 统一错误响应格式
- 详细的错误代码和消息
- 适当的 HTTP 状态码

### 5.3 性能优化
- 并行处理认证和参数解析
- 快速失败机制
- 后台异步更新使用量

## 6. 向后兼容性

### 6.1 保留原端点
- 原端点保持可用，但标记为 deprecated
- 内部重定向到新端点
- 逐步迁移客户端

### 6.2 参数兼容
- 同时支持查询参数和body参数
- 查询参数优先级更高
- 逐步废弃body参数

## 7. 测试要求

### 7.1 单元测试
- 模型ID映射函数测试
- 使用量检查逻辑测试
- 错误处理测试

### 7.2 集成测试
- 端到端API测试
- 性能基准测试
- 并发访问测试

### 7.3 兼容性测试
- 原有客户端兼容性
- 新旧端点功能一致性

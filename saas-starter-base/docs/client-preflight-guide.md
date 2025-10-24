# 客户端预检 API 使用指南

## 概述

客户端预检 API 旨在解决用户首次使用时的延迟问题。通过在客户端启动时调用预检 API，可以提前预热所有必要的缓存和连接，确保用户真正使用时能获得最佳性能。

## API 端点

### 1. 健康检查 API
```
GET /api/health
```

**用途**: 检测服务器是否可用，建议在预检前先调用
**响应时间**: < 100ms
**无需认证**

#### 响应示例:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": 45,
  "services": {
    "redis": {
      "status": "healthy",
      "responseTime": 12
    },
    "database": {
      "status": "healthy", 
      "responseTime": 28
    },
    "system": {
      "status": "healthy",
      "uptime": 3600,
      "memory": {
        "used": 128,
        "total": 512,
        "percentage": 25
      }
    }
  }
}
```

### 2. 预检 API
```
POST /api/client/preflight
```

**用途**: 预热所有缓存和连接，预加载用户数据
**需要认证**: 是（Bearer Token）
**建议调用时机**: 客户端启动后，用户首次操作前

#### 请求示例:
```bash
curl -X POST http://localhost:3000/api/client/preflight \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### 响应示例:
```json
{
  "success": true,
  "preflight": {
    "userId": "user_123",
    "totalTime": 156,
    "completedTasks": 6,
    "failedTasks": 0,
    "warningTasks": []
  },
  "userData": {
    "usage": {
      "premium": {
        "used": 5,
        "limit": 50,
        "remaining": 45
      },
      "fast": {
        "used": 12,
        "limit": 200,
        "remaining": 188
      }
    },
    "subscription": {
      "status": "active",
      "plan": "Premium"
    },
    "cache": {
      "preloaded": true,
      "timestamp": 1705312200000
    }
  },
  "models": {
    "available": ["gpt-4o-mini", "gpt-3.5-turbo", "gpt-4o", "claude-3-sonnet"],
    "default": "gpt-4o"
  },
  "system": {
    "serverReady": true,
    "cacheWarmed": true,
    "connectionsReady": true
  }
}
```

## 客户端集成建议

### 1. 启动流程
```
客户端启动
    ↓
检查网络连接
    ↓
调用健康检查 API (/api/health)
    ↓
如果服务器健康，调用预检 API (/api/client/preflight)
    ↓
缓存返回的用户数据到本地
    ↓
显示主界面（此时用户操作将非常快速）
```

### 2. 错误处理
```javascript
// 伪代码示例
async function performPreflight(authToken) {
  try {
    // 1. 健康检查
    const healthResponse = await fetch('/api/health');
    if (!healthResponse.ok) {
      throw new Error('服务器不可用');
    }
    
    // 2. 预检
    const preflightResponse = await fetch('/api/client/preflight', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!preflightResponse.ok) {
      throw new Error('预检失败');
    }
    
    const data = await preflightResponse.json();
    
    // 3. 缓存用户数据到本地
    localStorage.setItem('userData', JSON.stringify(data.userData));
    localStorage.setItem('availableModels', JSON.stringify(data.models));
    localStorage.setItem('preflightTime', Date.now().toString());
    
    return data;
    
  } catch (error) {
    console.warn('预检失败，将使用降级模式:', error);
    // 降级处理：不影响正常功能，但首次使用可能较慢
    return null;
  }
}
```

### 3. 缓存策略
- **用户数据**: 缓存 30 分钟，过期后重新预检
- **模型列表**: 缓存 24 小时
- **系统状态**: 不缓存，每次启动都检查

### 4. 性能优化建议

#### 客户端侧:
1. **后台预检**: 在用户登录成功后立即在后台执行预检
2. **本地缓存**: 将预检结果缓存到本地，避免重复请求
3. **超时处理**: 设置合理的超时时间（建议 10 秒）
4. **降级策略**: 预检失败时不影响正常功能

#### 服务器侧:
1. **并行处理**: 预检 API 内部并行执行所有预热任务
2. **缓存预热**: 提前将常用数据加载到 Redis
3. **连接池**: 使用连接池减少连接建立时间
4. **监控告警**: 监控预检 API 的成功率和响应时间

## 预期效果

### 使用预检 API 前:
- 首次请求: 2000-3000ms
- 后续请求: 50-100ms

### 使用预检 API 后:
- 预检耗时: 100-200ms（客户端启动时执行）
- 首次请求: 30-50ms ✨
- 后续请求: 20-30ms ✨

## 监控指标

建议监控以下指标：
- 预检 API 成功率
- 预检 API 响应时间
- 各个预热任务的成功率
- 用户首次请求的响应时间改善

## 故障排除

### 常见问题:

1. **预检超时**
   - 检查服务器负载
   - 检查 Redis 连接
   - 检查数据库连接

2. **部分任务失败**
   - 查看 `warningTasks` 字段
   - 检查对应服务的健康状态
   - 不影响核心功能，但可能影响性能

3. **认证失败**
   - 检查 JWT Token 是否有效
   - 检查 Token 是否过期
   - 检查用户权限

## 最佳实践

1. **渐进式预检**: 优先预热最重要的缓存，次要的可以延后
2. **智能重试**: 预检失败时可以重试，但要设置合理的重试间隔
3. **用户体验**: 在预检过程中显示加载状态，让用户知道系统正在准备
4. **数据同步**: 定期刷新缓存的用户数据，确保数据一致性

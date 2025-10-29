# 服务器端统一错误处理实现指南

## 概述

本文档说明如何在 Next.js 项目中实现统一的错误处理系统，与客户端错误处理系统完美集成，特别是针对使用次数到期时的处理。

## 核心特性

- 🎯 **统一错误格式**: 所有 API 使用相同的错误响应格式
- 🚀 **详细错误信息**: 提供升级链接、支持链接等详细信息
- 🔧 **易于维护**: 集中化的错误处理逻辑
- 📊 **便于监控**: 结构化的错误信息便于分析
- 🔒 **安全可靠**: 内置安全最佳实践

## 已实现的文件

### 1. 核心错误处理模块
- `lib/error-handling.ts` - 统一错误处理核心逻辑

### 2. 更新的 API 端点
- `src/app/api/hasNotEngine/route.ts` - AI 流式响应端点
- `src/app/api/hasEngine/route.ts` - AI 预检端点
- `src/app/api/usage/route.ts` - 使用量管理端点
- `src/app/api/models/route.ts` - 模型列表端点
- `lib/usage.ts` - 使用量检查逻辑

## 错误代码定义

```typescript
export const SERVER_ERROR_CODES = {
  // 认证相关错误
  USER_UNAUTHORIZED: 'USER_UNAUTHORIZED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // 使用量相关错误
  PREMIUM_LIMIT_EXCEEDED: 'PREMIUM_LIMIT_EXCEEDED',
  FAST_LIMIT_EXCEEDED: 'FAST_LIMIT_EXCEEDED',
  BASIC_LIMIT_EXCEEDED: 'BASIC_LIMIT_EXCEEDED', // 兼容旧代码
  
  // 系统错误
  USAGE_ERROR: 'USAGE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const
```

## 错误响应格式

### 使用量超限错误示例

```json
{
  "success": false,
  "error": {
    "code": "PREMIUM_LIMIT_EXCEEDED",
    "message": "高级模型使用次数已达上限",
    "details": {
      "currentUsage": {
        "used": 10,
        "limit": 10,
        "remaining": 0
      },
      "upgradeUrl": "https://elick.it.com/pricing",
      "supportUrl": "https://elick.it.com/contact",
      "canRetry": false
    }
  },
  "requestId": "uuid-here",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 成功响应格式

```json
{
  "success": true,
  "data": {
    "response": "AI response here",
    "usage": {
      "premiumRequests": {
        "used": 5,
        "limit": 10,
        "remaining": 5
      },
      "fastRequests": {
        "used": 20,
        "limit": 50,
        "remaining": 30
      }
    }
  },
  "requestId": "uuid-here",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 使用方法

### App Router 端点

```typescript
import { 
  NextJSUsageError, 
  SERVER_ERROR_CODES, 
  withErrorHandling, 
  createSuccessResponse,
  getRequestId
} from '@/lib/error-handling'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = getRequestId(req)
  
  // 验证认证
  const authResult = await verifyAuth(req)
  if (!authResult.success) {
    throw new NextJSUsageError(
      SERVER_ERROR_CODES.USER_UNAUTHORIZED,
      authResult.error || 'Unauthorized'
    )
  }
  
  // 检查使用量
  await checkAndUpdateUsage(authResult.userId, 'premium')
  
  // 处理业务逻辑
  const result = await processRequest(req)
  
  // 返回成功响应
  const successResponse = createSuccessResponse(result, requestId)
  return NextResponse.json(successResponse)
})
```

### Pages Router 端点

```typescript
import { 
  withPagesErrorHandling,
  createSuccessResponse,
  getRequestId
} from '@/lib/error-handling'

export default withPagesErrorHandling(async (req: NextApiRequest, res: NextApiResponse) => {
  const requestId = getRequestId(req)
  
  // 业务逻辑...
  
  const successResponse = createSuccessResponse(data, requestId)
  res.status(200).json(successResponse)
})
```

## 流式响应处理

对于流式响应（如 AI 聊天），错误处理会自动处理：

```typescript
export const POST = withErrorHandling(async (req: NextRequest) => {
  // 认证和使用量检查
  await checkAndUpdateUsage(userId, modelType)
  
  // 创建流式响应
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 处理流式数据
        for await (const chunk of aiStream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
        }
        controller.close()
      } catch (error) {
        // 错误会被自动处理
        throw error
      }
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
})
```

## 客户端集成

客户端可以根据错误代码进行相应处理：

```typescript
const response = await fetch('/api/hasNotEngine', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(requestData)
})

const data = await response.json()

if (!data.success) {
  const { code, message, details } = data.error
  
  switch (code) {
    case 'PREMIUM_LIMIT_EXCEEDED':
    case 'FAST_LIMIT_EXCEEDED':
      // 显示升级提示
      showUpgradeDialog({
        message,
        upgradeUrl: details.upgradeUrl,
        currentUsage: details.currentUsage
      })
      break
      
    case 'USER_UNAUTHORIZED':
      // 重新登录
      redirectToLogin()
      break
      
    default:
      // 显示通用错误
      showErrorMessage(message)
  }
}
```

## 环境变量配置

确保在 `.env.local` 中配置基础 URL：

```bash
# 应用基础配置
NEXT_PUBLIC_BASE_URL=https://elick.it.com  # 生产环境
# NEXT_PUBLIC_BASE_URL=http://localhost:3000  # 开发环境

# 其他必要配置
AUTH_SECRET=your_auth_secret_key
OPENROUTER_API_KEY=your_openrouter_key
```

## 测试

### 单元测试示例

```typescript
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/hasNotEngine/route'

describe('/api/hasNotEngine', () => {
  it('should handle usage limit exceeded', async () => {
    const request = new NextRequest('http://localhost/api/hasNotEngine', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test-user',
        modelType: 'premium',
        messages: []
      }),
      headers: {
        'Authorization': 'Bearer valid-token'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('PREMIUM_LIMIT_EXCEEDED')
    expect(data.error.details.upgradeUrl).toBeDefined()
  })
})
```

## 监控和日志

所有错误都会自动记录到控制台，包含：
- 错误类型和消息
- 请求 ID（用于追踪）
- 时间戳
- 用户信息（如果可用）

建议集成 Sentry 或其他错误监控服务来收集生产环境的错误信息。

## 最佳实践

1. **统一错误格式**: 所有 API 都使用相同的错误响应格式
2. **详细错误信息**: 提供足够的信息帮助用户解决问题
3. **安全考虑**: 不要在错误信息中泄露敏感信息
4. **用户体验**: 提供清晰的错误信息和解决方案链接
5. **监控告警**: 设置错误率和响应时间监控

## 迁移指南

从旧的错误处理系统迁移：

1. 导入新的错误处理模块
2. 使用 `withErrorHandling` 包装 API 函数
3. 替换手动错误处理为抛出 `NextJSUsageError`
4. 更新成功响应使用 `createSuccessResponse`
5. 测试所有 API 端点

这个实现提供了完整的错误处理解决方案，与客户端系统完美集成，特别是在处理使用次数到期时能够提供清晰的升级指引。

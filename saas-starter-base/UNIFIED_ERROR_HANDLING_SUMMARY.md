# 统一错误处理系统实现总结

## 🎯 项目目标

实现一个合理的、统一的错误信息处理逻辑，当接收到服务器提醒使用次数到期时，应该提醒用户到官网更新订阅或者购买加油包。

## ✅ 已完成的工作

### 1. 核心错误处理模块

**文件**: `lib/error-handling.ts`

- ✅ 定义了统一的错误代码常量
- ✅ 创建了 `NextJSUsageError` 自定义错误类
- ✅ 实现了 App Router 和 Pages Router 的错误处理包装器
- ✅ 提供了统一的成功/错误响应格式
- ✅ 集成了详细的错误信息（升级链接、支持链接、当前使用量等）

### 2. 更新的使用量检查逻辑

**文件**: `lib/usage.ts`

- ✅ 更新 `getUserUsage` 函数使用新的错误处理
- ✅ 更新 `checkAndUpdateUsage` 函数抛出详细的使用量错误
- ✅ 保持向后兼容的 `UsageError` 类
- ✅ 集成升级链接和当前使用量信息

### 3. 更新的 API 端点

#### AI 相关端点
- ✅ `src/app/api/hasNotEngine/route.ts` - AI 流式响应端点
- ✅ `src/app/api/hasEngine/route.ts` - AI 预检端点

#### 使用量管理端点
- ✅ `src/app/api/usage/route.ts` - 使用量查询和重置

#### 其他端点
- ✅ `src/app/api/models/route.ts` - 模型列表端点
- 🔄 `src/app/api/contact/route.ts` - 联系我们端点（部分更新）

### 4. 文档和测试

- ✅ `docs/server-error-handling-implementation.md` - 完整实现指南
- ✅ `scripts/test-error-handling.js` - 错误处理测试脚本
- ✅ `UNIFIED_ERROR_HANDLING_SUMMARY.md` - 本总结文档

## 🔧 核心特性

### 错误响应格式

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
    "usage": { ... }
  },
  "requestId": "uuid-here",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 支持的错误代码

- `USER_UNAUTHORIZED` - 用户未授权
- `USER_NOT_FOUND` - 用户不存在
- `PREMIUM_LIMIT_EXCEEDED` - 高级模型使用次数已达上限
- `FAST_LIMIT_EXCEEDED` - 基础模型使用次数已达上限
- `DATABASE_ERROR` - 数据库错误
- `INTERNAL_ERROR` - 内部服务器错误
- `VALIDATION_ERROR` - 输入验证错误

## 🚀 使用方法

### App Router 端点

```typescript
import { withErrorHandling, createSuccessResponse } from '@/lib/error-handling'

export const POST = withErrorHandling(async (req: NextRequest) => {
  // 业务逻辑
  await checkAndUpdateUsage(userId, 'premium')
  
  // 返回成功响应
  return NextResponse.json(createSuccessResponse(data, requestId))
})
```

### Pages Router 端点

```typescript
import { withPagesErrorHandling } from '@/lib/error-handling'

export default withPagesErrorHandling(async (req, res) => {
  // 业务逻辑
  res.json(createSuccessResponse(data, requestId))
})
```

## 🔄 客户端集成

客户端可以根据错误代码进行相应处理：

```typescript
if (!response.success) {
  const { code, details } = response.error
  
  switch (code) {
    case 'PREMIUM_LIMIT_EXCEEDED':
    case 'FAST_LIMIT_EXCEEDED':
      // 显示升级对话框
      showUpgradeDialog({
        upgradeUrl: details.upgradeUrl,
        currentUsage: details.currentUsage
      })
      break
      
    case 'USER_UNAUTHORIZED':
      // 重新登录
      redirectToLogin()
      break
  }
}
```

## 🧪 测试

运行测试脚本验证实现：

```bash
# 启动开发服务器
npm run dev

# 在另一个终端运行测试
node scripts/test-error-handling.js

# 或使用自定义配置
BASE_URL=http://localhost:3000 AUTH_TOKEN=your_token node scripts/test-error-handling.js
```

## 📋 待完成的工作

### 高优先级
1. 🔄 完成 `src/app/api/contact/route.ts` 的完整更新
2. 🔄 更新 `src/app/api/devices/route.ts` 使用新的错误处理
3. 🔄 更新 `src/app/api/download/route.ts` 使用新的错误处理

### 中优先级
4. 🔄 更新其他剩余的 API 端点
5. 🔄 添加更多的单元测试
6. 🔄 集成错误监控（如 Sentry）

### 低优先级
7. 🔄 添加错误率监控和告警
8. 🔄 优化错误消息的多语言支持
9. 🔄 添加错误重试机制

## 🌟 主要优势

1. **统一格式**: 所有 API 使用相同的错误响应格式
2. **详细信息**: 提供升级链接、当前使用量等详细信息
3. **易于维护**: 集中化的错误处理逻辑
4. **向后兼容**: 保持与现有代码的兼容性
5. **类型安全**: 使用 TypeScript 确保类型安全
6. **可扩展**: 易于添加新的错误类型和处理逻辑

## 🔗 相关文件

- `lib/error-handling.ts` - 核心错误处理模块
- `lib/usage.ts` - 使用量检查逻辑
- `docs/server-error-handling-implementation.md` - 详细实现指南
- `scripts/test-error-handling.js` - 测试脚本

## 📞 支持

如有问题或需要进一步的帮助，请：

1. 查看 `docs/server-error-handling-implementation.md` 获取详细指南
2. 运行测试脚本验证实现
3. 检查控制台日志获取调试信息

---

**状态**: ✅ 核心功能已完成，可以投入使用
**最后更新**: 2024-01-01
**版本**: 1.0.0

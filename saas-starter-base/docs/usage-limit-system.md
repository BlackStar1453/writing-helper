# 使用量限制系统

## 概述

本系统实现了基于用户订阅计划的差异化使用量限制提醒功能。当用户达到使用限制时，系统会根据用户的订阅状态显示不同的提醒消息和升级建议。

## 功能特性

### 1. 差异化错误消息

根据用户的订阅计划类型，系统会显示不同的错误消息：

- **免费用户**: 提示升级到 Premium 计划或购买终身版本
- **Premium 用户**: 提示购买加油包以获得更多使用次数
- **终身用户**: 提示联系客服获取帮助（异常情况）

### 2. 智能升级引导

系统会根据用户状态提供相应的操作建议：

- `upgrade_to_premium`: 跳转到定价页面
- `buy_booster_pack`: 跳转到加油包购买页面
- `contact_support`: 打开客服联系方式

## 技术实现

### 1. 后端实现

#### 用户计划类型判断

```typescript
function getUserPlanType(user: any): 'free' | 'premium' | 'lifetime' {
  if (user.subscriptionStatus === 'lifetime') {
    return 'lifetime';
  }
  
  if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') {
    return 'premium';
  }
  
  return 'free';
}
```

#### 错误消息生成

```typescript
function getUsageLimitMessage(planType: 'free' | 'premium' | 'lifetime', requestType: 'premium' | 'fast') {
  // 根据计划类型和请求类型生成相应的错误消息
}
```

#### 增强的 UsageError 类

```typescript
export class UsageError extends Error {
  constructor(
    message: string,
    public code: string = 'USAGE_ERROR',
    public status: number = 403,
    public userPlan?: string,
    public upgradeAction?: string
  ) {
    super(message);
    this.name = 'UsageError';
  }
}
```

### 2. 前端实现

#### 使用量限制处理 Hook

```typescript
import { useUsageLimitHandler } from '@/hooks/use-usage-limit-handler';

const { isDialogOpen, usageError, hideUsageLimitDialog, handleUsageError } = useUsageLimitHandler();

// 处理 API 错误
const wasHandled = handleUsageError(apiError);
```

#### 使用量限制对话框组件

```typescript
import { UsageLimitDialog } from '@/components/usage-limit-dialog';

<UsageLimitDialog
  isOpen={isDialogOpen}
  onClose={hideUsageLimitDialog}
  error={usageError}
/>
```

## 错误代码说明

### 免费用户错误代码

- `PREMIUM_LIMIT_EXCEEDED_FREE_USER`: 免费用户高级模型使用量超限
- `BASIC_LIMIT_EXCEEDED_FREE_USER`: 免费用户基础模型使用量超限

### Premium 用户错误代码

- `PREMIUM_LIMIT_EXCEEDED_PREMIUM_USER`: Premium 用户高级模型使用量超限
- `BASIC_LIMIT_EXCEEDED_PREMIUM_USER`: Premium 用户基础模型使用量超限

### 终身用户错误代码

- `PREMIUM_LIMIT_EXCEEDED_LIFETIME_USER`: 终身用户高级模型使用量异常
- `BASIC_LIMIT_EXCEEDED_LIFETIME_USER`: 终身用户基础模型使用量异常

## 使用示例

### 1. 在 API 路由中处理错误

```typescript
try {
  await checkAndUpdateUsage(userId, 'premium');
} catch (usageError: any) {
  if (usageError.name === 'UsageError') {
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: usageError.code,
          message: usageError.message,
          userPlan: usageError.userPlan,
          upgradeAction: usageError.upgradeAction
        }
      },
      { status: usageError.status }
    );
  }
}
```

### 2. 在前端组件中处理错误

```typescript
const handleApiCall = async () => {
  try {
    const response = await fetch('/api/some-endpoint');
    const data = await response.json();
    
    if (!response.ok) {
      const wasHandled = handleUsageError(data);
      if (!wasHandled) {
        // 处理其他类型的错误
      }
    }
  } catch (error) {
    console.error('API 调用失败:', error);
  }
};
```

## 测试

访问 `/dashboard/usage-limit-demo` 页面可以测试不同用户计划的使用量限制场景。

## 配置

系统会根据以下用户字段判断订阅状态：

- `subscriptionStatus`: 订阅状态（'active', 'trialing', 'lifetime', 等）
- `planName`: 计划名称
- `premiumRequestsUsed/premiumRequestsLimit`: 高级模型使用量
- `fastRequestsUsed/fastRequestsLimit`: 基础模型使用量

## 扩展

如需添加新的用户计划类型或修改错误消息，请修改：

1. `lib/usage.ts` 中的 `getUserPlanType` 和 `getUsageLimitMessage` 函数
2. `components/usage-limit-dialog.tsx` 中的 `getDialogContent` 函数
3. 相应的错误代码常量

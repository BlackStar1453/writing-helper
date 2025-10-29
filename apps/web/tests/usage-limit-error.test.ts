/**
 * 使用限制错误格式测试
 * 验证服务器返回的错误格式是否符合客户端期望
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock 用户数据
const mockUserData = {
  free: {
    id: 'test-free-user',
    premiumRequestsUsed: 5,
    premiumRequestsLimit: 5,
    fastRequestsUsed: 20,
    fastRequestsLimit: 20,
    subscriptionStatus: 'inactive',
    planName: 'Free',
    lastResetAt: new Date()
  },
  premium: {
    id: 'test-premium-user',
    premiumRequestsUsed: 100,
    premiumRequestsLimit: 100,
    fastRequestsUsed: 500,
    fastRequestsLimit: 500,
    subscriptionStatus: 'active',
    planName: 'Premium',
    lastResetAt: new Date()
  },
  lifetime: {
    id: 'test-lifetime-user',
    premiumRequestsUsed: 1000,
    premiumRequestsLimit: 1000,
    fastRequestsUsed: 2000,
    fastRequestsLimit: 2000,
    subscriptionStatus: 'lifetime',
    planName: 'Lifetime',
    lastResetAt: new Date()
  }
};

// 模拟使用量检查函数
function simulateUsageCheck(userUsage: any, type: 'premium' | 'fast') {
  // 获取当前使用量和限制
  const currentUsed = type === 'premium' ? userUsage.premiumRequestsUsed : userUsage.fastRequestsUsed;
  const limit = type === 'premium' ? userUsage.premiumRequestsLimit : userUsage.fastRequestsLimit;

  // 检查是否超过限制
  if (currentUsed >= limit) {
    // 获取用户计划类型
    const userPlanType = getUserPlanType(userUsage.subscriptionStatus);
    
    // 根据客户端期望的格式返回错误
    const errorCode = type === 'premium' ? 'PREMIUM_LIMIT_EXCEEDED' : 'BASIC_LIMIT_EXCEEDED';
    const upgradeAction = (userPlanType === 'premium' || userPlanType === 'lifetime') ? 'buy_credits' : 'upgrade_to_premium';
    
    return {
      success: false,
      error: {
        code: errorCode,
        message: type === 'premium' ? 'Premium model usage limit exceeded' : 'Basic model usage limit exceeded',
        userPlan: userPlanType === 'lifetime' ? 'premium' : userPlanType, // 客户端只识别 'free' | 'premium'
        upgradeAction: upgradeAction
      }
    };
  }

  return {
    success: true,
    message: 'Usage check passed'
  };
}

// 根据订阅状态获取用户计划类型
function getUserPlanType(subscriptionStatus: string): 'free' | 'premium' | 'lifetime' {
  if (subscriptionStatus === 'lifetime') {
    return 'lifetime';
  }
  
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    return 'premium';
  }
  
  return 'free';
}

// 客户端期望的错误代码常量
const SERVER_ERROR_CODES = {
  PREMIUM_LIMIT_EXCEEDED: 'PREMIUM_LIMIT_EXCEEDED',
  BASIC_LIMIT_EXCEEDED: 'BASIC_LIMIT_EXCEEDED',
} as const;

type ServerErrorCode = (typeof SERVER_ERROR_CODES)[keyof typeof SERVER_ERROR_CODES];

// 服务器错误响应接口
interface ServerErrorResponse {
  success: false;
  error: {
    code: ServerErrorCode;
    message: string;
    userPlan?: 'free' | 'premium';
    upgradeAction?: 'upgrade_to_premium' | 'buy_credits';
  };
}

// 检查是否为使用限制错误
function isUsageError(error: any): error is ServerErrorResponse {
  return (
    error &&
    typeof error === 'object' &&
    error.success === false &&
    error.error &&
    typeof error.error.code === 'string' &&
    (error.error.code === SERVER_ERROR_CODES.PREMIUM_LIMIT_EXCEEDED ||
      error.error.code === SERVER_ERROR_CODES.BASIC_LIMIT_EXCEEDED)
  );
}

describe('使用限制错误格式测试', () => {
  describe('免费用户使用限制', () => {
    it('应该返回正确的基础模型限制错误格式', () => {
      const result = simulateUsageCheck(mockUserData.free, 'fast');
      
      expect(result.success).toBe(false);
      expect(isUsageError(result)).toBe(true);
      
      if (!result.success) {
        expect(result.error.code).toBe('BASIC_LIMIT_EXCEEDED');
        expect(result.error.message).toBe('Basic model usage limit exceeded');
        expect(result.error.userPlan).toBe('free');
        expect(result.error.upgradeAction).toBe('upgrade_to_premium');
      }
    });

    it('应该返回正确的高级模型限制错误格式', () => {
      const result = simulateUsageCheck(mockUserData.free, 'premium');
      
      expect(result.success).toBe(false);
      expect(isUsageError(result)).toBe(true);
      
      if (!result.success) {
        expect(result.error.code).toBe('PREMIUM_LIMIT_EXCEEDED');
        expect(result.error.message).toBe('Premium model usage limit exceeded');
        expect(result.error.userPlan).toBe('free');
        expect(result.error.upgradeAction).toBe('upgrade_to_premium');
      }
    });
  });

  describe('Premium用户使用限制', () => {
    it('应该返回正确的基础模型限制错误格式', () => {
      const result = simulateUsageCheck(mockUserData.premium, 'fast');
      
      expect(result.success).toBe(false);
      expect(isUsageError(result)).toBe(true);
      
      if (!result.success) {
        expect(result.error.code).toBe('BASIC_LIMIT_EXCEEDED');
        expect(result.error.message).toBe('Basic model usage limit exceeded');
        expect(result.error.userPlan).toBe('premium');
        expect(result.error.upgradeAction).toBe('buy_credits');
      }
    });

    it('应该返回正确的高级模型限制错误格式', () => {
      const result = simulateUsageCheck(mockUserData.premium, 'premium');
      
      expect(result.success).toBe(false);
      expect(isUsageError(result)).toBe(true);
      
      if (!result.success) {
        expect(result.error.code).toBe('PREMIUM_LIMIT_EXCEEDED');
        expect(result.error.message).toBe('Premium model usage limit exceeded');
        expect(result.error.userPlan).toBe('premium');
        expect(result.error.upgradeAction).toBe('buy_credits');
      }
    });
  });

  describe('Lifetime用户使用限制', () => {
    it('应该返回正确的基础模型限制错误格式', () => {
      const result = simulateUsageCheck(mockUserData.lifetime, 'fast');
      
      expect(result.success).toBe(false);
      expect(isUsageError(result)).toBe(true);
      
      if (!result.success) {
        expect(result.error.code).toBe('BASIC_LIMIT_EXCEEDED');
        expect(result.error.message).toBe('Basic model usage limit exceeded');
        expect(result.error.userPlan).toBe('premium'); // lifetime 映射为 premium
        expect(result.error.upgradeAction).toBe('buy_credits');
      }
    });

    it('应该返回正确的高级模型限制错误格式', () => {
      const result = simulateUsageCheck(mockUserData.lifetime, 'premium');
      
      expect(result.success).toBe(false);
      expect(isUsageError(result)).toBe(true);
      
      if (!result.success) {
        expect(result.error.code).toBe('PREMIUM_LIMIT_EXCEEDED');
        expect(result.error.message).toBe('Premium model usage limit exceeded');
        expect(result.error.userPlan).toBe('premium'); // lifetime 映射为 premium
        expect(result.error.upgradeAction).toBe('buy_credits');
      }
    });
  });

  describe('错误格式验证', () => {
    it('应该包含所有必需的字段', () => {
      const result = simulateUsageCheck(mockUserData.free, 'fast');
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(result.error).toHaveProperty('code');
        expect(result.error).toHaveProperty('message');
        expect(result.error).toHaveProperty('userPlan');
        expect(result.error).toHaveProperty('upgradeAction');
      }
    });

    it('错误代码应该是有效值', () => {
      const basicResult = simulateUsageCheck(mockUserData.free, 'fast');
      const premiumResult = simulateUsageCheck(mockUserData.free, 'premium');
      
      if (!basicResult.success) {
        expect(['BASIC_LIMIT_EXCEEDED', 'PREMIUM_LIMIT_EXCEEDED']).toContain(basicResult.error.code);
      }
      
      if (!premiumResult.success) {
        expect(['BASIC_LIMIT_EXCEEDED', 'PREMIUM_LIMIT_EXCEEDED']).toContain(premiumResult.error.code);
      }
    });

    it('用户计划应该是有效值', () => {
      const result = simulateUsageCheck(mockUserData.free, 'fast');
      
      if (!result.success) {
        expect(['free', 'premium']).toContain(result.error.userPlan);
      }
    });

    it('升级动作应该是有效值', () => {
      const result = simulateUsageCheck(mockUserData.free, 'fast');
      
      if (!result.success) {
        expect(['upgrade_to_premium', 'buy_credits']).toContain(result.error.upgradeAction);
      }
    });
  });

  describe('客户端兼容性', () => {
    it('应该通过客户端的isUsageError检查', () => {
      const basicError = simulateUsageCheck(mockUserData.free, 'fast');
      const premiumError = simulateUsageCheck(mockUserData.premium, 'premium');
      
      expect(isUsageError(basicError)).toBe(true);
      expect(isUsageError(premiumError)).toBe(true);
    });

    it('成功响应不应该被识别为使用错误', () => {
      // 模拟未达到限制的用户
      const userWithinLimit = {
        ...mockUserData.free,
        fastRequestsUsed: 10, // 低于限制
        premiumRequestsUsed: 2 // 低于限制
      };
      
      const result = simulateUsageCheck(userWithinLimit, 'fast');
      
      expect(result.success).toBe(true);
      expect(isUsageError(result)).toBe(false);
    });
  });
});

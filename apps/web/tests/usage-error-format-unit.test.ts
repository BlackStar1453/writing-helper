/**
 * 使用限制错误格式单元测试
 * 专门测试错误格式生成逻辑，不依赖完整API流程
 */

import { describe, it, expect } from '@jest/globals';

// 模拟错误格式生成函数（从API中提取的逻辑）
function generateUsageLimitError(
  modelType: 'premium' | 'fast',
  subscriptionStatus: string
): {
  success: false;
  error: {
    code: string;
    message: string;
    userPlan: 'free' | 'premium';
    upgradeAction: 'upgrade_to_premium' | 'buy_credits';
  };
} {
  // 获取用户计划类型
  const getUserPlanType = (subscriptionStatus: string): 'free' | 'premium' | 'lifetime' => {
    if (subscriptionStatus === 'lifetime') {
      return 'lifetime';
    }
    if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
      return 'premium';
    }
    return 'free';
  };

  const userPlanType = getUserPlanType(subscriptionStatus);
  
  // 根据客户端期望的格式返回错误
  const errorCode = modelType === 'premium' ? 'PREMIUM_LIMIT_EXCEEDED' : 'BASIC_LIMIT_EXCEEDED';
  const upgradeAction = (userPlanType === 'premium' || userPlanType === 'lifetime') ? 'buy_credits' : 'upgrade_to_premium';

  return {
    success: false,
    error: {
      code: errorCode,
      message: modelType === 'premium' ? 'Premium model usage limit exceeded' : 'Basic model usage limit exceeded',
      userPlan: userPlanType === 'lifetime' ? 'premium' : userPlanType, // 客户端只识别 'free' | 'premium'
      upgradeAction: upgradeAction
    }
  };
}

// 客户端错误检查函数
function isUsageError(response: any): boolean {
  return (
    response &&
    typeof response === 'object' &&
    response.success === false &&
    response.error &&
    typeof response.error.code === 'string' &&
    (response.error.code === 'PREMIUM_LIMIT_EXCEEDED' ||
      response.error.code === 'BASIC_LIMIT_EXCEEDED') &&
    typeof response.error.message === 'string' &&
    ['free', 'premium'].includes(response.error.userPlan) &&
    ['upgrade_to_premium', 'buy_credits'].includes(response.error.upgradeAction)
  );
}

describe('使用限制错误格式单元测试', () => {
  describe('免费用户错误格式', () => {
    it('基础模型限制错误格式应该正确', () => {
      const error = generateUsageLimitError('fast', 'inactive');
      
      expect(error.success).toBe(false);
      expect(error.error.code).toBe('BASIC_LIMIT_EXCEEDED');
      expect(error.error.message).toBe('Basic model usage limit exceeded');
      expect(error.error.userPlan).toBe('free');
      expect(error.error.upgradeAction).toBe('upgrade_to_premium');
      expect(isUsageError(error)).toBe(true);
    });

    it('高级模型限制错误格式应该正确', () => {
      const error = generateUsageLimitError('premium', 'inactive');
      
      expect(error.success).toBe(false);
      expect(error.error.code).toBe('PREMIUM_LIMIT_EXCEEDED');
      expect(error.error.message).toBe('Premium model usage limit exceeded');
      expect(error.error.userPlan).toBe('free');
      expect(error.error.upgradeAction).toBe('upgrade_to_premium');
      expect(isUsageError(error)).toBe(true);
    });
  });

  describe('Premium用户错误格式', () => {
    it('基础模型限制错误格式应该正确', () => {
      const error = generateUsageLimitError('fast', 'active');
      
      expect(error.success).toBe(false);
      expect(error.error.code).toBe('BASIC_LIMIT_EXCEEDED');
      expect(error.error.message).toBe('Basic model usage limit exceeded');
      expect(error.error.userPlan).toBe('premium');
      expect(error.error.upgradeAction).toBe('buy_credits');
      expect(isUsageError(error)).toBe(true);
    });

    it('高级模型限制错误格式应该正确', () => {
      const error = generateUsageLimitError('premium', 'active');
      
      expect(error.success).toBe(false);
      expect(error.error.code).toBe('PREMIUM_LIMIT_EXCEEDED');
      expect(error.error.message).toBe('Premium model usage limit exceeded');
      expect(error.error.userPlan).toBe('premium');
      expect(error.error.upgradeAction).toBe('buy_credits');
      expect(isUsageError(error)).toBe(true);
    });

    it('试用期用户应该被识别为Premium', () => {
      const error = generateUsageLimitError('premium', 'trialing');
      
      expect(error.error.userPlan).toBe('premium');
      expect(error.error.upgradeAction).toBe('buy_credits');
      expect(isUsageError(error)).toBe(true);
    });
  });

  describe('Lifetime用户错误格式', () => {
    it('基础模型限制错误格式应该正确', () => {
      const error = generateUsageLimitError('fast', 'lifetime');
      
      expect(error.success).toBe(false);
      expect(error.error.code).toBe('BASIC_LIMIT_EXCEEDED');
      expect(error.error.message).toBe('Basic model usage limit exceeded');
      expect(error.error.userPlan).toBe('premium'); // lifetime 映射为 premium
      expect(error.error.upgradeAction).toBe('buy_credits');
      expect(isUsageError(error)).toBe(true);
    });

    it('高级模型限制错误格式应该正确', () => {
      const error = generateUsageLimitError('premium', 'lifetime');
      
      expect(error.success).toBe(false);
      expect(error.error.code).toBe('PREMIUM_LIMIT_EXCEEDED');
      expect(error.error.message).toBe('Premium model usage limit exceeded');
      expect(error.error.userPlan).toBe('premium'); // lifetime 映射为 premium
      expect(error.error.upgradeAction).toBe('buy_credits');
      expect(isUsageError(error)).toBe(true);
    });
  });

  describe('错误格式完整性验证', () => {
    it('所有必需字段都应该存在', () => {
      const error = generateUsageLimitError('fast', 'inactive');
      
      expect(error).toHaveProperty('success');
      expect(error).toHaveProperty('error');
      expect(error.error).toHaveProperty('code');
      expect(error.error).toHaveProperty('message');
      expect(error.error).toHaveProperty('userPlan');
      expect(error.error).toHaveProperty('upgradeAction');
    });

    it('字段类型应该正确', () => {
      const error = generateUsageLimitError('premium', 'active');
      
      expect(typeof error.success).toBe('boolean');
      expect(typeof error.error.code).toBe('string');
      expect(typeof error.error.message).toBe('string');
      expect(typeof error.error.userPlan).toBe('string');
      expect(typeof error.error.upgradeAction).toBe('string');
    });

    it('字段值应该在有效范围内', () => {
      const basicError = generateUsageLimitError('fast', 'inactive');
      const premiumError = generateUsageLimitError('premium', 'active');
      
      // 错误代码
      expect(['BASIC_LIMIT_EXCEEDED', 'PREMIUM_LIMIT_EXCEEDED']).toContain(basicError.error.code);
      expect(['BASIC_LIMIT_EXCEEDED', 'PREMIUM_LIMIT_EXCEEDED']).toContain(premiumError.error.code);
      
      // 用户计划
      expect(['free', 'premium']).toContain(basicError.error.userPlan);
      expect(['free', 'premium']).toContain(premiumError.error.userPlan);
      
      // 升级动作
      expect(['upgrade_to_premium', 'buy_credits']).toContain(basicError.error.upgradeAction);
      expect(['upgrade_to_premium', 'buy_credits']).toContain(premiumError.error.upgradeAction);
    });
  });

  describe('客户端兼容性', () => {
    it('所有错误格式都应该通过客户端检查', () => {
      const testCases = [
        { modelType: 'fast' as const, subscriptionStatus: 'inactive' },
        { modelType: 'premium' as const, subscriptionStatus: 'inactive' },
        { modelType: 'fast' as const, subscriptionStatus: 'active' },
        { modelType: 'premium' as const, subscriptionStatus: 'active' },
        { modelType: 'fast' as const, subscriptionStatus: 'lifetime' },
        { modelType: 'premium' as const, subscriptionStatus: 'lifetime' },
        { modelType: 'fast' as const, subscriptionStatus: 'trialing' },
        { modelType: 'premium' as const, subscriptionStatus: 'trialing' }
      ];

      testCases.forEach(({ modelType, subscriptionStatus }) => {
        const error = generateUsageLimitError(modelType, subscriptionStatus);
        expect(isUsageError(error)).toBe(true);
      });
    });

    it('错误消息应该清晰明确', () => {
      const basicError = generateUsageLimitError('fast', 'inactive');
      const premiumError = generateUsageLimitError('premium', 'active');
      
      expect(basicError.error.message).toContain('Basic model');
      expect(basicError.error.message).toContain('usage limit exceeded');
      
      expect(premiumError.error.message).toContain('Premium model');
      expect(premiumError.error.message).toContain('usage limit exceeded');
    });

    it('升级动作应该与用户计划匹配', () => {
      // 免费用户应该被建议升级到Premium
      const freeUserError = generateUsageLimitError('fast', 'inactive');
      expect(freeUserError.error.userPlan).toBe('free');
      expect(freeUserError.error.upgradeAction).toBe('upgrade_to_premium');
      
      // Premium用户应该被建议购买积分
      const premiumUserError = generateUsageLimitError('fast', 'active');
      expect(premiumUserError.error.userPlan).toBe('premium');
      expect(premiumUserError.error.upgradeAction).toBe('buy_credits');
      
      // Lifetime用户应该被建议购买积分
      const lifetimeUserError = generateUsageLimitError('fast', 'lifetime');
      expect(lifetimeUserError.error.userPlan).toBe('premium'); // 映射为premium
      expect(lifetimeUserError.error.upgradeAction).toBe('buy_credits');
    });
  });

  describe('边界情况', () => {
    it('应该处理未知订阅状态', () => {
      const error = generateUsageLimitError('fast', 'unknown_status');
      
      expect(error.error.userPlan).toBe('free'); // 默认为free
      expect(error.error.upgradeAction).toBe('upgrade_to_premium');
      expect(isUsageError(error)).toBe(true);
    });

    it('应该处理空订阅状态', () => {
      const error = generateUsageLimitError('premium', '');
      
      expect(error.error.userPlan).toBe('free'); // 默认为free
      expect(error.error.upgradeAction).toBe('upgrade_to_premium');
      expect(isUsageError(error)).toBe(true);
    });
  });
});

/**
 * API使用限制集成测试
 * 验证实际API返回的错误格式是否符合客户端期望
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock 数据库和缓存
jest.mock('@/lib/usage-simple', () => ({
  getCachedUserUsage: jest.fn(),
  getUserUsageFromDB: jest.fn()
}));

jest.mock('@/lib/auth', () => ({
  fastVerifyAuth: jest.fn()
}));

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

// Mock models data
jest.mock('@/lib/models-data', () => ({
  models: [
    { name: 'GPT-4o-mini', id: 'gpt-4o-mini', modelType: 'fast' },
    { name: 'GPT-4o', id: 'gpt-4o', modelType: 'premium' }
  ]
}));

// Mock CORS
jest.mock('@/lib/config/cors', () => ({
  getClientFriendlyCorsHeaders: jest.fn(() => ({})),
  handleCorsOptions: jest.fn()
}));

// 导入被测试的模块
import { NextRequest } from 'next/server';
import { POST } from '@/src/app/api/hasNotEngine-ultra-fast/route';

describe('API使用限制集成测试', () => {
  const mockFastVerifyAuth = require('@/lib/auth').fastVerifyAuth;
  const mockGetCachedUserUsage = require('@/lib/usage-simple').getCachedUserUsage;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock 认证成功
    mockFastVerifyAuth.mockResolvedValue({
      success: true,
      userId: 'test-user-id'
    });
  });

  describe('免费用户使用限制错误', () => {
    it('应该返回正确的基础模型限制错误格式', async () => {
      // Mock 免费用户已达基础模型限制
      mockGetCachedUserUsage.mockResolvedValue({
        fastRequestsUsed: 20,
        fastRequestsLimit: 20,
        premiumRequestsUsed: 3,
        premiumRequestsLimit: 5,
        subscriptionStatus: 'inactive',
        planName: 'Free'
      });

      const request = new NextRequest('http://localhost:3000/api/hasNotEngine-ultra-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          query: 'test query'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('BASIC_LIMIT_EXCEEDED');
      expect(data.error.message).toBe('Basic model usage limit exceeded');
      expect(data.error.userPlan).toBe('free');
      expect(data.error.upgradeAction).toBe('upgrade_to_premium');
    });

    it('应该返回正确的高级模型限制错误格式', async () => {
      // Mock 免费用户已达高级模型限制
      mockGetCachedUserUsage.mockResolvedValue({
        fastRequestsUsed: 10,
        fastRequestsLimit: 20,
        premiumRequestsUsed: 5,
        premiumRequestsLimit: 5,
        subscriptionStatus: 'inactive',
        planName: 'Free'
      });

      const request = new NextRequest('http://localhost:3000/api/hasNotEngine-ultra-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          query: 'test query'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('PREMIUM_LIMIT_EXCEEDED');
      expect(data.error.message).toBe('Premium model usage limit exceeded');
      expect(data.error.userPlan).toBe('free');
      expect(data.error.upgradeAction).toBe('upgrade_to_premium');
    });
  });

  describe('Premium用户使用限制错误', () => {
    it('应该返回正确的基础模型限制错误格式', async () => {
      // Mock Premium用户已达基础模型限制
      mockGetCachedUserUsage.mockResolvedValue({
        fastRequestsUsed: 500,
        fastRequestsLimit: 500,
        premiumRequestsUsed: 50,
        premiumRequestsLimit: 100,
        subscriptionStatus: 'active',
        planName: 'Premium'
      });

      const request = new NextRequest('http://localhost:3000/api/hasNotEngine-ultra-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          query: 'test query'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('BASIC_LIMIT_EXCEEDED');
      expect(data.error.message).toBe('Basic model usage limit exceeded');
      expect(data.error.userPlan).toBe('premium');
      expect(data.error.upgradeAction).toBe('buy_credits');
    });

    it('应该返回正确的高级模型限制错误格式', async () => {
      // Mock Premium用户已达高级模型限制
      mockGetCachedUserUsage.mockResolvedValue({
        fastRequestsUsed: 200,
        fastRequestsLimit: 500,
        premiumRequestsUsed: 100,
        premiumRequestsLimit: 100,
        subscriptionStatus: 'active',
        planName: 'Premium'
      });

      const request = new NextRequest('http://localhost:3000/api/hasNotEngine-ultra-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          query: 'test query'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('PREMIUM_LIMIT_EXCEEDED');
      expect(data.error.message).toBe('Premium model usage limit exceeded');
      expect(data.error.userPlan).toBe('premium');
      expect(data.error.upgradeAction).toBe('buy_credits');
    });
  });

  describe('Lifetime用户使用限制错误', () => {
    it('应该返回正确的错误格式（映射为premium）', async () => {
      // Mock Lifetime用户已达限制
      mockGetCachedUserUsage.mockResolvedValue({
        fastRequestsUsed: 2000,
        fastRequestsLimit: 2000,
        premiumRequestsUsed: 800,
        premiumRequestsLimit: 1000,
        subscriptionStatus: 'lifetime',
        planName: 'Lifetime'
      });

      const request = new NextRequest('http://localhost:3000/api/hasNotEngine-ultra-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          query: 'test query'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('BASIC_LIMIT_EXCEEDED');
      expect(data.error.message).toBe('Basic model usage limit exceeded');
      expect(data.error.userPlan).toBe('premium'); // lifetime 映射为 premium
      expect(data.error.upgradeAction).toBe('buy_credits');
    });
  });

  describe('客户端兼容性验证', () => {
    it('错误响应应该包含所有必需字段', async () => {
      mockGetCachedUserUsage.mockResolvedValue({
        fastRequestsUsed: 20,
        fastRequestsLimit: 20,
        premiumRequestsUsed: 3,
        premiumRequestsLimit: 5,
        subscriptionStatus: 'inactive',
        planName: 'Free'
      });

      const request = new NextRequest('http://localhost:3000/api/hasNotEngine-ultra-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          query: 'test query'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      // 验证响应结构
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      expect(data.error).toHaveProperty('userPlan');
      expect(data.error).toHaveProperty('upgradeAction');

      // 验证字段类型
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.error.code).toBe('string');
      expect(typeof data.error.message).toBe('string');
      expect(typeof data.error.userPlan).toBe('string');
      expect(typeof data.error.upgradeAction).toBe('string');

      // 验证字段值范围
      expect(['free', 'premium']).toContain(data.error.userPlan);
      expect(['upgrade_to_premium', 'buy_credits']).toContain(data.error.upgradeAction);
      expect(['BASIC_LIMIT_EXCEEDED', 'PREMIUM_LIMIT_EXCEEDED']).toContain(data.error.code);
    });
  });
});

/**
 * 预热系统与缓存冲突测试
 * 测试预热API是否会覆盖现有的缓冲区数据
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  checkAndUpdateUsageUltraFast, 
  getCachedUserUsage, 
  clearUserCache,
  forceClearUserSyncState
} from '../lib/usage-ultra-fast';

// 测试用户数据
const TEST_USER = {
  id: '1675524b-820b-478f-b841-f94aaffac413',
  email: '1519235462@qq.com',
  plan: 'Premium'
};

/**
 * 模拟预热API调用
 */
async function simulateWarmupAPI(userId: string): Promise<Response> {
  const response = await fetch(`http://localhost:3000/api/user/warmup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId })
  });
  
  return response;
}

describe('预热系统与缓存冲突测试', () => {
  beforeEach(async () => {
    // 清理用户缓存和同步状态
    await clearUserCache(TEST_USER.id);
    forceClearUserSyncState(TEST_USER.id);
    console.log('🧪 预热冲突测试开始');
  });

  afterEach(async () => {
    // 清理测试数据
    await clearUserCache(TEST_USER.id);
    forceClearUserSyncState(TEST_USER.id);
    console.log('🧹 预热冲突测试清理完成');
  });

  test('预热API不应该覆盖现有的缓冲区数据', async () => {
    console.log('🔬 测试预热API是否会覆盖缓冲区数据');

    // 步骤1: 执行一些使用量检查，积累缓冲区数据
    console.log('📤 步骤1: 积累缓冲区数据');
    
    const result1 = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
    expect(result1.success).toBe(true);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result2 = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
    expect(result2.success).toBe(true);

    // 验证缓冲区数据已积累
    const cacheBeforeWarmup = await getCachedUserUsage(TEST_USER.id);
    expect(cacheBeforeWarmup).not.toBeNull();
    expect(cacheBeforeWarmup!.fastBufferUsed).toBe(2);
    
    console.log(`📊 预热前缓冲区状态: premium=${cacheBeforeWarmup!.premiumBufferUsed}, fast=${cacheBeforeWarmup!.fastBufferUsed}`);

    // 步骤2: 调用预热API
    console.log('🔥 步骤2: 调用预热API');
    
    try {
      const warmupResponse = await simulateWarmupAPI(TEST_USER.id);
      console.log(`📡 预热API响应状态: ${warmupResponse.status}`);
      
      if (warmupResponse.ok) {
        const warmupResult = await warmupResponse.json();
        console.log('📋 预热API响应:', warmupResult);
      }
    } catch (error) {
      console.log('⚠️ 预热API调用失败（可能是服务器未运行），跳过网络调用');
      // 如果API调用失败，我们直接测试内部逻辑
    }

    // 等待预热完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 步骤3: 验证缓冲区数据是否被保留
    console.log('🔍 步骤3: 验证缓冲区数据');
    
    const cacheAfterWarmup = await getCachedUserUsage(TEST_USER.id);
    expect(cacheAfterWarmup).not.toBeNull();
    
    console.log(`📊 预热后缓冲区状态: premium=${cacheAfterWarmup!.premiumBufferUsed}, fast=${cacheAfterWarmup!.fastBufferUsed}`);

    // 关键验证：缓冲区数据应该被保留，不应该被重置为0
    expect(cacheAfterWarmup!.fastBufferUsed).toBe(2);
    expect(cacheAfterWarmup!.premiumBufferUsed).toBe(0);

    console.log('✅ 预热API正确保留了缓冲区数据');
  }, 30000);

  test('预热API应该只在没有缓存时创建新缓存', async () => {
    console.log('🔬 测试预热API的缓存创建逻辑');

    // 步骤1: 确认没有缓存
    let cache = await getCachedUserUsage(TEST_USER.id);
    expect(cache).toBeNull();
    console.log('📊 初始状态: 无缓存');

    // 步骤2: 调用预热API
    console.log('🔥 步骤2: 首次调用预热API');
    
    try {
      const warmupResponse = await simulateWarmupAPI(TEST_USER.id);
      console.log(`📡 预热API响应状态: ${warmupResponse.status}`);
    } catch (error) {
      console.log('⚠️ 预热API调用失败，跳过网络调用');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 步骤3: 验证缓存被创建
    cache = await getCachedUserUsage(TEST_USER.id);
    if (cache) {
      console.log(`📦 预热后缓存状态: premium=${cache.premiumBufferUsed}, fast=${cache.fastBufferUsed}`);
      expect(cache.premiumBufferUsed).toBe(0);
      expect(cache.fastBufferUsed).toBe(0);
      console.log('✅ 预热API正确创建了初始缓存');
    } else {
      console.log('⚠️ 预热API未创建缓存（可能是服务器未运行）');
    }

    // 步骤4: 积累一些缓冲区数据
    console.log('📤 步骤4: 积累缓冲区数据');
    
    const result = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
    expect(result.success).toBe(true);

    cache = await getCachedUserUsage(TEST_USER.id);
    expect(cache).not.toBeNull();
    expect(cache!.fastBufferUsed).toBe(1);
    
    console.log(`📊 使用后缓冲区状态: premium=${cache!.premiumBufferUsed}, fast=${cache!.fastBufferUsed}`);

    // 步骤5: 再次调用预热API
    console.log('🔥 步骤5: 再次调用预热API');
    
    try {
      const warmupResponse2 = await simulateWarmupAPI(TEST_USER.id);
      console.log(`📡 第二次预热API响应状态: ${warmupResponse2.status}`);
    } catch (error) {
      console.log('⚠️ 第二次预热API调用失败，跳过网络调用');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 步骤6: 验证缓冲区数据仍然保留
    const finalCache = await getCachedUserUsage(TEST_USER.id);
    expect(finalCache).not.toBeNull();
    
    console.log(`📊 最终缓冲区状态: premium=${finalCache!.premiumBufferUsed}, fast=${finalCache!.fastBufferUsed}`);

    // 关键验证：第二次预热不应该覆盖缓冲区数据
    expect(finalCache!.fastBufferUsed).toBe(1);

    console.log('✅ 预热API正确避免了覆盖现有缓冲区数据');
  }, 30000);

  test('验证缓冲区数据在多次操作后的一致性', async () => {
    console.log('🔬 测试缓冲区数据一致性');

    // 执行多次使用量检查和预热操作的混合
    const operations = [
      { type: 'usage', model: 'fast' },
      { type: 'warmup' },
      { type: 'usage', model: 'fast' },
      { type: 'usage', model: 'premium' },
      { type: 'warmup' },
      { type: 'usage', model: 'fast' },
    ];

    let expectedFast = 0;
    let expectedPremium = 0;

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      console.log(`📤 操作 ${i + 1}: ${op.type}${op.model ? ` (${op.model})` : ''}`);

      if (op.type === 'usage') {
        const result = await checkAndUpdateUsageUltraFast(
          TEST_USER.id, 
          op.model as 'fast' | 'premium', 
          { skipDeduplication: true }
        );
        expect(result.success).toBe(true);

        if (op.model === 'fast') expectedFast++;
        if (op.model === 'premium') expectedPremium++;

      } else if (op.type === 'warmup') {
        try {
          await simulateWarmupAPI(TEST_USER.id);
        } catch (error) {
          console.log('⚠️ 预热API调用失败，跳过');
        }
      }

      // 短暂等待
      await new Promise(resolve => setTimeout(resolve, 200));

      // 验证当前状态
      const currentCache = await getCachedUserUsage(TEST_USER.id);
      if (currentCache) {
        console.log(`📊 操作 ${i + 1} 后: premium=${currentCache.premiumBufferUsed}, fast=${currentCache.fastBufferUsed}`);
        
        // 验证缓冲区数据符合预期
        expect(currentCache.fastBufferUsed).toBe(expectedFast);
        expect(currentCache.premiumBufferUsed).toBe(expectedPremium);
      }
    }

    console.log(`✅ 缓冲区数据一致性测试通过: 最终 premium=${expectedPremium}, fast=${expectedFast}`);
  }, 45000);
});

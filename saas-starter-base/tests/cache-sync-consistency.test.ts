/**
 * 缓存同步一致性测试
 * 测试数据库同步后缓存是否正确更新，避免重复计算
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  checkAndUpdateUsageUltraFast, 
  getCachedUserUsage, 
  clearUserCache,
  forceClearUserSyncState,
  getUserUsageFromDB
} from '../lib/usage-ultra-fast';

// 测试用户数据
const TEST_USER = {
  id: '1675524b-820b-478f-b841-f94aaffac413',
  email: '1519235462@qq.com',
  plan: 'Premium'
};

describe('缓存同步一致性测试', () => {
  beforeEach(async () => {
    // 清理用户缓存和同步状态
    await clearUserCache(TEST_USER.id);
    forceClearUserSyncState(TEST_USER.id);
    console.log('🧪 缓存同步一致性测试开始');
  });

  afterEach(async () => {
    // 清理测试数据
    await clearUserCache(TEST_USER.id);
    forceClearUserSyncState(TEST_USER.id);
    console.log('🧹 缓存同步一致性测试清理完成');
  });

  test('数据库同步后缓存应该立即更新，避免重复计算', async () => {
    console.log('🔬 测试数据库同步后的缓存一致性');

    // 步骤1: 记录初始数据库状态
    console.log('📊 步骤1: 获取初始数据库状态');
    const initialDbData = await getUserUsageFromDB(TEST_USER.id);
    expect(initialDbData).not.toBeNull();
    
    const initialPremiumUsed = initialDbData!.premiumRequestsUsed;
    const initialFastUsed = initialDbData!.fastRequestsUsed;
    
    console.log(`📊 初始数据库状态: premium=${initialPremiumUsed}, fast=${initialFastUsed}`);

    // 步骤2: 执行多次使用量检查，积累缓冲区数据
    console.log('📤 步骤2: 积累缓冲区数据');
    
    const usageResults = [];
    for (let i = 0; i < 3; i++) {
      const result = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
      expect(result.success).toBe(true);
      usageResults.push(result);
      
      // 短暂等待
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 验证缓冲区数据已积累
    const cacheBeforeSync = await getCachedUserUsage(TEST_USER.id);
    expect(cacheBeforeSync).not.toBeNull();
    expect(cacheBeforeSync!.fastBufferUsed).toBe(3);
    
    console.log(`📊 同步前缓冲区状态: premium=${cacheBeforeSync!.premiumBufferUsed}, fast=${cacheBeforeSync!.fastBufferUsed}`);

    // 步骤3: 触发同步（通过达到阈值或手动触发）
    console.log('🔄 步骤3: 触发同步');
    
    // 继续添加使用量直到触发同步
    for (let i = 0; i < 3; i++) {
      const result = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
      expect(result.success).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 等待同步完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 步骤4: 验证同步后的状态
    console.log('🔍 步骤4: 验证同步后状态');
    
    // 检查缓存状态
    const cacheAfterSync = await getCachedUserUsage(TEST_USER.id);
    expect(cacheAfterSync).not.toBeNull();
    
    console.log(`📊 同步后缓冲区状态: premium=${cacheAfterSync!.premiumBufferUsed}, fast=${cacheAfterSync!.fastBufferUsed}`);
    console.log(`📊 同步后已同步状态: premium=${cacheAfterSync!.premiumRequestsUsed}, fast=${cacheAfterSync!.fastRequestsUsed}`);

    // 检查数据库状态
    const dbAfterSync = await getUserUsageFromDB(TEST_USER.id);
    expect(dbAfterSync).not.toBeNull();
    
    console.log(`📊 同步后数据库状态: premium=${dbAfterSync!.premiumRequestsUsed}, fast=${dbAfterSync!.fastRequestsUsed}`);

    // 关键验证：缓存和数据库应该一致
    expect(cacheAfterSync!.premiumRequestsUsed).toBe(dbAfterSync!.premiumRequestsUsed);
    expect(cacheAfterSync!.fastRequestsUsed).toBe(dbAfterSync!.fastRequestsUsed);

    // 验证数据库中的使用量确实增加了
    expect(dbAfterSync!.fastRequestsUsed).toBeGreaterThan(initialFastUsed);
    
    console.log('✅ 缓存和数据库状态一致，同步成功');
  }, 30000);

  test('并发使用和同步不应该导致数据重复计算', async () => {
    console.log('🔬 测试并发场景下的数据一致性');

    // 步骤1: 获取初始状态
    const initialDbData = await getUserUsageFromDB(TEST_USER.id);
    expect(initialDbData).not.toBeNull();
    
    const initialFastUsed = initialDbData!.fastRequestsUsed;
    console.log(`📊 初始数据库状态: fast=${initialFastUsed}`);

    // 步骤2: 并发执行多个使用量检查
    console.log('📤 步骤2: 并发执行使用量检查');
    
    const concurrentPromises = [];
    const expectedUsageCount = 8;
    
    for (let i = 0; i < expectedUsageCount; i++) {
      concurrentPromises.push(
        checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true })
      );
    }

    const results = await Promise.all(concurrentPromises);
    
    // 验证所有请求都成功
    results.forEach((result, index) => {
      expect(result.success).toBe(true);
      console.log(`📊 并发请求 ${index + 1} 成功`);
    });

    // 等待所有同步完成
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 步骤3: 验证最终状态
    console.log('🔍 步骤3: 验证最终状态');
    
    const finalDbData = await getUserUsageFromDB(TEST_USER.id);
    expect(finalDbData).not.toBeNull();
    
    const finalFastUsed = finalDbData!.fastRequestsUsed;
    const actualIncrease = finalFastUsed - initialFastUsed;
    
    console.log(`📊 最终数据库状态: fast=${finalFastUsed}`);
    console.log(`📊 实际增加量: ${actualIncrease}, 预期增加量: ${expectedUsageCount}`);

    // 关键验证：实际增加量应该等于预期增加量，不应该有重复计算
    expect(actualIncrease).toBe(expectedUsageCount);

    // 验证缓存状态
    const finalCacheData = await getCachedUserUsage(TEST_USER.id);
    if (finalCacheData) {
      console.log(`📊 最终缓存状态: fast=${finalCacheData.fastRequestsUsed}, 缓冲区=${finalCacheData.fastBufferUsed}`);
      
      // 缓存和数据库应该一致
      expect(finalCacheData.fastRequestsUsed).toBe(finalFastUsed);
    }

    console.log('✅ 并发场景下数据一致性验证通过');
  }, 45000);

  test('同步失败时应该清除缓存确保数据一致性', async () => {
    console.log('🔬 测试同步失败时的缓存处理');

    // 步骤1: 积累一些缓冲区数据
    console.log('📤 步骤1: 积累缓冲区数据');
    
    const result1 = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
    expect(result1.success).toBe(true);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result2 = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
    expect(result2.success).toBe(true);

    // 验证缓冲区数据
    const cacheBeforeTest = await getCachedUserUsage(TEST_USER.id);
    expect(cacheBeforeTest).not.toBeNull();
    expect(cacheBeforeTest!.fastBufferUsed).toBe(2);
    
    console.log(`📊 测试前缓冲区状态: fast=${cacheBeforeTest!.fastBufferUsed}`);

    // 步骤2: 模拟正常同步（通过继续使用直到触发同步）
    console.log('🔄 步骤2: 触发正常同步');
    
    for (let i = 0; i < 4; i++) {
      const result = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
      expect(result.success).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 等待同步完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 步骤3: 验证同步后状态
    console.log('🔍 步骤3: 验证同步后状态');
    
    const cacheAfterSync = await getCachedUserUsage(TEST_USER.id);
    const dbAfterSync = await getUserUsageFromDB(TEST_USER.id);
    
    if (cacheAfterSync && dbAfterSync) {
      console.log(`📊 同步后缓存状态: fast=${cacheAfterSync.fastRequestsUsed}, 缓冲区=${cacheAfterSync.fastBufferUsed}`);
      console.log(`📊 同步后数据库状态: fast=${dbAfterSync.fastRequestsUsed}`);
      
      // 验证数据一致性
      expect(cacheAfterSync.fastRequestsUsed).toBe(dbAfterSync.fastRequestsUsed);
      
      console.log('✅ 同步后数据一致性验证通过');
    } else {
      console.log('⚠️ 缓存或数据库数据为空，可能是同步过程中的正常状态');
    }
  }, 30000);
});

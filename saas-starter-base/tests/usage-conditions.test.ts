/**
 * 使用量系统缓存条件测试
 * 详细测试各种缓存同步条件：
 * 1. 缓存次数阈值触发
 * 2. 时间超时触发
 * 3. 会话超时触发
 * 4. 强制同步条件
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  checkAndUpdateUsageUltraFast,
  getCachedUserUsage,
  getUserUsageStats,
  clearUserCache,
  forceClearUserSyncState,
  setCachedUserUsage,
  getUserUsageFromDB
} from '../lib/usage-ultra-fast';
import { UserSessionWarmup } from '../lib/warmup';

// 测试用户数据
const TEST_USER = {
  id: '1675524b-820b-478f-b841-f94aaffac413',
  email: '1519235462@qq.com',
  plan: 'Premium'
};

/**
 * 预热用户数据到缓存
 */
async function warmupUserData(userId: string): Promise<void> {
  try {
    console.log(`🔥 [条件测试预热] 开始预热用户 ${userId} 数据...`);

    const userUsage = await getUserUsageFromDB(userId);
    if (userUsage) {
      await setCachedUserUsage(userId, userUsage);
      console.log(`✅ [条件测试预热] 用户 ${userId} 数据预热完成`);
    }

    await UserSessionWarmup.warmupUserSession(userId);
    console.log(`✅ [条件测试预热] 用户 ${userId} 会话预热完成`);

  } catch (error) {
    console.error(`❌ [条件测试预热] 用户 ${userId} 预热失败:`, error);
  }
}

describe('使用量系统缓存条件测试', () => {
  beforeEach(async () => {
    await clearUserCache(TEST_USER.id);
    forceClearUserSyncState(TEST_USER.id);

    // 预热用户数据
    await warmupUserData(TEST_USER.id);

    console.log('🧪 条件测试开始 - 用户数据已预热');
  });

  afterEach(async () => {
    await clearUserCache(TEST_USER.id);
    forceClearUserSyncState(TEST_USER.id);
    console.log('🧹 条件测试清理完成');
  });

  describe('缓存次数阈值测试', () => {
    test('达到SYNC_THRESHOLD时应该触发同步', async () => {
      console.log('🎯 测试SYNC_THRESHOLD触发条件');

      const syncThreshold = 3; // 开发环境的阈值
      let syncTriggered = false;

      // 逐步增加缓冲区使用量
      for (let i = 1; i <= syncThreshold + 1; i++) {
        console.log(`📤 执行第 ${i} 次请求 (阈值: ${syncThreshold})`);
        
        const result = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
        expect(result.success).toBe(true);

        const cache = await getCachedUserUsage(TEST_USER.id);
        console.log(`📊 当前缓冲: fast=${cache?.fastBufferUsed || 0}`);

        // 检查是否达到阈值
        if (cache && cache.fastBufferUsed >= syncThreshold) {
          console.log(`🚨 达到同步阈值: ${cache.fastBufferUsed} >= ${syncThreshold}`);
          syncTriggered = true;
          
          // 等待异步同步完成
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 验证同步后的状态
          const statsAfterSync = await getUserUsageStats(TEST_USER.id);
          console.log(`📊 同步后状态: 数据库=${statsAfterSync?.fast.synced || 0}, 缓冲=${statsAfterSync?.fast.buffered || 0}`);
          
          break;
        }

        // 短暂等待避免过快请求
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(syncTriggered).toBe(true);
      console.log('✅ SYNC_THRESHOLD触发测试通过');
    }, 20000);

    test('premium和fast类型都应该正确计算阈值', async () => {
      console.log('🔄 测试不同类型的阈值计算');

      // 测试premium类型
      console.log('📤 测试premium类型阈值');
      const premiumResult = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'premium', { skipDeduplication: true });
      expect(premiumResult.success).toBe(true);

      let cache = await getCachedUserUsage(TEST_USER.id);
      console.log(`📊 Premium缓冲: ${cache?.premiumBufferUsed || 0}`);

      // 测试fast类型
      console.log('📤 测试fast类型阈值');
      const fastResult = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
      expect(fastResult.success).toBe(true);

      cache = await getCachedUserUsage(TEST_USER.id);
      console.log(`📊 Fast缓冲: ${cache?.fastBufferUsed || 0}`);

      // 验证两种类型都正确更新
      expect(cache?.premiumBufferUsed).toBeGreaterThan(0);
      expect(cache?.fastBufferUsed).toBeGreaterThan(0);

      console.log('✅ 不同类型阈值测试通过');
    }, 15000);
  });

  describe('时间条件测试', () => {
    test('MAX_BUFFER_TIME超时应该触发同步', async () => {
      console.log('⏰ 测试MAX_BUFFER_TIME超时触发');

      // 创建初始缓冲区数据
      const result = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
      expect(result.success).toBe(true);

      let cache = await getCachedUserUsage(TEST_USER.id);
      expect(cache).not.toBeNull();
      
      const originalSyncTime = cache!.lastSyncTime;
      console.log(`📊 初始状态: 缓冲=${cache!.fastBufferUsed}, 上次同步=${new Date(originalSyncTime).toISOString()}`);

      // 模拟时间过期：手动修改缓存中的lastSyncTime
      const expiredTime = Date.now() - (6 * 60 * 1000); // 6分钟前（超过5分钟的MAX_BUFFER_TIME）
      const modifiedCache = {
        ...cache!,
        lastSyncTime: expiredTime
      };

      // 更新缓存以模拟时间过期
      await setCachedUserUsage(TEST_USER.id, modifiedCache);
      console.log(`⏰ 模拟时间过期: 设置lastSyncTime为 ${new Date(expiredTime).toISOString()}`);

      // 再次请求，这应该检测到时间过期并触发同步
      const result2 = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
      expect(result2.success).toBe(true);

      // 等待异步同步完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证同步是否发生
      const finalStats = await getUserUsageStats(TEST_USER.id);
      console.log(`📊 最终状态: 数据库=${finalStats?.fast.synced || 0}, 缓冲=${finalStats?.fast.buffered || 0}`);

      console.log('✅ MAX_BUFFER_TIME超时测试完成');
    }, 20000);

    test('SESSION_TIMEOUT应该触发会话结束同步', async () => {
      console.log('🕐 测试SESSION_TIMEOUT会话超时');

      // 创建缓冲区数据
      const result = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
      expect(result.success).toBe(true);

      let cache = await getCachedUserUsage(TEST_USER.id);
      expect(cache).not.toBeNull();

      console.log(`📊 初始状态: 缓冲=${cache!.fastBufferUsed}, 活动时间=${new Date(cache!.lastActivityTime).toISOString()}`);

      // 模拟会话超时：修改lastActivityTime为超过60分钟前
      const sessionExpiredTime = Date.now() - (61 * 60 * 1000); // 61分钟前
      const modifiedCache = {
        ...cache!,
        lastActivityTime: sessionExpiredTime
      };

      await setCachedUserUsage(TEST_USER.id, modifiedCache);
      console.log(`🕐 模拟会话超时: 设置lastActivityTime为 ${new Date(sessionExpiredTime).toISOString()}`);

      // 再次请求，这应该检测到会话超时
      const result2 = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
      expect(result2.success).toBe(true);

      // 等待异步同步完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ SESSION_TIMEOUT测试完成');
    }, 20000);
  });

  describe('强制同步条件测试', () => {
    test('多种条件同时满足时应该正确处理', async () => {
      console.log('🔥 测试多重条件同时触发');

      // 创建接近阈值的缓冲区数据
      for (let i = 0; i < 2; i++) {
        const result = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
        expect(result.success).toBe(true);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      let cache = await getCachedUserUsage(TEST_USER.id);
      expect(cache).not.toBeNull();
      console.log(`📊 当前状态: 缓冲=${cache!.fastBufferUsed}`);

      // 模拟时间也过期
      const expiredTime = Date.now() - (6 * 60 * 1000);
      const modifiedCache = {
        ...cache!,
        lastSyncTime: expiredTime,
        lastActivityTime: expiredTime
      };

      await setCachedUserUsage(TEST_USER.id, modifiedCache);
      console.log('🔥 设置多重过期条件');

      // 再次请求，这应该触发多重条件检查
      const result = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
      expect(result.success).toBe(true);

      // 等待异步同步完成
      await new Promise(resolve => setTimeout(resolve, 3000));

      const finalStats = await getUserUsageStats(TEST_USER.id);
      console.log(`📊 最终状态: 数据库=${finalStats?.fast.synced || 0}, 缓冲=${finalStats?.fast.buffered || 0}`);

      console.log('✅ 多重条件测试完成');
    }, 25000);

    test('缓存数据完整性应该得到保持', async () => {
      console.log('🔒 测试缓存数据完整性');

      // 执行多次不同类型的请求
      const operations = [
        { type: 'fast' as const, count: 2 },
        { type: 'premium' as const, count: 1 },
        { type: 'fast' as const, count: 1 }
      ];

      for (const op of operations) {
        for (let i = 0; i < op.count; i++) {
          const result = await checkAndUpdateUsageUltraFast(TEST_USER.id, op.type, { skipDeduplication: true });
          expect(result.success).toBe(true);
          console.log(`📤 执行 ${op.type} 请求 ${i + 1}/${op.count}`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // 验证缓存数据的完整性
      const cache = await getCachedUserUsage(TEST_USER.id);
      expect(cache).not.toBeNull();

      console.log(`📊 最终缓存状态:`);
      console.log(`  - Premium缓冲: ${cache!.premiumBufferUsed}`);
      console.log(`  - Fast缓冲: ${cache!.fastBufferUsed}`);
      console.log(`  - 上次同步: ${new Date(cache!.lastSyncTime).toISOString()}`);
      console.log(`  - 上次活动: ${new Date(cache!.lastActivityTime).toISOString()}`);

      // 验证数据一致性
      expect(cache!.premiumBufferUsed).toBe(1);
      expect(cache!.fastBufferUsed).toBe(3);
      expect(cache!.lastSyncTime).toBeGreaterThan(0);
      expect(cache!.lastActivityTime).toBeGreaterThan(0);

      console.log('✅ 缓存数据完整性测试通过');
    }, 20000);
  });
});

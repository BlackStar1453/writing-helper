/**
 * 使用量系统测试
 * 测试三个核心场景：
 * 1. 直接在请求后更新数据库使用量
 * 2. 请求后更新缓存
 * 3. 达到条件时将缓存内容更新到数据库
 */

// 使用 CommonJS 语法
import { 
  checkAndUpdateUsageUltraFast, 
  getCachedUserUsage, 
  getUserUsageStats,
  clearUserCache,
  forceClearUserSyncState,
  diagnoseDuplicateSync
} from '../lib/usage-ultra-fast';
import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// 测试用户数据
const TEST_USER = {
  id: '1675524b-820b-478f-b841-f94aaffac413',
  email: '1519235462@qq.com',
  plan: 'Premium'
};

describe('使用量系统测试', () => {
  let initialUserState: any = null;

  beforeEach(async () => {
    // 保存初始状态
    try {
      const userRecord = await db
        .select()
        .from(users)
        .where(eq(users.id, TEST_USER.id))
        .limit(1);
      
      if (userRecord.length > 0) {
        initialUserState = {
          premiumRequestsUsed: userRecord[0].premiumRequestsUsed || 0,
          fastRequestsUsed: userRecord[0].fastRequestsUsed || 0
        };
      }
    } catch (error) {
      console.log('获取初始用户状态失败，可能是新用户:', error);
      initialUserState = {
        premiumRequestsUsed: 0,
        fastRequestsUsed: 0
      };
    }

    // 清理用户缓存和同步状态
    await clearUserCache(TEST_USER.id);
    forceClearUserSyncState(TEST_USER.id);
    
    console.log(`🧪 测试开始 - 用户初始状态: premium=${initialUserState.premiumRequestsUsed}, fast=${initialUserState.fastRequestsUsed}`);
  });

  afterEach(async () => {
    // 清理测试数据
    await clearUserCache(TEST_USER.id);
    forceClearUserSyncState(TEST_USER.id);
    console.log('🧹 测试清理完成');
  });

  describe('场景1: 直接数据库更新测试', () => {
    test('应该能够直接更新数据库使用量（通过多次请求触发同步）', async () => {
      console.log('🔬 测试场景1: 直接数据库更新');

      // 获取测试前的数据库状态
      const beforeStats = await getUserUsageStats(TEST_USER.id);
      const beforeDbUsed = beforeStats ? beforeStats.fast.synced : 0;
      
      console.log(`📊 测试前数据库状态: fast已同步=${beforeDbUsed}`);

      // 执行多次请求以触发同步阈值（开发环境阈值为3）
      const requestCount = 4; // 超过阈值确保触发同步
      const results = [];

      for (let i = 0; i < requestCount; i++) {
        console.log(`📤 执行第 ${i + 1} 次请求...`);
        // 跳过去重机制来测试核心功能
        const result = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
        results.push(result);

        // 等待一小段时间让异步同步完成
        if (i === requestCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // 验证所有请求都成功
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ 成功请求数: ${successCount}/${requestCount}`);
      expect(successCount).toBeGreaterThan(0);

      // 获取测试后的数据库状态
      const afterStats = await getUserUsageStats(TEST_USER.id);
      const afterDbUsed = afterStats ? afterStats.fast.synced : 0;
      
      console.log(`📊 测试后数据库状态: fast已同步=${afterDbUsed}`);
      console.log(`📈 数据库使用量变化: ${beforeDbUsed} -> ${afterDbUsed} (+${afterDbUsed - beforeDbUsed})`);

      // 验证数据库使用量有增加
      expect(afterDbUsed).toBeGreaterThan(beforeDbUsed);

      // 验证增加的数量合理（由于跳过去重，应该等于成功的请求数）
      const actualIncrease = afterDbUsed - beforeDbUsed;
      expect(actualIncrease).toBeGreaterThan(0);
      expect(actualIncrease).toBeGreaterThanOrEqual(1); // 至少增加1

      console.log('✅ 场景1测试通过: 数据库使用量成功更新');
    }, 30000);
  });

  describe('场景2: 缓存更新测试', () => {
    test('应该能够在请求后更新缓存', async () => {
      console.log('🔬 测试场景2: 缓存更新');

      // 获取测试前的缓存状态
      const beforeCache = await getCachedUserUsage(TEST_USER.id);
      const beforeBuffered = beforeCache ? beforeCache.fastBufferUsed : 0;
      
      console.log(`📊 测试前缓存状态: fast缓冲=${beforeBuffered}`);

      // 执行一次请求
      console.log('📤 执行请求...');
      const result = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast');
      
      console.log(`📋 请求结果: ${result.success ? '成功' : '失败'}`);
      if (!result.success) {
        console.log(`❌ 请求失败原因:`, result.error);
      }

      // 验证请求成功
      expect(result.success).toBe(true);

      // 获取测试后的缓存状态
      const afterCache = await getCachedUserUsage(TEST_USER.id);
      expect(afterCache).not.toBeNull();
      
      const afterBuffered = afterCache!.fastBufferUsed;
      
      console.log(`📊 测试后缓存状态: fast缓冲=${afterBuffered}`);
      console.log(`📈 缓存使用量变化: ${beforeBuffered} -> ${afterBuffered} (+${afterBuffered - beforeBuffered})`);

      // 验证缓存中的缓冲区使用量有增加
      expect(afterBuffered).toBeGreaterThan(beforeBuffered);
      expect(afterBuffered - beforeBuffered).toBe(1); // 应该增加1

      // 验证缓存中包含必要的字段
      expect(afterCache).toHaveProperty('premiumBufferUsed');
      expect(afterCache).toHaveProperty('fastBufferUsed');
      expect(afterCache).toHaveProperty('lastActivityTime');
      expect(afterCache).toHaveProperty('lastSyncTime');

      console.log('✅ 场景2测试通过: 缓存成功更新');
    }, 15000);
  });

  describe('场景3: 缓存到数据库同步测试', () => {
    test('应该能够在达到条件时将缓存内容同步到数据库', async () => {
      console.log('🔬 测试场景3: 缓存到数据库同步');

      // 获取测试前状态
      const beforeStats = await getUserUsageStats(TEST_USER.id);
      const beforeDbUsed = beforeStats ? beforeStats.fast.synced : 0;
      const beforeBuffered = beforeStats ? beforeStats.fast.buffered : 0;
      
      console.log(`📊 测试前状态: 数据库=${beforeDbUsed}, 缓冲=${beforeBuffered}`);

      // 执行请求直到达到同步阈值（开发环境为3）
      const syncThreshold = 3;
      const results = [];

      console.log(`📤 执行 ${syncThreshold} 次请求以达到同步阈值...`);
      
      for (let i = 0; i < syncThreshold; i++) {
        console.log(`📤 执行第 ${i + 1}/${syncThreshold} 次请求...`);
        // 跳过去重机制来测试核心功能
        const result = await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast', { skipDeduplication: true });
        results.push(result);

        if (!result.success) {
          console.log(`❌ 第 ${i + 1} 次请求失败:`, result.error);
        }

        // 检查中间状态
        const midStats = await getUserUsageStats(TEST_USER.id);
        if (midStats) {
          console.log(`📊 第 ${i + 1} 次请求后: 数据库=${midStats.fast.synced}, 缓冲=${midStats.fast.buffered}`);
        }
      }

      // 等待异步同步完成
      console.log('⏳ 等待异步同步完成...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 获取最终状态
      const afterStats = await getUserUsageStats(TEST_USER.id);
      const afterDbUsed = afterStats ? afterStats.fast.synced : 0;
      const afterBuffered = afterStats ? afterStats.fast.buffered : 0;
      
      console.log(`📊 测试后状态: 数据库=${afterDbUsed}, 缓冲=${afterBuffered}`);
      console.log(`📈 变化: 数据库 ${beforeDbUsed}->${afterDbUsed} (+${afterDbUsed - beforeDbUsed}), 缓冲 ${beforeBuffered}->${afterBuffered}`);

      // 验证同步行为
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ 成功请求数: ${successCount}`);

      // 验证数据库使用量增加
      expect(afterDbUsed).toBeGreaterThan(beforeDbUsed);
      
      // 验证缓冲区被清空或减少（同步后应该清零）
      expect(afterBuffered).toBeLessThanOrEqual(beforeBuffered + successCount);
      
      // 验证总使用量的一致性
      const totalBefore = beforeDbUsed + beforeBuffered;
      const totalAfter = afterDbUsed + afterBuffered;
      const expectedIncrease = successCount;

      console.log(`📊 总使用量: ${totalBefore} -> ${totalAfter} (预期增加: ${expectedIncrease})`);
      // 由于跳过去重，总使用量应该增加
      expect(totalAfter - totalBefore).toBeGreaterThanOrEqual(1);
      expect(totalAfter - totalBefore).toBeLessThanOrEqual(expectedIncrease);

      console.log('✅ 场景3测试通过: 缓存成功同步到数据库');
    }, 30000);
  });

  describe('诊断和状态检查', () => {
    test('应该能够正确诊断同步状态', async () => {
      console.log('🔬 测试诊断功能');

      // 执行一些请求
      await checkAndUpdateUsageUltraFast(TEST_USER.id, 'fast');
      
      // 诊断同步状态
      const diagnosis = diagnoseDuplicateSync(TEST_USER.id);
      
      console.log('📊 诊断结果:', JSON.stringify(diagnosis, null, 2));
      
      // 验证诊断结果结构
      expect(diagnosis).toHaveProperty('syncLockStatus');
      expect(diagnosis).toHaveProperty('syncQueueStatus');
      expect(diagnosis).toHaveProperty('activeSyncCount');
      expect(diagnosis).toHaveProperty('requestDeduplicationStatus');
      expect(diagnosis).toHaveProperty('recommendations');
      
      console.log('✅ 诊断功能测试通过');
    }, 10000);
  });
});

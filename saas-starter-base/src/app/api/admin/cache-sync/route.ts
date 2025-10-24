import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAPI } from '@/lib/auth/admin-middleware';
import { performCacheSyncCheck } from '@/lib/cron/cache-sync-check';
import { redisCache } from '@/lib/redis';

/**
 * 管理员缓存同步管理API
 */

// GET - 获取缓存同步状态和历史
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'status':
        return await getCacheSyncStatus();
      case 'history':
        return await getCacheSyncHistory();
      case 'stats':
        return await getCacheStats();
      default:
        return await getCacheSyncOverview();
    }

  } catch (error) {
    console.error('获取缓存同步信息失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取缓存同步信息失败'
    }, { status: 500 });
  }
}

// POST - 执行缓存同步操作
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { action, options = {} } = body;

    switch (action) {
      case 'check':
        return await performSyncCheck(options);
      case 'fix':
        return await performSyncFix(options);
      case 'clear-history':
        return await clearSyncHistory();
      default:
        return NextResponse.json({
          success: false,
          error: '未知操作'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('执行缓存同步操作失败:', error);
    return NextResponse.json({
      success: false,
      error: '执行缓存同步操作失败'
    }, { status: 500 });
  }
}

/**
 * 获取缓存同步概览
 */
async function getCacheSyncOverview() {
  try {
    // 获取最近的检查结果
    const lastCheckResult = await redisCache.get('cache_sync:last_check');
    const lastCheckTime = await redisCache.get('cache_sync:last_check_time');
    const nextScheduledCheck = getNextScheduledCheck();

    // 获取缓存统计
    const cacheStats = await getCacheStatsData();

    return NextResponse.json({
      success: true,
      data: {
        lastCheck: {
          result: lastCheckResult ? JSON.parse(lastCheckResult) : null,
          timestamp: lastCheckTime,
        },
        nextScheduledCheck,
        cacheStats,
        status: lastCheckResult ? 'healthy' : 'unknown'
      }
    });

  } catch (error) {
    throw error;
  }
}

/**
 * 获取缓存同步状态
 */
async function getCacheSyncStatus() {
  try {
    const status = await redisCache.get('cache_sync:status') || 'idle';
    const progress = await redisCache.get('cache_sync:progress');
    const currentTask = await redisCache.get('cache_sync:current_task');

    return NextResponse.json({
      success: true,
      data: {
        status, // idle, running, completed, error
        progress: progress ? JSON.parse(progress) : null,
        currentTask,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    throw error;
  }
}

/**
 * 获取缓存同步历史
 */
async function getCacheSyncHistory() {
  try {
    const historyKeys = await redisCache.keys('cache_sync:history:*');
    const history = [];

    for (const key of historyKeys.slice(-10)) { // 最近10次记录
      const record = await redisCache.get(key);
      if (record) {
        history.push(JSON.parse(record));
      }
    }

    // 按时间倒序排列
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      data: {
        history,
        total: historyKeys.length
      }
    });

  } catch (error) {
    throw error;
  }
}

/**
 * 获取缓存统计信息
 */
async function getCacheStats() {
  try {
    const stats = await getCacheStatsData();

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    throw error;
  }
}

/**
 * 执行同步检查
 */
async function performSyncCheck(options: any) {
  try {
    // 设置运行状态
    await redisCache.set('cache_sync:status', 'running', 3600);
    await redisCache.set('cache_sync:current_task', '执行缓存同步检查', 3600);

    const checkOptions = {
      autoFix: false, // 仅检查，不修复
      checkAll: options.checkAll || false,
      batchSize: options.batchSize || 50,
      maxUsers: options.maxUsers || 200
    };

    const result = await performCacheSyncCheck(checkOptions);

    // 保存检查结果
    await saveSyncResult(result, 'check');

    // 重置状态
    await redisCache.set('cache_sync:status', 'completed', 3600);
    await redisCache.del('cache_sync:current_task');

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    await redisCache.set('cache_sync:status', 'error', 3600);
    await redisCache.set('cache_sync:current_task', `错误: ${error instanceof Error ? error.message : '未知错误'}`, 3600);
    throw error;
  }
}

/**
 * 执行同步修复
 */
async function performSyncFix(options: any) {
  try {
    // 设置运行状态
    await redisCache.set('cache_sync:status', 'running', 3600);
    await redisCache.set('cache_sync:current_task', '执行缓存同步修复', 3600);

    const fixOptions = {
      autoFix: true, // 自动修复
      checkAll: options.checkAll || false,
      batchSize: options.batchSize || 30, // 修复时使用较小的批次
      maxUsers: options.maxUsers || 100
    };

    const result = await performCacheSyncCheck(fixOptions);

    // 保存修复结果
    await saveSyncResult(result, 'fix');

    // 重置状态
    await redisCache.set('cache_sync:status', 'completed', 3600);
    await redisCache.del('cache_sync:current_task');

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    await redisCache.set('cache_sync:status', 'error', 3600);
    await redisCache.set('cache_sync:current_task', `错误: ${error instanceof Error ? error.message : '未知错误'}`, 3600);
    throw error;
  }
}

/**
 * 清除同步历史
 */
async function clearSyncHistory() {
  try {
    const historyKeys = await redisCache.keys('cache_sync:history:*');
    
    for (const key of historyKeys) {
      await redisCache.del(key);
    }

    return NextResponse.json({
      success: true,
      data: {
        cleared: historyKeys.length,
        message: `已清除 ${historyKeys.length} 条历史记录`
      }
    });

  } catch (error) {
    throw error;
  }
}

/**
 * 保存同步结果到历史
 */
async function saveSyncResult(result: any, type: 'check' | 'fix') {
  try {
    const timestamp = new Date().toISOString();
    const historyRecord = {
      type,
      result,
      timestamp,
      summary: {
        totalChecked: result.totalChecked,
        inconsistencies: result.inconsistencies,
        fixed: result.fixed,
        errors: result.errors
      }
    };

    // 保存到历史记录
    const historyKey = `cache_sync:history:${Date.now()}`;
    await redisCache.set(historyKey, JSON.stringify(historyRecord), 7 * 24 * 3600); // 保存7天

    // 更新最后检查结果
    await redisCache.set('cache_sync:last_check', JSON.stringify(result), 24 * 3600);
    await redisCache.set('cache_sync:last_check_time', timestamp, 24 * 3600);

  } catch (error) {
    console.error('保存同步结果失败:', error);
  }
}

/**
 * 获取缓存统计数据
 */
async function getCacheStatsData() {
  try {
    // 这里可以添加更多的缓存统计逻辑
    const userCacheKeys = await redisCache.keys('user_usage:*');
    const bufferKeys = await redisCache.keys('user_usage_buffer:*');

    return {
      userCacheCount: userCacheKeys.length,
      bufferCount: bufferKeys.length,
      totalCacheKeys: userCacheKeys.length + bufferKeys.length,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error('获取缓存统计失败:', error);
    return {
      userCacheCount: 0,
      bufferCount: 0,
      totalCacheKeys: 0,
      lastUpdated: new Date().toISOString(),
      error: '获取统计失败'
    };
  }
}

/**
 * 获取下次计划检查时间
 */
function getNextScheduledCheck() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0); // 明天凌晨2点

  return tomorrow.toISOString();
}

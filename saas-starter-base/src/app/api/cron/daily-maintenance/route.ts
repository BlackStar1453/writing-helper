import { NextRequest, NextResponse } from 'next/server';
import { performCacheSyncCheck } from '@/lib/cron/cache-sync-check';

/**
 * 每日维护任务 - 合并多个维护任务以节省 Cron Job 配额
 * 
 * 包含的任务：
 * 1. 缓存同步检查 (原 cache-sync-check)
 * 2. 版本缓存刷新 (原 refresh-version-cache)
 * 3. 其他日常维护任务
 */

export async function GET(request: NextRequest) {
  try {
    // 验证请求来源（Vercel cron或管理员）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // 如果设置了CRON_SECRET，验证授权
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    console.log('🔧 开始执行每日维护任务...');
    
    const maintenanceResults = {
      timestamp: new Date().toISOString(),
      tasks: [] as any[],
      summary: {
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        totalDuration: 0
      }
    };

    const startTime = Date.now();

    // 任务1: 缓存同步检查
    await executeTask(
      'cache-sync-check',
      '缓存同步检查',
      async () => {
        const result = await performCacheSyncCheck({
          autoFix: true,
          checkAll: false,
          batchSize: 50,
          maxUsers: 200
        });
        return {
          totalChecked: result.totalChecked,
          inconsistencies: result.inconsistencies,
          fixed: result.fixed,
          errors: result.errors,
          cacheHitRate: result.summary.cacheHitRate,
          dataConsistencyRate: result.summary.dataConsistencyRate
        };
      },
      maintenanceResults
    );

    // 任务2: 版本缓存刷新
    await executeTask(
      'refresh-version-cache',
      '版本缓存刷新',
      async () => {
        // 导入版本缓存刷新逻辑
        const { refreshVersionCache } = await import('@/lib/version-cache');
        const result = await refreshVersionCache();
        return {
          versionsRefreshed: result.versionsRefreshed || 0,
          platformsUpdated: result.platformsUpdated || 0,
          cacheUpdated: result.success
        };
      },
      maintenanceResults
    );

    // 任务3: 清理过期数据 (可选)
    await executeTask(
      'cleanup-expired-data',
      '清理过期数据',
      async () => {
        // 清理过期的缓存同步历史记录
        const { redisCache } = await import('@/lib/redis');
        const historyKeys = await redisCache.keys('cache_sync:history:*');
        
        // 保留最近7天的记录，删除更早的
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        let deletedCount = 0;
        
        for (const key of historyKeys) {
          const timestamp = parseInt(key.split(':')[2]);
          if (timestamp && timestamp < sevenDaysAgo) {
            await redisCache.del(key);
            deletedCount++;
          }
        }
        
        return {
          expiredRecordsDeleted: deletedCount,
          totalHistoryRecords: historyKeys.length
        };
      },
      maintenanceResults
    );

    // 计算总耗时
    maintenanceResults.summary.totalDuration = Date.now() - startTime;

    console.log('✅ 每日维护任务完成:', {
      totalTasks: maintenanceResults.summary.totalTasks,
      successful: maintenanceResults.summary.successfulTasks,
      failed: maintenanceResults.summary.failedTasks,
      duration: `${maintenanceResults.summary.totalDuration}ms`
    });

    return NextResponse.json({
      success: true,
      message: '每日维护任务执行完成',
      ...maintenanceResults
    });

  } catch (error) {
    console.error('❌ 每日维护任务失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * 执行单个维护任务
 */
async function executeTask(
  taskId: string,
  taskName: string,
  taskFunction: () => Promise<any>,
  results: any
) {
  const taskStartTime = Date.now();
  
  try {
    console.log(`🔄 开始执行: ${taskName}`);
    
    const taskResult = await taskFunction();
    const duration = Date.now() - taskStartTime;
    
    results.tasks.push({
      id: taskId,
      name: taskName,
      status: 'success',
      duration,
      result: taskResult,
      timestamp: new Date().toISOString()
    });
    
    results.summary.totalTasks++;
    results.summary.successfulTasks++;
    
    console.log(`✅ ${taskName} 完成 (${duration}ms):`, taskResult);
    
  } catch (error) {
    const duration = Date.now() - taskStartTime;
    
    results.tasks.push({
      id: taskId,
      name: taskName,
      status: 'failed',
      duration,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
    
    results.summary.totalTasks++;
    results.summary.failedTasks++;
    
    console.error(`❌ ${taskName} 失败 (${duration}ms):`, error);
  }
}

// POST - 手动触发维护任务（仅限管理员）
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const { verifyAdminAPI } = await import('@/lib/auth/admin-middleware');
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    console.log('🔧 手动触发每日维护任务...');

    const body = await request.json().catch(() => ({}));
    const options = {
      tasks: body.tasks || ['cache-sync-check', 'refresh-version-cache', 'cleanup-expired-data'],
      force: body.force === true
    };

    // 重新调用 GET 方法的逻辑，但使用自定义选项
    const response = await GET(request);
    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: '手动维护任务执行完成',
      options,
      ...result
    });

  } catch (error) {
    console.error('❌ 手动维护任务失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

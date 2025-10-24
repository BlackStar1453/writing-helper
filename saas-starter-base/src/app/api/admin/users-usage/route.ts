import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq, desc, asc, like, sql, and, gte, lte } from 'drizzle-orm';
import {
  getUserUsageStats,
  forceSyncUserUsage,
  diagnoseUserSync,
  checkAndUpdateUsageUltraFast,
  getActiveUsersFromCache,
  clearUserCache,
  syncAllActiveUsers,
  diagnoseDuplicateSync,
  forceClearUserSyncState
} from '@/lib/usage-ultra-fast';
import { redisCache } from '@/lib/redis';

// 统一的管理员认证函数，支持Bearer token和session cookie
async function authenticateAdmin(req: NextRequest): Promise<{ success: boolean; userId?: string; role?: string; error?: string }> {
  // 首先尝试Bearer token认证
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const authResult = await verifyAuth(req);
    if (authResult.success) {
      return {
        success: authResult.role === 'admin',
        userId: authResult.userId,
        role: authResult.role,
        error: authResult.role !== 'admin' ? 'Insufficient permissions' : undefined
      };
    }
  }

  // 如果Bearer token认证失败，尝试session cookie认证
  try {
    const user = await getUser();
    if (user) {
      return {
        success: user.role === 'admin',
        userId: user.id,
        role: user.role,
        error: user.role !== 'admin' ? `Insufficient permissions: role is '${user.role}', expected 'admin'` : undefined
      };
    }
  } catch (error) {
    console.error('Session认证失败:', error);
  }

  return { success: false, error: 'Unauthorized' };
}

export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await authenticateAdmin(req);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const planFilter = searchParams.get('plan') || '';
    const statusFilter = searchParams.get('status') || '';

    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions = [];
    
    if (search) {
      conditions.push(like(users.email, `%${search}%`));
    }
    
    if (planFilter) {
      conditions.push(eq(users.planName, planFilter));
    }
    
    if (statusFilter) {
      conditions.push(eq(users.subscriptionStatus, statusFilter));
    }

    // 构建排序
    const sortField = sortBy === 'updated_at' ? users.updatedAt :
                     sortBy === 'created_at' ? users.createdAt :
                     sortBy === 'premium_requests_used' ? users.premiumRequestsUsed :
                     sortBy === 'fast_requests_used' ? users.fastRequestsUsed :
                     users.updatedAt; // 默认按更新时间排序

    const orderBy = sortOrder === 'desc' ? desc(sortField) : asc(sortField);

    // 获取用户列表
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        planName: users.planName,
        subscriptionStatus: users.subscriptionStatus,
        premiumRequestsUsed: users.premiumRequestsUsed,
        premiumRequestsLimit: users.premiumRequestsLimit,
        fastRequestsUsed: users.fastRequestsUsed,
        fastRequestsLimit: users.fastRequestsLimit,
        usageLastResetAt: users.usageLastResetAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        subscriptionExpiresAt: users.subscriptionExpiresAt
      })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // 获取总数
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = totalResult[0]?.count || 0;

    // 获取统计信息
    const statsResult = await db
      .select({
        totalUsers: sql<number>`count(*)`,
        totalPremiumUsage: sql<number>`sum(${users.premiumRequestsUsed})`,
        totalFastUsage: sql<number>`sum(${users.fastRequestsUsed})`,
        activeUsers: sql<number>`count(*) filter (where ${users.subscriptionStatus} = 'active')`,
        premiumUsers: sql<number>`count(*) filter (where ${users.planName} = 'Premium')`,
        freeUsers: sql<number>`count(*) filter (where ${users.planName} = 'Free')`
      })
      .from(users);

    const stats = statsResult[0] || {
      totalUsers: 0,
      totalPremiumUsage: 0,
      totalFastUsage: 0,
      activeUsers: 0,
      premiumUsers: 0,
      freeUsers: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        users: usersList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        stats,
        filters: {
          search,
          sortBy,
          sortOrder,
          planFilter,
          statusFilter
        }
      }
    });

  } catch (error) {
    console.error('获取用户使用量列表失败:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await authenticateAdmin(req);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, userId, ...params } = body;

    switch (action) {
      case 'sync_user':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          );
        }
        
        const syncResult = await forceSyncUserUsage(userId);
        return NextResponse.json({
          success: true,
          data: {
            action: 'sync_user',
            userId,
            synced: syncResult
          }
        });

      case 'diagnose_user':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          );
        }

        const diagnosisResult = await diagnoseUserSync(userId);
        return NextResponse.json({
          success: true,
          data: {
            action: 'diagnose_user',
            userId,
            ...diagnosisResult
          }
        });

      case 'get_user_stats':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          );
        }

        const userStats = await getUserUsageStats(userId);
        return NextResponse.json({
          success: true,
          data: {
            action: 'get_user_stats',
            userId,
            stats: userStats
          }
        });

      case 'test_cache_db':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          );
        }

        try {
          console.log(`[Admin API] 开始测试用户 ${userId} 的缓存和数据库操作...`);

          // 导入测试函数
          const { testDatabaseUpdate, getCachedUserUsage, setCachedUserUsage, clearUserCache } = await import('@/lib/usage-ultra-fast');

          const testResults = {
            cacheTest: null as any,
            dbTest: null as any,
            timestamp: new Date().toISOString()
          };

          // 测试缓存操作
          console.log(`[Admin API] 测试用户 ${userId} 缓存操作...`);
          try {
            // 清除现有缓存
            await clearUserCache(userId);

            // 测试缓存读取（应该为空）
            const cachedData1 = await getCachedUserUsage(userId);

            // 创建测试数据
            const testCacheData = {
              premiumRequestsUsed: 5,
              premiumRequestsLimit: 10,
              fastRequestsUsed: 15,
              fastRequestsLimit: 50,
              subscriptionStatus: 'active',
              planName: 'test-plan',
              lastResetAt: new Date().toISOString(),
              cacheTime: Date.now(),
              lastSyncTime: Date.now(),
              premiumBufferUsed: 2,
              fastBufferUsed: 3,
              lastActivityTime: Date.now(),
              bufferSize: 10,
              sessionStartTime: Date.now(),
            };

            // 测试缓存写入
            await setCachedUserUsage(userId, testCacheData);

            // 测试缓存读取
            const cachedData2 = await getCachedUserUsage(userId);

            testResults.cacheTest = {
              success: true,
              beforeCache: cachedData1,
              afterCache: cachedData2,
              cacheWorking: !!cachedData2 && cachedData2.premiumRequestsUsed === 5
            };

            console.log(`[Admin API] 用户 ${userId} 缓存测试完成:`, testResults.cacheTest);

          } catch (error) {
            testResults.cacheTest = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown cache error'
            };
            console.error(`[Admin API] 用户 ${userId} 缓存测试失败:`, error);
          }

          // 测试数据库操作
          console.log(`[Admin API] 测试用户 ${userId} 数据库操作...`);
          try {
            testResults.dbTest = await testDatabaseUpdate(userId);
            console.log(`[Admin API] 用户 ${userId} 数据库测试完成:`, testResults.dbTest);
          } catch (error) {
            testResults.dbTest = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown database error'
            };
            console.error(`[Admin API] 用户 ${userId} 数据库测试失败:`, error);
          }

          return NextResponse.json({
            success: true,
            data: {
              action: 'test_cache_db',
              userId,
              testResults
            }
          });

        } catch (error) {
          console.error(`[Admin API] 测试缓存和数据库操作失败:`, error);
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Test failed' },
            { status: 500 }
          );
        }

      case 'reset_usage':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          );
        }
        
        await db
          .update(users)
          .set({
            premiumRequestsUsed: 0,
            fastRequestsUsed: 0,
            usageLastResetAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
        
        return NextResponse.json({
          success: true,
          data: {
            action: 'reset_usage',
            userId,
            message: 'Usage reset successfully'
          }
        });

      case 'update_limits':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          );
        }
        
        const { premiumLimit, fastLimit } = params;
        
        await db
          .update(users)
          .set({
            premiumRequestsLimit: premiumLimit,
            fastRequestsLimit: fastLimit,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
        
        return NextResponse.json({
          success: true,
          data: {
            action: 'update_limits',
            userId,
            premiumLimit,
            fastLimit,
            message: 'Limits updated successfully'
          }
        });

      case 'simulate_usage':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          );
        }

        const { type = 'fast', count = 1 } = params;
        const results = [];

        for (let i = 0; i < count; i++) {
          // 模拟使用时跳过去重检查，允许快速连续调用
          const result = await checkAndUpdateUsageUltraFast(userId, type, { skipDeduplication: true });
          results.push(result);

          // 在模拟调用之间添加小延迟，避免过快调用
          if (i < count - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            action: 'simulate_usage',
            userId,
            type,
            count,
            results
          }
        });

      case 'diagnose_duplicate_sync':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          );
        }

        const diagnosis = diagnoseDuplicateSync(userId);
        return NextResponse.json({
          success: true,
          data: {
            action: 'diagnose_duplicate_sync',
            userId,
            diagnosis
          }
        });

      case 'clear_sync_state':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          );
        }

        const clearResult = forceClearUserSyncState(userId);
        return NextResponse.json({
          success: true,
          data: {
            action: 'clear_sync_state',
            userId,
            result: clearResult
          }
        });

      case 'test_duplicate_prevention':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          );
        }

        const { testType = 'fast', testCount = 5 } = params;
        console.log(`[Admin API] 开始测试用户 ${userId} 的重复同步防护机制...`);

        // 获取测试前状态
        const beforeStats = await getUserUsageStats(userId);

        // 执行并发测试
        const testPromises = [];
        for (let i = 0; i < testCount; i++) {
          testPromises.push(
            checkAndUpdateUsageUltraFast(userId, testType).then(result => ({
              index: i,
              result
            }))
          );
        }

        const testResults = await Promise.all(testPromises);

        // 等待同步完成
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 获取测试后状态
        const afterStats = await getUserUsageStats(userId);

        // 分析结果
        const successCount = testResults.filter(r => r.result.success && !r.result.deduplicated).length;
        const deduplicatedCount = testResults.filter(r => r.result.deduplicated).length;
        const actualIncrease = afterStats ?
          (afterStats[testType].used - (beforeStats ? beforeStats[testType].used : 0)) : 0;

        return NextResponse.json({
          success: true,
          data: {
            action: 'test_duplicate_prevention',
            userId,
            testType,
            testCount,
            beforeStats,
            afterStats,
            testResults,
            analysis: {
              successCount,
              deduplicatedCount,
              actualIncrease,
              expectedIncrease: successCount,
              hasDuplicateIssue: actualIncrease !== successCount,
              duplicateCount: actualIncrease - successCount
            }
          }
        });

      case 'check_sync_manager':
        try {
          console.log('[Admin API] 检查ActiveSyncManager运行状态...');

          // 导入ActiveSyncManager相关函数
          const { getActiveUsersStats, getPerformanceStats } = await import('@/lib/usage-ultra-fast');

          // 获取活跃用户统计
          const activeStats = getActiveUsersStats();

          // 获取性能统计
          const perfStats = getPerformanceStats();

          // 检查同步管理器状态
          const syncManagerStatus = {
            isRunning: activeStats.syncManagerRunning,
            activeUsersCount: activeStats.activeUsersCount,
            activeUsers: activeStats.activeUsers.slice(0, 10), // 只显示前10个用户
            performance: perfStats,
            timestamp: new Date().toISOString()
          };

          console.log('[Admin API] ActiveSyncManager状态:', syncManagerStatus);

          return NextResponse.json({
            success: true,
            data: {
              action: 'check_sync_manager',
              syncManagerStatus,
              message: syncManagerStatus.isRunning ? 'ActiveSyncManager正在运行' : 'ActiveSyncManager未运行'
            }
          });
        } catch (error) {
          console.error('[Admin API] 检查同步管理器状态失败:', error);
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Check sync manager failed' },
            { status: 500 }
          );
        }

      case 'sync_all_users':
        try {
          console.log('[Admin API] 开始批量同步所有活跃用户...');

          // 获取所有活跃用户
          const activeUsers = await getActiveUsersFromCache();
          console.log(`[Admin API] 找到 ${activeUsers.length} 个活跃用户`);

          let syncedCount = 0;
          const results = [];

          // 批量同步
          for (const activeUserId of activeUsers) {
            try {
              const result = await forceSyncUserUsage(activeUserId);
              if (result) {
                syncedCount++;
              }
              results.push({ userId: activeUserId, synced: result });
            } catch (error) {
              console.error(`[Admin API] 同步用户 ${activeUserId} 失败:`, error);
              results.push({
                userId: activeUserId,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }

          console.log(`[Admin API] 批量同步完成: 检查 ${activeUsers.length} 个用户，同步 ${syncedCount} 个`);

          return NextResponse.json({
            success: true,
            data: {
              checked: activeUsers.length,
              synced: syncedCount,
              results
            }
          });
        } catch (error) {
          console.error('[Admin API] 批量同步失败:', error);
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Batch sync failed' },
            { status: 500 }
          );
        }

      case 'get_cache_stats':
        try {
          console.log('[Admin API] 获取缓存统计...');

          // 获取活跃用户列表
          const activeUsers = await getActiveUsersFromCache();

          // 获取缓存详情
          const cacheDetails = [];
          for (const activeUserId of activeUsers.slice(0, 20)) { // 限制显示前20个
            try {
              const cacheKey = `user:usage:${activeUserId}`;
              const cacheData = await redisCache.get(cacheKey);
              if (cacheData) {
                cacheDetails.push({
                  userId: activeUserId,
                  premiumBufferUsed: cacheData.premiumBufferUsed || 0,
                  fastBufferUsed: cacheData.fastBufferUsed || 0,
                  lastActivityTime: cacheData.lastActivityTime || null,
                  lastSyncTime: cacheData.lastSyncTime || null,
                  ...cacheData
                });
              }
            } catch (error) {
              console.error(`[Admin API] 获取用户 ${activeUserId} 缓存失败:`, error);
            }
          }

          // 检查系统状态
          let redisConnected = false;
          let dbConnected = false;

          try {
            redisConnected = await redisCache.ping();
          } catch (error) {
            console.error('[Admin API] Redis ping 失败:', error);
            redisConnected = false;
          }

          try {
            await db.select().from(users).limit(1);
            dbConnected = true;
          } catch (error) {
            console.error('[Admin API] 数据库连接失败:', error);
            dbConnected = false;
          }

          return NextResponse.json({
            success: true,
            data: {
              action: 'get_cache_stats',
              activeUsersCount: activeUsers.length,
              activeUsers,
              cacheDetails,
              syncManagerRunning: true, // 假设同步管理器在运行
              systemInfo: {
                redisConnected,
                dbConnected
              }
            }
          });
        } catch (error) {
          console.error('[Admin API] 获取缓存统计失败:', error);
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Get cache stats failed' },
            { status: 500 }
          );
        }

      case 'clear_cache':
        try {
          console.log('[Admin API] 清理缓存...');

          // 获取所有活跃用户
          const activeUsers = await getActiveUsersFromCache();
          let clearedCount = 0;

          // 清理每个用户的缓存
          for (const activeUserId of activeUsers) {
            try {
              await clearUserCache(activeUserId);
              clearedCount++;
            } catch (error) {
              console.error(`[Admin API] 清理用户 ${activeUserId} 缓存失败:`, error);
            }
          }

          console.log(`[Admin API] 缓存清理完成: 清理 ${clearedCount} 个用户缓存`);

          return NextResponse.json({
            success: true,
            data: {
              cleared: clearedCount,
              total: activeUsers.length
            }
          });
        } catch (error) {
          console.error('[Admin API] 清理缓存失败:', error);
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Clear cache failed' },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('用户使用量操作失败:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

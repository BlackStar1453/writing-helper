import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '@/lib/auth/admin';
import { UserSessionWarmup, globalServerWarmup } from '@/lib/warmup';

/**
 * 管理员手动触发预缓存 API
 * 用于在 Vercel 部署后手动启动预缓存系统
 */
export async function POST(req: NextRequest) {
  try {
    // 验证管理员权限
    const userOrError = await adminMiddleware();
    if (userOrError instanceof Response) {
      return userOrError;
    }

    console.log('🔧 [Admin] 手动触发预缓存系统...');


    // 2. 检查全局预热状态
    const isGlobalWarmedUp = globalServerWarmup.isReady();
    console.log('🔍 [Admin] 全局预热状态:', isGlobalWarmedUp);

    // 3. 如果全局预热未完成，先执行全局预热
    if (!isGlobalWarmedUp) {
      console.log('🔥 [Admin] 执行全局预热...');
      await globalServerWarmup.warmup();
    }

    // 4. 执行活跃用户预缓存
    console.log('👥 [Admin] 开始活跃用户预缓存...');
    await UserSessionWarmup.precacheActiveUsers();

    // 5. 获取预缓存统计信息
    const stats = UserSessionWarmup.getStats();
    const warmupInfo = globalServerWarmup.getWarmupInfo();

    console.log('✅ [Admin] 预缓存系统启动完成');

    return NextResponse.json({
      success: true,
      message: '预缓存系统已成功启动',
      stats: {
        globalWarmup: warmupInfo,
        userPrecache: stats,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('❌ [Admin] 手动触发预缓存失败:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to trigger precache',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * 获取预缓存系统状态
 */
export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const userOrError = await adminMiddleware();
    if (userOrError instanceof Response) {
      return userOrError;
    }

    // 获取系统状态
    const globalStatus = globalServerWarmup.getWarmupInfo();
    const userStats = UserSessionWarmup.getStats();
    
    // 检查环境变量
    const envConfig = {
      PRECACHE_ACTIVE_USERS: process.env.PRECACHE_ACTIVE_USERS,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envConfig,
      globalWarmup: {
        ...globalStatus,
        isReady: globalServerWarmup.isReady(),
      },
      userPrecache: userStats,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime(),
      }
    });

  } catch (error) {
    console.error('❌ [Admin] 获取预缓存状态失败:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to get precache status',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

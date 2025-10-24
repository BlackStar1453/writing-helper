import { NextRequest, NextResponse } from 'next/server';
import { performCacheSyncCheck } from '@/lib/cron/cache-sync-check';

/**
 * 缓存同步检查定时任务
 * 每天凌晨2点执行，检查缓存与数据库的一致性
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

    console.log('🔍 开始执行缓存同步检查任务...');

    const result = await performCacheSyncCheck();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 缓存同步检查任务失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST - 手动触发缓存同步检查（仅限管理员）
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

    console.log('🔧 手动触发缓存同步检查...');

    const body = await request.json().catch(() => ({}));
    const options = {
      autoFix: body.autoFix !== false, // 默认自动修复
      checkAll: body.checkAll === true, // 是否检查所有用户
      batchSize: body.batchSize || 50, // 批处理大小
    };

    const result = await performCacheSyncCheck(options);

    return NextResponse.json({
      success: true,
      ...result,
      options,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 手动缓存同步检查失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

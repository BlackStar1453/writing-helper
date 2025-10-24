/**
 * 定价缓存预热定时任务
 * 定期预热定价相关缓存以提高用户体验
 */

import { NextRequest, NextResponse } from 'next/server';
import { warmupPricingCache } from '@/lib/cache/pricing-cache';

export async function GET(request: NextRequest) {
  try {
    // 验证是否为Vercel Cron请求
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] 开始定价缓存预热任务...');
    
    const startTime = Date.now();
    
    // 执行缓存预热
    await warmupPricingCache();
    
    const duration = Date.now() - startTime;
    
    console.log(`[Cron] 定价缓存预热完成，耗时: ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      message: '定价缓存预热完成',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] 定价缓存预热失败:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: '定价缓存预热失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 设置运行时配置
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

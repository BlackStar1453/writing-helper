/**
 * 定价缓存更新API
 * 用于手动更新定价相关缓存数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { warmupPricingCache, clearPricingCache, getPricingCacheStats } from '@/lib/cache/pricing-cache';

/**
 * POST /api/admin/pricing-cache-update
 * 更新定价缓存数据
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限（简单的API密钥验证）
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;
    
    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await request.json();
    const startTime = Date.now();

    switch (action) {
      case 'warmup':
        console.log('[Admin] 开始预热定价缓存...');
        await warmupPricingCache();
        const warmupDuration = Date.now() - startTime;
        
        return NextResponse.json({
          success: true,
          message: '定价缓存预热完成',
          duration: `${warmupDuration}ms`,
          timestamp: new Date().toISOString()
        });

      case 'clear':
        console.log('[Admin] 开始清除定价缓存...');
        await clearPricingCache();
        const clearDuration = Date.now() - startTime;
        
        return NextResponse.json({
          success: true,
          message: '定价缓存已清除',
          duration: `${clearDuration}ms`,
          timestamp: new Date().toISOString()
        });

      case 'refresh':
        console.log('[Admin] 开始刷新定价缓存...');
        // 先清除再预热
        await clearPricingCache();
        await warmupPricingCache();
        const refreshDuration = Date.now() - startTime;
        
        return NextResponse.json({
          success: true,
          message: '定价缓存已刷新',
          duration: `${refreshDuration}ms`,
          timestamp: new Date().toISOString()
        });

      case 'stats':
        const stats = await getPricingCacheStats();
        
        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { success: false, error: '无效的操作类型' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Admin] 定价缓存操作失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '缓存操作失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/pricing-cache-update
 * 获取定价缓存统计信息
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;
    
    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stats = await getPricingCacheStats();
    
    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Admin] 获取定价缓存统计失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取缓存统计失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 设置运行时配置
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 缓存管理API路由
 * 提供缓存监控、清理和管理功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '@/lib/auth/admin';
import { cacheMonitor, cacheAdmin } from '@/lib/cache/cache-monitor';
import { CACHE_TAGS } from '@/lib/cache/cache-keys';

/**
 * 获取缓存监控数据
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(request);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'monitor':
        const monitorData = await cacheMonitor.getMonitorData();
        return NextResponse.json({
          success: true,
          data: monitorData
        });

      case 'health':
        const healthStatus = await cacheAdmin.getHealthStatus();
        return NextResponse.json({
          success: true,
          data: healthStatus
        });

      default:
        return NextResponse.json({
          success: false,
          error: '无效的操作类型'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('获取缓存数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取缓存数据失败' },
      { status: 500 }
    );
  }
}

/**
 * 缓存管理操作
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(request);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      case 'clear-all':
        await cacheAdmin.clearAll();
        return NextResponse.json({
          success: true,
          message: '所有缓存已清除'
        });

      case 'clear-by-tag':
        const { tag } = params;
        if (!tag || !Object.values(CACHE_TAGS).includes(tag)) {
          return NextResponse.json({
            success: false,
            error: '无效的缓存标签'
          }, { status: 400 });
        }
        
        await cacheAdmin.clearByTag(tag);
        return NextResponse.json({
          success: true,
          message: `标签 ${tag} 的缓存已清除`
        });

      case 'warmup':
        const { keys } = params;
        if (!Array.isArray(keys)) {
          return NextResponse.json({
            success: false,
            error: '预热键列表必须是数组'
          }, { status: 400 });
        }

        await cacheAdmin.warmupCache(keys);
        return NextResponse.json({
          success: true,
          message: '缓存预热已完成'
        });

      case 'reset-stats':
        cacheMonitor.reset();
        return NextResponse.json({
          success: true,
          message: '统计数据已重置'
        });

      case 'cleanup':
        cacheMonitor.cleanup();
        return NextResponse.json({
          success: true,
          message: '缓存清理已完成'
        });

      default:
        return NextResponse.json({
          success: false,
          error: '无效的操作类型'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('缓存管理操作失败:', error);
    return NextResponse.json(
      { success: false, error: '缓存管理操作失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取可用的缓存标签和操作
 */
export async function OPTIONS(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(request);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    return NextResponse.json({
      success: true,
      data: {
        availableTags: Object.values(CACHE_TAGS),
        availableActions: [
          'clear-all',
          'clear-by-tag',
          'warmup',
          'reset-stats',
          'cleanup'
        ],
        warmupKeys: [
          'features',
          'pricing',
          'releases',
          'translations'
        ]
      }
    });

  } catch (error) {
    console.error('获取缓存选项失败:', error);
    return NextResponse.json(
      { success: false, error: '获取缓存选项失败' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/db/queries'
import { versionCache } from '@/lib/cache/version-cache'

/**
 * 管理员获取缓存统计API
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户权限
    const user = await getUser()
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }

    // 获取缓存统计
    const stats = await versionCache.getCacheStats()

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('获取缓存统计失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

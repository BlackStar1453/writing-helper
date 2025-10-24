import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/db/queries'
import { versionCache } from '@/lib/cache/version-cache'

/**
 * 管理员清除版本缓存API
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户权限
    const user = await getUser()
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }

    // 清除所有版本缓存
    await versionCache.clearAllVersionCache()

    console.log(`管理员 ${user.email} 清除了所有版本缓存`)

    return NextResponse.json({
      success: true,
      message: '所有版本缓存已清除',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('清除版本缓存失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

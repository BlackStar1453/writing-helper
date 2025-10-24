import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/db/queries'
import { versionCache } from '@/lib/cache/version-cache'

/**
 * 管理员手动刷新版本缓存API
 * 支持清除指定版本缓存并重新获取
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

    const body = await request.json()
    const { version } = body

    if (!version) {
      return NextResponse.json(
        { error: '缺少必要参数: version' },
        { status: 400 }
      )
    }

    console.log(`管理员 ${user.email} 请求刷新版本 ${version} 的缓存`)

    // 1. 清除指定版本的所有缓存
    await versionCache.clearVersionCache(version)
    console.log(`✅ 已清除版本 ${version} 的缓存`)

    // 2. 立即触发重新检查
    const checkResponse = await fetch(`${request.nextUrl.origin}/api/check-version`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ version })
    })

    let newCacheData = null
    if (checkResponse.ok) {
      const result = await checkResponse.json()
      newCacheData = result.availability
      console.log(`✅ 版本 ${version} 重新检查完成:`, newCacheData)

      // 等待一下确保缓存已经写入Redis
      await new Promise(resolve => setTimeout(resolve, 500))
    } else {
      console.warn(`⚠️ 版本 ${version} 重新检查失败`)
    }

    return NextResponse.json({
      success: true,
      message: `版本 ${version} 缓存已刷新`,
      version,
      newData: newCacheData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('刷新版本缓存失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 获取当前版本缓存状态
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

    const { searchParams } = new URL(request.url)
    const version = searchParams.get('version')

    if (!version) {
      return NextResponse.json(
        { error: '缺少必要参数: version' },
        { status: 400 }
      )
    }

    // 获取缓存数据
    const cachedData = await versionCache.getBatchVersionCheck(version)
    const latestJson = await versionCache.getLatestJson(version)

    return NextResponse.json({
      success: true,
      version,
      cachedData,
      latestJson,
      hasCachedData: !!cachedData,
      hasLatestJson: !!latestJson,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('获取版本缓存状态失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

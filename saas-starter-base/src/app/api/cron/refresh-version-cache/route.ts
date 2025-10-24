import { NextRequest, NextResponse } from 'next/server'
import { versionCache } from '@/lib/cache/version-cache'

/**
 * 定时刷新版本缓存的Cron Job
 * 每天早上6点执行，检查最新版本信息并更新缓存
 */

// 从GitHub获取最新版本信息
async function fetchLatestVersionInfo() {
  try {
    // 获取最新release信息
    const response = await fetch('https://api.github.com/repos/BlackStar1453/Elick-public/releases/latest', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Elick-Website'
      },
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const release = await response.json()
    return {
      version: release.tag_name,
      publishedAt: release.published_at,
      assets: release.assets
    }
  } catch (error) {
    console.error('获取最新版本信息失败:', error)
    return null
  }
}

// 检查并缓存版本信息
async function refreshVersionCache(version: string) {
  try {
    console.log(`开始刷新版本 ${version} 的缓存...`)

    // 清除旧缓存
    await versionCache.clearVersionCache(version)

    const platforms = ['windows', 'mac-intel', 'mac-silicon']
    const cleanVersion = version.replace(/^v/, '')
    const baseUrl = `https://github.com/BlackStar1453/Elick-public/releases/download/${version}`

    // 获取latest.json信息
    let latestInfo = null
    try {
      const latestJsonUrl = `${baseUrl}/${version}/latest.json`
      const response = await fetch(latestJsonUrl, {
        signal: AbortSignal.timeout(10000)
      })
      
      if (response.ok) {
        latestInfo = await response.json()
        // 缓存latest.json
        await versionCache.setLatestJson(version, latestInfo)
      }
    } catch (error) {
      console.warn(`获取 ${version} 的latest.json失败:`, error)
    }

    // 检查各平台文件
    const results = []
    for (const platform of platforms) {
      let fileUrl = ''
      let platformSupported = false

      // 根据latest.json中的平台信息和实际文件命名规则构建URL
      switch (platform) {
        case 'windows':
          platformSupported = !!(latestInfo?.platforms?.['windows-x86_64'])
          fileUrl = `${baseUrl}/Elick_${cleanVersion}_x64-setup.exe`
          break
        case 'mac-intel':
          platformSupported = !!(latestInfo?.platforms?.['darwin-x86_64'])
          fileUrl = `${baseUrl}/Elick_${cleanVersion}_x64.dmg`
          break
        case 'mac-silicon':
          platformSupported = !!(latestInfo?.platforms?.['darwin-aarch64'])
          fileUrl = `${baseUrl}/Elick_${cleanVersion}_aarch64.dmg`
          break
      }

      let result
      if (!platformSupported) {
        result = {
          exists: false,
          url: null,
          size: null,
          platform,
          version,
          message: `${platform}版本暂未发布`
        }
      } else {
        try {
          const response = await fetch(fileUrl, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(10000)
          })
          
          const exists = response.ok
          const size = response.headers.get('content-length')
          
          result = {
            exists,
            url: exists ? fileUrl : null,
            size: size ? parseInt(size) : null,
            platform,
            version
          }
        } catch (error) {
          console.warn(`检查文件失败 ${fileUrl}:`, error)
          result = {
            exists: false,
            url: null,
            size: null,
            platform,
            version,
            error: '检查文件时发生错误'
          }
        }
      }

      // 缓存单个平台结果
      await versionCache.setVersionCheck(version, platform, result)
      results.push(result)
    }

    // 缓存批量结果
    const availability = {
      windows: results.find(r => r.platform === 'windows')?.exists || false,
      macIntel: results.find(r => r.platform === 'mac-intel')?.exists || false,
      macAppleSilicon: results.find(r => r.platform === 'mac-silicon')?.exists || false
    }

    const batchResult = {
      version,
      availability,
      details: results,
      lastUpdated: new Date().toISOString()
    }

    await versionCache.setBatchVersionCheck(version, batchResult)

    console.log(`版本 ${version} 缓存刷新完成:`, availability)
    return { version, availability, refreshed: true }

  } catch (error) {
    console.error(`刷新版本 ${version} 缓存失败:`, error)
    return { version, error: error instanceof Error ? error.message : '未知错误', refreshed: false }
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证请求来源（Vercel cron或管理员）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // 如果设置了CRON_SECRET，验证授权
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    console.log('开始执行版本缓存刷新任务...')

    // 获取最新版本信息
    const latestVersion = await fetchLatestVersionInfo()
    
    if (!latestVersion) {
      return NextResponse.json({
        success: false,
        error: '无法获取最新版本信息',
        timestamp: new Date().toISOString()
      })
    }

    // 刷新最新版本的缓存
    const refreshResult = await refreshVersionCache(latestVersion.version)

    // 可以在这里添加刷新其他版本的逻辑
    // 例如：刷新最近几个版本的缓存

    return NextResponse.json({
      success: true,
      latestVersion: latestVersion.version,
      refreshResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('版本缓存刷新任务失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

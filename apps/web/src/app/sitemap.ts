import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'
  const currentDate = new Date()
  
  // 支持的语言
  const locales = ['zh', 'en']
  
  // 静态页面路由
  const staticRoutes = [
    '',
    '/pricing',
    '/contact',
    '/privacy',
    '/features',
  ]
  
  // 生成多语言页面的sitemap条目
  const sitemapEntries: MetadataRoute.Sitemap = []
  
  // 为每个静态路由生成多语言版本
  staticRoutes.forEach(route => {
    locales.forEach(locale => {
      const url = locale === 'zh' 
        ? `${baseUrl}${route}` 
        : `${baseUrl}/${locale}${route}`
      
      // 生成替代语言链接
      const alternates: { [key: string]: string } = {}
      locales.forEach(altLocale => {
        if (altLocale !== locale) {
          alternates[altLocale] = altLocale === 'zh' 
            ? `${baseUrl}${route}` 
            : `${baseUrl}/${altLocale}${route}`
        }
      })
      
      sitemapEntries.push({
        url,
        lastModified: currentDate,
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1.0 : 0.8,
        alternates: {
          languages: alternates
        }
      })
    })
  })
  
  // 添加特殊文件
  sitemapEntries.push(
    {
      url: `${baseUrl}/robots.txt`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/llms.txt`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    }
  )
  
  return sitemapEntries
}

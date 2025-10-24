import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/sign-in',
          '/sign-up',
          '/auth/',
          '/payment/',
          '/_next/',
          '/private/',
          '/test/',
          '/debug/',
          '/scripts/',
          '/node_modules/',
        ],
      },
      // 允许搜索引擎访问公开页面
      {
        userAgent: '*',
        allow: [
          '/',
          '/pricing',
          '/contact',
          '/privacy',
          '/features',
          '/zh/',
          '/en/',
          '/zh/pricing',
          '/en/pricing',
          '/zh/contact',
          '/en/contact',
          '/zh/privacy',
          '/en/privacy',
          '/zh/features',
          '/en/features',
        ],
      },
      // 针对AI爬虫的特殊规则
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
          'PerplexityBot',
          'YouBot',
          'Applebot-Extended',
        ],
        allow: [
          '/',
          '/pricing',
          '/contact',
          '/privacy',
          '/features',
          '/zh/',
          '/en/',
          '/llms.txt',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/auth/',
          '/payment/',
          '/private/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}

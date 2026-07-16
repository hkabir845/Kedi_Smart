import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl()
  const privatePaths = [
    '/admin',
    '/dashboard',
    '/api',
    '/scan/',
    '/checkout',
    '/cart',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/order/',
    '/django-admin',
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: privatePaths,
      },
      // Allow major AI / answer-engine crawlers to discover brand content
      {
        userAgent: 'GPTBot',
        allow: ['/', '/llms.txt', '/blog/', '/marketplace/', '/shop/', '/pets/', '/vets/'],
        disallow: privatePaths,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: privatePaths,
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: privatePaths,
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: privatePaths,
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: privatePaths,
      },
      {
        userAgent: 'Applebot-Extended',
        allow: '/',
        disallow: privatePaths,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ''),
  }
}

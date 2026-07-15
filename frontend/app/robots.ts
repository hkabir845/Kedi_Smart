import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
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
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ''),
  }
}

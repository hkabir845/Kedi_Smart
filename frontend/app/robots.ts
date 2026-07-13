import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard', '/api', '/scan/'],
      },
    ],
    sitemap: 'https://kedismart.com/sitemap.xml',
  }
}

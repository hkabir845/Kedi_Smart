import { MetadataRoute } from 'next'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kedismart.com'
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
  ]

  try {
    const productsRes = await fetch(`${apiUrl}/shop/products?limit=100`, { next: { revalidate: 3600 } })
    if (productsRes.ok) {
      const products = await productsRes.json()
      if (products.items) {
        products.items.forEach((product: { slug: string; updated_at?: string }) => {
          routes.push({
            url: `${baseUrl}/product/${product.slug}`,
            lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          })
        })
      }
    }

    const postsRes = await fetch(`${apiUrl}/blog/posts?limit=100`, { next: { revalidate: 3600 } })
    if (postsRes.ok) {
      const posts = await postsRes.json()
      if (posts.items) {
        posts.items.forEach((post: { slug: string; updated_at?: string }) => {
          routes.push({
            url: `${baseUrl}/blog/${post.slug}`,
            lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          })
        })
      }
    }
  } catch (error) {
    console.error('Error generating sitemap:', error)
  }

  return routes
}

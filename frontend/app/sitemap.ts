import { MetadataRoute } from 'next'
import { getServerApiBase, getSiteUrl } from '@/lib/seo'

export const dynamic = 'force-dynamic'

async function fetchItems(path: string): Promise<any[]> {
  try {
    const res = await fetch(`${getServerApiBase()}${path}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    if (Array.isArray(data)) return data
    if (Array.isArray(data.items)) return data.items
    if (Array.isArray(data.results)) return data.results
    return []
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  const now = new Date()

  const routes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/shop?catalog=general`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/marketplace`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/vets`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/tags`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/pets`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/llms.txt`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/blog/feed.xml`, lastModified: now, changeFrequency: 'daily', priority: 0.4 },
    { url: `${baseUrl}/track`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  const products = await fetchItems('/shop/products?limit=500')
  for (const product of products) {
    if (!product?.slug) continue
    routes.push({
      url: `${baseUrl}/product/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : now,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  const posts = await fetchItems('/blog/posts?limit=500')
  for (const post of posts) {
    if (!post?.slug) continue
    routes.push({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updated_at ? new Date(post.updated_at) : now,
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  const listings = await fetchItems('/marketplace/listings?limit=500')
  for (const listing of listings) {
    const id = listing?.id
    if (id == null) continue
    routes.push({
      url: `${baseUrl}/marketplace/${id}`,
      lastModified: listing.updated_at ? new Date(listing.updated_at) : now,
      changeFrequency: 'daily',
      priority: 0.6,
    })
  }

  const vets = await fetchItems('/vets?limit=500')
  for (const vet of vets) {
    const id = vet?.id
    if (id == null) continue
    routes.push({
      url: `${baseUrl}/vets/${id}`,
      lastModified: vet.updated_at ? new Date(vet.updated_at) : now,
      changeFrequency: 'weekly',
      priority: 0.5,
    })
  }

  const categories = await fetchItems('/content/categories')
  for (const cat of categories) {
    const slug = cat?.slug
    if (!slug) continue
    routes.push({
      url: `${baseUrl}/pets/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  const topics = await fetchItems('/content/topics?limit=500')
  for (const topic of topics) {
    if (!topic?.slug) continue
    const cat =
      topic.category_slug ||
      topic.category?.slug ||
      (typeof topic.category === 'string' ? topic.category : 'pets')
    routes.push({
      url: `${baseUrl}/pets/${cat}/${topic.slug}`,
      lastModified: topic.updated_at ? new Date(topic.updated_at) : now,
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  }

  return routes
}

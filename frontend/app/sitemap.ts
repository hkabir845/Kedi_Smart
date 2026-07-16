import { MetadataRoute } from 'next'
import { allCompareSlugs } from '@/lib/content/comparisons'
import { allGuideSlugs } from '@/lib/content/guides'
import { absoluteMediaUrl, getServerApiBase, getSiteUrl } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

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

/** Paginate list endpoints that support skip/limit (avoids hard 500 cap). */
async function fetchAllPages(basePath: string, pageSize = 100, maxPages = 50): Promise<any[]> {
  const all: any[] = []
  const joiner = basePath.includes('?') ? '&' : '?'
  for (let page = 0; page < maxPages; page++) {
    const skip = page * pageSize
    const batch = await fetchItems(`${basePath}${joiner}skip=${skip}&limit=${pageSize}`)
    if (!batch.length) break
    all.push(...batch)
    if (batch.length < pageSize) break
  }
  return all
}

type SitemapEntry = MetadataRoute.Sitemap[number]

function entry(
  url: string,
  opts: Partial<SitemapEntry> & { images?: string[] } = {},
): SitemapEntry {
  const { images, ...rest } = opts
  const row: SitemapEntry = {
    url,
    lastModified: rest.lastModified || new Date(),
    changeFrequency: rest.changeFrequency || 'weekly',
    priority: rest.priority ?? 0.5,
  }
  if (images?.length) {
    ;(row as any).images = images.map((img) => absoluteMediaUrl(img) || img).filter(Boolean)
  }
  return row
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  const now = new Date()

  const routes: MetadataRoute.Sitemap = [
    entry(baseUrl, { lastModified: now, changeFrequency: 'daily', priority: 1 }),
    entry(`${baseUrl}/shop`, { changeFrequency: 'daily', priority: 0.9 }),
    entry(`${baseUrl}/blog`, { changeFrequency: 'daily', priority: 0.8 }),
    entry(`${baseUrl}/marketplace`, { changeFrequency: 'daily', priority: 0.9 }),
    entry(`${baseUrl}/vets`, { changeFrequency: 'weekly', priority: 0.7 }),
    entry(`${baseUrl}/tags`, { changeFrequency: 'weekly', priority: 0.85 }),
    entry(`${baseUrl}/pets`, { changeFrequency: 'weekly', priority: 0.7 }),
    entry(`${baseUrl}/learn`, { changeFrequency: 'weekly', priority: 0.8 }),
    entry(`${baseUrl}/guides`, { changeFrequency: 'weekly', priority: 0.85 }),
    entry(`${baseUrl}/compare`, { changeFrequency: 'weekly', priority: 0.8 }),
    entry(`${baseUrl}/emergency`, { changeFrequency: 'weekly', priority: 0.85 }),
    entry(`${baseUrl}/site-map`, { changeFrequency: 'monthly', priority: 0.4 }),
    entry(`${baseUrl}/about`, { changeFrequency: 'monthly', priority: 0.7 }),
    entry(`${baseUrl}/contact`, { changeFrequency: 'monthly', priority: 0.7 }),
    entry(`${baseUrl}/faq`, { changeFrequency: 'monthly', priority: 0.65 }),
    entry(`${baseUrl}/press`, { changeFrequency: 'monthly', priority: 0.5 }),
    entry(`${baseUrl}/privacy`, { changeFrequency: 'yearly', priority: 0.4 }),
    entry(`${baseUrl}/terms`, { changeFrequency: 'yearly', priority: 0.4 }),
    entry(`${baseUrl}/shipping`, { changeFrequency: 'monthly', priority: 0.45 }),
    entry(`${baseUrl}/returns`, { changeFrequency: 'monthly', priority: 0.45 }),
    entry(`${baseUrl}/editorial-policy`, { changeFrequency: 'yearly', priority: 0.4 }),
    entry(`${baseUrl}/authors/jahura-satter`, { changeFrequency: 'monthly', priority: 0.5 }),
    entry(`${baseUrl}/llms.txt`, { changeFrequency: 'monthly', priority: 0.3 }),
    entry(`${baseUrl}/blog/feed.xml`, { changeFrequency: 'daily', priority: 0.4 }),
  ]

  for (const slug of allGuideSlugs()) {
    routes.push(
      entry(`${baseUrl}/guides/${slug}`, {
        changeFrequency: 'monthly',
        priority: 0.75,
      }),
    )
  }
  for (const slug of allCompareSlugs()) {
    routes.push(
      entry(`${baseUrl}/compare/${slug}`, {
        changeFrequency: 'monthly',
        priority: 0.7,
      }),
    )
  }

  const products = await fetchAllPages('/shop/products')
  for (const product of products) {
    if (!product?.slug) continue
    const imgs = (product.images || [])
      .map((img: any) => img?.url)
      .filter(Boolean)
      .slice(0, 5)
    if (product.image_url) imgs.unshift(product.image_url)
    routes.push(
      entry(`${baseUrl}/product/${product.slug}`, {
        lastModified: product.updated_at ? new Date(product.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
        images: imgs,
      }),
    )
  }

  const posts = await fetchAllPages('/blog/posts')
  for (const post of posts) {
    if (!post?.slug) continue
    routes.push(
      entry(`${baseUrl}/blog/${post.slug}`, {
        lastModified: post.updated_at ? new Date(post.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.6,
        images: post.cover_image_url ? [post.cover_image_url] : undefined,
      }),
    )
  }

  const listings = await fetchAllPages('/marketplace/listings')
  for (const listing of listings) {
    const id = listing?.id
    if (id == null) continue
    routes.push(
      entry(`${baseUrl}/marketplace/${id}`, {
        lastModified: listing.updated_at ? new Date(listing.updated_at) : now,
        changeFrequency: 'daily',
        priority: 0.6,
        images: listing.cover_image_url || listing.image_url
          ? [listing.cover_image_url || listing.image_url]
          : undefined,
      }),
    )
  }

  // Vet endpoint currently returns a plain, unpaginated array.
  const vets = await fetchItems('/vets')
  for (const vet of vets) {
    const id = vet?.id
    if (id == null) continue
    routes.push(
      entry(`${baseUrl}/vets/${id}`, {
        lastModified: vet.updated_at ? new Date(vet.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.5,
      }),
    )
  }

  const categories = await fetchItems('/content/categories')
  for (const cat of categories) {
    const slug = cat?.slug
    if (!slug) continue
    routes.push(
      entry(`${baseUrl}/pets/${slug}`, {
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      }),
    )
  }

  const topics = await fetchAllPages('/content/topics')
  for (const topic of topics) {
    if (!topic?.slug) continue
    const cat =
      topic.category_slug ||
      topic.category?.slug ||
      (typeof topic.category === 'string' ? topic.category : 'pets')
    routes.push(
      entry(`${baseUrl}/pets/${cat}/${topic.slug}`, {
        lastModified: topic.updated_at ? new Date(topic.updated_at) : now,
        changeFrequency: 'monthly',
        priority: 0.5,
        images: topic.cover_image_url ? [topic.cover_image_url] : undefined,
      }),
    )
  }

  // Sitemaps must contain canonical URLs only and should never repeat entries.
  return [...new Map(routes.map((route) => [route.url, route])).values()]
}

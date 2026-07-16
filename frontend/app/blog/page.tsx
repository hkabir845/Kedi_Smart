import Link from 'next/link'
import { api } from '@/lib/api'
import PetPageHero from '@/components/PetPageHero'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import { petCardClass } from '@/lib/pet-theme'
import { buildPageMetadata, plainText } from '@/lib/seo'
import { breadcrumbList, itemListSchema, readingTimeMinutes } from '@/lib/schema'

type BlogSearchParams = {
  q?: string
  page?: string
  category?: string
  tag?: string
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const isFiltered = Boolean(params.q || params.category || params.tag)
  return buildPageMetadata({
    title: page > 1 ? `Blog — Page ${page}` : 'Blog',
    description:
      'Pet care tips, animal welfare stories, and community updates from KediSmart (Kedi Smart, kedismart).',
    path: page > 1 && !isFiltered ? `/blog?page=${page}` : '/blog',
    noIndex: isFiltered,
    keywords: ['KediSmart blog', 'pet care tips', 'animal welfare Bangladesh'],
  })
}

export const revalidate = 600

async function getPosts(q?: string, page = 1, category?: string, tag?: string) {
  try {
    const params = new URLSearchParams({ limit: '20', page: String(page) })
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    if (tag) params.set('tag', tag)
    const response = await api.get(`/blog/posts?${params.toString()}`)
    return {
      items: response.items || response.results || [],
      total: response.total || response.count || (response.items || []).length,
    }
  } catch {
    return { items: [], total: 0 }
  }
}

async function getCategories() {
  try {
    const categories = await api.get('/blog/categories')
    return Array.isArray(categories) ? categories : []
  } catch {
    return []
  }
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>
}) {
  const sp = await searchParams
  const q = (sp.q || '').trim()
  const category = (sp.category || '').trim()
  const tag = (sp.tag || '').trim()
  const page = Math.max(1, Number(sp.page) || 1)
  const [{ items: posts }, categories] = await Promise.all([
    getPosts(q || undefined, page, category || undefined, tag || undefined),
    getCategories(),
  ])
  const filterParams = new URLSearchParams()
  if (q) filterParams.set('q', q)
  if (category) filterParams.set('category', category)
  if (tag) filterParams.set('tag', tag)

  const crumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
  ]
  const crumbs = breadcrumbList(crumbItems)
  const listLd = itemListSchema(
    'KediSmart Blog',
    posts.map((post: any) => ({
      name: post.title,
      url: `/blog/${post.slug}`,
      image: post.cover_image_url,
      description: plainText(post.excerpt || post.title, 120),
    })),
    {
      description: 'Stories, tips, and updates from KediSmart.',
      path: '/blog',
    },
  )

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      <JsonLd data={[crumbs, listLd]} />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumbs items={crumbItems} />
        <PetPageHero
          title="Blog"
          description="Stories, tips, and community updates about pet care and animal welfare."
        />

        <form action="/blog" method="get" className="mb-6 flex flex-col sm:flex-row gap-2" role="search">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {tag ? <input type="hidden" name="tag" value={tag} /> : null}
          <label htmlFor="blog-search" className="sr-only">
            Search blog posts
          </label>
          <input
            id="blog-search"
            name="q"
            defaultValue={q}
            placeholder="Search pet care tips…"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Search
          </button>
        </form>

        {categories.length > 0 ? (
          <nav aria-label="Blog categories" className="mb-6 flex flex-wrap gap-2">
            <Link
              href="/blog"
              aria-current={!category ? 'page' : undefined}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                !category ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              All
            </Link>
            {categories.map((item: any) => (
              <Link
                key={item.id}
                href={`/blog?category=${encodeURIComponent(item.slug)}`}
                aria-current={category === item.slug ? 'page' : undefined}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  category === item.slug
                    ? 'border-primary-600 bg-primary-50 text-primary-800'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {posts.length === 0 ? (
          <div className={`${petCardClass} p-12 text-center`}>
            <p className="text-gray-600">
              {q ? `No posts matched “${q}”.` : 'No blog posts yet. Check back soon.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <article key={post.id} className={`${petCardClass} p-6`}>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  <Link href={`/blog/${post.slug}`} className="hover:text-primary-600">
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt && (
                  <p className="text-gray-600 mb-3 text-sm leading-relaxed">{post.excerpt}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {(post.author_name || '').toLowerCase() === 'jahura satter' ? (
                    <Link href="/authors/jahura-satter" className="hover:text-primary-700">
                      {post.author_name}
                    </Link>
                  ) : (
                    <span>{post.author_name || 'KediSmart Editorial Team'}</span>
                  )}
                  {post.category ? (
                    <Link
                      href={`/blog?category=${encodeURIComponent(post.category.slug)}`}
                      className="hover:text-primary-700"
                    >
                      {post.category.name}
                    </Link>
                  ) : null}
                  <span>{new Date(post.published_at || post.created_at).toLocaleDateString()}</span>
                  <span>{readingTimeMinutes(post.body_md || post.excerpt)} min read</span>
                </div>
              </article>
            ))}
          </div>
        )}

        <nav className="mt-8 flex justify-between text-sm" aria-label="Blog pagination">
          {page > 1 ? (
            <Link
              href={`/blog?${new URLSearchParams({ ...Object.fromEntries(filterParams), page: String(page - 1) }).toString()}`}
              className="text-primary-700 font-medium hover:underline"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {posts.length >= 20 ? (
            <Link
              href={`/blog?${new URLSearchParams({ ...Object.fromEntries(filterParams), page: String(page + 1) }).toString()}`}
              className="text-primary-700 font-medium hover:underline"
            >
              Next →
            </Link>
          ) : null}
        </nav>
      </div>
    </div>
  )
}

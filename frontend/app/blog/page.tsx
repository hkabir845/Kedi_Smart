import Link from 'next/link'
import { api } from '@/lib/api'
import PetPageHero from '@/components/PetPageHero'
import JsonLd from '@/components/JsonLd'
import { petCardClass } from '@/lib/pet-theme'
import { buildPageMetadata, plainText } from '@/lib/seo'
import { breadcrumbList, itemListSchema } from '@/lib/schema'

export const metadata = buildPageMetadata({
  title: 'Blog',
  description:
    'Pet care tips, animal welfare stories, and community updates from KediSmart (Kedi Smart, kedismart).',
  path: '/blog',
  keywords: ['KediSmart blog', 'pet care tips', 'animal welfare Bangladesh'],
})

async function getPosts() {
  try {
    const response = await api.get('/blog/posts?limit=20')
    return response.items || []
  } catch {
    return []
  }
}

export default async function BlogPage() {
  const posts = await getPosts()
  const crumbs = breadcrumbList([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
  ])
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
    <main className="min-h-screen bg-[#f5f5f3]">
      <JsonLd data={[crumbs, listLd]} />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <PetPageHero
          title="Blog"
          description="Stories, tips, and community updates about pet care and animal welfare."
        />

        {posts.length === 0 ? (
          <div className={`${petCardClass} p-12 text-center`}>
            <p className="text-gray-600">No blog posts yet. Check back soon.</p>
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
                <div className="flex items-center text-sm text-gray-500">
                  <span>{new Date(post.published_at).toLocaleDateString()}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

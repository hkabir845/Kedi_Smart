import Link from 'next/link'
import { api } from '@/lib/api'
import PetPageHero from '@/components/PetPageHero'
import { petCardClass } from '@/lib/pet-theme'

export const metadata = {
  title: 'Blog - Kedi Smart',
  description: 'Community blog posts about pet care and animal welfare',
}

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

  return (
    <main className="min-h-screen bg-[#f5f5f3]">
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
                {post.excerpt && <p className="text-gray-600 mb-3 text-sm leading-relaxed">{post.excerpt}</p>}
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

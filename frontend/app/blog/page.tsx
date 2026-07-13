import { api } from '@/lib/api'

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
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Community Blog</h1>
        <div className="space-y-8">
          {posts.map((post: any) => (
            <article key={post.id} className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-2">
                <a href={`/blog/${post.slug}`} className="hover:text-primary-600">
                  {post.title}
                </a>
              </h2>
              {post.excerpt && <p className="text-gray-600 mb-4">{post.excerpt}</p>}
              <div className="flex items-center text-sm text-gray-500">
                <span>{new Date(post.published_at).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}

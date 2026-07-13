import { api } from '@/lib/api'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const post = await api.get(`/blog/posts/${params.slug}`)
    return {
      title: `${post.title} - Kedi Smart Blog`,
      description: post.excerpt || post.title,
    }
  } catch {
    return {
      title: 'Blog Post - Kedi Smart',
    }
  }
}

async function getPost(slug: string) {
  try {
    return await api.get(`/blog/posts/${slug}`)
  } catch {
    return null
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)

  if (!post) {
    notFound()
  }

  return (
    <main className="min-h-screen p-8">
      <article className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        {post.excerpt && <p className="text-xl text-gray-600 mb-8">{post.excerpt}</p>}
        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-96 object-cover rounded-lg mb-8"
          />
        )}
        <div className="prose max-w-none">
          {post.body_md && <div dangerouslySetInnerHTML={{ __html: post.body_md }} />}
        </div>
      </article>
    </main>
  )
}

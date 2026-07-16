import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/JsonLd'
import { absoluteMediaUrl, absoluteUrl, buildPageMetadata, plainText } from '@/lib/seo'
import { breadcrumbList } from '@/lib/schema'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const post = await api.get(`/blog/posts/${slug}`)
    return buildPageMetadata({
      title: post.title,
      description: plainText(post.excerpt || post.body_md || post.title),
      path: `/blog/${slug}`,
      image: absoluteMediaUrl(post.cover_image_url),
      type: 'article',
      publishedTime: post.published_at || post.created_at,
      modifiedTime: post.updated_at || post.published_at || post.created_at,
      authors: ['KediSmart'],
      keywords: ['KediSmart blog', post.title],
    })
  } catch {
    return buildPageMetadata({ title: 'Blog Post', path: `/blog/${slug}` })
  }
}

async function getPost(slug: string) {
  try {
    return await api.get(`/blog/posts/${slug}`)
  } catch {
    return null
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: plainText(post.excerpt || post.title, 200),
    image: absoluteMediaUrl(post.cover_image_url),
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    mainEntityOfPage: absoluteUrl(`/blog/${slug}`),
    author: {
      '@type': 'Organization',
      name: 'KediSmart',
    },
    publisher: {
      '@type': 'Organization',
      name: 'KediSmart',
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/brand/kedismart-logo.png'),
      },
    },
  }

  const crumbs = breadcrumbList([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${slug}` },
  ])

  return (
    <main className="min-h-screen p-8">
      <JsonLd data={[articleLd, crumbs]} />
      <article className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        {post.excerpt && <p className="text-xl text-gray-600 mb-8">{post.excerpt}</p>}
        {post.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
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

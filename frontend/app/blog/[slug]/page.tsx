import Image from 'next/image'
import Link from 'next/link'
import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import ShareButtons from '@/components/ShareButtons'
import { absoluteMediaUrl, absoluteUrl, buildPageMetadata, plainText } from '@/lib/seo'
import { breadcrumbList, extractToc, readingTimeMinutes } from '@/lib/schema'

export const revalidate = 600

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
      authors: [post.author_name || 'Jahura Satter', 'KediSmart'],
      keywords: ['KediSmart blog', 'pet care Bangladesh', post.title],
    })
  } catch {
    return buildPageMetadata({ title: 'Blog Post', path: `/blog/${slug}`, noIndex: true })
  }
}

async function getPost(slug: string) {
  try {
    return await api.get(`/blog/posts/${slug}`)
  } catch {
    return null
  }
}

async function getRelated(slug: string) {
  try {
    const res = await api.get('/blog/posts?limit=6')
    const items = res.items || []
    return items.filter((p: any) => p.slug !== slug).slice(0, 3)
  } catch {
    return []
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  const cover = absoluteMediaUrl(post.cover_image_url)
  const minutes = readingTimeMinutes(post.body_md || post.excerpt)
  const toc = extractToc(post.body_md)
  const related = await getRelated(slug)
  const authorName = post.author_name || 'Jahura Satter'

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: plainText(post.excerpt || post.title, 200),
    image: cover ? [cover] : [absoluteUrl('/brand/kedismart-logo.png')],
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': absoluteUrl(`/blog/${slug}`),
    },
    author: {
      '@type': 'Person',
      name: authorName,
      url: absoluteUrl('/authors/jahura-satter'),
    },
    publisher: {
      '@type': 'Organization',
      name: 'KediSmart',
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/brand/kedismart-logo.png'),
      },
    },
    inLanguage: 'en-BD',
    wordCount: plainText(post.body_md || '', 500000).split(/\s+/).filter(Boolean).length || undefined,
  }

  const crumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${slug}` },
  ]
  const crumbs = breadcrumbList(crumbItems)

  return (
    <main className="min-h-screen bg-white">
      <JsonLd data={[articleLd, crumbs]} />
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={crumbItems} />
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>
          {post.excerpt && <p className="text-xl text-gray-600 mb-4">{post.excerpt}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
            <Link href="/authors/jahura-satter" className="font-medium text-primary-700 hover:underline">
              {authorName}
            </Link>
            <time dateTime={post.published_at || post.created_at}>
              {new Date(post.published_at || post.created_at).toLocaleDateString('en-BD', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <span>{minutes} min read</span>
          </div>
        </header>

        {cover && (
          <div className="relative w-full aspect-[16/9] mb-8 overflow-hidden rounded-2xl bg-gray-100">
            <Image
              src={cover}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 896px"
              className="object-cover"
            />
          </div>
        )}

        {toc.length > 0 && (
          <nav aria-label="Table of contents" className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">On this page</p>
            <ol className="space-y-1 text-sm">
              {toc.map((item) => (
                <li key={item.id} className={item.level === 3 ? 'ml-4' : ''}>
                  <a href={`#${item.id}`} className="text-primary-700 hover:underline">
                    {item.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="prose prose-lg max-w-none prose-headings:scroll-mt-24">
          {post.body_md && <div dangerouslySetInnerHTML={{ __html: post.body_md }} />}
        </div>

        <ShareButtons
          className="mt-10"
          path={`/blog/${slug}`}
          title={post.title}
          description={plainText(post.excerpt || post.title, 120)}
        />

        {related.length > 0 && (
          <section className="mt-12 border-t border-gray-200 pt-8" aria-labelledby="related-posts">
            <h2 id="related-posts" className="text-xl font-semibold text-gray-900 mb-4">
              Related posts
            </h2>
            <ul className="space-y-3">
              {related.map((item: any) => (
                <li key={item.slug}>
                  <Link href={`/blog/${item.slug}`} className="text-primary-700 font-medium hover:underline">
                    {item.title}
                  </Link>
                  {item.excerpt && (
                    <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">{item.excerpt}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </main>
  )
}

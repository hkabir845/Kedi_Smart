import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import { absoluteMediaUrl, absoluteUrl, buildPageMetadata, plainText } from '@/lib/seo'
import { renderContentHtml } from '@/lib/sanitize-html'
import { breadcrumbList } from '@/lib/schema'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; topicSlug: string }>
}) {
  const { category, topicSlug } = await params
  try {
    const topic = await api.get(`/content/topics/${topicSlug}`)
    const seo = topic.seo || {}
    return buildPageMetadata({
      title: seo.meta_title || topic.title,
      description: plainText(seo.meta_description || topic.excerpt || topic.title),
      path: `/pets/${category}/${topicSlug}`,
      image: absoluteMediaUrl(seo.og_image_url || topic.cover_image_url),
      noIndex: Boolean(seo.noindex),
      type: 'article',
      publishedTime: topic.published_at,
      modifiedTime: topic.updated_at || topic.published_at,
      authors: [topic.author_name || 'KediSmart Editorial Team'],
    })
  } catch {
    return buildPageMetadata({
      title: 'Pet Care Guide',
      path: `/pets/${category}/${topicSlug}`,
      noIndex: true,
    })
  }
}

async function getTopic(slug: string) {
  try {
    return await api.get(`/content/topics/${slug}`)
  } catch {
    return null
  }
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ category: string; topicSlug: string }>
}) {
  const { category, topicSlug } = await params
  const topic = await getTopic(topicSlug)

  if (!topic) {
    notFound()
  }

  const seo = topic.seo || {}
  const blocks: Record<string, unknown>[] = []
  const safeBodyHtml = renderContentHtml(topic.body_md)
  const coverImage = absoluteMediaUrl(topic.cover_image_url)
  const authorName = topic.author_name || 'KediSmart Editorial Team'
  const isEditorialTeam = authorName === 'KediSmart Editorial Team'
  const crumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Pet Care', path: '/pets' },
    { name: topic.category?.name || category, path: `/pets/${category}` },
    { name: topic.title, path: `/pets/${category}/${topicSlug}` },
  ]

  if (seo.json_ld_override && typeof seo.json_ld_override === 'object') {
    blocks.push(seo.json_ld_override)
  } else {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: topic.title,
      description: plainText(topic.excerpt || topic.title, 200),
      image: absoluteMediaUrl(topic.cover_image_url),
      mainEntityOfPage: absoluteUrl(`/pets/${category}/${topicSlug}`),
      author: {
        '@type': isEditorialTeam ? 'Organization' : 'Person',
        name: authorName,
      },
      publisher: { '@id': `${absoluteUrl('/')}/#organization` },
      datePublished: topic.published_at,
      dateModified: topic.updated_at || topic.published_at,
    })
  }
  blocks.push(breadcrumbList(crumbItems))

  if (topic.faqs?.length) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: topic.faqs.map((faq: any) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    })
  }

  return (
    <div className="min-h-screen p-8">
      <JsonLd data={blocks} />
      <article className="max-w-4xl mx-auto">
        <Breadcrumbs items={crumbItems} />
        <Link
          href={`/pets/${category}`}
          className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
        >
          ← Back to {category}
        </Link>

        <h1 className="text-4xl font-bold mb-4">{topic.title}</h1>
        <p className="mb-4 text-sm text-gray-500">
          By {authorName}
          {topic.updated_at ? (
            <>
              {' · Updated '}
              <time dateTime={topic.updated_at}>
                {new Date(topic.updated_at).toLocaleDateString('en-BD', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </>
          ) : null}
        </p>
        {topic.vet_verified && (
          <span className="inline-block bg-green-100 text-green-800 text-xs px-3 py-1 rounded mb-4">
            ✓ Vet Verified
          </span>
        )}

        {topic.excerpt && <p className="text-xl text-gray-600 mb-8">{topic.excerpt}</p>}

        {coverImage && (
          <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-100">
            <Image
            src={coverImage}
            alt={topic.title}
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
            />
          </div>
        )}

        <div className="prose max-w-none">
          {safeBodyHtml && <div dangerouslySetInnerHTML={{ __html: safeBodyHtml }} />}
        </div>

        {topic.faqs && topic.faqs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {topic.faqs.map((faq: any, index: number) => (
                <div key={faq.id || index} className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  )
}

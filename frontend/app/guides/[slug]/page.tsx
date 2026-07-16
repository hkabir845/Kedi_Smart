import Link from 'next/link'
import { notFound } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import FaqSection from '@/components/FaqSection'
import JsonLd from '@/components/JsonLd'
import ShareButtons from '@/components/ShareButtons'
import { allGuideSlugs, getGuide } from '@/lib/content/guides'
import { TOPIC_CLUSTERS } from '@/lib/content/topic-clusters'
import { automatePageSeo, definitionBlock } from '@/lib/seo-automation'

export function generateStaticParams() {
  return allGuideSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) return {}
  return automatePageSeo({
    kind: 'guide',
    title: guide.title,
    description: guide.summary,
    path: `/guides/${slug}`,
    keywords: guide.keywords,
    type: 'article',
    modifiedTime: guide.lastReviewed,
    aiSummary: guide.definition,
    clusterId: guide.clusterId,
  }).metadata
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) notFound()

  const path = `/guides/${slug}`
  const seo = automatePageSeo({
    kind: 'guide',
    title: guide.title,
    description: guide.summary,
    path,
    keywords: guide.keywords,
    type: 'article',
    modifiedTime: guide.lastReviewed,
    faqs: guide.faqs,
    aiSummary: guide.definition,
    clusterId: guide.clusterId,
  })

  const cluster = TOPIC_CLUSTERS.find((c) => c.id === guide.clusterId)
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.summary,
    dateModified: guide.lastReviewed,
    author: { '@type': 'Organization', name: 'KediSmart' },
    publisher: { '@id': 'https://kedismart.com/#organization' },
    mainEntityOfPage: path,
    about: guide.definition,
  }

  return (
    <main className="min-h-screen bg-white">
      <JsonLd data={[...seo.schemas, articleLd]} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={seo.breadcrumbs} />
        <p className="text-sm text-teal-800 font-medium mb-2">
          {cluster ? cluster.name : 'Guide'} · Reviewed {guide.lastReviewed}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{guide.title}</h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-6">{guide.summary}</p>

        <div className="rounded-xl border border-teal-100 bg-teal-50/50 px-5 py-4 mb-10">
          <p className="text-sm font-semibold text-teal-900 mb-1">Definition</p>
          <p className="text-gray-800 leading-relaxed">
            {definitionBlock(guide.title.replace(/\?$/, ''), guide.definition)}
          </p>
        </div>

        {guide.sections.map((section) => (
          <section key={section.heading} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{section.heading}</h2>
            <p className="text-gray-700 leading-relaxed mb-3">{section.body}</p>
            {section.bullets?.length ? (
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                {section.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        {guide.faqs.length ? <FaqSection faqs={guide.faqs} /> : null}

        <nav className="mt-10 pt-6 border-t border-gray-100" aria-label="Related">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Related</h2>
          <ul className="space-y-2 text-sm">
            {guide.relatedPaths?.map((r) => (
              <li key={r.path}>
                <Link href={r.path} className="text-primary-700 hover:underline">
                  {r.label}
                </Link>
              </li>
            ))}
            {guide.relatedCompareSlugs?.map((s) => (
              <li key={s}>
                <Link href={`/compare/${s}`} className="text-primary-700 hover:underline">
                  Compare: {s.replace(/-/g, ' ')}
                </Link>
              </li>
            ))}
            {seo.relatedLinks.slice(0, 4).map((r) => (
              <li key={r.path}>
                <Link href={r.path} className="text-primary-700 hover:underline">
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8">
          <ShareButtons path={path} title={guide.title} />
        </div>
      </article>
    </main>
  )
}

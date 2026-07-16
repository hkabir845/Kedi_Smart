import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import { TOPIC_CLUSTERS } from '@/lib/content/topic-clusters'
import { itemListSchema } from '@/lib/schema'
import { automatePageSeo } from '@/lib/seo-automation'

const path = '/learn'
const seo = automatePageSeo({
  kind: 'category',
  title: 'Learn — Pet Identification Knowledge Base',
  description:
    'Topic clusters for NFC pet tags, lost pet recovery, pet identification, cat and dog safety, health records, travel, and ownership — the KediSmart knowledge base.',
  path,
  keywords: [
    'pet identification knowledge base',
    'NFC pet tags learn',
    'lost pet recovery guide hub',
  ],
  crumbs: [
    { name: 'Home', path: '/' },
    { name: 'Learn', path },
  ],
})

export const metadata = seo.metadata

export default function LearnPage() {
  const list = itemListSchema(
    'KediSmart Topic Clusters',
    TOPIC_CLUSTERS.map((c) => ({
      name: c.name,
      url: c.cornerstonePath,
      description: c.definition,
    })),
    { path },
  )

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={[...seo.schemas, list]} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={seo.breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Knowledge base</h1>
        <p className="text-gray-600 mb-8 max-w-2xl leading-relaxed">
          Authority clusters interconnect guides, comparisons, FAQs, and products so people — and AI
          systems — can understand KediSmart&apos;s expertise.
        </p>

        <div className="space-y-6">
          {TOPIC_CLUSTERS.map((cluster) => (
            <section
              key={cluster.id}
              className="rounded-xl border border-gray-100 p-5 hover:border-teal-200 transition-colors"
            >
              <h2 className="text-xl font-semibold text-gray-900">
                <Link href={cluster.cornerstonePath} className="hover:text-primary-700">
                  {cluster.name}
                </Link>
              </h2>
              <p className="text-sm text-gray-500 mt-1 capitalize">Intent: {cluster.intent}</p>
              <p className="text-gray-700 mt-2 leading-relaxed">{cluster.definition}</p>
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {cluster.guideSlugs.slice(0, 4).map((s) => (
                  <li key={s}>
                    <Link href={`/guides/${s}`} className="text-primary-700 hover:underline">
                      {s.replace(/-/g, ' ')}
                    </Link>
                  </li>
                ))}
                {cluster.compareSlugs.map((s) => (
                  <li key={s}>
                    <Link href={`/compare/${s}`} className="text-primary-700 hover:underline">
                      Compare: {s.replace(/-/g, ' ')}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={cluster.relatedProductPath} className="text-primary-700 hover:underline">
                    Related products
                  </Link>
                </li>
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm text-gray-500">
          Also explore{' '}
          <Link href="/pets" className="text-primary-700 hover:underline">
            pet care topics
          </Link>
          ,{' '}
          <Link href="/blog" className="text-primary-700 hover:underline">
            blog
          </Link>
          , and{' '}
          <Link href="/emergency" className="text-primary-700 hover:underline">
            emergency center
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

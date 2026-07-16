import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import { GUIDES } from '@/lib/content/guides'
import { itemListSchema } from '@/lib/schema'
import { automatePageSeo } from '@/lib/seo-automation'

const path = '/guides'
const seo = automatePageSeo({
  kind: 'guide',
  title: 'Pet Care & Smart Tag Guides',
  description:
    'Evergreen guides on NFC pet tags, lost pet recovery, cat and dog safety, health records, travel, and responsible ownership — written for Bangladesh pet families.',
  path,
  keywords: ['pet care guides', 'NFC pet tag guide', 'lost pet guide Bangladesh'],
  crumbs: [
    { name: 'Home', path: '/' },
    { name: 'Guides', path },
  ],
})

export const metadata = seo.metadata

export default function GuidesIndexPage() {
  const list = itemListSchema(
    'KediSmart Guides',
    GUIDES.map((g) => ({
      name: g.title,
      url: `/guides/${g.slug}`,
      description: g.summary,
    })),
    { path, description: String(seo.metadata.description) },
  )

  return (
    <main className="min-h-screen bg-white">
      <JsonLd data={[...seo.schemas, list]} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={seo.breadcrumbs} />
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Guides</h1>
        <p className="text-gray-600 mb-2 max-w-2xl leading-relaxed">
          Clear, entity-first explainers for NFC tags, recovery, safety, and everyday pet care.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          See also{' '}
          <Link href="/compare" className="text-primary-700 hover:underline">
            comparisons
          </Link>
          ,{' '}
          <Link href="/learn" className="text-primary-700 hover:underline">
            topic clusters
          </Link>
          , and our{' '}
          <Link href="/editorial-policy" className="text-primary-700 hover:underline">
            editorial policy
          </Link>
          .
        </p>

        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/guides/${g.slug}`}
                className="block px-5 py-4 hover:bg-teal-50/40 transition-colors"
              >
                <span className="font-semibold text-gray-900">{g.title}</span>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{g.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

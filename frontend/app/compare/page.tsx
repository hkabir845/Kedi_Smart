import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import { COMPARISONS } from '@/lib/content/comparisons'
import { itemListSchema } from '@/lib/schema'
import { automatePageSeo } from '@/lib/seo-automation'

const path = '/compare'
const seo = automatePageSeo({
  kind: 'comparison',
  title: 'Pet ID Comparisons',
  description:
    'Side-by-side comparisons: NFC vs QR pet tags, NFC vs microchip, smart tags vs engraved collars — so you choose the right identification stack.',
  path,
  keywords: ['NFC vs QR', 'NFC vs microchip', 'smart tag vs engraved'],
  crumbs: [
    { name: 'Home', path: '/' },
    { name: 'Compare', path },
  ],
})

export const metadata = seo.metadata

export default function CompareIndexPage() {
  const list = itemListSchema(
    'KediSmart Comparisons',
    COMPARISONS.map((c) => ({
      name: c.title,
      url: `/compare/${c.slug}`,
      description: c.summary,
    })),
    { path },
  )

  return (
    <main className="min-h-screen bg-white">
      <JsonLd data={[...seo.schemas, list]} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={seo.breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Compare</h1>
        <p className="text-gray-600 mb-8 max-w-2xl">
          Honest trade-offs for pet identification — not ranking spam. Layered ID usually wins.
        </p>
        <ul className="space-y-4">
          {COMPARISONS.map((c) => (
            <li key={c.slug} className="border border-gray-100 rounded-xl p-5 hover:border-teal-200">
              <Link href={`/compare/${c.slug}`} className="font-semibold text-gray-900 hover:text-primary-700">
                {c.title}
              </Link>
              <p className="text-sm text-gray-600 mt-1">{c.summary}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-gray-500">
          More planned comparisons are listed on the{' '}
          <Link href="/resources" className="text-primary-700 hover:underline">
            editorial roadmap
          </Link>
          .
        </p>
      </div>
    </main>
  )
}

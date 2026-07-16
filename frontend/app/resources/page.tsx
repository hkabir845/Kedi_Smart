import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import {
  EDITORIAL_CATEGORIES,
  PLANNED_ARTICLES,
  PLANNED_COMPARISONS,
  PLANNED_DOWNLOADS,
  PLANNED_FAQS,
  PLANNED_GUIDES,
  PLANNED_LANDINGS,
  roadmapTotals,
} from '@/lib/content/editorial-roadmap'
import { automatePageSeo } from '@/lib/seo-automation'

const path = '/resources'
const totals = roadmapTotals()

const seo = automatePageSeo({
  kind: 'landing',
  title: 'Editorial Roadmap & Resources',
  description: `KediSmart content roadmap: ${totals.articles} articles, ${totals.faqs} FAQs, ${totals.landings} landing pages, ${totals.comparisons} comparisons, ${totals.guides} guides, ${totals.downloads} downloads — planned for topical authority.`,
  path,
  keywords: ['KediSmart editorial roadmap', 'pet content strategy', 'NFC content plan'],
  noIndex: true,
  crumbs: [
    { name: 'Home', path: '/' },
    { name: 'Resources', path },
  ],
})

export const metadata = seo.metadata

function Section({
  title,
  count,
  items,
  publishedPath,
}: {
  title: string
  count: number
  items: { id: string; title: string; slug: string; status: string; priority: string }[]
  publishedPath?: (slug: string) => string | null
}) {
  const preview = items.slice(0, 12)
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">
        {title}{' '}
        <span className="text-gray-500 font-normal text-base">({count})</span>
      </h2>
      <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
        {preview.map((item) => {
          const href = item.status === 'published' && publishedPath ? publishedPath(item.slug) : null
          return (
            <li key={item.id || item.slug} className="flex gap-2">
              <span className="text-xs uppercase tracking-wide text-gray-400 w-10 shrink-0">
                {item.priority}
              </span>
              {href ? (
                <Link href={href} className="text-primary-700 hover:underline">
                  {item.title}
                </Link>
              ) : (
                <span>
                  {item.title}{' '}
                  <span className="text-gray-400">({item.status})</span>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {items.length > preview.length ? (
        <p className="text-xs text-gray-500 mt-2">+{items.length - preview.length} more in roadmap data</p>
      ) : null}
    </section>
  )
}

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={seo.schemas} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={seo.breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Resources &amp; roadmap</h1>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Transparent editorial plan for building topical authority. Titles below are briefs for
          human editors — we publish only accurate, helpful pages (no doorway spam).
        </p>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10 text-center">
          {[
            ['Articles', totals.articles],
            ['FAQs', totals.faqs],
            ['Landings', totals.landings],
            ['Comparisons', totals.comparisons],
            ['Guides', totals.guides],
            ['Downloads', totals.downloads],
          ].map(([label, n]) => (
            <div key={label as string} className="rounded-xl border border-gray-100 py-4">
              <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
              <dd className="text-2xl font-bold text-gray-900 mt-1">{n}</dd>
            </div>
          ))}
        </dl>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Categories</h2>
          <p className="text-sm text-gray-600 mb-2">{EDITORIAL_CATEGORIES.join(' · ')}</p>
        </section>

        <Section
          title="Evergreen guides"
          count={PLANNED_GUIDES.length}
          items={PLANNED_GUIDES}
          publishedPath={(slug) =>
            PLANNED_GUIDES.some((g) => g.slug === slug && g.status === 'published')
              ? `/guides/${slug}`
              : null
          }
        />
        <Section
          title="Comparisons"
          count={PLANNED_COMPARISONS.length}
          items={PLANNED_COMPARISONS}
          publishedPath={(slug) =>
            PLANNED_COMPARISONS.some((g) => g.slug === slug && g.status === 'published')
              ? `/compare/${slug}`
              : null
          }
        />
        <Section title="Blog articles (planned)" count={PLANNED_ARTICLES.length} items={PLANNED_ARTICLES} />
        <Section title="FAQs (planned)" count={PLANNED_FAQS.length} items={PLANNED_FAQS} />
        <Section title="Landing pages (planned)" count={PLANNED_LANDINGS.length} items={PLANNED_LANDINGS} />
        <Section title="Downloadable resources (planned)" count={PLANNED_DOWNLOADS.length} items={PLANNED_DOWNLOADS} />

        <p className="text-sm text-gray-500">
          Standards:{' '}
          <Link href="/editorial-policy" className="text-primary-700 hover:underline">
            Editorial policy
          </Link>
        </p>
      </div>
    </div>
  )
}

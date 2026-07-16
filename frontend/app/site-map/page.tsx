import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import { COMPARISONS } from '@/lib/content/comparisons'
import { GUIDES } from '@/lib/content/guides'
import { automatePageSeo } from '@/lib/seo-automation'

const path = '/site-map'
const seo = automatePageSeo({
  kind: 'landing',
  title: 'Sitemap',
  description:
    'HTML sitemap of KediSmart — shop, marketplace, vets, smart tags, guides, comparisons, policies, and help pages.',
  path,
  keywords: ['KediSmart sitemap', 'site map'],
  crumbs: [
    { name: 'Home', path: '/' },
    { name: 'Sitemap', path },
  ],
})

export const metadata = seo.metadata

const HUBS = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/marketplace', label: 'Live animals marketplace' },
  { href: '/vets', label: 'Veterinarians' },
  { href: '/tags', label: 'NFC & QR smart tags' },
  { href: '/pets', label: 'Pet care topics' },
  { href: '/learn', label: 'Knowledge base' },
  { href: '/guides', label: 'Guides' },
  { href: '/compare', label: 'Comparisons' },
  { href: '/emergency', label: 'Lost pet emergency' },
  { href: '/blog', label: 'Blog' },
  { href: '/resources', label: 'Editorial roadmap' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/press', label: 'Press & media kit' },
  { href: '/authors/jahura-satter', label: 'CEO — Jahura Satter' },
  { href: '/track', label: 'Track order' },
]

const POLICIES = [
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms of service' },
  { href: '/shipping', label: 'Shipping' },
  { href: '/returns', label: 'Returns' },
  { href: '/editorial-policy', label: 'Editorial policy' },
]

export default function HtmlSitemapPage() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={seo.schemas} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={seo.breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Sitemap</h1>
        <p className="text-gray-600 mb-8">
          Human-readable map. Machines should use{' '}
          <a href="/sitemap.xml" className="text-primary-700 hover:underline">
            /sitemap.xml
          </a>
          .
        </p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Main hubs</h2>
          <ul className="columns-1 sm:columns-2 gap-4 text-sm space-y-1.5">
            {HUBS.map((l) => (
              <li key={l.href} className="break-inside-avoid">
                <Link href={l.href} className="text-primary-700 hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Policies</h2>
          <ul className="text-sm space-y-1.5">
            {POLICIES.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-primary-700 hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Guides</h2>
          <ul className="text-sm space-y-1.5 columns-1 sm:columns-2 gap-4">
            {GUIDES.map((g) => (
              <li key={g.slug} className="break-inside-avoid">
                <Link href={`/guides/${g.slug}`} className="text-primary-700 hover:underline">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Comparisons</h2>
          <ul className="text-sm space-y-1.5">
            {COMPARISONS.map((c) => (
              <li key={c.slug}>
                <Link href={`/compare/${c.slug}`} className="text-primary-700 hover:underline">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

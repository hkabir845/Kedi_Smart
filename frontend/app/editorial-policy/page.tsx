import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import { automatePageSeo } from '@/lib/seo-automation'

const path = '/editorial-policy'
const seo = automatePageSeo({
  kind: 'policy',
  title: 'Editorial Policy',
  description:
    'How KediSmart creates, reviews, and updates pet care guides — experience, expertise, sourcing, and corrections for E-E-A-T.',
  path,
  keywords: ['KediSmart editorial policy', 'pet content standards', 'E-E-A-T'],
  crumbs: [
    { name: 'Home', path: '/' },
    { name: 'Editorial Policy', path },
  ],
})

export const metadata = seo.metadata

export default function EditorialPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={seo.schemas} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={seo.breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Editorial Policy</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          KediSmart publishes guides to help pet families make safer decisions. We prioritize helpful,
          accurate information over volume. We do not fabricate credentials or publish manipulative
          content.
        </p>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Mission</h2>
            <p>
              Explain pet identification, safety, recovery, and marketplace use in clear language —
              especially for Bangladesh pet owners.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Who writes</h2>
            <p>
              Content is produced by the KediSmart team under editorial review. Leadership context:{' '}
              <Link href="/authors/jahura-satter" className="text-primary-700 hover:underline">
                Jahura Satter, CEO
              </Link>
              . Clinical veterinary advice should always be confirmed with a licensed veterinarian —{' '}
              <Link href="/vets" className="text-primary-700 hover:underline">
                find a vet
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Standards</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>One primary search intent per page</li>
              <li>Clear definitions and actionable steps</li>
              <li>Visible last-reviewed dates on evergreen guides</li>
              <li>No fake reviews, fake expertise, or doorway spam</li>
              <li>Product mentions are labeled when commercial</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Corrections</h2>
            <p>
              Spot an error? Email info@kedismart.com with the URL and suggested correction. We update
              pages when facts change.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Medical disclaimer</h2>
            <p>
              Guides are educational, not a diagnosis or treatment plan. For emergencies, contact a
              veterinarian immediately.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-gray-500">
          <Link href="/guides" className="text-primary-700 hover:underline">
            Browse guides
          </Link>
          {' · '}
          <Link href="/resources" className="text-primary-700 hover:underline">
            Editorial roadmap
          </Link>
        </p>
      </article>
    </div>
  )
}

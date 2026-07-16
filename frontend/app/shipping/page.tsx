import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import FaqSection from '@/components/FaqSection'
import JsonLd from '@/components/JsonLd'
import { automatePageSeo } from '@/lib/seo-automation'

const path = '/shipping'
const faqs = [
  {
    question: 'Do you deliver across Bangladesh?',
    answer:
      'Yes. Coverage depends on the product and courier partner. Metro areas often qualify for free-delivery thresholds shown at checkout.',
  },
  {
    question: 'How do I track my order?',
    answer:
      'Use your account orders page or the public track page at /track with your order number.',
  },
  {
    question: 'Is cash on delivery available?',
    answer:
      'COD is available where configured for the order. Exact payment options appear at checkout.',
  },
]

const seo = automatePageSeo({
  kind: 'policy',
  title: 'Shipping & Delivery',
  description:
    'KediSmart shipping across Bangladesh — delivery timelines, COD, free-delivery thresholds, and how to track orders.',
  path,
  keywords: ['KediSmart shipping', 'pet products delivery Bangladesh', 'COD KediSmart'],
  faqs,
  crumbs: [
    { name: 'Home', path: '/' },
    { name: 'Shipping', path },
  ],
})

export const metadata = seo.metadata

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={seo.schemas} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={seo.breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Shipping &amp; Delivery</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          We partner with couriers to deliver pet care products and general goods across Bangladesh.
          Timelines vary by destination and stock location.
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Delivery areas</h2>
          <p className="text-gray-700 leading-relaxed">
            Major cities and many districts are covered. If your area is not serviceable for a
            specific SKU, checkout will indicate the limitation before you pay.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Costs &amp; free delivery</h2>
          <p className="text-gray-700 leading-relaxed">
            Shipping fees are calculated at checkout. Some catalogs offer free delivery above a cart
            threshold — the current threshold is shown before you confirm.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Live animals</h2>
          <p className="text-gray-700 leading-relaxed">
            Live animal transfers are arranged between buyer and seller according to the listing —
            they are not standard parcel shipments. Prioritize animal welfare and local regulations.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Track your order</h2>
          <p className="text-gray-700 leading-relaxed">
            Visit{' '}
            <Link href="/track" className="text-primary-700 hover:underline">
              Order tracking
            </Link>{' '}
            or your{' '}
            <Link href="/dashboard/orders" className="text-primary-700 hover:underline">
              Orders dashboard
            </Link>
            . Need help?{' '}
            <Link href="/contact" className="text-primary-700 hover:underline">
              Contact us
            </Link>
            .
          </p>
        </section>

        <FaqSection faqs={faqs} />

        <p className="mt-10 text-sm text-gray-500">
          Related:{' '}
          <Link href="/returns" className="text-primary-700 hover:underline">
            Returns
          </Link>
          {' · '}
          <Link href="/faq" className="text-primary-700 hover:underline">
            FAQ
          </Link>
        </p>
      </div>
    </div>
  )
}

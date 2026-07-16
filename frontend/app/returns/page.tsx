import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import FaqSection from '@/components/FaqSection'
import JsonLd from '@/components/JsonLd'
import { automatePageSeo } from '@/lib/seo-automation'

const path = '/returns'
const faqs = [
  {
    question: 'Can I return pet food if opened?',
    answer:
      'Opened consumables generally cannot be returned for hygiene reasons. Unopened items in original condition may qualify within the return window.',
  },
  {
    question: 'What if my item arrives damaged?',
    answer:
      'Contact support within 48 hours with photos of the package and product. We will arrange replacement or refund according to the case.',
  },
  {
    question: 'Are live animals returnable?',
    answer:
      'Live animal transactions follow listing-specific agreements between buyer and seller. Contact support for mediation if welfare or misrepresentation issues arise.',
  },
]

const seo = automatePageSeo({
  kind: 'policy',
  title: 'Returns & Refunds',
  description:
    'KediSmart returns and refunds policy for pet products and general goods — windows, conditions, and how to start a return.',
  path,
  keywords: ['KediSmart returns', 'pet product refund Bangladesh', 'exchange policy'],
  faqs,
  crumbs: [
    { name: 'Home', path: '/' },
    { name: 'Returns', path },
  ],
})

export const metadata = seo.metadata

export default function ReturnsPage() {
  return (
    <main className="min-h-screen bg-white">
      <JsonLd data={seo.schemas} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={seo.breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Returns &amp; Refunds</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          We want you to shop with confidence. This policy covers standard catalog products. Vendor
          and marketplace items may include additional seller terms shown on the listing.
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Return window</h2>
          <p className="text-gray-700 leading-relaxed">
            Eligible unused products in original packaging may be returned within 7 days of delivery
            unless the product page states a different window.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Non-returnable items</h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>Opened food, treats, and hygiene consumables</li>
            <li>Personalized or made-to-order items</li>
            <li>Items damaged by misuse after delivery</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">How to start a return</h2>
          <ol className="list-decimal pl-5 space-y-1 text-gray-700">
            <li>Open your order in the dashboard or email info@kedismart.com</li>
            <li>Include order number, item, and reason</li>
            <li>Wait for return authorization and courier instructions</li>
            <li>Refunds are issued to the original payment method or as store credit when agreed</li>
          </ol>
        </section>

        <FaqSection faqs={faqs} />

        <p className="mt-10 text-sm text-gray-500">
          Related:{' '}
          <Link href="/shipping" className="text-primary-700 hover:underline">
            Shipping
          </Link>
          {' · '}
          <Link href="/contact" className="text-primary-700 hover:underline">
            Contact
          </Link>
        </p>
      </div>
    </main>
  )
}

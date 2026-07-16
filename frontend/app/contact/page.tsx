import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import ShareButtons from '@/components/ShareButtons'
import { breadcrumbList, faqPageSchema, webPageSchema } from '@/lib/schema'
import { absoluteUrl, buildPageMetadata, getSiteUrl } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Contact KediSmart',
  description:
    'Contact KediSmart in Gulshan, Dhaka — phone +880 1898-941782, email info@kedismart.com. Customer support for orders, sellers, vets, and NFC pet tags.',
  path: '/contact',
  keywords: ['contact KediSmart', 'KediSmart support', 'pet marketplace Dhaka contact'],
})

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Contact', path: '/contact' },
]

const faqs = [
  {
    question: 'What are KediSmart customer support hours?',
    answer:
      'Our Dhaka team typically responds Sunday–Thursday during business hours. For urgent order issues, call +880 1898-941782 or email info@kedismart.com.',
  },
  {
    question: 'How do vendors or vets join KediSmart?',
    answer:
      'Create an account as a Vendor, Breeder, or Vet from the register page, then complete verification from your dashboard.',
  },
]

export default function ContactPage() {
  const contactLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${absoluteUrl('/contact')}#webpage`,
    url: absoluteUrl('/contact'),
    name: 'Contact KediSmart',
    description:
      'Reach KediSmart customer service in Dhaka for orders, marketplace, vets, and smart tags.',
    isPartOf: { '@id': `${getSiteUrl()}/#website` },
    mainEntity: {
      '@type': 'Organization',
      '@id': `${getSiteUrl()}/#organization`,
      name: 'KediSmart',
      email: 'info@kedismart.com',
      telephone: '+8801898941782',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'A.B.M Tower, Gulshan 2',
        addressLocality: 'Dhaka',
        postalCode: '1212',
        addressCountry: 'BD',
      },
    },
  }

  const schemas = [
    contactLd,
    webPageSchema({
      name: 'Contact KediSmart',
      path: '/contact',
      type: 'ContactPage',
      description: String(metadata.description),
    }),
    breadcrumbList(crumbs),
    faqPageSchema(faqs),
  ].filter(Boolean) as Record<string, unknown>[]

  return (
    <div className="min-h-screen bg-gray-50">
      <JsonLd data={schemas} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Contact us</h1>
        <p className="text-lg text-gray-600 mb-8">
          Questions about orders, sellers, veterinary listings, or NFC pet tags? We are here to help.
        </p>

        <div className="rounded-2xl bg-white border border-gray-200 p-6 space-y-4 mb-10">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Phone / WhatsApp</h2>
            <a href="tel:+8801898941782" className="text-xl font-semibold text-primary-700 hover:underline">
              +880 1898-941782
            </a>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Email</h2>
            <a href="mailto:info@kedismart.com" className="text-xl font-semibold text-primary-700 hover:underline">
              info@kedismart.com
            </a>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Address (NAP)</h2>
            <p className="text-gray-800">A.B.M Tower, Gulshan 2, Dhaka 1212, Bangladesh</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Map</h2>
            <div className="mt-2 aspect-video overflow-hidden rounded-xl border border-gray-200">
              <iframe
                title="KediSmart office location on Google Maps — Gulshan 2, Dhaka"
                src="https://www.google.com/maps?q=Gulshan+2+Dhaka+Bangladesh&output=embed"
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>

        <section className="mb-10" lang="bn">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">যোগাযোগ (বাংলা)</h2>
          <p className="text-gray-700">
            ফোন: +৮৮০ ১৮৯৮-৯৪১৭৮২ · ইমেইল: info@kedismart.com · ঠিকানা: এ.বি.এম টাওয়ার, গুলশান ২,
            ঢাকা ১২১২।
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Quick links</h2>
          <ul className="space-y-2 text-primary-700">
            <li>
              <Link href="/track" className="hover:underline">
                Track an order
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:underline">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:underline">
                About KediSmart
              </Link>
            </li>
          </ul>
        </section>

        <ShareButtons path="/contact" title="Contact KediSmart" />
      </div>
    </div>
  )
}

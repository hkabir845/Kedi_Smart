import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import FaqSection from '@/components/FaqSection'
import JsonLd from '@/components/JsonLd'
import { FAQ_ANSWERS } from '@/lib/content/editorial-roadmap'
import { breadcrumbList, faqPageSchema, webPageSchema, type FaqEntry } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'FAQ — KediSmart Help Center',
  description:
    'Answers about KediSmart shopping, live animal marketplace, veterinary bookings, NFC pet tags, delivery in Bangladesh, returns, and seller accounts.',
  path: '/faq',
  keywords: ['KediSmart FAQ', 'pet marketplace help', 'NFC pet tag questions Bangladesh'],
})

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'FAQ', path: '/faq' },
]

const coreFaqs: FaqEntry[] = [
  {
    question: 'What is KediSmart?',
    answer:
      'KediSmart is a Bangladesh marketplace for pet & animal products, live animal listings, veterinary discovery, care guides, and NFC/QR smart pet tags — plus a general products catalog for everyday essentials.',
  },
  {
    question: 'Do you deliver across Bangladesh?',
    answer:
      'Yes. Delivery coverage depends on the product and courier partner. Metro areas often qualify for free delivery thresholds shown at checkout. Track shipments from your orders page or /track. See /shipping.',
  },
  {
    question: 'How do NFC smart pet tags work?',
    answer:
      'A KediSmart tag links to a private pet profile. When someone taps NFC or scans the QR, they can contact you anonymously if the pet is lost — without exposing your personal phone number by default. Learn more on /tags and /guides/what-is-an-nfc-pet-tag.',
  },
  {
    question: 'Can I sell live animals on KediSmart?',
    answer:
      'Verified breeders and sellers can list live animals on the marketplace after creating a Breeder/Seller account and completing verification. Listings should follow animal welfare guidelines.',
  },
  {
    question: 'How do I find a veterinarian?',
    answer:
      'Browse the /vets directory to discover clinics and professionals, then book or contact them according to their profile availability.',
  },
  {
    question: 'What payment methods are supported?',
    answer:
      'KediSmart supports cash on delivery and online payment gateways where configured for the order. Exact options appear at checkout.',
  },
  {
    question: 'What is your returns policy?',
    answer:
      'Eligible unused products may be returned within the window described on /returns. Opened consumables are generally non-returnable for hygiene reasons.',
  },
  {
    question: 'What should I do if my pet is lost?',
    answer:
      'Search nearby immediately, enable lost mode on your digital pet profile, alert neighbors, and follow the checklist at /emergency.',
  },
  {
    question: 'কেডিস্মার্টে কীভাবে অর্ডার ট্র্যাক করব?',
    answer:
      'অ্যাকাউন্টের অর্ডার পেজ থেকে অথবা /track পেজে অর্ডার নম্বর দিয়ে ট্র্যাক করতে পারেন। সহায়তার জন্য info@kedismart.com-এ লিখুন।',
  },
]

const faqs: FaqEntry[] = [
  ...coreFaqs,
  ...FAQ_ANSWERS.filter(
    (f) => !coreFaqs.some((c) => c.question.toLowerCase() === f.question.toLowerCase()),
  ).map((f) => ({ question: f.question, answer: f.answer })),
]

export default function FaqPage() {
  const schemas = [
    webPageSchema({
      name: 'KediSmart FAQ',
      path: '/faq',
      type: 'FAQPage',
      description: String(metadata.description),
    }),
    breadcrumbList(crumbs),
    faqPageSchema(faqs),
  ].filter(Boolean) as Record<string, unknown>[]

  return (
    <main className="min-h-screen bg-white">
      <JsonLd data={schemas} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Help &amp; FAQ</h1>
        <p className="text-gray-600 mb-2">
          Clear answers for pet parents, sellers, and vets using KediSmart in Bangladesh.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Still stuck?{' '}
          <Link href="/contact" className="text-primary-700 hover:underline">
            Contact support
          </Link>
          {' · '}
          <Link href="/emergency" className="text-primary-700 hover:underline">
            Lost pet emergency
          </Link>
          {' · '}
          <Link href="/guides" className="text-primary-700 hover:underline">
            Guides
          </Link>
          .
        </p>
        <FaqSection faqs={faqs} title="Popular questions" />
      </div>
    </main>
  )
}

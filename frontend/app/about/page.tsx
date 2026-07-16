import Image from 'next/image'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import ShareButtons from '@/components/ShareButtons'
import { breadcrumbList, personSchema, webPageSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'About KediSmart',
  description:
    'KediSmart (Kedi Smart) is Bangladesh’s pet & animal marketplace — shop products, find vets, list live animals, and protect pets with NFC smart tags. Led by CEO Jahura Satter in Gulshan, Dhaka.',
  path: '/about',
  keywords: [
    'about KediSmart',
    'Kedi Smart Bangladesh',
    'pet marketplace Dhaka',
    'Jahura Satter',
    'NFC pet tags Bangladesh',
  ],
})

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
]

export default function AboutPage() {
  const schemas = [
    webPageSchema({
      name: 'About KediSmart',
      description:
        'Learn about KediSmart — Bangladesh pet marketplace for products, live animals, vets, and smart tags.',
      path: '/about',
      type: 'AboutPage',
    }),
    breadcrumbList(crumbs),
    personSchema({
      name: 'Jahura Satter',
      jobTitle: 'CEO',
      path: '/authors/jahura-satter',
      image: '/brand/jahura-satter-ceo.png',
      description:
        'CEO of KediSmart, building a trusted marketplace so every pet family in Bangladesh feels seen and supported.',
    }),
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50/60 via-white to-white">
      <JsonLd data={schemas} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">About KediSmart</h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-8">
          KediSmart (also known as Kedi Smart, kedismart) is a Bangladesh-first marketplace for pet
          &amp; animal care and everyday general products. We help families shop supplies, connect
          with veterinarians, buy or adopt live animals responsibly, and protect pets with NFC &amp;
          QR smart tags.
        </p>

        <div className="flex items-start gap-4 rounded-2xl border border-teal-100 bg-white p-5 mb-10 shadow-sm">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-teal-200">
            <Image
              src="/brand/jahura-satter-ceo.png"
              alt="Jahura Satter, CEO of KediSmart"
              fill
              sizes="80px"
              className="object-cover object-[center_18%]"
              priority
            />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Leadership</h2>
            <p className="text-gray-600 mt-1">
              Founded and led by{' '}
              <Link href="/authors/jahura-satter" className="text-primary-700 font-medium hover:underline">
                Jahura Satter
              </Link>
              , CEO — building KediSmart so every pet family feels seen and supported.
            </p>
          </div>
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">What we offer</h2>
          <ul className="space-y-2 text-gray-700 list-disc pl-5">
            <li>
              <Link href="/shop" className="text-primary-700 hover:underline">
                Shop
              </Link>{' '}
              — pet care products and general household essentials
            </li>
            <li>
              <Link href="/marketplace" className="text-primary-700 hover:underline">
                Live animals marketplace
              </Link>{' '}
              — buy, sell, and adopt with verified sellers
            </li>
            <li>
              <Link href="/vets" className="text-primary-700 hover:underline">
                Veterinary directory
              </Link>{' '}
              — find clinics and book care
            </li>
            <li>
              <Link href="/tags" className="text-primary-700 hover:underline">
                NFC &amp; QR smart tags
              </Link>{' '}
              — help lost pets come home faster
            </li>
            <li>
              <Link href="/pets" className="text-primary-700 hover:underline">
                Knowledge hub
              </Link>{' '}
              and{' '}
              <Link href="/blog" className="text-primary-700 hover:underline">
                blog
              </Link>{' '}
              — practical care guides for Bangladesh pet parents
            </li>
          </ul>
        </section>

        <section className="mb-10" lang="bn">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">কেডিস্মার্ট সম্পর্কে (বাংলা)</h2>
          <p className="text-gray-700 leading-relaxed">
            কেডিস্মার্ট বাংলাদেশের পোষা প্রাণী ও প্রাণী যত্নের মার্কেটপ্লেস। এখানে পণ্য কিনুন,
            ভেট খুঁজুন, লাইভ অ্যানিম্যাল লিস্টিং দেখুন এবং NFC স্মার্ট ট্যাগ দিয়ে পোষা প্রাণীকে
            সুরক্ষিত রাখুন। আমাদের অফিস: এ.বি.এম টাওয়ার, গুলশান ২, ঢাকা ১২১২।
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Our location</h2>
          <p className="text-gray-700">
            A.B.M Tower, Gulshan 2, Dhaka 1212, Bangladesh
            <br />
            <a href="tel:+8801898941782" className="text-primary-700 hover:underline">
              +880 1898-941782
            </a>
            {' · '}
            <a href="mailto:info@kedismart.com" className="text-primary-700 hover:underline">
              info@kedismart.com
            </a>
          </p>
          <p className="mt-3">
            <Link href="/contact" className="font-medium text-primary-700 hover:underline">
              Contact us →
            </Link>
          </p>
        </section>

        <ShareButtons path="/about" title="About KediSmart" description={String(metadata.description)} />
      </div>
    </main>
  )
}

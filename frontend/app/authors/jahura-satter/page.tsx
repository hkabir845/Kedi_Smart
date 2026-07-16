import Image from 'next/image'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import { breadcrumbList, personSchema, webPageSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Jahura Satter — CEO of KediSmart',
  description:
    'Jahura Satter is the CEO of KediSmart (Kedi Smart), Bangladesh’s pet & animal marketplace. Learn about her mission to support pet families with products, vets, and smart tags.',
  path: '/authors/jahura-satter',
  type: 'profile',
  image: '/brand/jahura-satter-ceo.png',
  keywords: ['Jahura Satter', 'KediSmart CEO', 'pet marketplace founder Bangladesh'],
  authors: ['Jahura Satter'],
})

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Jahura Satter', path: '/authors/jahura-satter' },
]

export default function AuthorPage() {
  const schemas = [
    webPageSchema({
      name: 'Jahura Satter — CEO',
      path: '/authors/jahura-satter',
      type: 'ProfilePage',
      description: String(metadata.description),
    }),
    breadcrumbList(crumbs),
    personSchema({
      name: 'Jahura Satter',
      jobTitle: 'Chief Executive Officer',
      path: '/authors/jahura-satter',
      image: '/brand/jahura-satter-ceo.png',
      description:
        'CEO of KediSmart, building a trusted pet & animal marketplace for families across Bangladesh.',
    }),
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50/50 to-white">
      <JsonLd data={schemas} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={crumbs} />
        <div className="flex flex-col sm:flex-row gap-6 items-start mb-8">
          <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-2xl ring-2 ring-teal-200 shadow">
            <Image
              src="/brand/jahura-satter-ceo.png"
              alt="Portrait of Jahura Satter, CEO of KediSmart"
              fill
              sizes="144px"
              className="object-cover object-[center_18%]"
              priority
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Jahura Satter</h1>
            <p className="text-primary-700 font-medium mt-1">CEO, KediSmart</p>
            <p className="text-gray-600 mt-4 leading-relaxed">
              Jahura Satter leads KediSmart with a simple mission: make pet care and everyday shopping
              trustworthy for families in Bangladesh. Under her leadership, KediSmart connects pet
              parents with products, veterinarians, responsible live-animal listings, and NFC smart
              tags that help lost pets come home.
            </p>
          </div>
        </div>

        <section className="prose prose-gray max-w-none mb-8">
          <h2>Expertise &amp; E-E-A-T</h2>
          <p>
            As CEO, Jahura oversees marketplace trust, vendor verification standards, and product
            experiences spanning pet supplies and general goods. Editorial care guides and community
            content on KediSmart are published to help owners make safer, more informed decisions.
          </p>
          <h2>Contact</h2>
          <p>
            For press or partnership inquiries, reach the team via{' '}
            <Link href="/contact">the contact page</Link> or email{' '}
            <a href="mailto:info@kedismart.com">info@kedismart.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}

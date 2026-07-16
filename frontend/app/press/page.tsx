import Image from 'next/image'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import { automatePageSeo } from '@/lib/seo-automation'

const path = '/press'
const seo = automatePageSeo({
  kind: 'landing',
  title: 'Press & Media Kit',
  description:
    'KediSmart press resources — brand story, CEO bio, logo assets, and media contact for journalists covering pet tech in Bangladesh.',
  path,
  keywords: ['KediSmart press', 'media kit', 'pet marketplace Bangladesh news'],
  crumbs: [
    { name: 'Home', path: '/' },
    { name: 'Press', path },
  ],
})

export const metadata = seo.metadata

export default function PressPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-white to-white">
      <JsonLd data={seo.schemas} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={seo.breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Press &amp; Media Kit</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          KediSmart is Bangladesh&apos;s pet &amp; animal marketplace with NFC smart tags for digital
          pet identification and lost-pet recovery.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Boilerplate</h2>
          <p className="text-gray-700 leading-relaxed rounded-xl border border-teal-100 bg-white p-5">
            KediSmart (also known as Kedi Smart) helps families shop pet products, discover
            veterinarians, list live animals responsibly, and protect pets with NFC &amp; QR smart
            tags. Headquartered in Gulshan, Dhaka, and led by CEO Jahura Satter.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Leadership</h2>
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-teal-200">
              <Image
                src="/brand/jahura-satter-ceo.png"
                alt="Jahura Satter, CEO of KediSmart"
                fill
                sizes="80px"
                className="object-cover object-[center_18%]"
              />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Jahura Satter</p>
              <p className="text-gray-600 text-sm">CEO</p>
              <Link
                href="/authors/jahura-satter"
                className="text-primary-700 text-sm hover:underline mt-1 inline-block"
              >
                Full profile
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Brand assets</h2>
          <ul className="space-y-2 text-gray-700">
            <li>
              <a href="/brand/kedismart-logo.png" className="text-primary-700 hover:underline">
                Logo (full)
              </a>
            </li>
            <li>
              <a href="/brand/kedismart-mark.png" className="text-primary-700 hover:underline">
                Logo mark
              </a>
            </li>
          </ul>
          <p className="text-sm text-gray-500 mt-3">
            Please leave clear space around the logo. Do not alter colors without approval.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Facts</h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>Website: https://kedismart.com</li>
            <li>HQ: A.B.M Tower, Gulshan 2, Dhaka 1212, Bangladesh</li>
            <li>Phone: +880 1898-941782</li>
            <li>Email: info@kedismart.com</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Media contact</h2>
          <p className="text-gray-700">
            <a href="mailto:info@kedismart.com" className="text-primary-700 hover:underline">
              info@kedismart.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}

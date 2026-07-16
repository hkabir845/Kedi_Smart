import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import { automatePageSeo } from '@/lib/seo-automation'

const path = '/terms'
const seo = automatePageSeo({
  kind: 'policy',
  title: 'Terms of Service',
  description:
    'Terms governing use of KediSmart marketplace, shop, veterinary directory, and NFC smart pet tag services in Bangladesh.',
  path,
  keywords: ['KediSmart terms of service', 'pet marketplace terms Bangladesh'],
  crumbs: [
    { name: 'Home', path: '/' },
    { name: 'Terms of Service', path },
  ],
})

export const metadata = seo.metadata

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={seo.schemas} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={seo.breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: 1 July 2026</p>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <p>
            By using kedismart.com you agree to these terms. If you do not agree, do not use the
            platform.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Accounts</h2>
            <p>
              You are responsible for accurate registration details and for safeguarding login
              credentials. Roles (buyer, vendor, breeder, vet) may require verification before certain
              features unlock.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Marketplace &amp; animal welfare</h2>
            <p>
              Live animal listings must comply with applicable law and humane care standards.
              KediSmart may remove listings, suspend accounts, or refuse service for welfare or fraud
              concerns. Buyers should verify health, documentation, and suitability before purchase or
              adoption.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Products &amp; orders</h2>
            <p>
              Product descriptions aim to be accurate; images are illustrative. Prices are shown in BDT
              unless stated otherwise. Orders are subject to availability and successful payment or COD
              acceptance. See{' '}
              <Link href="/shipping" className="text-primary-700 hover:underline">
                Shipping
              </Link>{' '}
              and{' '}
              <Link href="/returns" className="text-primary-700 hover:underline">
                Returns
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Smart tags</h2>
            <p>
              NFC/QR tags link to digital profiles you control. Tags are identification aids, not GPS
              trackers or guarantees of recovery. Keep profiles updated and test tags regularly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Veterinary directory</h2>
            <p>
              Vet profiles help discovery. KediSmart does not practice veterinary medicine and is not
              liable for clinical outcomes. Confirm credentials and availability directly with clinics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Prohibited use</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fraud, scams, or misrepresentation</li>
              <li>Illegal wildlife trade or abusive animal practices</li>
              <li>Scraping, attacking, or overloading our systems</li>
              <li>Posting malware, hate, or illegal content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Liability</h2>
            <p>
              To the fullest extent permitted by law, KediSmart is not liable for indirect or
              consequential damages arising from marketplace transactions, lost pets, or third-party
              services. Our total liability for any claim related to the site is limited to amounts you
              paid us for the specific order giving rise to the claim in the prior 3 months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Governing law</h2>
            <p>
              These terms are governed by the laws of Bangladesh. Disputes should first be raised with
              support at info@kedismart.com.
            </p>
          </section>

          <p className="text-sm text-gray-500 pt-4">
            Also read our{' '}
            <Link href="/privacy" className="text-primary-700 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </article>
    </div>
  )
}

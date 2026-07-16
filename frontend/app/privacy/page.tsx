import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import { automatePageSeo } from '@/lib/seo-automation'

const path = '/privacy'
const seo = automatePageSeo({
  kind: 'policy',
  title: 'Privacy Policy',
  description:
    'How KediSmart collects, uses, and protects personal data for shoppers, sellers, veterinarians, and pet profile users in Bangladesh.',
  path,
  keywords: ['KediSmart privacy policy', 'pet marketplace privacy Bangladesh', 'NFC tag privacy'],
  crumbs: [
    { name: 'Home', path: '/' },
    { name: 'Privacy Policy', path },
  ],
})

export const metadata = seo.metadata

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <JsonLd data={seo.schemas} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 prose prose-gray">
        <Breadcrumbs items={seo.breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: 1 July 2026</p>

        <p className="text-gray-700 leading-relaxed">
          KediSmart (&quot;we&quot;, &quot;us&quot;) operates kedismart.com. This policy explains what information we
          collect, why we collect it, and the choices you have. We design pet profiles so you can help
          finders contact you without exposing unnecessary personal details.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Information we collect</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Account data: name, email, phone, role (buyer, vendor, breeder, vet)</li>
          <li>Order and delivery details needed to fulfill purchases</li>
          <li>Pet profile data you choose to store (photos, medical notes, tag links)</li>
          <li>Marketplace listing content you publish</li>
          <li>Technical logs: IP address, device/browser type, approximate location for security</li>
          <li>Messages between finders and owners via smart-tag flows</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">How we use information</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Provide shopping, marketplace, vet discovery, and NFC/QR tag services</li>
          <li>Process payments, delivery, refunds, and support requests</li>
          <li>Improve safety, prevent fraud, and secure accounts</li>
          <li>Send transactional emails/SMS about orders and security</li>
          <li>Show public listing and profile fields you explicitly make visible</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Smart tags &amp; privacy</h2>
        <p className="text-gray-700 leading-relaxed">
          Digital pet IDs are privacy-controlled. You decide what finders see. We recommend sharing pet
          identity and a secure contact channel — not your home address — on public-facing tag pages.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Sharing</h2>
        <p className="text-gray-700 leading-relaxed">
          We share data with delivery partners, payment processors, and infrastructure providers only as
          needed to operate the service. We do not sell personal data. We may disclose information when
          required by law or to protect users and animals from harm.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Retention &amp; security</h2>
        <p className="text-gray-700 leading-relaxed">
          We retain account and order records as required for legal, accounting, and dispute purposes.
          We use industry-standard safeguards; no method of transmission is 100% secure.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Your choices</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Update or delete pet profile fields in your dashboard</li>
          <li>Request account deletion via{' '}
            <a href="mailto:info@kedismart.com" className="text-primary-700 hover:underline">
              info@kedismart.com
            </a>
          </li>
          <li>Adjust marketing preferences where offered</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Children</h2>
        <p className="text-gray-700 leading-relaxed">
          KediSmart is not directed at children under 13. Parents/guardians should supervise pet accounts
          used by families.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Contact</h2>
        <p className="text-gray-700 leading-relaxed">
          Privacy questions: info@kedismart.com · A.B.M Tower, Gulshan 2, Dhaka 1212, Bangladesh ·{' '}
          <Link href="/contact" className="text-primary-700 hover:underline">
            Contact page
          </Link>
        </p>

        <p className="mt-10 text-sm text-gray-500">
          Related:{' '}
          <Link href="/terms" className="text-primary-700 hover:underline">
            Terms
          </Link>
          {' · '}
          <Link href="/editorial-policy" className="text-primary-700 hover:underline">
            Editorial Policy
          </Link>
        </p>
      </article>
    </main>
  )
}

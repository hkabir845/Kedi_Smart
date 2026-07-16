import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Page not found',
  description: 'The page you requested was not found on KediSmart.',
  path: '/404',
  noIndex: true,
})

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary-600 mb-2">404</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Page not found</h1>
        <p className="text-gray-600 mb-8">
          That URL may be outdated or mistyped. Try one of these popular destinations instead.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-primary-600 px-5 py-2.5 text-white font-semibold hover:bg-primary-700"
          >
            Home
          </Link>
          <Link
            href="/shop"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-800 hover:border-primary-400"
          >
            Shop
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-800 hover:border-primary-400"
          >
            Contact
          </Link>
        </div>
      </div>
    </div>
  )
}

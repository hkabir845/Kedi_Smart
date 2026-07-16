import { Suspense } from 'react'
import JsonLd from '@/components/JsonLd'
import KediSmartLogo from '@/components/KediSmartLogo'
import ShopContent from './ShopContent'
import { buildPageMetadata } from '@/lib/seo'
import { breadcrumbList } from '@/lib/schema'

export const metadata = buildPageMetadata({
  title: 'Shop Pet & General Products',
  description:
    'Browse Pet & Animal care and General Products on KediSmart (Kedi Smart, kedismart) — trusted marketplace for Bangladesh.',
  path: '/shop',
  keywords: ['KediSmart shop', 'pet products', 'general products Bangladesh'],
})

function ShopLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <KediSmartLogo variant="mark" size="lg" link={false} className="mx-auto mb-4 animate-pulse" />
        <p className="text-gray-500">Loading marketplace...</p>
      </div>
    </div>
  )
}

export default function ShopPage() {
  const crumbs = breadcrumbList([
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
  ])

  return (
    <>
      <JsonLd data={crumbs} />
      <Suspense fallback={<ShopLoading />}>
        <ShopContent />
      </Suspense>
    </>
  )
}

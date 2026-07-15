import { Suspense } from 'react'
import KediSmartLogo from '@/components/KediSmartLogo'
import ShopContent from './ShopContent'
import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Shop Pet & General Products',
  description:
    'Browse Pet & Animal care and General Products on KediSmart — trusted marketplace for Bangladesh.',
  path: '/shop',
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
  return (
    <Suspense fallback={<ShopLoading />}>
      <ShopContent />
    </Suspense>
  )
}

import { Suspense } from 'react'
import JsonLd from '@/components/JsonLd'
import KediSmartLogo from '@/components/KediSmartLogo'
import ShopContent from './ShopContent'
import { buildPageMetadata } from '@/lib/seo'
import { breadcrumbList } from '@/lib/schema'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ catalog?: string; q?: string; category_id?: string }>
}) {
  const params = await searchParams
  const title =
    params.catalog === 'pet_animal'
      ? 'Shop Pet Products'
      : params.catalog === 'general'
        ? 'Shop General Products'
        : 'Shop Pet & General Products'
  return buildPageMetadata({
    title,
    description:
      'Browse pet care and general products on KediSmart — a marketplace serving customers across Bangladesh.',
    path: '/shop',
    noIndex: Boolean(params.q || params.category_id),
    keywords: ['KediSmart shop', 'pet products', 'general products Bangladesh'],
  })
}

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

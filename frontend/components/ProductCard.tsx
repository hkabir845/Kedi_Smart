'use client'

import Link from 'next/link'
import KediSmartLogo from '@/components/KediSmartLogo'
import ProductImageWithBrand from '@/components/ProductImageWithBrand'
import { resolveMediaUrl } from '@/lib/media'
import QuickAddButton from './QuickAddButton'

export type ProductCardData = {
  id: number
  title: string
  slug: string
  brand?: string
  catalog?: string
  description_md?: string
  category?: { name: string }
  variants?: Array<{
    id?: number
    price: string
    compare_at_price?: string
    currency: string
    is_active?: boolean
    stock_qty?: number
  }>
  images?: Array<{ url: string; sort_order: number }>
  average_rating?: number
}

function getPrice(product: ProductCardData) {
  const variants = product.variants?.filter((v) => v.is_active !== false) || []
  if (!variants.length) return null

  const prices = variants.map((v) => parseFloat(v.price))
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const cheapest = variants.reduce((best, v) =>
    parseFloat(v.price) < parseFloat(best.price) ? v : best
  )

  let compareAt: number | null = null
  let savings: number | null = null

  for (const v of variants) {
    if (!v.compare_at_price) continue
    const compare = parseFloat(v.compare_at_price)
    const price = parseFloat(v.price)
    if (compare <= price) continue
    const pct = Math.round(((compare - price) / compare) * 100)
    if (!savings || pct > savings) savings = pct
  }

  if (cheapest.compare_at_price) {
    const compare = parseFloat(cheapest.compare_at_price)
    if (compare > min) compareAt = compare
  }

  return {
    min,
    max,
    currency: variants[0].currency || 'BDT',
    variantId: cheapest.id,
    compareAt,
    savings,
  }
}

export default function ProductCard({
  product,
  dense = false,
}: {
  product: ProductCardData
  dense?: boolean
}) {
  const price = getPrice(product)
  const imageUrl = resolveMediaUrl(
    product.images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url
  )
  const cachedImageUrl = imageUrl
    ? `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}v=${product.id}-r2`
    : ''
  const inStock = (product.variants?.[0]?.stock_qty ?? 1) > 0

  return (
    <Link
      href={`/product/${product.slug}`}
      className={`group bg-white border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full relative ${
        dense ? 'rounded-xl' : 'rounded-2xl shadow-sm'
      }`}
    >
      <ProductImageWithBrand
        className={`aspect-square bg-gradient-to-br from-gray-50 to-gray-100 ${dense ? '' : ''}`}
        watermarkSize="xs"
      >
        {cachedImageUrl && (cachedImageUrl.startsWith('http') || cachedImageUrl.startsWith('/')) ? (
          <img
            src={cachedImageUrl}
            alt={product.title}
            className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary-50">
            <KediSmartLogo variant="mark" size="md" link={false} />
          </div>
        )}
        {price?.savings ? (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
            -{price.savings}%
          </span>
        ) : null}
        {price?.variantId && inStock && <QuickAddButton variantId={price.variantId} />}
      </ProductImageWithBrand>

      <div className={`flex flex-col flex-1 ${dense ? 'p-3' : 'p-4'}`}>
        {product.brand && (
          <p className="text-xs text-primary-700 font-medium mb-0.5 truncate">{product.brand}</p>
        )}
        <h3
          className={`text-gray-900 line-clamp-2 group-hover:text-primary-700 transition-colors ${
            dense ? 'text-sm font-medium leading-snug mb-1.5' : 'font-semibold mb-2'
          }`}
        >
          {product.title}
        </h3>
        {product.average_rating ? (
          <p className="text-sm text-amber-500 mb-1.5">★ {product.average_rating.toFixed(1)}</p>
        ) : (
          <p className="text-xs text-gray-400 mb-1.5">No reviews yet</p>
        )}
        <div className="mt-auto pt-1 flex items-end justify-between gap-2">
          {price ? (
            <div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <p className={`font-bold text-gray-900 ${dense ? 'text-lg' : 'text-xl'} ${price.savings ? 'text-red-600' : ''}`}>
                  <span className="text-xs font-semibold align-top mr-0.5">{price.currency}</span>
                  {price.min.toFixed(0)}
                </p>
                {price.compareAt && (
                  <p className="text-xs text-gray-400 line-through">
                    {price.compareAt.toFixed(0)}
                  </p>
                )}
              </div>
              {price.savings ? (
                <p className="text-[11px] font-semibold text-red-600 mt-0.5">Save {price.savings}%</p>
              ) : (
                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Eligible for delivery</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Price unavailable</p>
          )}
          {!inStock && <span className="text-xs text-red-500 font-medium">Out of stock</span>}
        </div>
      </div>
    </Link>
  )
}

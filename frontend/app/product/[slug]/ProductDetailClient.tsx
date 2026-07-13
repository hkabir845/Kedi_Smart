'use client'

import { useMemo, useState } from 'react'
import AddToCartButton from '@/components/AddToCartButton'
import KediSmartLogo from '@/components/KediSmartLogo'
import ProductImageWithBrand from '@/components/ProductImageWithBrand'
import { resolveMediaUrl } from '@/lib/media'
import Link from 'next/link'

type Variant = {
  id: number
  price: string
  compare_at_price?: string
  currency: string
  stock_qty?: number
  size?: string
  flavor?: string
  sku?: string
}

type Review = {
  id: number
  rating: number
  title?: string
  body?: string
  created_at?: string
}

type Props = {
  product: {
    title: string
    slug?: string
    brand?: string
    catalog?: string
    description_md?: string
    average_rating?: number
    variants?: Variant[]
    images?: Array<{ url: string }>
    reviews?: Review[]
  }
}

export default function ProductDetailClient({ product }: Props) {
  const variants = product.variants || []
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [activeImage, setActiveImage] = useState(0)

  const variant = variants[selectedIdx] || variants[0]
  const isGeneral = product.catalog === 'general'
  const images = product.images?.length ? product.images : [{ url: '' }]
  const imageUrl = resolveMediaUrl(images[activeImage]?.url)
  const inStock = (variant?.stock_qty ?? 0) > 0

  const savings = useMemo(() => {
    if (!variant?.compare_at_price) return null
    const compare = parseFloat(variant.compare_at_price)
    const price = parseFloat(variant.price)
    if (compare <= price) return null
    return Math.round(((compare - price) / compare) * 100)
  }, [variant])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6 flex flex-wrap gap-1">
        <Link href="/shop" className="hover:text-primary-600">Shop</Link>
        <span>/</span>
        <Link
          href={isGeneral ? '/shop?catalog=general' : '/shop'}
          className="hover:text-primary-600"
        >
          {isGeneral ? 'General Products' : 'Pet & Animal'}
        </Link>
        <span>/</span>
        <span className="text-gray-800 line-clamp-1">{product.title}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div>
          <ProductImageWithBrand
            className="aspect-square rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border border-gray-100 shadow-sm"
            watermarkPosition="top-right"
            watermarkSize="sm"
          >
            {imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('/')) ? (
              <img src={imageUrl} alt={product.title} className="w-full h-full object-contain" />
            ) : (
              <KediSmartLogo variant="mark" size="xl" link={false} />
            )}
          </ProductImageWithBrand>
          {images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`rounded-lg overflow-hidden border-2 shrink-0 ${
                    activeImage === i ? 'border-primary-600' : 'border-gray-200'
                  }`}
                >
                  <ProductImageWithBrand className="w-16 h-16" watermark={false}>
                    {resolveMediaUrl(img.url) ? (
                      <img
                        src={resolveMediaUrl(img.url)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <KediSmartLogo variant="mark" size="xs" link={false} />
                      </div>
                    )}
                  </ProductImageWithBrand>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy box — Amazon-style */}
        <div className="flex flex-col">
          <span
            className={`inline-block w-fit text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full mb-3 ${
              isGeneral ? 'bg-purple-100 text-purple-800' : 'bg-primary-100 text-primary-800'
            }`}
          >
            {isGeneral ? 'General Product' : 'Pet & Animal'}
          </span>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{product.title}</h1>
          {product.brand && <p className="text-lg text-gray-500 mb-2">Brand: <strong>{product.brand}</strong></p>}

          {product.average_rating ? (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-amber-500 text-lg">★ {product.average_rating}</span>
              <span className="text-sm text-gray-500">({product.reviews?.length || 0} reviews)</span>
            </div>
          ) : null}

          {variant && (
            <div className="mb-6 p-5 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="flex items-baseline gap-3 flex-wrap">
                <p className="text-4xl font-bold text-primary-600">
                  {variant.currency} {parseFloat(variant.price).toFixed(0)}
                </p>
                {variant.compare_at_price && (
                  <>
                    <p className="text-gray-400 line-through text-xl">
                      {variant.currency} {parseFloat(variant.compare_at_price).toFixed(0)}
                    </p>
                    {savings && (
                      <span className="bg-red-100 text-red-700 text-sm font-bold px-2 py-0.5 rounded">
                        Save {savings}%
                      </span>
                    )}
                  </>
                )}
              </div>
              {inStock ? (
                <p className="text-sm text-green-600 mt-2 font-medium">✓ In stock — {variant.stock_qty} available</p>
              ) : (
                <p className="text-sm text-red-500 mt-2 font-medium">Currently unavailable</p>
              )}
              <p className="text-sm text-gray-500 mt-1">Free delivery on orders over BDT 1,500</p>
            </div>
          )}

          {variants.length > 1 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">Select option</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      selectedIdx === i
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {v.size || v.flavor || v.sku || `Option ${i + 1}`}
                    {' · '}
                    {v.currency} {parseFloat(v.price).toFixed(0)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {inStock && variant && (
            <div className="mb-6 flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700">Qty</label>
              <div className="flex items-center border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-4 py-2 hover:bg-gray-50 text-lg"
                >
                  −
                </button>
                <span className="px-4 py-2 min-w-[3rem] text-center font-medium">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(variant.stock_qty || 99, q + 1))}
                  className="px-4 py-2 hover:bg-gray-50 text-lg"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {variant && inStock && (
              <AddToCartButton
                variantId={variant.id}
                qty={qty}
                label={`Add ${qty} to Cart`}
                className="flex-1 bg-primary-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 transition-all shadow-lg shadow-primary-600/20 text-lg"
              />
            )}
            <Link
              href="/cart"
              className="flex-1 text-center px-8 py-4 rounded-xl border-2 border-primary-600 text-primary-600 font-semibold hover:bg-primary-50"
            >
              View Cart
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-gray-600 border-t pt-6">
            <div><div className="text-2xl mb-1">🚚</div>Fast Delivery</div>
            <div><div className="text-2xl mb-1">↩️</div>Easy Returns</div>
            <div><div className="text-2xl mb-1">💵</div>Secure COD</div>
          </div>
        </div>
      </div>

      {/* Description & Reviews */}
      <div className="mt-12 grid lg:grid-cols-3 gap-8">
        {product.description_md && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h2 className="text-xl font-bold mb-4">About this product</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{product.description_md}</p>
          </div>
        )}

        {product.reviews && product.reviews.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Customer Reviews</h2>
            <div className="space-y-4">
              {product.reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="text-amber-500 text-sm mb-1">{'★'.repeat(review.rating)}</div>
                  {review.title && <p className="font-semibold text-sm">{review.title}</p>}
                  {review.body && <p className="text-sm text-gray-600 mt-1">{review.body}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

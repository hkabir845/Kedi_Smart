'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

type ProductImage = { id?: number; url: string; sort_order?: number }
type ProductVideo = {
  id?: number
  video_url: string
  poster_url?: string
  title?: string
  duration_seconds?: number | null
  sort_order?: number
}

type MediaItem =
  | { kind: 'image'; key: string; url: string; id?: number }
  | {
      kind: 'video'
      key: string
      videoUrl: string
      posterUrl: string
      title: string
      duration?: number | null
      id?: number
    }

type Props = {
  product: {
    title: string
    slug?: string
    brand?: string
    catalog?: string
    description_md?: string
    average_rating?: number
    updated_at?: string
    variants?: Variant[]
    images?: ProductImage[]
    videos?: ProductVideo[]
    reviews?: Review[]
  }
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Amazon HLS clips usually end with a branded Amazon logo bumper — trim it off playback. */
const AMAZON_END_BUMPER_SEC = 2.4

function cleanProductDescription(raw?: string) {
  if (!raw) return ''
  return raw
    .replace(/^Amazon\.com:\s*/i, '')
    .replace(/\s+:\s*(Electronics|Home|Kitchen|Clothing|Beauty|Sports|Office).*$/i, '')
    .trim()
}

function ProductVideoPlayer({
  src,
  poster,
  title,
  durationHint,
}: {
  src: string
  poster?: string
  title: string
  durationHint?: number | null
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playableDuration, setPlayableDuration] = useState<number | null>(
    durationHint && durationHint > AMAZON_END_BUMPER_SEC
      ? durationHint - AMAZON_END_BUMPER_SEC
      : durationHint || null
  )

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    let hls: { destroy: () => void } | null = null
    let cancelled = false

    const applyTrim = () => {
      if (!video.duration || !Number.isFinite(video.duration) || video.duration < 6) {
        setPlayableDuration(video.duration || durationHint || null)
        return
      }
      const endAt = Math.max(1, video.duration - AMAZON_END_BUMPER_SEC)
      setPlayableDuration(endAt)
    }

    const onTimeUpdate = () => {
      if (!video.duration || !Number.isFinite(video.duration) || video.duration < 6) return
      const endAt = Math.max(1, video.duration - AMAZON_END_BUMPER_SEC)
      if (video.currentTime >= endAt - 0.05) {
        video.pause()
        video.currentTime = Math.max(0, endAt - 0.12)
      }
    }

    const onEnded = () => {
      // Prefer last content frame over Amazon end card
      if (video.duration > AMAZON_END_BUMPER_SEC) {
        video.currentTime = Math.max(0, video.duration - AMAZON_END_BUMPER_SEC - 0.12)
      }
    }

    video.addEventListener('loadedmetadata', applyTrim)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('ended', onEnded)

    const setup = async () => {
      const isHls = src.includes('.m3u8')
      if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
        video.play().catch(() => {})
        return
      }
      if (isHls) {
        const Hls = (await import('hls.js')).default
        if (cancelled) return
        if (Hls.isSupported()) {
          const instance = new Hls({ enableWorker: true })
          instance.loadSource(src)
          instance.attachMedia(video)
          instance.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {})
          })
          hls = instance as { destroy: () => void }
          return
        }
      }
      video.src = src
      video.play().catch(() => {})
    }

    setup().catch(() => {
      if (video) video.src = src
    })

    return () => {
      cancelled = true
      video.removeEventListener('loadedmetadata', applyTrim)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('ended', onEnded)
      hls?.destroy()
    }
  }, [src, durationHint])

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-stone-50">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        controls
        playsInline
        autoPlay
        poster={poster || undefined}
        aria-label={title}
        data-playable-duration={playableDuration ?? undefined}
      />
    </div>
  )
}

export default function ProductDetailClient({ product }: Props) {
  const variants = product.variants || []
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [activeMedia, setActiveMedia] = useState(0)

  const variant = variants[selectedIdx] || variants[0]
  const isGeneral = product.catalog === 'general'
  const inStock = (variant?.stock_qty ?? 0) > 0

  const media: MediaItem[] = useMemo(() => {
    // Amazon-style order: first still, then videos (landscape first), then remaining stills
    const images: MediaItem[] = []
    for (const img of product.images || []) {
      const url = resolveMediaUrl(img.url)
      if (!url) continue
      images.push({ kind: 'image', key: `img-${img.id || images.length}`, url, id: img.id })
    }
    const videos: Extract<MediaItem, { kind: 'video' }>[] = []
    for (const vid of product.videos || []) {
      const videoUrl = (vid.video_url || '').trim()
      if (!videoUrl) continue
      videos.push({
        kind: 'video',
        key: `vid-${vid.id || videos.length}`,
        videoUrl,
        posterUrl: resolveMediaUrl(vid.poster_url || '') || '',
        title: vid.title || 'Product video',
        duration: vid.duration_seconds,
        id: vid.id,
      })
    }
    // Prefer landscape Amazon streams — vertical ones include letterbox + end-card branding more often
    videos.sort((a, b) => {
      const av = a.videoUrl.includes('.vertical.') ? 1 : 0
      const bv = b.videoUrl.includes('.vertical.') ? 1 : 0
      return av - bv
    })
    const items =
      images.length > 0 ? [images[0], ...videos, ...images.slice(1)] : [...videos]
    return items.length ? items : [{ kind: 'image', key: 'empty', url: '' }]
  }, [product.images, product.videos])

  useEffect(() => {
    setActiveMedia(0)
  }, [product.slug])

  const current = media[Math.min(activeMedia, media.length - 1)]
  const cacheKey = `${product.updated_at || product.slug || '1'}-r3`
  const imageSrc =
    current?.kind === 'image' && current.url
      ? `${current.url}${current.url.includes('?') ? '&' : '?'}v=${encodeURIComponent(cacheKey)}`
      : ''

  const savings = useMemo(() => {
    if (!variant?.compare_at_price) return null
    const compare = parseFloat(variant.compare_at_price)
    const price = parseFloat(variant.price)
    if (compare <= price) return null
    return Math.round(((compare - price) / compare) * 100)
  }, [variant])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <nav className="text-sm text-gray-500 mb-6 flex flex-wrap gap-1">
        <Link href="/shop" className="hover:text-primary-600">
          Shop
        </Link>
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

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
        {/* Media gallery: horizontal thumbs on phone, vertical on sm+ */}
        <div>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            {media.length > 1 && (
              <div className="flex sm:flex-col gap-2 shrink-0 max-w-full sm:max-h-[28rem] overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto scrollbar-none pb-1 sm:pb-0 sm:pr-1">
                {media.map((item, i) => {
                  const selected = i === activeMedia
                  const thumb =
                    item.kind === 'image'
                      ? `${item.url}${item.url.includes('?') ? '&' : '?'}v=${encodeURIComponent(cacheKey)}`
                      : item.posterUrl
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveMedia(i)}
                      className={`relative w-16 h-16 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 shrink-0 bg-gray-50 ${
                        selected ? 'border-primary-600' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      aria-label={item.kind === 'video' ? item.title : `Image ${i + 1}`}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <KediSmartLogo variant="mark" size="xs" link={false} />
                        </div>
                      )}
                      {item.kind === 'video' && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <span className="w-6 h-6 rounded-full bg-white/95 text-gray-900 flex items-center justify-center text-[10px] shadow">
                            ▶
                          </span>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <ProductImageWithBrand
                className="aspect-square rounded-2xl bg-stone-50 flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden"
                watermarkPosition="top-right"
                watermarkSize="sm"
                watermark={current?.kind !== 'video'}
              >
                {current?.kind === 'video' ? (
                  <ProductVideoPlayer
                    src={current.videoUrl}
                    poster={current.posterUrl || undefined}
                    title={current.title}
                    durationHint={current.duration}
                  />
                ) : imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc}
                    alt={product.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <KediSmartLogo variant="mark" size="xl" link={false} />
                )}
              </ProductImageWithBrand>
              {current?.kind === 'video' && (
                <p className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                  <span className="font-medium text-gray-700">{current.title}</span>
                  {current.duration ? (
                    <span>
                      ·{' '}
                      {formatDuration(
                        current.duration > AMAZON_END_BUMPER_SEC
                          ? current.duration - AMAZON_END_BUMPER_SEC
                          : current.duration
                      )}
                    </span>
                  ) : null}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Buy box — Amazon-style */}
        <div className="flex flex-col">
          <div className="mb-1">
            <span
              className={`inline-block text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                isGeneral ? 'bg-stone-100 text-stone-700' : 'bg-primary-100 text-primary-800'
              }`}
            >
              {isGeneral ? 'General Product' : 'Pet & Animal'}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 leading-snug mb-2">
            {product.title}
          </h1>
          {product.brand && (
            <p className="text-sm text-gray-600 mb-3">
              Brand:{' '}
              <span className="text-primary-700 font-medium hover:underline cursor-default">
                {product.brand}
              </span>
            </p>
          )}

          {product.average_rating ? (
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(product.average_rating || 0)
                      ? 'text-amber-400 fill-current'
                      : 'text-gray-300'
                  }`}
                  viewBox="0 0 20 20"
                >
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              ))}
              <span className="text-sm text-primary-700 ml-1">
                {product.average_rating.toFixed(1)}
              </span>
            </div>
          ) : null}

          <div className="border-t border-b border-gray-200 py-4 mb-4">
            {variant ? (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-bold text-primary-700">
                  {variant.currency} {parseFloat(variant.price).toFixed(0)}
                </span>
                {variant.compare_at_price &&
                  parseFloat(variant.compare_at_price) > parseFloat(variant.price) && (
                    <>
                      <span className="text-base text-gray-400 line-through">
                        {variant.currency} {parseFloat(variant.compare_at_price).toFixed(0)}
                      </span>
                      {savings ? (
                        <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          Save {savings}%
                        </span>
                      ) : null}
                    </>
                  )}
              </div>
            ) : (
              <p className="text-gray-500">Price unavailable</p>
            )}
            {inStock ? (
              <p className="text-sm text-green-700 mt-2 font-medium">
                ✓ In stock{variant?.stock_qty ? ` — ${variant.stock_qty} available` : ''}
              </p>
            ) : (
              <p className="text-sm text-red-600 mt-2 font-medium">Currently unavailable</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Free delivery on orders over BDT 1,500</p>
          </div>

          {variants.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
              <div className="flex flex-wrap gap-2">
                {variants.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      i === selectedIdx
                        ? 'border-primary-600 bg-primary-50 text-primary-800 font-medium'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {[v.size, v.flavor].filter(Boolean).join(' / ') || `Option ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm font-medium text-gray-700">Qty</label>
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                −
              </button>
              <span className="px-4 py-2 text-sm font-medium border-x border-gray-300 min-w-[3rem] text-center">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                +
              </button>
            </div>
          </div>

          {variant && (
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <AddToCartButton
                variantId={variant.id}
                qty={qty}
                className="flex-1 py-3 text-base font-semibold"
              />
              <Link
                href="/cart"
                className="flex-1 text-center py-3 text-base font-semibold border-2 border-primary-600 text-primary-700 rounded-xl hover:bg-primary-50 transition-colors"
              >
                View Cart
              </Link>
            </div>
          )}

          <div className="flex gap-4 text-xs text-gray-500 mb-6">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              Fast Delivery
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Easy Returns
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Secure COD
            </div>
          </div>
        </div>
      </div>

      {cleanProductDescription(product.description_md) && (
        <div className="mt-10 max-w-3xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
            About this product
          </h2>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
            {cleanProductDescription(product.description_md)}
          </div>
        </div>
      )}

      {product.reviews && product.reviews.length > 0 && (
        <div className="mt-10 max-w-3xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            Customer reviews
          </h2>
          <div className="space-y-4">
            {product.reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < review.rating ? 'text-amber-400 fill-current' : 'text-gray-300'
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                  {review.title && (
                    <span className="text-sm font-semibold text-gray-800">{review.title}</span>
                  )}
                </div>
                {review.body && <p className="text-sm text-gray-600">{review.body}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

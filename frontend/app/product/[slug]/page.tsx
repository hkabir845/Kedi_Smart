import Link from 'next/link'
import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import FaqSection from '@/components/FaqSection'
import JsonLd from '@/components/JsonLd'
import ShareButtons from '@/components/ShareButtons'
import {
  absoluteMediaUrl,
  absoluteUrl,
  buildPageMetadata,
  plainText,
} from '@/lib/seo'
import {
  aggregateRatingSchema,
  breadcrumbList,
  defaultProductFaqs,
  faqPageSchema,
  reviewSchemas,
  videoObjectSchema,
} from '@/lib/schema'
import { productBreadcrumbs } from '@/lib/seo-automation'
import ProductDetailClient from './ProductDetailClient'

export const revalidate = 300

function productImage(product: any): string | undefined {
  const first = product?.images?.[0]?.url || product?.image_url || product?.cover_image_url
  return absoluteMediaUrl(first)
}

function productImages(product: any): string[] {
  const urls = (product?.images || [])
    .map((img: any) => absoluteMediaUrl(img?.url))
    .filter(Boolean) as string[]
  const primary = productImage(product)
  if (primary && !urls.includes(primary)) urls.unshift(primary)
  return [...new Set(urls)]
}

function productPrice(product: any): string | undefined {
  const variants = product?.variants || []
  const prices = variants
    .map((v: any) => Number(v.price))
    .filter((n: number) => Number.isFinite(n) && n > 0)
  if (!prices.length) return undefined
  return String(Math.min(...prices))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const product = await api.get(`/shop/products/${slug}`)
    return buildPageMetadata({
      title: product.title,
      description: plainText(product.description_md || product.title),
      path: `/product/${slug}`,
      image: productImage(product),
      keywords: [
        product.title,
        product.brand,
        product.category?.name || product.category_name,
        product.catalog === 'general' ? 'general products' : 'pet products',
        'KediSmart shop',
        'buy online Bangladesh',
      ].filter(Boolean) as string[],
    })
  } catch {
    return buildPageMetadata({
      title: 'Product',
      path: `/product/${slug}`,
      keywords: ['KediSmart shop', 'pet products'],
      noIndex: true,
    })
  }
}

async function getRelated(product: any) {
  try {
    const catalog = product.catalog || 'pet_animal'
    const res = await api.get(`/shop/products?limit=8&catalog=${catalog}`)
    const items = res.items || res.results || []
    return items.filter((p: any) => p.slug && p.slug !== product.slug).slice(0, 4)
  } catch {
    return []
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let product
  try {
    product = await api.get(`/shop/products/${slug}`)
  } catch {
    notFound()
  }

  if (!product) notFound()

  const price = productPrice(product)
  const images = productImages(product)
  const reviews = product.reviews || []
  const related = await getRelated(product)
  const faqs = defaultProductFaqs({
    title: product.title,
    brand: product.brand,
    currency: product.currency || 'BDT',
  })

  const productLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: plainText(product.description_md || product.title, 300),
    url: absoluteUrl(`/product/${slug}`),
    sku: product.slug,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'KediSmart',
      ...(product.brand
        ? {}
        : { alternateName: ['Kedi Smart', 'kedismart', 'Kedi_Smart', 'Kedi-Smart'] }),
    },
  }
  if (images.length) productLd.image = images
  if (price) {
    productLd.offers = {
      '@type': 'Offer',
      priceCurrency: product.currency || product.variants?.[0]?.currency || 'BDT',
      price,
      availability:
        product.stock_qty > 0 || product.in_stock !== false
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: absoluteUrl(`/product/${slug}`),
      seller: {
        '@type': 'Organization',
        name: 'KediSmart',
      },
    }
  }
  const agg = aggregateRatingSchema(product.average_rating, reviews.length)
  if (agg) productLd.aggregateRating = agg
  const reviewLd = reviewSchemas(reviews)
  if (reviewLd.length) productLd.review = reviewLd

  const crumbItems = productBreadcrumbs({
    title: product.title,
    slug,
    categoryName: product.category?.name || product.category_name,
    categorySlug: product.category?.slug || product.category_slug,
  })
  const crumbs = breadcrumbList(crumbItems)
  const faqLd = faqPageSchema(faqs)

  const videoLd = (product.videos || [])
    .filter((v: any) => v.video_url)
    .slice(0, 3)
    .map((v: any) =>
      videoObjectSchema({
        name: v.title || `${product.title} video`,
        description: plainText(product.description_md || product.title, 160),
        contentUrl: v.video_url,
        posterUrl: v.poster_url || images[0],
        uploadDate: product.updated_at,
        durationSeconds: v.duration_seconds,
      }),
    )

  const schemas = [productLd, crumbs, faqLd, ...videoLd].filter(Boolean) as Record<string, unknown>[]

  return (
    <>
      <JsonLd data={schemas} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs items={crumbItems} />
      </div>
      <ProductDetailClient product={product} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <ShareButtons
          path={`/product/${slug}`}
          title={product.title}
          description={plainText(product.description_md || product.title, 120)}
          className="mt-6"
        />
        <FaqSection faqs={faqs} />
        {related.length > 0 && (
          <section className="mt-12" aria-labelledby="related-heading">
            <h2 id="related-heading" className="text-xl font-semibold text-gray-900 mb-4">
              Related products
            </h2>
            <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((item: any) => (
                <li key={item.id || item.slug}>
                  <Link
                    href={`/product/${item.slug}`}
                    className="block rounded-xl border border-gray-200 bg-white p-3 hover:border-primary-300 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}

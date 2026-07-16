import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/JsonLd'
import { absoluteMediaUrl, absoluteUrl, buildPageMetadata, plainText } from '@/lib/seo'
import { breadcrumbList } from '@/lib/schema'
import ProductDetailClient from './ProductDetailClient'

export const dynamic = 'force-dynamic'

function productImage(product: any): string | undefined {
  const first = product?.images?.[0]?.url || product?.image_url || product?.cover_image_url
  return absoluteMediaUrl(first)
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
      ].filter(Boolean) as string[],
    })
  } catch {
    return buildPageMetadata({
      title: 'Product',
      path: `/product/${slug}`,
      keywords: ['KediSmart shop', 'pet products'],
    })
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
  const image = productImage(product)
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
  if (image) productLd.image = [image]
  if (price) {
    productLd.offers = {
      '@type': 'Offer',
      priceCurrency: product.currency || 'BDT',
      price,
      availability:
        product.stock_qty > 0 || product.in_stock !== false
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: absoluteUrl(`/product/${slug}`),
    }
  }

  const crumbs = breadcrumbList([
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: product.title, path: `/product/${slug}` },
  ])

  return (
    <>
      <JsonLd data={[productLd, crumbs]} />
      <ProductDetailClient product={product} />
    </>
  )
}

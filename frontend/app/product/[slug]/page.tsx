import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import ProductDetailClient from './ProductDetailClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const product = await api.get(`/shop/products/${params.slug}`)
    return {
      title: `${product.title} - Kedi Smart`,
      description: product.description_md?.substring(0, 160) || product.title,
    }
  } catch {
    return { title: 'Product - Kedi Smart' }
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  let product
  try {
    product = await api.get(`/shop/products/${params.slug}`)
  } catch {
    notFound()
  }

  if (!product) notFound()

  return <ProductDetailClient product={product} />
}

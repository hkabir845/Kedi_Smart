'use client'

import ProductCard, { ProductCardData } from '@/components/ProductCard'

type Props = {
  products: ProductCardData[]
  accent?: 'pet' | 'general'
}

export default function FeaturedProductGrid({ products, accent = 'pet' }: Props) {
  if (!products.length) return null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

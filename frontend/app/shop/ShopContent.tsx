'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import { api } from '@/lib/api'

const PAGE_SIZE = 48

interface Product {
  id: number
  title: string
  slug: string
  brand?: string
  catalog?: string
  description_md?: string
  category?: { id: number; name: string; slug: string }
  variants?: Array<{
    id: number
    price: string
    compare_at_price?: string
    currency: string
    stock_qty: number
    is_active: boolean
  }>
  images?: Array<{ id: number; url: string; sort_order: number }>
  average_rating?: number
}

interface Category {
  id: number
  name: string
  slug: string
}

type Catalog = 'pet_animal' | 'general'
type SortBy = 'newest' | 'price-low' | 'price-high' | 'rating'

export default function ShopContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryCatalog = searchParams.get('catalog')
  const querySearch = searchParams.get('q') || ''
  const queryCategory = searchParams.get('category_id')

  const [catalog, setCatalog] = useState<Catalog>(
    queryCatalog === 'general' ? 'general' : 'pet_animal'
  )
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(
    queryCategory ? Number(queryCategory) || null : null
  )
  const [searchQuery, setSearchQuery] = useState(querySearch)
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [dealsOnly, setDealsOnly] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const canLoadMore = !loading && !loadingMore && products.length > 0 && products.length < totalCount

  useEffect(() => {
    if (queryCatalog === 'general') setCatalog('general')
    else if (queryCatalog === 'pet_animal') setCatalog('pet_animal')
    else setCatalog('pet_animal')
  }, [queryCatalog])

  useEffect(() => {
    setSearchQuery(querySearch)
  }, [querySearch])

  useEffect(() => {
    setSelectedCategory(queryCategory ? Number(queryCategory) || null : null)
  }, [queryCategory])

  useEffect(() => {
    api.get(`/shop/categories?catalog=${catalog}`).then(setCategories).catch(() => setCategories([]))
  }, [catalog])

  useEffect(() => {
    setLoading(true)
    setProducts([])
    setTotalCount(0)
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      skip: '0',
      catalog,
    })
    if (selectedCategory) params.append('category_id', String(selectedCategory))

    api
      .get(`/shop/products?${params}`)
      .then((data) => {
        setProducts(data.items || [])
        setTotalCount(data.total ?? 0)
      })
      .catch(() => {
        setProducts([])
        setTotalCount(0)
      })
      .finally(() => setLoading(false))
  }, [catalog, selectedCategory])

  const loadMore = useCallback(() => {
    if (!canLoadMore) return

    setLoadingMore(true)
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      skip: String(products.length),
      catalog,
    })
    if (selectedCategory) params.append('category_id', String(selectedCategory))

    api
      .get(`/shop/products?${params}`)
      .then((data) => {
        setProducts((prev) => {
          const ids = new Set(prev.map((p) => p.id))
          const newItems = (data.items || []).filter((p: Product) => !ids.has(p.id))
          return [...prev, ...newItems]
        })
        setTotalCount(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [canLoadMore, products.length, catalog, selectedCategory])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !canLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [canLoadMore, loadMore])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          p.title.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.description_md?.toLowerCase().includes(q)
        if (!match) return false
      }
      if (inStockOnly) {
        const stock = p.variants?.some((v) => v.is_active !== false && (v.stock_qty ?? 0) > 0)
        if (!stock) return false
      }
      if (dealsOnly) {
        const hasDeal = p.variants?.some(
          (v) =>
            v.compare_at_price &&
            parseFloat(v.compare_at_price) > parseFloat(v.price || '0')
        )
        if (!hasDeal) return false
      }
      return true
    })
  }, [products, searchQuery, inStockOnly, dealsOnly])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const priceA = parseFloat(a.variants?.[0]?.price || '0')
      const priceB = parseFloat(b.variants?.[0]?.price || '0')
      switch (sortBy) {
        case 'price-low':
          return priceA - priceB
        case 'price-high':
          return priceB - priceA
        case 'rating':
          return (b.average_rating || 0) - (a.average_rating || 0)
        default:
          return b.id - a.id
      }
    })
  }, [filtered, sortBy])

  const activeCategoryName =
    categories.find((c) => c.id === selectedCategory)?.name ||
    (catalog === 'general' ? 'General Products' : 'Pet & Animal')

  const clearFilters = () => {
    setInStockOnly(false)
    setDealsOnly(false)
    setSearchQuery('')
    const params = new URLSearchParams()
    if (catalog === 'general') params.set('catalog', 'general')
    const qs = params.toString()
    router.push(qs ? `/shop?${qs}` : '/shop')
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <nav className="text-xs text-gray-500 mb-3 flex flex-wrap items-center gap-1">
          <Link href="/" className="hover:text-primary-700 hover:underline">
            Home
          </Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-primary-700 hover:underline">
            Shop
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">{activeCategoryName}</span>
        </nav>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="search"
                placeholder={`Search in ${activeCategoryName}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="shop-sort" className="text-xs text-gray-500 whitespace-nowrap">
                Sort by
              </label>
              <select
                id="shop-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="newest">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Avg. Customer Review</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              In stock
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={dealsOnly}
                onChange={(e) => setDealsOnly(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Deals
            </label>

            <div className="flex-1" />

            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">{sorted.length}</span>
              {searchQuery.trim() ? (
                <>
                  {' '}
                  results for <span className="font-semibold">&quot;{searchQuery.trim()}&quot;</span>
                </>
              ) : (
                <> products</>
              )}
              {!searchQuery.trim() && products.length < totalCount && (
                <span className="text-gray-500">
                  {' '}
                  · showing {products.length} of {totalCount}
                </span>
              )}
            </p>

            {(selectedCategory || inStockOnly || dealsOnly || searchQuery) && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-primary-700 hover:text-primary-800"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl h-80 animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products match</h3>
            <p className="text-sm text-gray-500 mb-4">Try clearing filters or searching another department.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-semibold text-primary-700 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {sorted.map((product) => (
                <ProductCard key={product.id} product={product} dense />
              ))}
            </div>
            {products.length < totalCount && (
              <div ref={loadMoreRef} className="flex justify-center py-10">
                {loadingMore ? (
                  <div className="flex items-center gap-3 text-gray-500 text-sm">
                    <span className="inline-block w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    Loading more…
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Scroll for more</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

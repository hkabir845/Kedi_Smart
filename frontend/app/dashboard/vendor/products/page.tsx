'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/media'
import { EmptyState, StatusPill } from '@/components/control-centre/PanelPrimitives'

type Filter = 'all' | 'live' | 'pending' | 'draft' | 'low'

export default function VendorProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/vendor/products')
      return
    }

    api.setToken(token)
    Promise.all([
      api.get('/vendor/products').catch(() => []),
      api.get('/vendor/profile').catch(() => null),
    ])
      .then(([productsData, profileData]) => {
        setProducts(Array.isArray(productsData) ? productsData : [])
        setProfile(profileData)
      })
      .catch(() => router.push('/dashboard/vendor'))
      .finally(() => setLoading(false))
  }, [router])

  const filtered = useMemo(() => {
    let list = products
    if (filter === 'live') {
      list = list.filter((p) => p.approval_status === 'approved')
    } else if (filter === 'pending') {
      list = list.filter((p) => p.approval_status === 'pending')
    } else if (filter === 'draft') {
      list = list.filter((p) => p.status === 'draft')
    } else if (filter === 'low') {
      list = list.filter((p) => p.is_low_stock && p.track_inventory)
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.catalog?.toLowerCase().includes(q)
      )
    }
    return list
  }, [products, filter, query])

  if (loading) {
    return <div className="text-gray-500">Loading catalogue...</div>
  }

  const lowCount = products.filter((p) => p.is_low_stock && p.track_inventory).length

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: `All (${products.length})` },
    {
      id: 'live',
      label: `Approved (${products.filter((p) => p.approval_status === 'approved').length})`,
    },
    {
      id: 'pending',
      label: `In review (${products.filter((p) => p.approval_status === 'pending').length})`,
    },
    {
      id: 'draft',
      label: `Draft (${products.filter((p) => p.status === 'draft').length})`,
    },
    { id: 'low', label: `Low stock (${lowCount})` },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My products</h1>
          <p className="text-sm text-gray-500 mt-1">
            Catalogue + inventory — open a listing to restock, set low-stock alerts, or switch to a
            service (no qty).
          </p>
        </div>
        <Link
          href="/dashboard/vendor/products/new"
          className="inline-flex items-center justify-center min-h-[44px] rounded-xl bg-primary-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-primary-700 shadow-sm shrink-0"
        >
          + Add product
        </Link>
      </div>

      {!profile && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>Set up your shop first.</strong>{' '}
          <Link href="/dashboard/vendor/profile" className="underline font-semibold">
            Complete shop profile
          </Link>{' '}
          before submitting products.
        </div>
      )}

      {profile && !profile.is_approved && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          Shop approval is pending. You can still add products — they stay in review until your shop
          is approved.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search title or brand..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-h-[44px] rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
        />
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold border transition ${
                filter === f.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={products.length === 0 ? 'No products yet' : 'No matches'}
          description={
            products.length === 0
              ? 'List your first item with photos, price, and stock — shoppers will find it after review.'
              : 'Try another search or filter.'
          }
          actionHref={products.length === 0 ? '/dashboard/vendor/products/new' : undefined}
          actionLabel={products.length === 0 ? 'Add your first product' : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((product) => {
            const img = product.images?.[0]?.url
            const price = product.variants?.[0]?.price
            const stock = product.variants?.[0]?.stock_qty
            const tracks = product.track_inventory
            return (
              <article
                key={product.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
              >
                <div className="aspect-[16/10] bg-gray-50 relative">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(img)}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl text-gray-300">
                      📦
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="font-semibold text-gray-900 line-clamp-2">{product.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{product.brand || 'No brand'}</p>
                  <p className="text-base font-bold text-primary-700 mt-2">
                    {price != null ? `BDT ${price}` : 'No price'}
                    {tracks ? (
                      <span
                        className={`ml-2 text-xs font-medium ${
                          product.is_low_stock ? 'text-amber-600' : 'text-gray-400'
                        }`}
                      >
                        · {stock ?? 0} in stock
                        {product.is_low_stock ? ' (low)' : ''}
                      </span>
                    ) : (
                      <span className="ml-2 text-xs font-medium text-gray-400 capitalize">
                        · {product.product_kind || 'service'}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <StatusPill
                      tone={product.approval_status === 'approved' ? 'success' : 'warning'}
                    >
                      {product.approval_status || 'pending'}
                    </StatusPill>
                    <StatusPill tone="neutral">{product.status}</StatusPill>
                    {product.is_low_stock && <StatusPill tone="warning">Low stock</StatusPill>}
                  </div>
                  <Link
                    href={`/dashboard/vendor/products/${product.id}`}
                    className="mt-4 inline-flex items-center justify-center min-h-[40px] rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Manage inventory
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/media'

export default function VendorProductInventoryPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id
  const [product, setProduct] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [title, setTitle] = useState('')
  const [brand, setBrand] = useState('')
  const [kind, setKind] = useState('physical')
  const [price, setPrice] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [threshold, setThreshold] = useState('5')
  const [adjustDelta, setAdjustDelta] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [adjustReason, setAdjustReason] = useState('restock')

  const load = async () => {
    const [p, m] = await Promise.all([
      api.get(`/vendor/products/${productId}`),
      api.get(`/vendor/products/${productId}/movements`).catch(() => []),
    ])
    setProduct(p)
    setMovements(Array.isArray(m) ? m : [])
    setTitle(p.title || '')
    setBrand(p.brand || '')
    setKind(p.product_kind || 'physical')
    const v = p.variants?.[0]
    setPrice(v?.price != null ? String(v.price) : '')
    setStockQty(v?.stock_qty != null ? String(v.stock_qty) : '0')
    setThreshold(v?.low_stock_threshold != null ? String(v.low_stock_threshold) : '5')
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push(`/login?next=/dashboard/vendor/products/${productId}`)
      return
    }
    api.setToken(token)
    load()
      .catch((err) => setError(err.message || 'Not found'))
      .finally(() => setLoading(false))
  }, [productId, router])

  const saveProduct = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await api.put(`/vendor/products/${productId}`, {
        title,
        brand,
        product_kind: kind,
        price: price === '' ? undefined : Number(price),
        stock_qty: kind === 'physical' ? Number(stockQty) : undefined,
        low_stock_threshold: Number(threshold) || 5,
      })
      await load()
      setMessage('Saved.')
    } catch (err: any) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const adjustStock = async () => {
    const delta = Number(adjustDelta)
    if (!delta) {
      setError('Enter a stock change (e.g. +10 or -2).')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await api.post(`/vendor/products/${productId}/stock`, {
        delta,
        reason: adjustReason,
        note: adjustNote,
      })
      setAdjustDelta('')
      setAdjustNote('')
      await load()
      setMessage('Stock updated.')
    } catch (err: any) {
      setError(err.message || 'Adjust failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-500">Loading inventory…</div>
  if (!product) {
    return (
      <div>
        <Link href="/dashboard/vendor/products" className="text-sm text-primary-700 font-semibold">
          ← My products
        </Link>
        <p className="mt-3 text-red-700">{error || 'Not found'}</p>
      </div>
    )
  }

  const img = product.images?.[0]?.url
  const tracks = product.track_inventory && kind === 'physical'
  const stock = product.variants?.[0]?.stock_qty
  const low = product.is_low_stock

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div>
        <Link href="/dashboard/vendor/products" className="text-sm font-semibold text-primary-700">
          ← My products
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Inventory & listing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track units like Shopify/Square for physical goods. Services don’t use stock qty — bill them via
          invoices when needed.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex gap-4 p-5">
          <div className="h-20 w-20 rounded-xl bg-gray-50 overflow-hidden shrink-0">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveMediaUrl(img)} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl text-gray-300">
                📦
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{product.title}</p>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">
              {product.product_kind || 'physical'}
              {tracks ? ` · ${stock ?? 0} in stock` : ' · no stock tracking'}
              {low ? ' · low stock' : ''}
            </p>
            <p className="text-xs text-gray-400 mt-1">SKU {product.variants?.[0]?.sku || '—'}</p>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Listing</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm block sm:col-span-2">
            <span className="font-medium text-gray-700">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
            />
          </label>
          <label className="text-sm block">
            <span className="font-medium text-gray-700">Brand</span>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
            />
          </label>
          <label className="text-sm block">
            <span className="font-medium text-gray-700">Type</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3 bg-white"
            >
              <option value="physical">Physical product (tracks stock)</option>
              <option value="service">Service (no stock)</option>
              <option value="digital">Digital (no stock)</option>
            </select>
          </label>
          <label className="text-sm block">
            <span className="font-medium text-gray-700">Price (BDT)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
            />
          </label>
          {tracks && (
            <>
              <label className="text-sm block">
                <span className="font-medium text-gray-700">On-hand qty</span>
                <input
                  type="number"
                  min="0"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
                />
              </label>
              <label className="text-sm block">
                <span className="font-medium text-gray-700">Low-stock alert at</span>
                <input
                  type="number"
                  min="0"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
                />
              </label>
            </>
          )}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={saveProduct}
          className="min-h-[44px] rounded-xl bg-primary-600 px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save listing'}
        </button>
      </section>

      {tracks && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Quick adjust</h2>
          <p className="text-xs text-gray-500">
            Restock incoming goods, remove damaged units, or correct a count — every change is logged.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-sm block">
              <span className="font-medium text-gray-700">Change (+/−)</span>
              <input
                type="number"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                placeholder="+10 or -2"
                className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
              />
            </label>
            <label className="text-sm block">
              <span className="font-medium text-gray-700">Reason</span>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3 bg-white"
              >
                <option value="restock">Restock / received</option>
                <option value="adjustment">Count correction</option>
                <option value="return">Return restock</option>
              </select>
            </label>
            <label className="text-sm block">
              <span className="font-medium text-gray-700">Note</span>
              <input
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Optional"
                className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={adjustStock}
            className="min-h-[44px] rounded-xl border border-gray-200 px-5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            Apply adjustment
          </button>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Stock history</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-gray-500">No movements yet.</p>
        ) : (
          <ul className="divide-y divide-gray-50 text-sm">
            {movements.map((m) => (
              <li key={m.id} className="py-2.5 flex justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900 capitalize">
                    {String(m.reason || '').replace(/_/g, ' ')}{' '}
                    <span className={m.delta >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                      {m.delta >= 0 ? '+' : ''}
                      {m.delta}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {m.note || '—'} · after {m.quantity_after}
                  </p>
                </div>
                <p className="text-xs text-gray-400 tabular-nums shrink-0">
                  {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

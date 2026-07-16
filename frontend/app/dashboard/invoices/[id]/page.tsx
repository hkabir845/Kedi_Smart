'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import OrderDocument, { type OrderDocOrder } from '@/components/OrderDocument'

export default function SellerInvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id
  const [order, setOrder] = useState<(OrderDocOrder & { editable?: boolean; can_mark_paid?: boolean; channel?: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [view, setView] = useState<'invoice' | 'receipt'>('invoice')
  const [issuedAt, setIssuedAt] = useState('')
  const [notes, setNotes] = useState('')
  const [seller, setSeller] = useState({ name: '', phone: '', email: '', address: '' })
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: '',
    notes: '',
  })
  const [items, setItems] = useState<Array<{ title: string; qty: string; price: string }>>([])
  const [discount, setDiscount] = useState('0')
  const [shipping, setShipping] = useState('0')
  const [tax, setTax] = useState('0')

  const load = async () => {
    const data = await api.get(`/seller/invoices/${orderId}`)
    setOrder(data)
    const invDate = data.invoice?.issued_at || data.created_at
    setIssuedAt(invDate ? String(invDate).slice(0, 10) : '')
    setNotes(data.invoice?.notes || '')
    setSeller({
      name: data.invoice?.seller_name || data.seller?.name || '',
      phone: data.invoice?.seller_phone || data.seller?.phone || '',
      email: data.invoice?.seller_email || data.seller?.email || '',
      address: data.invoice?.seller_address || data.seller?.address || '',
    })
    const ship = data.shipping_address || {}
    setCustomer({
      name: ship.name || '',
      phone: ship.phone || '',
      email: data.guest_email || '',
      address: ship.address || '',
      city: ship.city || '',
      country: ship.country || '',
      notes: ship.notes || '',
    })
    setItems(
      (data.items || []).map((it: any) => ({
        title: it.title_snapshot || '',
        qty: String(it.qty ?? 1),
        price: String(it.price_snapshot ?? 0),
      }))
    )
    setDiscount(String(data.discount ?? 0))
    setShipping(String(data.shipping_fee ?? 0))
    setTax(String(data.tax ?? 0))
    return data
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push(`/login?next=/dashboard/invoices/${orderId}`)
      return
    }
    api.setToken(token)
    load()
      .catch((err) => setError(err.message || 'Not found'))
      .finally(() => setLoading(false))
  }, [orderId, router])

  const save = async () => {
    if (!order) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload: Record<string, unknown> = {
        issued_at: issuedAt,
        notes,
        seller,
      }
      if (order.editable) {
        payload.customer = customer
        payload.discount = Number(discount) || 0
        payload.shipping_fee = Number(shipping) || 0
        payload.tax = Number(tax) || 0
        payload.items = items
          .filter((l) => l.title.trim())
          .map((l) => ({
            title: l.title.trim(),
            qty: Number(l.qty) || 1,
            price: Number(l.price) || 0,
          }))
      }
      const data = await api.put(`/seller/invoices/${order.id}`, payload)
      setOrder(data)
      setMessage('Saved.')
      await load()
    } catch (err: any) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const markPaid = async () => {
    if (!order) return
    setSaving(true)
    try {
      const data = await api.post(`/seller/invoices/${order.id}/mark-paid`, {})
      setOrder(data)
      setMessage('Marked paid — receipt unlocked.')
    } catch (err: any) {
      setError(err.message || 'Could not mark paid')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-500">Loading invoice…</div>
  if (!order) {
    return (
      <div className="space-y-3">
        <Link href="/dashboard/invoices" className="text-sm font-semibold text-primary-700">
          ← Invoices
        </Link>
        <p className="text-red-700">{error || 'Not found'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="no-print space-y-4">
        <Link href="/dashboard/invoices" className="text-sm font-semibold text-primary-700">
          ← Invoices
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {order.invoice?.number || order.public_order_number}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {order.channel === 'manual' ? 'Manual sale' : 'Online order'} ·{' '}
              {order.public_order_number}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView('invoice')}
              className={`min-h-[40px] rounded-xl px-4 text-sm font-semibold border ${
                view === 'invoice'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white border-gray-200'
              }`}
            >
              Invoice
            </button>
            <button
              type="button"
              onClick={() => setView('receipt')}
              className={`min-h-[40px] rounded-xl px-4 text-sm font-semibold border ${
                view === 'receipt'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white border-gray-200'
              }`}
            >
              Receipt
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[40px] rounded-xl bg-slate-900 text-white px-4 text-sm font-semibold"
            >
              Print
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const token = localStorage.getItem('access_token')
                  const res = await fetch(
                    `/api/v1/shop/orders/${order.id}/pdf?mode=${view}`,
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
                  )
                  if (!res.ok) throw new Error('Download failed')
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${view}-${order.public_order_number || order.id}.pdf`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch {
                  setError('Could not download PDF')
                }
              }}
              className="min-h-[40px] rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800"
            >
              Download PDF
            </button>
          </div>
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

        {order.editable === false && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This document is locked for editing (paid or online checkout). You can still print or
            download the invoice and receipt.
          </div>
        )}

        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 ${order.editable === false ? 'opacity-60 pointer-events-none' : ''}`}>
          <h2 className="font-semibold text-gray-900">Edit document</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm block">
              <span className="font-medium text-gray-700">Invoice date</span>
              <input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
              />
            </label>
            <label className="text-sm block sm:col-span-2">
              <span className="font-medium text-gray-700">Notes</span>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <p className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              From
            </p>
            {(['name', 'phone', 'email', 'address'] as const).map((key) => (
              <label key={key} className={`text-sm block ${key === 'address' ? 'sm:col-span-2' : ''}`}>
                <span className="capitalize text-gray-700">{key}</span>
                {key === 'address' ? (
                  <textarea
                    rows={2}
                    value={seller[key]}
                    onChange={(e) => setSeller({ ...seller, [key]: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                  />
                ) : (
                  <input
                    value={seller[key]}
                    onChange={(e) => setSeller({ ...seller, [key]: e.target.value })}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
                  />
                )}
              </label>
            ))}
          </div>

          {order.editable && (
            <>
              <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <p className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Customer
                </p>
                {(['name', 'phone', 'email', 'city', 'address'] as const).map((key) => (
                  <label
                    key={key}
                    className={`text-sm block ${key === 'address' ? 'sm:col-span-2' : ''}`}
                  >
                    <span className="capitalize text-gray-700">{key}</span>
                    {key === 'address' ? (
                      <textarea
                        rows={2}
                        value={customer[key]}
                        onChange={(e) => setCustomer({ ...customer, [key]: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                      />
                    ) : (
                      <input
                        value={customer[key]}
                        onChange={(e) => setCustomer({ ...customer, [key]: e.target.value })}
                        className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
                      />
                    )}
                  </label>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Items</p>
                {items.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      className="col-span-6 min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
                      value={line.title}
                      onChange={(e) => {
                        const next = [...items]
                        next[idx] = { ...line, title: e.target.value }
                        setItems(next)
                      }}
                    />
                    <input
                      type="number"
                      className="col-span-2 min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
                      value={line.qty}
                      onChange={(e) => {
                        const next = [...items]
                        next[idx] = { ...line, qty: e.target.value }
                        setItems(next)
                      }}
                    />
                    <input
                      type="number"
                      className="col-span-3 min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
                      value={line.price}
                      onChange={(e) => {
                        const next = [...items]
                        next[idx] = { ...line, price: e.target.value }
                        setItems(next)
                      }}
                    />
                    <button
                      type="button"
                      className="col-span-1 text-xs text-gray-500"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm font-semibold text-primary-700"
                  onClick={() => setItems([...items, { title: '', qty: '1', price: '' }])}
                >
                  + Add line
                </button>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    className="min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="Discount"
                  />
                  <input
                    type="number"
                    className="min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
                    value={shipping}
                    onChange={(e) => setShipping(e.target.value)}
                    placeholder="Shipping"
                  />
                  <input
                    type="number"
                    className="min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    placeholder="Tax"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="min-h-[44px] rounded-xl bg-primary-600 px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {order.can_mark_paid && (
              <button
                type="button"
                disabled={saving}
                onClick={markPaid}
                className="min-h-[44px] rounded-xl border border-emerald-300 bg-emerald-50 px-5 text-sm font-semibold text-emerald-900"
              >
                Mark paid
              </button>
            )}
          </div>
        </div>
      </div>

      <OrderDocument order={order} mode={view} />
    </div>
  )
}

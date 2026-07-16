'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import OrderDocument, { type OrderDocOrder } from '@/components/OrderDocument'
import OrderTimeline from '@/components/OrderTimeline'

const FULFILL_ACTIONS: { status: string; label: string }[] = [
  { status: 'processing', label: 'Processing' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'ready_for_pickup', label: 'Ready for pickup' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'cancelled', label: 'Cancel' },
  { status: 'refunded', label: 'Refund' },
]

export default function AdminOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id
  const [order, setOrder] = useState<(OrderDocOrder & { shipments?: any[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [message, setMessage] = useState('')
  const [view, setView] = useState<'invoice' | 'receipt'>('invoice')
  const [refundIds, setRefundIds] = useState<number[]>([])

  const load = () => {
    return api.get(`/admin/orders/${orderId}`).then(setOrder)
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }
    api.setToken(token)
    load()
      .catch(() => router.push('/admin/orders'))
      .finally(() => setLoading(false))
  }, [orderId, router])

  const approvePayment = async () => {
    if (!order) return
    setActing(true)
    setMessage('')
    try {
      const data = await api.post(`/admin/orders/${order.id}/approve-payment`, {})
      setOrder(data)
      setMessage('Payment approved — receipt marked paid and vendor ledger credited.')
    } catch (err: any) {
      setMessage(err.message || 'Could not approve payment')
    } finally {
      setActing(false)
    }
  }

  const updateStatus = async (status: string) => {
    if (!order) return
    const confirmHeavy = status === 'cancelled' || status === 'refunded'
    if (
      confirmHeavy &&
      !window.confirm(
        status === 'refunded'
          ? 'Refund this order? Stock will be restored and vendor earnings reversed.'
          : 'Cancel this order? Stock will be restored and any credited earnings reversed.'
      )
    ) {
      return
    }
    setActing(true)
    setMessage('')
    try {
      const data = await api.post(`/admin/orders/${order.id}/status`, { status })
      setOrder(data)
      setMessage(`Order status updated to ${status.replace(/_/g, ' ')}.`)
    } catch (err: any) {
      setMessage(err.message || 'Could not update status')
    } finally {
      setActing(false)
    }
  }

  const partialRefund = async () => {
    if (!order || refundIds.length === 0) return
    if (
      !window.confirm(
        `Refund ${refundIds.length} line item(s)? Stock will be restored and vendor ledger reversed for those lines.`
      )
    ) {
      return
    }
    setActing(true)
    setMessage('')
    try {
      const data = await api.post(`/admin/orders/${order.id}/refund`, { item_ids: refundIds })
      setOrder(data.order || data)
      setRefundIds([])
      setMessage(data.message || 'Partial refund applied')
    } catch (err: any) {
      setMessage(err.message || 'Partial refund failed')
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">Loading…</main>
    )
  }

  if (!order) return null

  const paymentPending = order.payment?.status === 'pending'
  const terminal = order.status === 'cancelled' || order.status === 'refunded'

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto">
        <div className="no-print mb-6 space-y-4">
          <Link href="/admin/orders" className="text-primary-600 hover:text-primary-700 text-sm">
            ← Order management
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {order.public_order_number || `Order #${order.id}`}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Status <strong className="capitalize">{String(order.status || '').replace(/_/g, ' ')}</strong>
                {' · '}
                Invoice <strong>{order.invoice?.number || '—'}</strong> · Receipt{' '}
                <strong>{order.receipt?.number || '—'}</strong>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setView('invoice')}
                className={`min-h-[40px] rounded-xl px-4 text-sm font-semibold border ${
                  view === 'invoice'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                Packing invoice
              </button>
              <button
                type="button"
                onClick={() => setView('receipt')}
                className={`min-h-[40px] rounded-xl px-4 text-sm font-semibold border ${
                  view === 'receipt'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                Shopper receipt
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
                    const res = await fetch(`/api/v1/shop/orders/${order.id}/pdf?mode=${view}`, {
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                      credentials: 'include',
                    })
                    if (!res.ok) throw new Error('Download failed')
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${view}-${order.public_order_number || order.id}.pdf`
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch {
                    setMessage('Could not download PDF')
                  }
                }}
                className="min-h-[40px] inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800"
              >
                PDF
              </button>
            </div>
          </div>

          {paymentPending && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-amber-950">
                Payment still pending ({order.payment?.method}
                {order.payment?.wallet_txn_id ? ` · Txn ${order.payment.wallet_txn_id}` : ''}).
              </p>
              <button
                type="button"
                disabled={acting}
                onClick={approvePayment}
                className="min-h-[40px] rounded-xl bg-primary-600 text-white px-4 text-sm font-semibold disabled:opacity-50"
              >
                {acting ? 'Approving…' : 'Approve payment'}
              </button>
            </div>
          )}

          {!terminal && (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-gray-900 mb-2">Fulfillment (whole order)</p>
              <div className="flex flex-wrap gap-2">
                {FULFILL_ACTIONS.map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    disabled={acting || order.status === action.status}
                    onClick={() => updateStatus(action.status)}
                    className={`min-h-[36px] rounded-lg px-3 text-sm font-semibold border disabled:opacity-40 ${
                      action.status === 'cancelled' || action.status === 'refunded'
                        ? 'border-red-200 text-red-700 hover:bg-red-50'
                        : 'border-gray-200 text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(order.shipments) && order.shipments.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Per-vendor shipments</p>
              {order.shipments.map((s: any) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-gray-100 rounded-lg px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {s.vendor_id ? `Vendor #${s.vendor_id}` : 'Platform stock'} · {s.status}
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.courier || 'manual'}
                      {s.tracking_number ? ` · ${s.tracking_number}` : ''}
                    </p>
                  </div>
                  <select
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    value={s.status}
                    disabled={acting}
                    onChange={async (e) => {
                      setActing(true)
                      setMessage('')
                      try {
                        await api.patch(`/admin/shipments/${s.id}`, { status: e.target.value })
                        await load()
                        setMessage('Shipment updated')
                      } catch (err: any) {
                        setMessage(err.message || 'Shipment update failed')
                      } finally {
                        setActing(false)
                      }
                    }}
                  >
                    {['pending', 'processing', 'ready', 'shipped', 'delivered', 'cancelled'].map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {!terminal && Array.isArray(order.items) && order.items.length > 0 && (
            <div className="rounded-xl border border-amber-100 bg-white px-4 py-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">Partial refund</p>
                <button
                  type="button"
                  disabled={acting || refundIds.length === 0}
                  onClick={partialRefund}
                  className="min-h-[36px] rounded-lg px-3 text-sm font-semibold border border-amber-300 text-amber-900 hover:bg-amber-50 disabled:opacity-40"
                >
                  Refund selected ({refundIds.length})
                </button>
              </div>
              <ul className="space-y-2">
                {order.items.map((item) => {
                  const id = Number(item.id)
                  if (!id) return null
                  return (
                    <li key={id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={refundIds.includes(id)}
                        onChange={(e) => {
                          setRefundIds((prev) =>
                            e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
                          )
                        }}
                      />
                      <span>
                        {item.title_snapshot || `Item #${id}`} × {item.qty || 1}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {message && (
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          {order.timeline && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Order tracker</h2>
              <OrderTimeline steps={order.timeline} />
            </div>
          )}
        </div>

        <OrderDocument order={order} mode={view} />
      </div>
    </main>
  )
}

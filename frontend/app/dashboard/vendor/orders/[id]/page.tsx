'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import OrderDocument, { type OrderDocOrder } from '@/components/OrderDocument'

type Shipment = {
  id: number
  status: string
  courier?: string
  tracking_number?: string | null
  tracking_url?: string | null
  consignment_id?: string | null
  carrier_note?: string | null
}

const STATUS_OPTIONS = [
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
]

export default function VendorOrderInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id
  const [order, setOrder] = useState<(OrderDocOrder & { shipment?: Shipment; couriers?: any[] }) | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shipStatus, setShipStatus] = useState('processing')
  const [courier, setCourier] = useState('manual')
  const [tracking, setTracking] = useState('')

  const load = () =>
    api.get(`/vendor/orders/${orderId}`).then((data) => {
      setOrder(data)
      if (data.shipment) {
        setShipStatus(data.shipment.status || 'processing')
        setCourier(data.shipment.courier || 'manual')
        setTracking(data.shipment.tracking_number || '')
      }
    })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push(`/login?next=/dashboard/vendor/orders/${orderId}`)
      return
    }
    api.setToken(token)
    load()
      .catch((err) => {
        setError(err.message || 'Order not found')
        setOrder(null)
      })
      .finally(() => setLoading(false))
  }, [orderId, router])

  const saveShipment = async () => {
    setBusy(true)
    setError('')
    try {
      await api.patch(`/vendor/orders/${orderId}/shipment`, {
        status: shipStatus,
        courier,
        tracking_number: tracking || null,
      })
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not update shipment')
    } finally {
      setBusy(false)
    }
  }

  const bookCourier = async () => {
    setBusy(true)
    setError('')
    try {
      await api.post(`/vendor/orders/${orderId}/shipment`, { courier })
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not book courier')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading packing invoice…</div>
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/vendor/orders" className="text-sm text-primary-700 font-semibold">
          ← Customer orders
        </Link>
        <p className="text-red-700">{error || 'Order not found'}</p>
      </div>
    )
  }

  return (
    <div className="print:p-0 space-y-6">
      <div className="no-print space-y-4">
        <Link href="/dashboard/vendor/orders" className="text-sm text-primary-700 font-semibold">
          ← Customer orders
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Packing invoice</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Update your shipment independently of other sellers on this order. Customer sees one
              KediSmart receipt.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {order.invoice?.number || '—'} · Order {order.public_order_number || `#${order.id}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[44px] rounded-xl bg-primary-600 px-5 text-sm font-bold text-white hover:bg-primary-700"
            >
              Print invoice
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const token = localStorage.getItem('access_token')
                  const res = await fetch(`/api/v1/shop/orders/${order.id}/pdf?mode=invoice`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  })
                  if (!res.ok) throw new Error('Download failed')
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `invoice-${order.public_order_number || order.id}.pdf`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch {
                  setError('Could not download PDF')
                }
              }}
              className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
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

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Your shipment</h2>
          <p className="text-sm text-gray-600">
            Current: <span className="font-medium capitalize">{order.shipment?.status || 'pending'}</span>
            {order.shipment?.tracking_number ? ` · Tracking ${order.shipment.tracking_number}` : ''}
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-sm block">
              <span className="font-medium text-gray-700">Status</span>
              <select
                value={shipStatus}
                onChange={(e) => setShipStatus(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3 bg-white"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm block">
              <span className="font-medium text-gray-700">Courier</span>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3 bg-white"
              >
                {(order.couriers || [{ value: 'manual', label: 'Manual' }]).map((c: any) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm block">
              <span className="font-medium text-gray-700">Tracking number</span>
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
                placeholder="Optional"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={saveShipment}
              className="min-h-[44px] rounded-xl bg-slate-900 text-white px-5 text-sm font-semibold disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save shipment'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={bookCourier}
              className="min-h-[44px] rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-800 disabled:opacity-50"
            >
              Book courier
            </button>
          </div>
          {order.shipment?.carrier_note && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {order.shipment.carrier_note}
            </p>
          )}
        </section>
      </div>

      <OrderDocument order={order} mode="invoice" />
    </div>
  )
}

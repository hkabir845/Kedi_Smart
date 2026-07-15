'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import OrderDocument, { type OrderDocOrder } from '@/components/OrderDocument'

export default function VendorOrderInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id
  const [order, setOrder] = useState<OrderDocOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push(`/login?next=/dashboard/vendor/orders/${orderId}`)
      return
    }
    api.setToken(token)
    api
      .get(`/vendor/orders/${orderId}`)
      .then(setOrder)
      .catch((err) => {
        setError(err.message || 'Order not found')
        setOrder(null)
      })
      .finally(() => setLoading(false))
  }, [orderId, router])

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
      <div className="no-print">
        <Link href="/dashboard/vendor/orders" className="text-sm text-primary-700 font-semibold">
          ← Customer orders
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Packing invoice</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Print and pack with your items. The customer receipt only shows{' '}
              <strong>Kedi Smart</strong> — they never see your shop name (Amazon FBM-style).
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {order.invoice?.number || '—'} · Order{' '}
              {order.public_order_number || `#${order.id}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] rounded-xl bg-primary-600 px-5 text-sm font-bold text-white hover:bg-primary-700"
          >
              Print invoice
            </button>
            <Link
              href={`/dashboard/invoices/${orderId}`}
              className="inline-flex items-center justify-center min-h-[44px] rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700"
            >
              Edit / receipt
            </Link>
        </div>
      </div>

      <OrderDocument order={order} mode="invoice" />
    </div>
  )
}

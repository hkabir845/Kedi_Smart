'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import OrderDocument, { type OrderDocOrder } from '@/components/OrderDocument'
import OrderTimeline from '@/components/OrderTimeline'

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id
  const [order, setOrder] = useState<OrderDocOrder | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    api
      .get(`/shop/orders/${orderId}`)
      .then(setOrder)
      .catch(() => router.push('/dashboard/orders'))
      .finally(() => setLoading(false))
  }, [orderId, router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!order) {
    return null
  }

  return (
    <div className="print:p-0">
      <div className="no-print mb-6">
        <Link
          href="/dashboard/orders"
          className="text-primary-600 hover:text-primary-700 mb-4 inline-block text-sm"
        >
          ← Back to Orders
        </Link>

        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold mb-1">
              {order.public_order_number || `Order #${order.id}`}
            </h1>
            <p className="text-gray-600 text-sm">
              Placed on {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Your customer receipt is below. The packing invoice ships with your products.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/track?order=${order.id}`}
              className="border border-gray-300 px-4 py-2 rounded-xl text-sm font-semibold bg-white"
            >
              Public track link
            </Link>
            <button
              type="button"
              onClick={async () => {
                try {
                  const token = localStorage.getItem('access_token')
                  const res = await fetch(`/api/v1/shop/orders/${order.id}/pdf?mode=receipt`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    credentials: 'include',
                  })
                  if (!res.ok) throw new Error('Download failed')
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `receipt-${order.public_order_number || order.id}.pdf`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch {
                  alert('Could not download PDF')
                }
              }}
              className="border border-primary-600 text-primary-700 px-4 py-2 rounded-xl text-sm font-semibold bg-white"
            >
              PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"
            >
              Print receipt
            </button>
          </div>
        </div>

        {order.timeline && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Order tracker</h2>
            <OrderTimeline steps={order.timeline} />
          </div>
        )}
      </div>

      <OrderDocument order={order} mode="receipt" />
    </div>
  )
}

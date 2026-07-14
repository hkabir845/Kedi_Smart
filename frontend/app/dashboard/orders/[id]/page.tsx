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
    <main className="min-h-screen p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard/orders" className="text-primary-600 hover:text-primary-700 mb-4 inline-block text-sm">
          ← Back to Orders
        </Link>

        <div className="flex flex-wrap justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">{order.public_order_number || `Order #${order.id}`}</h1>
            <p className="text-gray-600 text-sm">
              Placed on {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Link
              href={`/track?order=${order.id}`}
              className="border border-gray-300 px-4 py-2 rounded-xl text-sm font-semibold"
            >
              Public track link
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"
            >
              Print invoice
            </button>
          </div>
        </div>

        {order.timeline && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Order tracker</h2>
            <OrderTimeline steps={order.timeline} />
          </div>
        )}

        <OrderDocument order={order} />
      </div>
    </main>
  )
}

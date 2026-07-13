'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    api.setToken(token)
    api
      .get('/shop/orders')
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-gray-500 py-8">Loading orders...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Orders</h2>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-gray-600 mb-4">You haven&apos;t placed any orders yet.</p>
          <Link href="/shop" className="inline-flex text-primary-600 hover:text-primary-700 font-semibold">
            Start shopping →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-primary-100 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Order #{order.id}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <span className="inline-block mt-2 text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                    {order.status}
                  </span>
                </div>
                <p className="text-xl font-bold text-primary-600">
                  {order.currency} {Number(order.total).toFixed(0)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

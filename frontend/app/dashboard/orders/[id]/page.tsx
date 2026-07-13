'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    api.get(`/shop/orders/${orderId}`)
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
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/dashboard/orders" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Orders
        </Link>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Order #{order.id}</h1>
              <p className="text-gray-600">
                Placed on {new Date(order.created_at).toLocaleDateString()}
              </p>
              <p className={`inline-block mt-2 px-3 py-1 rounded text-sm font-semibold ${
                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {order.status}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary-600">
                {order.currency} {order.total}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Order Items</h2>
              <div className="space-y-4">
                {(order.items || []).map((item: any) => (
                  <div key={item.id} className="border-b pb-3">
                    <p className="font-medium">{item.title_snapshot}</p>
                    <p className="text-sm text-gray-600">
                      Qty: {item.qty} × BDT {item.price_snapshot}
                    </p>
                  </div>
                ))}
              </div>
              {order.shipping_address && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-2">Shipping</h2>
                  <p>{order.shipping_address.name}</p>
                  <p className="text-gray-600">{order.shipping_address.phone}</p>
                  <p className="text-gray-600">{order.shipping_address.address}</p>
                  <p className="text-gray-600">{order.shipping_address.city}, {order.shipping_address.country}</p>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{order.currency} {order.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{order.currency} {order.shipping_fee}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>{order.currency} {order.tax}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg pt-4 border-t">
                  <span>Total</span>
                  <span>{order.currency} {order.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

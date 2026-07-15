'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function AdminOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingOnly, setPendingOnly] = useState(false)

  const load = (pending: boolean) => {
    const qs = pending ? '?pending_payment=1&limit=100' : '?limit=100'
    return api.get(`/admin/orders${qs}`).then(setOrders)
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    load(false)
      .catch(() => router.push('/admin'))
      .finally(() => setLoading(false))
  }, [router])

  const togglePending = async () => {
    const next = !pendingOnly
    setPendingOnly(next)
    setLoading(true)
    try {
      await load(next)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <Link href="/admin" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Admin Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold">Order Management</h1>
          <button
            type="button"
            onClick={togglePending}
            className={`min-h-[40px] rounded-xl px-4 text-sm font-semibold border ${
              pendingOnly
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-gray-800 border-gray-200'
            }`}
          >
            {pendingOnly ? 'Showing pending payments' : 'Filter: pending payments'}
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {pendingOnly ? 'No orders awaiting payment approval.' : 'No orders found.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-[40rem] w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Order
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Payment
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.public_order_number || `#${order.id}`}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                      {String(order.status || '').replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.payment?.method || '—'} · {order.payment?.status || '—'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      BDT {Number(order.total || 0).toLocaleString()}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-primary-600 hover:text-primary-700 font-semibold"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

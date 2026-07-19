'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    api
      .get('/admin/dashboard')
      .then(setStats)
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!stats) {
    return null
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
            <p className="text-3xl font-bold">{stats.users || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Orders</h3>
            <p className="text-3xl font-bold">{stats.orders || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">GMV (delivered)</h3>
            <p className="text-3xl font-bold">BDT {Number(stats.revenue || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Est. platform profit</h3>
            <p className="text-3xl font-bold text-emerald-700">
              BDT {Number(stats.platform_profit || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Marketplace income</h3>
            <p className="text-3xl font-bold">
              BDT {Number(stats.marketplace_income || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Pending payouts</h3>
            <p className="text-3xl font-bold">
              BDT {Number(stats.pending_payouts || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Moderation</h3>
            <p className="text-3xl font-bold">{stats.pending_moderation || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Pending verifications</h3>
            <p className="text-3xl font-bold">{stats.pending_verifications || 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/admin/finance"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-primary-100"
          >
            <h3 className="text-xl font-semibold mb-2">Finance & P&L</h3>
            <p className="text-gray-600">Owner profit, take rate, COGS, fees</p>
          </Link>

          <Link
            href="/admin/expenses"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">Expenses & bills</h3>
            <p className="text-gray-600">Enter operating costs for company books</p>
          </Link>

          <Link
            href="/admin/users"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">User Management</h3>
            <p className="text-gray-600">Manage users and permissions</p>
          </Link>

          <Link
            href="/admin/moderation"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">Moderation Queue</h3>
            <p className="text-gray-600">{stats.pending_moderation || 0} items pending</p>
          </Link>

          <Link
            href="/admin/verifications"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">Verifications</h3>
            <p className="text-gray-600">{stats.pending_verifications || 0} pending</p>
          </Link>

          <Link
            href="/admin/orders"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">Order Management</h3>
            <p className="text-gray-600">View and manage all orders</p>
          </Link>

          <Link
            href="/admin/payouts"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">Vendor payouts</h3>
            <p className="text-gray-600">Approve and mark seller withdrawals paid</p>
          </Link>

          <Link
            href="/admin/settings"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">Settings</h3>
            <p className="text-gray-600">Platform settings and configuration</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

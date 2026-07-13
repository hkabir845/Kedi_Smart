'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    api.setToken(token)
    api
      .get('/auth/me')
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-gray-500 py-8">Loading...</div>
  }

  if (!user) return null

  const cardClass =
    'block bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-100 transition-all'

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl border border-gray-100 p-6 md:p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account details</h2>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <dt className="text-gray-500 mb-0.5">Email</dt>
            <dd className="font-medium text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500 mb-0.5">Account type</dt>
            <dd className="font-medium text-gray-900 capitalize">{user.role.replace('_', ' ').toLowerCase()}</dd>
          </div>
          {user.profile?.full_name && (
            <div>
              <dt className="text-gray-500 mb-0.5">Full name</dt>
              <dd className="font-medium text-gray-900">{user.profile.full_name}</dd>
            </div>
          )}
          {user.profile?.phone && (
            <div>
              <dt className="text-gray-500 mb-0.5">Phone</dt>
              <dd className="font-medium text-gray-900">{user.profile.phone}</dd>
            </div>
          )}
        </dl>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Explore KediSmart</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/shop" className={cardClass}>
            <h3 className="font-semibold text-gray-900 mb-1">Shop products</h3>
            <p className="text-sm text-gray-500">Pet food, toys, electronics &amp; more</p>
          </Link>
          <Link href="/blog" className={cardClass}>
            <h3 className="font-semibold text-gray-900 mb-1">Blog &amp; tips</h3>
            <p className="text-sm text-gray-500">Pet care guides and marketplace news</p>
          </Link>
        </div>
      </section>
    </div>
  )
}

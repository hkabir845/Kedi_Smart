'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function AdminModerationPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    api.get('/admin/moderation')
      .then(setItems)
      .catch(() => router.push('/admin'))
      .finally(() => setLoading(false))
  }, [router])

  const handleApprove = async (itemId: number) => {
    try {
      await api.put(`/admin/moderation/${itemId}/approve`)
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Failed to approve')
    }
  }

  const handleReject = async (itemId: number) => {
    const notes = prompt('Rejection reason:')
    if (!notes) return
    try {
      await api.put(`/admin/moderation/${itemId}/reject`, { notes })
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Failed to reject')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <Link href="/admin" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Admin Dashboard
        </Link>
        <h1 className="text-4xl font-bold mb-8">Moderation Queue</h1>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No items pending moderation.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {item.entity_type} #{item.entity_id}
                    </h3>
                    <p className="text-gray-600">
                      Status: {item.status}
                    </p>
                    {item.notes && (
                      <p className="text-gray-600 mt-2">Notes: {item.notes}</p>
                    )}
                  </div>
                  {item.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

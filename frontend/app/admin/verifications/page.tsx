'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function AdminVerificationsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    api.get('/admin/verifications')
      .then(setRequests)
      .catch(() => router.push('/admin'))
      .finally(() => setLoading(false))
  }, [router])

  const handleApprove = async (requestId: number) => {
    try {
      await api.put(`/admin/verifications/${requestId}/approve`)
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Failed to approve')
    }
  }

  const handleReject = async (requestId: number) => {
    const notes = prompt('Rejection reason:')
    if (!notes) return
    try {
      await api.put(`/admin/verifications/${requestId}/reject`, { notes })
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
        <h1 className="text-4xl font-bold mb-8">Verification Requests</h1>

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No verification requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      User #{request.user_id} - {request.type}
                    </h3>
                    <p className="text-gray-600">
                      Status: {request.status}
                    </p>
                    {request.admin_notes && (
                      <p className="text-gray-600 mt-2">Notes: {request.admin_notes}</p>
                    )}
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
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

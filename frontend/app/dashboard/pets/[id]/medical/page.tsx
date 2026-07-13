'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function PetMedicalPage() {
  const router = useRouter()
  const params = useParams()
  const petId = params.id
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    api.get(`/pets/${petId}/medical-records`)
      .then(setRecords)
      .catch(() => router.push(`/dashboard/pets/${petId}`))
      .finally(() => setLoading(false))
  }, [petId, router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <Link href={`/dashboard/pets/${petId}`} className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Pet Details
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Medical Records</h1>
          <button className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700">
            + Add Record
          </button>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No medical records yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <div key={record.id} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-2">{record.title}</h3>
                <p className="text-gray-600 mb-2">Type: {record.type}</p>
                <p className="text-gray-600 mb-2">
                  Date: {new Date(record.record_date).toLocaleDateString()}
                </p>
                {record.notes && (
                  <p className="text-gray-700">{record.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

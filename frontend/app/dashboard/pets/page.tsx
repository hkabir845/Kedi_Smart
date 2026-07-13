'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function PetsDashboardPage() {
  const router = useRouter()
  const [pets, setPets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    api.get('/pets')
      .then((response) => {
        setPets(response.items || [])
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return <div className="text-gray-500 py-8">Loading pets...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My pets</h2>
        <Link
          href="/dashboard/pets/new"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
        >
          + Add pet
        </Link>
      </div>

      {pets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">🐾</p>
          <p className="text-gray-600 mb-4">You haven&apos;t added any pets yet.</p>
          <Link href="/dashboard/pets/new" className="text-primary-600 hover:text-primary-700 font-semibold">
            Add your first pet →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((pet) => (
            <Link
              key={pet.id}
              href={`/dashboard/pets/${pet.id}`}
              className="block bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-primary-100 transition-all"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{pet.name}</h3>
              <p className="text-sm text-gray-500 capitalize">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

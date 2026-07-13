'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function PetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const petId = params.id
  const [pet, setPet] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    api.get(`/pets/${petId}`)
      .then(setPet)
      .catch(() => router.push('/dashboard/pets'))
      .finally(() => setLoading(false))
  }, [petId, router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!pet) {
    return null
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/dashboard/pets" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Pets
        </Link>
        
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-4xl font-bold mb-6">{pet.name}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              <dl className="space-y-2">
                <dt className="font-medium">Species:</dt>
                <dd className="text-gray-600">{pet.species}</dd>
                {pet.breed && (
                  <>
                    <dt className="font-medium">Breed:</dt>
                    <dd className="text-gray-600">{pet.breed}</dd>
                  </>
                )}
                {pet.gender && (
                  <>
                    <dt className="font-medium">Gender:</dt>
                    <dd className="text-gray-600">{pet.gender}</dd>
                  </>
                )}
                {pet.age_text && (
                  <>
                    <dt className="font-medium">Age:</dt>
                    <dd className="text-gray-600">{pet.age_text}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          <div className="flex gap-4">
            <Link
              href={`/dashboard/pets/${petId}/medical`}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
            >
              Medical Records
            </Link>
            <Link
              href={`/dashboard/pets/${petId}/privacy`}
              className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300"
            >
              Privacy Settings
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

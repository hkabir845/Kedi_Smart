'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import PetTagManager from '@/components/nfc/PetTagManager'
import PetLostModePanel from '@/components/nfc/PetLostModePanel'
import PetMessagesInbox from '@/components/nfc/PetMessagesInbox'

export default function PetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const petId = String(params.id)
  const [pet, setPet] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push(`/login?next=/dashboard/pets/${petId}`)
      return
    }

    api.setToken(token)
    api
      .get(`/pets/${petId}`)
      .then(setPet)
      .catch(() => router.push('/dashboard/pets'))
      .finally(() => setLoading(false))
  }, [petId, router])

  if (loading) {
    return <div className="text-gray-500 py-8">Loading pet…</div>
  }

  if (!pet) {
    return null
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/dashboard/pets"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 mb-3 inline-block"
        >
          ← Back to pets
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{pet.name}</h1>
            <p className="text-sm text-gray-600 mt-1 capitalize">
              {pet.species}
              {pet.breed ? ` · ${pet.breed}` : ''}
              {pet.gender ? ` · ${pet.gender}` : ''}
              {pet.age_text ? ` · ${pet.age_text}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/pets/${petId}/medical`}
              className="inline-flex px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
            >
              Medical
            </Link>
            <Link
              href={`/dashboard/pets/${petId}/privacy`}
              className="inline-flex px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Profile</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Species</dt>
            <dd className="text-gray-900 capitalize font-medium">{pet.species}</dd>
          </div>
          {pet.breed && (
            <div>
              <dt className="text-gray-500">Breed</dt>
              <dd className="text-gray-900 font-medium">{pet.breed}</dd>
            </div>
          )}
          {pet.gender && (
            <div>
              <dt className="text-gray-500">Gender</dt>
              <dd className="text-gray-900 capitalize font-medium">{pet.gender}</dd>
            </div>
          )}
          {pet.age_text && (
            <div>
              <dt className="text-gray-500">Age</dt>
              <dd className="text-gray-900 font-medium">{pet.age_text}</dd>
            </div>
          )}
          {pet.color_markings && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Color / markings</dt>
              <dd className="text-gray-900 font-medium">{pet.color_markings}</dd>
            </div>
          )}
          {pet.instructions_if_found && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">If found instructions</dt>
              <dd className="text-gray-900 whitespace-pre-wrap">{pet.instructions_if_found}</dd>
            </div>
          )}
        </dl>
      </section>

      <PetTagManager petId={petId} />
      <PetLostModePanel petId={petId} petName={pet.name} />
      <PetMessagesInbox petId={petId} />
    </div>
  )
}

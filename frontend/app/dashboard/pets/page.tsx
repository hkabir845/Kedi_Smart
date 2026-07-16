'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { EmptyState } from '@/components/control-centre/PanelPrimitives'
import PetImage from '@/components/PetImage'
import { resolveMediaUrl } from '@/lib/media'

export default function PetsDashboardPage() {
  const router = useRouter()
  const [pets, setPets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/pets')
      return
    }

    api.setToken(token)
    api
      .get('/pets')
      .then((response) => setPets(response.items || []))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return <div className="text-gray-500 py-8">Loading pets...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">My pets</h2>
          <p className="text-sm text-gray-600">
            Profiles, NFC / QR tags, lost mode, privacy, and medical records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/pets/tags"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Tags &amp; lost/found
          </Link>
          <Link
            href="/dashboard/pets/new"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            + Add pet
          </Link>
        </div>
      </div>

      {pets.length === 0 ? (
        <EmptyState
          title="No pets yet"
          description="Add your first pet to link NFC/QR tags, manage lost mode, privacy, and medical records."
          actionHref="/dashboard/pets/new"
          actionLabel="Add your first pet"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((pet) => {
            const thumb = resolveMediaUrl(pet.primary_photo_url)
            return (
              <div
                key={pet.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-primary-100 transition-all"
              >
                <Link href={`/dashboard/pets/${pet.id}`} className="block">
                  <div className="aspect-[16/10] bg-gray-50 flex items-center justify-center overflow-hidden">
                    {thumb ? (
                      <PetImage
                        src={thumb}
                        alt={pet.name}
                        fit="contain"
                        className="max-w-full max-h-full w-auto h-auto"
                        fallbackClassName="w-full h-full"
                      />
                    ) : (
                      <span className="text-3xl text-gray-300">🐾</span>
                    )}
                  </div>
                  <div className="p-5 pb-3">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{pet.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {pet.species}
                      {pet.breed ? ` · ${pet.breed}` : ''}
                    </p>
                  </div>
                </Link>
                <div className="flex flex-wrap gap-2 px-5 pb-5">
                  <Link
                    href={`/dashboard/pets/${pet.id}#nfc-tags`}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-800 hover:bg-primary-100"
                  >
                    NFC / QR
                  </Link>
                  <Link
                    href={`/dashboard/pets/${pet.id}#lost-mode`}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-800 hover:bg-red-100"
                  >
                    Lost mode
                  </Link>
                  <Link
                    href={`/dashboard/pets/${pet.id}/privacy`}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Privacy
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

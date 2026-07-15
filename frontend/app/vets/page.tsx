import Link from 'next/link'
import Image from 'next/image'
import { api } from '@/lib/api'
import PetPageHero from '@/components/PetPageHero'
import { petCardClass } from '@/lib/pet-theme'
import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Find a Vet',
  description: 'Find qualified veterinarians and book pet care on KediSmart.',
  path: '/vets',
})

async function getVets() {
  try {
    return await api.get('/vets')
  } catch {
    return []
  }
}

export default async function VetsPage() {
  const vets = await getVets()

  return (
    <main className="min-h-screen bg-[#f5f5f3]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <PetPageHero
          title="Find a Veterinarian"
          description="Connect with qualified vets for consultations, appointments, and expert pet care."
        />

        {vets.length === 0 ? (
          <div className={`${petCardClass} p-12 text-center`}>
            <p className="text-4xl mb-4">🏥</p>
            <p className="text-gray-600">No veterinarians listed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vets.map((vet: any) => (
              <div key={vet.user_id} className={`${petCardClass} overflow-hidden`}>
                <div className="relative aspect-[16/10] bg-gray-100">
                  {vet.clinic_image_url ? (
                    <Image
                      src={vet.clinic_image_url}
                      alt={vet.clinic_name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl bg-primary-50">
                      🏥
                    </div>
                  )}
                  {vet.avatar_url && (
                    <div className="absolute -bottom-6 left-5 w-14 h-14 rounded-full border-4 border-white overflow-hidden bg-white shadow-md">
                      <Image
                        src={vet.avatar_url}
                        alt={vet.full_name || vet.clinic_name}
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                </div>
                <div className="p-6 pt-9">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">{vet.clinic_name}</h2>
                  {vet.full_name && (
                    <p className="text-sm text-primary-700 font-medium mb-2">{vet.full_name}</p>
                  )}
                  <p className="text-sm text-gray-500 mb-1">{vet.address}</p>
                  <p className="text-sm text-gray-500 mb-4">
                    {vet.city}, {vet.country}
                  </p>
                  {vet.specialties && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 mb-1">
                        Specialties
                      </p>
                      <p className="text-sm text-gray-600">{vet.specialties.join(', ')}</p>
                    </div>
                  )}
                  {vet.online_consultation_enabled && (
                    <p className="text-xs font-semibold text-green-700 mb-4">✓ Online consultations</p>
                  )}
                  <Link
                    href={`/vets/${vet.user_id}`}
                    className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
                  >
                    View profile →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

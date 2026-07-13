import Image from 'next/image'
import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: { vetId: string } }) {
  try {
    const vet = await api.get(`/vets/${params.vetId}`)
    return {
      title: `${vet.clinic_name} - Kedi Smart`,
      description: `Veterinary services at ${vet.clinic_name}`,
    }
  } catch {
    return {
      title: 'Vet Profile - Kedi Smart',
    }
  }
}

async function getVet(vetId: string) {
  try {
    return await api.get(`/vets/${vetId}`)
  } catch {
    return null
  }
}

export default async function VetProfilePage({ params }: { params: { vetId: string } }) {
  const vet = await getVet(params.vetId)

  if (!vet) {
    notFound()
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <Link href="/vets" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Vets
        </Link>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {vet.clinic_image_url && (
            <div className="relative h-64 md:h-80 bg-gray-100">
              <Image
                src={vet.clinic_image_url}
                alt={vet.clinic_name}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            </div>
          )}

          <div className="p-8">
            <div className="flex items-start gap-4 mb-6">
              {vet.avatar_url && (
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md shrink-0 -mt-14 bg-white">
                  <Image
                    src={vet.avatar_url}
                    alt={vet.full_name || vet.clinic_name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className={vet.avatar_url ? 'pt-2' : ''}>
                <h1 className="text-4xl font-bold mb-1">{vet.clinic_name}</h1>
                {vet.full_name && <p className="text-lg text-primary-700">{vet.full_name}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
                <p className="text-gray-600 mb-2">{vet.address}</p>
                <p className="text-gray-600 mb-2">{vet.city}, {vet.country}</p>
                {vet.years_experience && (
                  <p className="text-gray-600 mb-2">Experience: {vet.years_experience} years</p>
                )}
                {vet.online_consultation_enabled && (
                  <p className="text-green-600 font-semibold mb-2">✓ Online Consultations Available</p>
                )}
              </div>

              {vet.specialties && vet.specialties.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Specialties</h2>
                  <ul className="list-disc list-inside space-y-2">
                    {vet.specialties.map((specialty: string, index: number) => (
                      <li key={index} className="text-gray-600">{specialty}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {vet.availability && vet.availability.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Availability</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vet.availability.map((slot: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-semibold">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][slot.day_of_week]}
                      </p>
                      <p className="text-gray-600">
                        {slot.start_time} - {slot.end_time}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">{slot.mode}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <a
                href={`/dashboard/appointments?vet_id=${params.vetId}`}
                className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
              >
                Book Appointment
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

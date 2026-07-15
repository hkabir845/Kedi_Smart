import { api } from '@/lib/api'
import { notFound } from 'next/navigation'

export const metadata = {
  robots: { index: false, follow: false },
}

async function getTagInfo(tagUid: string) {
  try {
    return await api.get(`/nfc/scan/${tagUid}`)
  } catch {
    return null
  }
}

export default async function ScanPage({ params }: { params: { tagUid: string } }) {
  const tagInfo = await getTagInfo(params.tagUid)

  if (!tagInfo || tagInfo.message === 'Tag not activated') {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Tag Not Activated</h1>
          <p className="text-gray-600">This NFC tag has not been activated yet.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {tagInfo.lost_mode_active && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h2 className="text-xl font-bold text-red-800 mb-2">⚠️ Lost Pet</h2>
              <p className="text-red-700">Last seen: {tagInfo.last_seen_location}</p>
              {tagInfo.reward_note && (
                <p className="text-red-700 mt-2">{tagInfo.reward_note}</p>
              )}
            </div>
          )}

          {tagInfo.photo_url && (
            <img
              src={tagInfo.photo_url}
              alt={tagInfo.name}
              className="w-full h-64 object-cover rounded-lg mb-6"
            />
          )}

          <h1 className="text-4xl font-bold mb-4">{tagInfo.name}</h1>
          <p className="text-lg text-gray-600 mb-4">Species: {tagInfo.species}</p>
          {tagInfo.breed && <p className="text-gray-600 mb-4">Breed: {tagInfo.breed}</p>}
          {tagInfo.location && <p className="text-gray-600 mb-6">Location: {tagInfo.location}</p>}

          <div className="space-y-4">
            {tagInfo.contact_options?.allow_call && (
              <a
                href={`tel:${tagInfo.contact_options.phone}`}
                className="block w-full bg-green-600 text-white text-center py-3 rounded-lg hover:bg-green-700"
              >
                📞 Call Owner
              </a>
            )}
            {tagInfo.contact_options?.allow_whatsapp && (
              <a
                href={`https://wa.me/${tagInfo.contact_options.phone}`}
                className="block w-full bg-green-500 text-white text-center py-3 rounded-lg hover:bg-green-600"
              >
                💬 WhatsApp
              </a>
            )}
            {tagInfo.contact_options?.allow_chat && (
              <button className="block w-full bg-primary-600 text-white text-center py-3 rounded-lg hover:bg-primary-700">
                💌 Send Message
              </button>
            )}
          </div>

          <div className="mt-8 pt-8 border-t">
            <h2 className="text-xl font-bold mb-4">Found this pet?</h2>
            <a
              href={`/nfc/pets/${tagInfo.pet_id}/found-report`}
              className="block w-full bg-primary-600 text-white text-center py-3 rounded-lg hover:bg-primary-700"
            >
              Report Found
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}

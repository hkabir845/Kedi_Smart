import Link from 'next/link'
import { api } from '@/lib/api'
import ScanProfileClient, { type ScanPayload } from '@/components/nfc/ScanProfileClient'

export const metadata = {
  robots: { index: false, follow: false },
}

async function getTagInfo(tagUid: string): Promise<ScanPayload | null> {
  try {
    return await api.get(`/nfc/scan/${encodeURIComponent(tagUid)}`)
  } catch {
    return null
  }
}

export default async function ScanPage({ params }: { params: Promise<{ tagUid: string }> }) {
  const { tagUid } = await params
  const tagInfo = await getTagInfo(tagUid)

  if (!tagInfo) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tag not found</h1>
          <p className="text-gray-600 text-sm mb-6">
            This NFC / QR code is not registered in KediSmart.
          </p>
          <Link href="/" className="text-primary-600 font-semibold hover:underline text-sm">
            Go to KediSmart home
          </Link>
        </div>
      </main>
    )
  }

  if (tagInfo.message === 'Tag not activated') {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-md text-center rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            {tagInfo.tag_uid || tagUid}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tag not activated</h1>
          <p className="text-gray-600 text-sm mb-6">
            The owner still needs to link this tag to a pet profile in their KediSmart dashboard.
          </p>
          <Link
            href="/login"
            className="inline-flex px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
          >
            Owner sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[70vh] px-4 py-10 sm:py-14 bg-gradient-to-b from-primary-50 via-white to-white">
      <div className="max-w-lg mx-auto">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
          <ScanProfileClient tagInfo={tagInfo} />
        </div>
      </div>
    </main>
  )
}

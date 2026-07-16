'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

type FoundReport = {
  id: number
  finder_name?: string | null
  finder_contact?: string | null
  location_text?: string | null
  message?: string | null
  created_at?: string
}

type Props = {
  petId: string | number
}

export default function PetFoundReportsInbox({ petId }: Props) {
  const [items, setItems] = useState<FoundReport[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await api.get(`/nfc/pets/${petId}/found-reports`)
    setItems(data?.items || [])
  }, [petId])

  useEffect(() => {
    load()
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [load])

  if (loading) {
    return (
      <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading found reports…</p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Found reports</h2>
          <p className="text-sm text-gray-600 mt-1">
            When someone taps &quot;I found this pet&quot; on the scan page, reports show up here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load().catch(() => undefined)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 rounded-lg bg-gray-50 border border-dashed border-gray-200 px-4 py-5">
          No found reports yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                <p className="font-semibold text-gray-900">{r.finder_name || 'Anonymous finder'}</p>
                {r.created_at && (
                  <time className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</time>
                )}
              </div>
              {r.finder_contact && <p className="text-gray-700">Contact: {r.finder_contact}</p>}
              {r.location_text && <p className="text-gray-700">Location: {r.location_text}</p>}
              {r.message && <p className="text-gray-600 mt-1 whitespace-pre-wrap">{r.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

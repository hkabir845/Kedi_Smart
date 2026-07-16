'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { EmptyState, StatusPill } from '@/components/control-centre/PanelPrimitives'

type PetRow = {
  id: number
  name: string
  species?: string
  breed?: string
  tags: { tag_uid: string; scan_url?: string }[]
  lost_mode_active: boolean
}

export default function TagsAndLostFoundHubPage() {
  const router = useRouter()
  const [rows, setRows] = useState<PetRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/pets/tags')
      return
    }
    api.setToken(token)

    ;(async () => {
      try {
        const petList = await api.get('/pets?limit=100')
        const pets = petList?.items || []
        const enriched = await Promise.all(
          pets.map(async (pet: any) => {
            const [tagsRes, lostRes] = await Promise.all([
              api.get(`/pets/${pet.id}/tags`).catch(() => ({ items: [] })),
              api.get(`/pets/${pet.id}/lost`).catch(() => ({ lost_mode_active: false })),
            ])
            return {
              id: pet.id,
              name: pet.name,
              species: pet.species,
              breed: pet.breed,
              tags: tagsRes.items || [],
              lost_mode_active: Boolean(lostRes.lost_mode_active),
            } as PetRow
          })
        )
        setRows(enriched)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  if (loading) {
    return <div className="text-gray-500 py-8">Loading tags &amp; lost/found…</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Tags &amp; lost/found</h2>
        <p className="text-sm text-gray-600">
          Manage NFC / QR tags, lost mode, finder messages, and scan-profile privacy for each pet.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Pets</p>
          <p className="text-2xl font-semibold text-gray-900">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Tags linked</p>
          <p className="text-2xl font-semibold text-gray-900">
            {rows.reduce((n, r) => n + r.tags.length, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 shadow-sm">
          <p className="text-xs text-red-700 mb-1">Lost mode on</p>
          <p className="text-2xl font-semibold text-red-800">
            {rows.filter((r) => r.lost_mode_active).length}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No pets yet"
          description="Add a pet first, then link an NFC/QR tag and control what finders see."
          actionHref="/dashboard/pets/new"
          actionLabel="Add a pet"
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((pet) => (
            <li
              key={pet.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">{pet.name}</h3>
                  {pet.lost_mode_active ? (
                    <StatusPill tone="danger">Lost mode</StatusPill>
                  ) : (
                    <StatusPill tone="success">Safe</StatusPill>
                  )}
                  {pet.tags.length > 0 ? (
                    <StatusPill tone="info">{pet.tags.length} tag linked</StatusPill>
                  ) : (
                    <StatusPill tone="warning">No tag</StatusPill>
                  )}
                </div>
                <p className="text-sm text-gray-500 capitalize">
                  {pet.species}
                  {pet.breed ? ` · ${pet.breed}` : ''}
                </p>
                {pet.tags[0]?.tag_uid && (
                  <p className="text-xs text-gray-400 font-mono mt-1">UID: {pet.tags[0].tag_uid}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link
                  href={`/dashboard/pets/${pet.id}#nfc-tags`}
                  className="px-3.5 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
                >
                  Manage tags
                </Link>
                <Link
                  href={`/dashboard/pets/${pet.id}#lost-mode`}
                  className="px-3.5 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200"
                >
                  Lost mode
                </Link>
                <Link
                  href={`/dashboard/pets/${pet.id}/privacy`}
                  className="px-3.5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                >
                  Privacy
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
        <p className="font-medium text-gray-800 mb-1">How it works</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Open a pet → link your tag UID under NFC &amp; QR tag</li>
          <li>Share the QR / scan link — finders open the public profile</li>
          <li>Turn on lost mode if the pet goes missing</li>
        </ol>
      </div>
    </div>
  )
}

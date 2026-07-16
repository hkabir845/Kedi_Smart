'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import PetImage from '@/components/PetImage'
import { resolveMediaUrl } from '@/lib/media'

type Photo = {
  id: number
  url: string
  is_primary?: boolean
}

type Props = {
  petId: string | number
  onPrimaryChange?: (url: string | null) => void
}

export default function PetPhotoManager({ petId, onPrimaryChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const data = await api.get(`/pets/${petId}/photos`)
    const list: Photo[] = Array.isArray(data) ? data : data?.items || []
    setPhotos(list)
    const primary = list.find((p) => p.is_primary) || list[0]
    onPrimaryChange?.(primary ? resolveMediaUrl(primary.url) : null)
  }, [petId, onPrimaryChange])

  useEffect(() => {
    load()
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false))
  }, [load])

  const upload = async (file: File) => {
    setBusy(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.upload(`/pets/${petId}/photos`, fd)
      await load()
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const setPrimary = async (photoId: number) => {
    setBusy(true)
    setError('')
    try {
      await api.post(`/pets/${petId}/photos/${photoId}/primary`, {})
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not set primary photo')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (photoId: number) => {
    if (!confirm('Remove this photo?')) return
    setBusy(true)
    setError('')
    try {
      await api.delete(`/pets/${petId}/photos/${photoId}`)
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not delete photo')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading photos…</p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
          <p className="text-sm text-gray-600 mt-1">
            Primary photo appears on the QR / NFC scan profile (when privacy allows). Images keep their
            original shape inside the frame.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex self-start px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Upload photo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
          }}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
          <p className="text-sm text-gray-500">No photos yet. Upload one so finders can recognize your pet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-xl border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center group"
            >
              <PetImage
                src={resolveMediaUrl(photo.url)}
                alt="Pet"
                fit="contain"
                className="max-w-full max-h-full w-auto h-auto"
                fallbackClassName="w-full h-full"
              />
              {photo.is_primary && (
                <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide bg-primary-600 text-white px-2 py-0.5 rounded-full">
                  Primary
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex gap-1 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                {!photo.is_primary && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPrimary(photo.id)}
                    className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-white/95 text-gray-900"
                  >
                    Set primary
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(photo.id)}
                  className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-red-600 text-white"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

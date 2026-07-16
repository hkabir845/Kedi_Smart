'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import QrCodeCard from '@/components/nfc/QrCodeCard'

type TagItem = {
  tag_uid: string
  status: string
  nfc_url?: string
  qr_url?: string
  scan_url: string
  activated_at?: string | null
}

type Props = {
  petId: string | number
}

export default function PetTagManager({ petId }: Props) {
  const [tags, setTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tagUid, setTagUid] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  const load = useCallback(async () => {
    const data = await api.get(`/pets/${petId}/tags`)
    setTags(data.items || [])
  }, [petId])

  useEffect(() => {
    load()
      .catch(() => setTags([]))
      .finally(() => setLoading(false))
  }, [load])

  const activate = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const uid = tagUid.trim()
    if (!uid) {
      setError('Enter the tag UID printed on your NFC / QR tag.')
      return
    }
    setBusy(true)
    try {
      await api.post('/nfc/tags/activate', { tag_uid: uid, pet_id: Number(petId) })
      setTagUid('')
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not activate tag')
    } finally {
      setBusy(false)
    }
  }

  const deactivate = async (uid: string) => {
    if (!confirm(`Unlink tag ${uid} from this pet?`)) return
    setBusy(true)
    setError('')
    try {
      await api.post('/nfc/tags/deactivate', { tag_uid: uid })
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not deactivate tag')
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied(''), 2000)
    } catch {
      setError('Could not copy link')
    }
  }

  if (loading) {
    return (
      <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading NFC / QR tags…</p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">NFC &amp; QR tag</h2>
        <p className="text-sm text-gray-600 mt-1">
          Link a KediSmart tag so anyone who taps the chip or scans the QR opens this pet&apos;s public
          profile.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {tags.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-600">
          No tag linked yet. Enter the UID from your tag packaging or admin inventory, then activate.
        </div>
      ) : (
        <div className="space-y-6">
          {tags.map((tag) => (
            <div
              key={tag.tag_uid}
              className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 rounded-xl border border-gray-100 p-4"
            >
              <QrCodeCard url={tag.scan_url} label={`QR for ${tag.tag_uid}`} size={180} />
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Tag UID</p>
                  <p className="font-mono text-sm text-gray-900 break-all">{tag.tag_uid}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Public profile</p>
                  <Link
                    href={`/scan/${encodeURIComponent(tag.tag_uid)}`}
                    className="text-sm text-primary-600 hover:underline break-all"
                    target="_blank"
                  >
                    {tag.scan_url}
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => copyLink(tag.scan_url)}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
                  >
                    {copied === tag.scan_url ? 'Copied' : 'Copy link'}
                  </button>
                  <Link
                    href={`/scan/${encodeURIComponent(tag.tag_uid)}`}
                    target="_blank"
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
                  >
                    Preview profile
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => deactivate(tag.tag_uid)}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                  >
                    Unlink tag
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={activate} className="border-t border-gray-100 pt-5 space-y-3">
        <label className="block text-sm font-medium text-gray-800">
          Activate a tag
          <input
            value={tagUid}
            onChange={(e) => setTagUid(e.target.value)}
            placeholder="e.g. DEMO-TAG-001"
            className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            autoComplete="off"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Link tag to this pet'}
        </button>
      </form>
    </section>
  )
}

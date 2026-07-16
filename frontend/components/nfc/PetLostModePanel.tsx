'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

type Props = {
  petId: string | number
  petName?: string
}

export default function PetLostModePanel({ petId, petName }: Props) {
  const [active, setActive] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [location, setLocation] = useState('')
  const [reward, setReward] = useState('')

  const load = useCallback(async () => {
    const data = await api.get(`/pets/${petId}/lost`)
    setActive(Boolean(data.lost_mode_active))
    setReport(data.report || null)
  }, [petId])

  useEffect(() => {
    load()
      .catch(() => {
        setActive(false)
        setReport(null)
      })
      .finally(() => setLoading(false))
  }, [load])

  const activate = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!location.trim()) {
      setError('Enter where the pet was last seen.')
      return
    }
    setBusy(true)
    try {
      await api.post(`/pets/${petId}/lost/activate`, {
        location_text: location.trim(),
        reward_note: reward.trim() || null,
      })
      setLocation('')
      setReward('')
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not enable lost mode')
    } finally {
      setBusy(false)
    }
  }

  const closeLost = async () => {
    if (!confirm(`Mark ${petName || 'this pet'} as found and turn off lost mode?`)) return
    setBusy(true)
    setError('')
    try {
      await api.post(`/nfc/pets/${petId}/lost/close`)
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not close lost mode')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading lost-mode status…</p>
      </section>
    )
  }

  return (
    <section
      className={`rounded-xl border p-6 shadow-sm space-y-4 ${
        active ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-white'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Lost mode</h2>
          <p className="text-sm text-gray-600 mt-1">
            When on, anyone scanning the tag sees a lost-pet alert with last-seen details.
          </p>
        </div>
        <span
          className={`inline-flex self-start px-2.5 py-1 rounded-full text-xs font-semibold ${
            active ? 'bg-red-100 text-red-800' : 'bg-emerald-50 text-emerald-800'
          }`}
        >
          {active ? 'Active' : 'Off'}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {active && report ? (
        <div className="space-y-3">
          <dl className="text-sm space-y-2">
            <div>
              <dt className="text-gray-500">Last seen</dt>
              <dd className="text-gray-900 font-medium">{report.last_seen_location_text}</dd>
            </div>
            {report.reward_note && (
              <div>
                <dt className="text-gray-500">Reward note</dt>
                <dd className="text-gray-900">{report.reward_note}</dd>
              </div>
            )}
          </dl>
          <button
            type="button"
            disabled={busy}
            onClick={closeLost}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'Updating…' : 'Pet found — turn off lost mode'}
          </button>
        </div>
      ) : (
        <form onSubmit={activate} className="space-y-3">
          <label className="block text-sm font-medium text-gray-800">
            Last seen location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Gulshan 2 park, near ABM Tower"
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 bg-white"
            />
          </label>
          <label className="block text-sm font-medium text-gray-800">
            Reward note (optional)
            <input
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="Shown only if privacy allows reward notes"
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 bg-white"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? 'Enabling…' : 'Enable lost mode'}
          </button>
        </form>
      )}
    </section>
  )
}

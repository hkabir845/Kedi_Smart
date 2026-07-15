'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { EmptyState, PanelNotice, SectionHeading } from '@/components/control-centre/PanelPrimitives'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function VetAvailabilityPage() {
  const router = useRouter()
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    day_of_week: '1',
    start_time: '09:00',
    end_time: '17:00',
    mode: 'clinic',
  })

  const load = async (userId: number) => {
    const profile = await api.get(`/vets/${userId}`).catch(() => null)
    setSlots(profile?.availability || [])
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/vet/availability')
      return
    }
    api.setToken(token)
    api
      .get('/auth/me')
      .then((me) => load(me.id))
      .finally(() => setLoading(false))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/vets/availability', {
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        mode: form.mode,
      })
      const me = await api.get('/auth/me')
      await load(me.id)
    } catch (err: any) {
      setError(err.message || 'Failed to add availability')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading availability...</div>
  }

  const field =
    'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500'

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/vet" className="text-primary-600 hover:text-primary-700 text-sm mb-3 inline-block">
          ← Clinic home
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Availability</h2>
        <p className="text-sm text-gray-600">
          Publish weekly slots so pet parents know when you accept clinic visits or online consultations.
        </p>
      </div>

      <PanelNotice tone="info">
        Add recurring weekly windows. Owners pick a specific datetime when they book; use this schedule as your
        operating hours.
      </PanelNotice>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <SectionHeading title="Add a weekly slot" />
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
            <select
              className={field}
              value={form.day_of_week}
              onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
            >
              {DAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
            <select
              className={field}
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value })}
            >
              <option value="clinic">Clinic</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
            <input
              type="time"
              required
              className={field}
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
            <input
              type="time"
              required
              className={field}
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Add slot'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <SectionHeading title="Current schedule" />
        {slots.length === 0 ? (
          <EmptyState
            title="No slots yet"
            description="Add at least one weekly window so owners know when you are available."
          />
        ) : (
          <div className="space-y-3">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <p className="font-medium text-gray-900">{DAYS[slot.day_of_week] || `Day ${slot.day_of_week}`}</p>
                  <p className="text-sm text-gray-500">
                    {String(slot.start_time).slice(0, 5)} – {String(slot.end_time).slice(0, 5)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                    {slot.mode}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await api.delete(`/vets/availability/${slot.id}`)
                        const me = await api.get('/auth/me')
                        await load(me.id)
                      } catch (err: any) {
                        setError(err.message || 'Could not remove slot')
                      }
                    }}
                    className="text-sm font-semibold text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

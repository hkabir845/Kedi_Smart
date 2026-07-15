'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { EmptyState, SectionHeading, StatusPill } from '@/components/control-centre/PanelPrimitives'

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'confirmed') return 'info'
  if (status === 'cancelled') return 'danger'
  if (status === 'requested') return 'warning'
  return 'neutral'
}

function ShopperAppointmentsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const vetIdParam = searchParams.get('vet_id')

  const [appointments, setAppointments] = useState<any[]>([])
  const [pets, setPets] = useState<any[]>([])
  const [vets, setVets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    pet_id: '',
    vet_user_id: vetIdParam || '',
    scheduled_at: '',
    mode: 'clinic',
    notes: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/appointments')
      return
    }
    api.setToken(token)
    Promise.all([
      api.get('/vets/appointments').catch(() => []),
      api.get('/pets?limit=100').catch(() => ({ items: [] })),
      api.get('/vets').catch(() => []),
    ])
      .then(([appts, petList, vetList]) => {
        setAppointments(Array.isArray(appts) ? appts : [])
        setPets(petList?.items || [])
        setVets(Array.isArray(vetList) ? vetList : [])
      })
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    if (vetIdParam) {
      setForm((prev) => ({ ...prev, vet_user_id: vetIdParam }))
    }
  }, [vetIdParam])

  const selectedVetName = useMemo(() => {
    const vet = vets.find((v) => String(v.user_id || v.id) === String(form.vet_user_id))
    return vet?.full_name || vet?.clinic_name || null
  }, [vets, form.vet_user_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/vets/appointments', {
        pet_id: Number(form.pet_id),
        vet_user_id: Number(form.vet_user_id),
        scheduled_at: form.scheduled_at,
        mode: form.mode,
        notes: form.notes || undefined,
      })
      const refreshed = await api.get('/vets/appointments')
      setAppointments(Array.isArray(refreshed) ? refreshed : [])
      setForm((prev) => ({ ...prev, scheduled_at: '', notes: '' }))
    } catch (err: any) {
      setError(err.message || 'Failed to request appointment')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500 py-8">Loading appointments...</div>
  }

  const field =
    'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500'

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Appointments</h2>
        <p className="text-sm text-gray-600">
          Request clinic visits or online consultations with verified veterinarians.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <SectionHeading title="Book an appointment" />
        {pets.length === 0 ? (
          <EmptyState
            title="Add a pet first"
            description="Appointments are linked to a pet profile so the vet has the right context."
            actionHref="/dashboard/pets/new"
            actionLabel="Add a pet"
          />
        ) : vets.length === 0 ? (
          <EmptyState
            title="No approved vets yet"
            description="Check the public directory later, or ask support if you need a clinic listed sooner."
            actionHref="/vets"
            actionLabel="Browse vets"
          />
        ) : (
          <>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {selectedVetName && (
              <p className="mb-4 text-sm text-gray-600">
                Booking with <span className="font-semibold text-gray-900">{selectedVetName}</span>
              </p>
            )}
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pet *</label>
                <select
                  required
                  className={field}
                  value={form.pet_id}
                  onChange={(e) => setForm({ ...form, pet_id: e.target.value })}
                >
                  <option value="">Select pet</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Veterinarian *</label>
                <select
                  required
                  className={field}
                  value={form.vet_user_id}
                  onChange={(e) => setForm({ ...form, vet_user_id: e.target.value })}
                >
                  <option value="">Select vet</option>
                  {vets.map((vet) => (
                    <option key={vet.user_id || vet.id} value={vet.user_id || vet.id}>
                      {vet.full_name || vet.clinic_name} {vet.city ? `· ${vet.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date &amp; time *</label>
                <input
                  required
                  type="datetime-local"
                  className={field}
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode *</label>
                <select
                  required
                  className={field}
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value })}
                >
                  <option value="clinic">Clinic visit</option>
                  <option value="online">Online consultation</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  className={field}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Symptoms, vaccination needs, etc."
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60"
                >
                  {submitting ? 'Requesting...' : 'Request appointment'}
                </button>
              </div>
            </form>
          </>
        )}
      </section>

      <section>
        <SectionHeading
          title="Your appointments"
          action={
            <Link href="/vets" className="text-sm font-semibold text-primary-600 hover:underline">
              Find a vet
            </Link>
          }
        />
        {appointments.length === 0 ? (
          <EmptyState
            title="No appointments yet"
            description="Book a clinic visit or online consult when your pet needs care."
          />
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Appointment #{appointment.id}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(appointment.scheduled_at).toLocaleString()} · {appointment.mode}
                  </p>
                  {appointment.notes && (
                    <p className="text-sm text-gray-500 mt-2">{appointment.notes}</p>
                  )}
                </div>
                <StatusPill tone={statusTone(appointment.status)}>{appointment.status}</StatusPill>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default function ShopperAppointmentsPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 py-8">Loading appointments...</div>}>
      <ShopperAppointmentsInner />
    </Suspense>
  )
}

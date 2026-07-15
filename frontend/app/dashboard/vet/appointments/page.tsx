'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { EmptyState, StatusPill } from '@/components/control-centre/PanelPrimitives'

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'confirmed') return 'info'
  if (status === 'cancelled') return 'danger'
  if (status === 'requested') return 'warning'
  return 'neutral'
}

export default function VetAppointmentsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [noteFor, setNoteFor] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  const load = () =>
    api.get('/vets/appointments').then((data) => setAppointments(Array.isArray(data) ? data : []))

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/vet/appointments')
      return
    }
    api.setToken(token)
    load()
      .catch(() => router.push('/dashboard/vet'))
      .finally(() => setLoading(false))
  }, [router])

  const updateStatus = async (appointmentId: number, status: string) => {
    setUpdatingId(appointmentId)
    try {
      await api.put(`/vets/appointments/${appointmentId}/status`, { status })
      await load()
    } catch (err: any) {
      alert(err.message || 'Failed to update appointment')
    } finally {
      setUpdatingId(null)
    }
  }

  const saveNote = async (e: FormEvent, appointmentId: number) => {
    e.preventDefault()
    if (!noteText.trim()) return
    setNoteSaving(true)
    try {
      await api.post(`/vets/appointments/${appointmentId}/notes`, { notes: noteText.trim() })
      setNoteFor(null)
      setNoteText('')
      alert('Consultation note saved')
    } catch (err: any) {
      alert(err.message || 'Failed to save note')
    } finally {
      setNoteSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading appointments...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Appointment inbox</h2>
          <p className="text-sm text-gray-600">Confirm new requests and keep consultation notes.</p>
        </div>
        <Link
          href="/dashboard/vet/availability"
          className="text-sm font-semibold text-primary-600 hover:underline"
        >
          Edit availability
        </Link>
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          description="When pet parents book your clinic, requests will appear here for confirmation."
          actionHref="/dashboard/vet/profile"
          actionLabel="Complete clinic profile"
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {appointment.pet_name || `Pet #${appointment.pet_id}`}
                    </h3>
                    <StatusPill tone={statusTone(appointment.status)}>{appointment.status}</StatusPill>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(appointment.scheduled_at).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Owner: {appointment.owner_name || '—'}
                    {appointment.owner_phone ? ` · ${appointment.owner_phone}` : ''}
                  </p>
                  <p className="text-sm text-gray-500 mt-1 capitalize">
                    Mode: {appointment.mode}
                    {appointment.pet_species ? ` · ${appointment.pet_species}` : ''}
                  </p>
                  {appointment.notes && (
                    <p className="text-sm text-gray-500 mt-2">{appointment.notes}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {appointment.status === 'requested' && (
                    <>
                      <button
                        type="button"
                        disabled={updatingId === appointment.id}
                        onClick={() => updateStatus(appointment.id, 'confirmed')}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === appointment.id}
                        onClick={() => updateStatus(appointment.id, 'cancelled')}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {appointment.status === 'confirmed' && (
                    <button
                      type="button"
                      disabled={updatingId === appointment.id}
                      onClick={() => updateStatus(appointment.id, 'completed')}
                      className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60"
                    >
                      Mark complete
                    </button>
                  )}
                  {(appointment.status === 'confirmed' || appointment.status === 'completed') && (
                    <button
                      type="button"
                      onClick={() => {
                        setNoteFor(noteFor === appointment.id ? null : appointment.id)
                        setNoteText('')
                      }}
                      className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                    >
                      Add note
                    </button>
                  )}
                </div>
              </div>
              {noteFor === appointment.id && (
                <form
                  onSubmit={(e) => saveNote(e, appointment.id)}
                  className="mt-4 border-t border-gray-100 pt-4 space-y-3"
                >
                  <textarea
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                    rows={3}
                    placeholder="Consultation notes for this visit..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={noteSaving}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {noteSaving ? 'Saving...' : 'Save consultation note'}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

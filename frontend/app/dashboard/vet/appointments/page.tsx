'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function VetAppointmentsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    api.get('/vets/appointments')
      .then(setAppointments)
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false))
  }, [router])

  const updateStatus = async (appointmentId: number, status: string) => {
    try {
      await api.put(`/vets/appointments/${appointmentId}/status`, { status })
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Failed to update appointment')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">My Appointments</h1>

        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No appointments scheduled.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Appointment #{appointment.id}
                    </h3>
                    <p className="text-gray-600">
                      Scheduled: {new Date(appointment.scheduled_at).toLocaleString()}
                    </p>
                    <p className="text-gray-600">Mode: {appointment.mode}</p>
                    <p className={`inline-block mt-2 px-3 py-1 rounded text-sm font-semibold ${
                      appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {appointment.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {appointment.status === 'requested' && (
                      <>
                        <button
                          onClick={() => updateStatus(appointment.id, 'confirmed')}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => updateStatus(appointment.id, 'cancelled')}
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {appointment.status === 'confirmed' && (
                      <button
                        onClick={() => updateStatus(appointment.id, 'completed')}
                        className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
